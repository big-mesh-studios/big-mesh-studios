/**
 * The paint field: a colour per world-space voxel, stored sparsely in bricks.
 *
 * ## Why a sparse bricked grid and not a dense one
 *
 * **Because paint lives on a surface and a dense grid pays for the volume around it.** A
 * 5-unit figure at 0.02 world units a voxel is 250³ texels — 62 MB — to hold what is really
 * about 78 units² of shell. Bricks are allocated only where a dab has been, so the cost is
 * the painted area and not the model's bounding box, and the number scales with what somebody
 * painted rather than with how big their model is.
 *
 * Bricks are 8³ voxels in a 10³ slot, which is `randoms-3d-paint`'s arrangement and
 * Laine & Karras's, and the extra two are the whole reason the structure exists.
 *
 * ## Why every brick has a one-voxel gutter
 *
 * **Because hardware trilinear filtering reads a voxel and its seven neighbours, and at a
 * brick's edge those neighbours are in a different brick.** Storing them as if they were in
 * this one would need the sampler to know which brick each of eight reads came from. The
 * gutter makes them local instead: a write to a voxel also writes into the gutters of the
 * bricks around it, so from inside one brick the edge voxels' neighbours are already correct
 * and a single lookup suffices.
 *
 * **The price is 1000 texels for 512 voxels of use, a 1.95× overhead.** That is cheaper than
 * the alternative (eight dependent lookups per fragment) and cheaper than shrinking the
 * brick, because a smaller brick has proportionally more shell to cover.
 *
 * ## Why the CPU buffer is laid out exactly as the texture will be
 *
 * **Because M3 wraps this in a `DataTexture` and there should be no repack in between.** A
 * second layout would mean a 16 MB copy every time the resolution changed and a class of bug
 * where the two disagree about which texel is which.
 *
 * ## Why an unallocated brick reads as clear rather than as an error
 *
 * **Because the sampler has no way to tell "no paint here" from "this brick was never
 * allocated", and a figure is mostly unpainted.** A zero read is what makes the shader's
 * single indirection lookup able to answer without a branch that costs a texture read.
 */

import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  RGBAFormat,
  UnsignedByteType,
} from "@random-mesh/rmsl/scene";

/** Voxels along one edge of a brick's useful interior. */
export const BRICK = 8;

/** One voxel of gutter on each side, so trilinear has its neighbours. {@link BRICK} + 2. */
export const SLOT = BRICK + 2;

/** Texels in one slot. */
export const SLOT_VOXELS = SLOT * SLOT * SLOT;

/**
 * The indirection grid's edge.
 *
 * **Indexed in voxels of bricks, not texels**, so a 5-unit figure at 0.02 units a voxel needs
 * 5 / (8 × 0.02) = 32 and fits in 32. Each entry is four bytes — the slot's x, y and z and
 * whether it is allocated — which at 64³ is a megabyte, so this is set from the model's
 * bounding box rather than fixed.
 */
export const GRID_RES = 64;

/** Bricks a field holds along one edge by default, so `TILES ** 3` in all. */
export const TILES = 16;

export interface Region {
  readonly x0: number;
  readonly y0: number;
  readonly z0: number;
  readonly x1: number;
  readonly y1: number;
  readonly z1: number;
}

/** One texel's worth of paint, straight-alpha. */
export interface Texel {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

const clampByte = (value: number): number =>
  value < 0 ? 0 : value > 255 ? 255 : Math.round(value);

/**
 * Which slot cells hold a given voxel of a brick.
 *
 * **The border is a duplicate of the brick's own edge voxels**, which is the convention every
 * bricked grid uses and the reason this needs no cross-brick writes: a sample near this
 * brick's edge finds its neighbour already inside it, so one lookup is enough and the sampler
 * never has to know which brick each of its eight reads came from. Laine & Karras describe the
 * same border for the same reason.
 *
 * **Cell `n` holds voxel `min(max(n - 1, 0), BRICK - 1)`**, so a voxel has one cell in the
 * interior, and a second only when it is on an edge — which is why this is a table and not
 * something worked out per write. Scanning all `SLOT ** 3` cells to find the two that matter
 * is 500 times the work for the same answer.
 */
const BORDER: readonly (readonly number[])[] = Array.from(
  { length: BRICK },
  (_, voxel) =>
    voxel === 0
      ? [1, 0]
      : voxel === BRICK - 1
        ? [BRICK, SLOT - 1]
        : [voxel + 1],
);

export class PaintField {
  /**
   * Every slot's texels, four bytes apiece, laid out as a 3D texture of
   * `tiles * SLOT` on each axis.
   */
  readonly pool: Uint8Array;

  /** `[slotX, slotY, slotZ, allocated]` per brick of the grid, four bytes apiece. */
  readonly indirection: Uint8Array;

  /** Slots not currently in use, handed out before any further allocation. */
  private free: number[] = [];

  /** Tiles touched since the last {@link takeDirty}, for a partial upload. */
  private dirty = new Set<number>();

  /**
   * Whether anything has been written since the GPU was last told.
   *
   * **A boolean rather than `dirty.size > 0`, because `takeDirty` empties the set** and the
   * two answer different questions: "which bricks changed, for a partial upload" and "is the
   * texture stale at all, for a full one". Deriving the second from the first would stop
   * uploading the moment anybody asked what had changed.
   */
  private sinceSync = true;

  /** Bricks this field can hold along one edge, so `tiles ** 3` in all. */
  readonly tiles: number;

  /** Voxels per world unit, and where voxel `(0,0,0)` sits. */
  readonly voxelSize: number;
  readonly origin: readonly [number, number, number];

  /**
   * The world-space box, in **world units**.
   *
   * **And this is now the unit the constructor takes too**, which is the fix for the bug that
   * made the whole feature invisible. The third argument used to be voxels per axis while
   * every caller had world units in hand — `modelBounds` returns world units — so a field for
   * a twelve-unit model was built twelve *voxels* across, which at a fiftieth of a unit a
   * voxel is six tenths of a unit. Every dab was written correctly and every dab landed outside
   * the box the shader samples, so the brush recorded, rasterised and uploaded a painting that
   * was never on screen.
   *
   * World units in and world units out, with the conversion to voxels here and nowhere else.
   */
  readonly extent: readonly [number, number, number];

  /**
   * The box in voxels per axis.
   *
   * **Derived once and rounded up**, because the shader normalises by `extent` and the field
   * indexes by voxel, so the two must agree to within a voxel — and rounding *up* is the
   * direction that errs towards covering the model rather than clipping it.
   */
  readonly voxels: readonly [number, number, number];

  private constructor(
    tiles: number,
    voxelSize: number,
    origin: readonly [number, number, number],
    extent: readonly [number, number, number],
    pool: Uint8Array,
    indirection: Uint8Array,
    free: number[],
  ) {
    this.tiles = tiles;
    this.voxelSize = voxelSize;
    this.origin = origin;
    this.extent = extent;
    this.voxels = [
      Math.max(1, Math.ceil(extent[0] / voxelSize)),
      Math.max(1, Math.ceil(extent[1] / voxelSize)),
      Math.max(1, Math.ceil(extent[2] / voxelSize)),
    ];
    this.pool = pool;
    this.indirection = indirection;
    this.free = free;
  }

  /** The pool texture's edge in texels, which is what the shader normalises slot positions by. */
  get poolDim(): number {
    return this.tiles * SLOT;
  }

  /**
   * How many bricks a side the volume spans, per axis.
   *
   * **Which is not `GRID_RES`, and the difference is the whole of the shader's address
   * arithmetic.** `GRID_RES` is how many cells the indirection *texture* has, which is the most
   * the grid can address — it is sized for the largest box `over` will accept. How many bricks
   * this particular volume spans is its extent divided by a brick, and for a twelve-unit box at
   * a fiftieth of a unit it is thirty, not sixty-four.
   *
   * The shader conflated the two and read brick 32 where the CPU had written brick 15, so every
   * lookup found an unallocated cell and every surface came back unpainted — while the brush
   * recorded, rasterised and uploaded a painting that was there the whole time.
   */
  get bricksPerAxis(): readonly [number, number, number] {
    return [
      this.extent[0] / (BRICK * this.voxelSize),
      this.extent[1] / (BRICK * this.voxelSize),
      this.extent[2] / (BRICK * this.voxelSize),
    ];
  }

  /**
   * The pool as a 3D texture, wrapping the same bytes this field writes.
   *
   * **Built once and handed out, rather than rebuilt on each access.** rmsl uploads the whole
   * image on `needsUpdate`, so a fresh `DataTexture` per frame would re-allocate a 16 MB GL
   * texture sixty times a second.
   */
  poolTexture: DataTexture | undefined;

  /** The indirection as a 3D texture, at one texel per brick. */
  gridTexture: DataTexture | undefined;

  /**
   * Builds the two textures if they are not built.
   *
   * **Linear filtering on both, and clamped on all three axes of each.** The pool needs linear
   * because that is the antialiasing; it needs clamped because a slot's border cells already
   * hold copies of the edge voxels and a wrap would drag the far side of the atlas into them.
   * The indirection is filtered too but is only ever read at a cell centre, where filtering
   * returns the cell — see the note in `sampleField`.
   */
  ensureTextures = (): void => {
    if (this.poolTexture !== undefined) return;
    const edge = this.poolDim;
    const pool = new DataTexture(
      this.pool,
      edge,
      edge,
      edge,
      RGBAFormat,
      UnsignedByteType,
    );
    pool.wrapS = ClampToEdgeWrapping;
    pool.wrapT = ClampToEdgeWrapping;
    pool.wrapR = ClampToEdgeWrapping;
    pool.magFilter = LinearFilter;
    pool.minFilter = LinearFilter;
    pool.needsUpdate = true;

    const grid = new DataTexture(
      this.indirection,
      GRID_RES,
      GRID_RES,
      GRID_RES,
      RGBAFormat,
      UnsignedByteType,
    );
    grid.wrapS = ClampToEdgeWrapping;
    grid.wrapT = ClampToEdgeWrapping;
    grid.wrapR = ClampToEdgeWrapping;
    grid.magFilter = LinearFilter;
    grid.minFilter = LinearFilter;
    grid.needsUpdate = true;

    this.poolTexture = pool;
    this.gridTexture = grid;
  };

  /**
   * An empty field over a world-space box, **`size` in world units.**
   *
   * **The pool is allocated whole, because the GPU texture will be too**, and a field that
   * grew its storage under a live `DataTexture` is a repack. That makes `tiles` a decision
   * about the model rather than a constant: it is the number of bricks the painted area needs,
   * which is surface area over brick face area, and 16 is right for a figure a few units
   * across at 0.02 units a voxel.
   *
   * **The box is checked against the indirection grid rather than the pool**, because the pool
   * running out degrades to a lost millimetre at the edge while the grid running out would
   * silently alias every brick past the edge onto the ones at the start — paint appearing on
   * the wrong side of the model. That is worth failing on at construction.
   */
  static over(
    voxelSize: number,
    origin: readonly [number, number, number],
    /** The box, in **world units** — not voxels. See {@link PaintField.extent}. */
    size: readonly [number, number, number],
    tiles: number = TILES,
  ): PaintField {
    // **A slot's coordinates go in one byte each**, so a pool wider than 256 could not be
    // named by the indirection entry that points at it.
    if (tiles < 1 || tiles > 256) {
      throw new RangeError(`a field holds 1 to 256 slots a side, not ${tiles}`);
    }
    // **The check is in voxels, because the grid is counted in voxels.** It used to compare
    // the voxel count against a world-unit reach, which is a comparison of two different things
    // and so could not fail for the right reason — the same unit confusion as above, one call
    // earlier.
    const reach = GRID_RES * BRICK;
    for (let axis = 0; axis < 3; axis++) {
      const needed = Math.ceil(size[axis] / voxelSize);
      if (needed > reach) {
        throw new RangeError(
          `a field's box is ${size[axis]} units on axis ${axis}, which is ${needed} voxels, and its grid holds ${reach}`,
        );
      }
    }
    return new PaintField(
      tiles,
      voxelSize,
      origin,
      size,
      new Uint8Array(tiles ** 3 * SLOT_VOXELS * 4),
      new Uint8Array(GRID_RES ** 3 * 4),
      Array.from({ length: tiles ** 3 }, (_, at) => at).reverse(),
    );
  }

  /** How many bricks are allocated, which is what the pool is actually costing. */
  get brickCount(): number {
    return this.tiles ** 3 - this.free.length;
  }

  /** The world point at a voxel's centre. */
  worldAt(x: number, y: number, z: number): [number, number, number] {
    return [
      this.origin[0] + (x + 0.5) * this.voxelSize,
      this.origin[1] + (y + 0.5) * this.voxelSize,
      this.origin[2] + (z + 0.5) * this.voxelSize,
    ];
  }

  /** The voxel a world point falls in, which may be outside the field. */
  voxelAt(wx: number, wy: number, wz: number): [number, number, number] {
    return [
      Math.floor((wx - this.origin[0]) / this.voxelSize),
      Math.floor((wy - this.origin[1]) / this.voxelSize),
      Math.floor((wz - this.origin[2]) / this.voxelSize),
    ];
  }

  /** The slot a grid brick points at, or `undefined` when it has none. */
  private slotOf(bx: number, by: number, bz: number): number | undefined {
    if (
      bx < 0 ||
      by < 0 ||
      bz < 0 ||
      bx >= GRID_RES ||
      by >= GRID_RES ||
      bz >= GRID_RES
    ) {
      return undefined;
    }
    const at = ((bz * GRID_RES + by) * GRID_RES + bx) * 4;
    if (this.indirection[at + 3] === 0) return undefined;
    return (
      this.indirection[at]! +
      this.indirection[at + 1]! * this.tiles +
      this.indirection[at + 2]! * this.tiles * this.tiles
    );
  }

  /**
   * Gives a grid brick a slot if it has none, and says whether it has one afterwards.
   *
   * **False means the pool is full**, which is a real limit rather than an error: the caller
   * drops the write, and a stroke near the edge of a very large model loses its outermost
   * millimetre rather than failing.
   */
  private ensureBrick(bx: number, by: number, bz: number): boolean {
    if (
      bx < 0 ||
      by < 0 ||
      bz < 0 ||
      bx >= GRID_RES ||
      by >= GRID_RES ||
      bz >= GRID_RES
    ) {
      return false;
    }
    const at = ((bz * GRID_RES + by) * GRID_RES + bx) * 4;
    if (this.indirection[at + 3] !== 0) return true;
    const slot = this.free.pop();
    if (slot === undefined) return false;
    this.indirection[at] = slot % this.tiles;
    this.indirection[at + 1] = Math.floor(slot / this.tiles) % this.tiles;
    this.indirection[at + 2] = Math.floor(slot / (this.tiles * this.tiles));
    this.indirection[at + 3] = 255;
    return true;
  }

  /** Where a slot's texel `(lx, ly, lz)` sits in {@link pool}. */
  private offsetOf(slot: number, lx: number, ly: number, lz: number): number {
    const x = (slot % this.tiles) * SLOT + lx;
    const y = (Math.floor(slot / this.tiles) % this.tiles) * SLOT + ly;
    const z = Math.floor(slot / (this.tiles * this.tiles)) * SLOT + lz;
    const edge = this.tiles * SLOT;
    return ((z * edge + y) * edge + x) * 4;
  }

  /**
   * Writes one voxel, and its gutters.
   *
   * **Returns whether anything actually changed**, which is what makes Tier-0 culling
   * possible: a repaint of the same colour over the same spot produces identical bytes, and
   * the caller marks that dab dead rather than keeping it forever. See the plan's
   * "Culling dead dabs".
   */
  set(x: number, y: number, z: number, colour: Texel): boolean {
    const bx = Math.floor(x / BRICK);
    const by = Math.floor(y / BRICK);
    const bz = Math.floor(z / BRICK);
    if (!this.ensureBrick(bx, by, bz)) return false;
    const slot = this.slotOf(bx, by, bz)!;
    const i = x - bx * BRICK;
    const j = y - by * BRICK;
    const k = z - bz * BRICK;
    const r = clampByte(colour.r);
    const g = clampByte(colour.g);
    const b = clampByte(colour.b);
    const a = clampByte(colour.a);
    let changed = false;
    for (const lx of BORDER[i]) {
      for (const ly of BORDER[j]) {
        for (const lz of BORDER[k]) {
          const at = this.offsetOf(slot, lx, ly, lz);
          if (
            this.pool[at] === r &&
            this.pool[at + 1] === g &&
            this.pool[at + 2] === b &&
            this.pool[at + 3] === a
          ) {
            continue;
          }
          this.pool[at] = r;
          this.pool[at + 1] = g;
          this.pool[at + 2] = b;
          this.pool[at + 3] = a;
          changed = true;
          this.sinceSync = true;
        }
      }
    }
    if (changed) this.dirty.add(slot);
    return changed;
  }

  /** Reads one voxel. An unallocated brick reads as clear. */
  get(x: number, y: number, z: number): Texel {
    const bx = Math.floor(x / BRICK);
    const by = Math.floor(y / BRICK);
    const bz = Math.floor(z / BRICK);
    const slot = this.slotOf(bx, by, bz);
    if (slot === undefined) return { r: 0, g: 0, b: 0, a: 0 };
    const at = this.offsetOf(
      slot,
      x - bx * BRICK + 1,
      y - by * BRICK + 1,
      z - bz * BRICK + 1,
    );
    return {
      r: this.pool[at]!,
      g: this.pool[at + 1]!,
      b: this.pool[at + 2]!,
      a: this.pool[at + 3]!,
    };
  }

  /** Clears every voxel in a region, releasing bricks that are left empty. */
  clearRegion(region: Region): void {
    for (let z = region.z0; z <= region.z1; z++) {
      for (let y = region.y0; y <= region.y1; y++) {
        for (let x = region.x0; x <= region.x1; x++) {
          const bx = Math.floor(x / BRICK);
          const by = Math.floor(y / BRICK);
          const bz = Math.floor(z / BRICK);
          const slot = this.slotOf(bx, by, bz);
          if (slot === undefined) continue;
          const at = this.offsetOf(
            slot,
            x - bx * BRICK + 1,
            y - by * BRICK + 1,
            z - bz * BRICK + 1,
          );
          if (this.pool[at + 3] === 0) continue;
          this.pool[at] = 0;
          this.pool[at + 1] = 0;
          this.pool[at + 2] = 0;
          this.pool[at + 3] = 0;
          this.dirty.add(slot);
          this.sinceSync = true;
        }
      }
    }
  }

  /** Clears everything and releases every brick, as "Clear texture" does. */
  clearAll(): void {
    this.pool.fill(0);
    this.indirection.fill(0);
    this.free = Array.from(
      { length: this.tiles ** 3 },
      (_, at) => at,
    ).reverse();
    this.dirty.clear();
    this.sinceSync = true;
  }

  /** The slots touched since the last call, and forgets them. */
  takeDirty(): number[] {
    const taken = [...this.dirty];
    this.dirty.clear();
    return taken;
  }

  /** Whether anything has been written since {@link markSynced}. */
  get dirtySinceSync(): boolean {
    return this.sinceSync;
  }

  /** Says the GPU now holds everything written so far. */
  markSynced = (): void => {
    this.sinceSync = false;
  };

  /** Records that something was written, which is what {@link dirtySinceSync} reports. */
  markChanged = (): void => {
    this.sinceSync = true;
  };
}
