// The block window: keeps a fixed-size ball of `WorldBlock`s — one per
// chunk cell within `radius` chunks of the player's cell, `yRadius` chunks
// above and below it — centred on the player in every axis. When the player
// crosses a chunk boundary, cells that leave the ball are evicted and cells
// that enter claim their slot (same slot, new data) rather than allocating
// fresh ones. Owns the `FillClient` that generates each cell's terrain,
// offline when the worker is available.
import {
  BLOCK_WORLD,
  CHUNK_VOXELS,
  VOXEL_SIZE,
  buildBlockShell,
  chunkCellOf,
  type BlockQuery,
  type Dim3,
  type WorldBlock,
} from "./level-data";
import { FillClient } from "./fill-client";
import type { EditLayer } from "./edit-layer";
import type { TerrainConfig } from "./noise";
import {
  VOXEL_PADDING,
  type BorderSizes,
  type FillStoreFn,
} from "./voxel-store";
import { expandShape, type StructurePlan } from "./structure-fill";
import type { VoxelTileConfig } from "../renderers/atlas";
import type { BlockMeshes } from "../renderers/mesh";
import type { WorldWorkerPool } from "./worker-pool";
import { Counter, Phase, probe } from "../render/perf-probe";
import { CoordinateMap } from "./coordinate-map";

export interface CellCoord {
  x: number;
  y: number;
  z: number;
}

export const cellKey = (c: CellCoord): string => `${c.x},${c.y},${c.z}`;

/**
 * Every integer lattice cell within `radius` squared of `center` — the set
 * of chunks the window holds. The Y extent is `yRadius` (default `radius`,
 * a regular ball), so the window can be flattened vertically — a squashed
 * ball — when there is nothing worth streaming far above and below the
 * player. Ordered in `x`, then `y`, then `z`.
 */
export const sphereCells = (
  center: CellCoord,
  radius: number,
  yRadius = radius,
): CellCoord[] => {
  const out: CellCoord[] = [];
  for (let x = -radius; x <= radius; x++) {
    for (let y = -yRadius; y <= yRadius; y++) {
      for (let z = -radius; z <= radius; z++) {
        const cell = { x: center.x + x, y: center.y + y, z: center.z + z };
        if (cellInSphere(cell, center, radius, yRadius)) {
          out.push(cell);
        }
      }
    }
  }
  return out;
};

/**
 * Whether a cell lies inside a window of these radii centred on `center`: the
 * same squashed-ball test `sphereCells` builds a window from, asked of one
 * cell rather than swept over a cube of them.
 */
export const cellInSphere = (
  cell: CellCoord,
  center: CellCoord,
  radius: number,
  yRadius = radius,
): boolean => {
  const dx = cell.x - center.x;
  const dy = cell.y - center.y;
  const dz = cell.z - center.z;
  const ky = radius / yRadius;
  return dx * dx + dz * dz + (dy * ky) ** 2 <= radius * radius;
};

/** How many cells a window of these `radius` and `yRadius` values holds. */
export const cellsInSphere = (radius: number, yRadius = radius): number =>
  sphereCells({ x: 0, y: 0, z: 0 }, radius, yRadius).length;

/**
 * The chunk cell whose interior holds a LOD-0 world voxel. Mirrors
 * `chunkCellOf`: a block's interior covers world voxels
 * `[cell*CHUNK_VOXELS/2, cell*CHUNK_VOXELS/2 + CHUNK_VOXELS)`, so the voxel
 * grid is the world grid shifted by half a chunk.
 */
const cellTouchingVoxel = (voxel: number): number =>
  Math.floor((voxel + CHUNK_VOXELS / 2) / CHUNK_VOXELS);

/**
 * The chunk cells a plan's shapes stamp voxels into, grown by the broadest
 * border a window block is meshed with. When a plan changes, these are the
 * cells whose terrain has to be generated again: the cells of the replaced
 * plan joined with those of the one that follows, so a shape that was cleared
 * comes off the ground it sat on and a shape that was added goes down on it.
 */
export const cellsTouchedByPlan = (
  plan: StructurePlan | undefined,
): CellCoord[] => {
  const margin = VOXEL_PADDING << 2;
  const seen = new Set<string>();
  const cells: CellCoord[] = [];
  for (const shape of plan ?? []) {
    for (const part of expandShape(shape)) {
      const lo = cellTouchingVoxel(part.min[0] - margin);
      const hi = cellTouchingVoxel(part.max[0] + margin);
      const loY = cellTouchingVoxel(part.min[1] - margin);
      const hiY = cellTouchingVoxel(part.max[1] + margin);
      const loZ = cellTouchingVoxel(part.min[2] - margin);
      const hiZ = cellTouchingVoxel(part.max[2] + margin);
      for (let x = lo; x <= hi; x++) {
        for (let y = loY; y <= hiY; y++) {
          for (let z = loZ; z <= hiZ; z++) {
            const key = `${x},${y},${z}`;
            if (!seen.has(key)) {
              seen.add(key);
              cells.push({ x, y, z });
            }
          }
        }
      }
    }
  }
  return cells;
};

/** Whether two plans stamp the same voxels, whatever order their shapes keep. */
const plansEqual = (
  a: StructurePlan | undefined,
  b: StructurePlan | undefined,
): boolean => {
  if (a === b) {
    return true;
  }
  if (a === undefined || b === undefined) {
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
};

/**
 * How far, in chunks, each level of detail reaches. A cell within `full`
 * chunks of the player's is generated at full resolution; one within `coarse`
 * is a level coarser; anything past that is coarsest.
 */
export interface LodBands {
  full: number;
  coarse: number;
}

/**
 * The distances the world uses unless something asks for others: full
 * resolution out past the fog's start, so everything the player can clearly
 * see, and one level coarser through the shell the fog hides heavily.
 */
export const DEFAULT_LOD_BANDS: LodBands = { full: 3, coarse: 4 };

/**
 * Bands that reach everywhere, so every block of the window is generated at
 * full resolution however far away it is. What "no levels of detail" means:
 * the coarse shells cost nothing to look at, and everything the window holds
 * is worth eight times what its coarser tiers would be.
 */
export const LOD_OFF: LodBands = {
  full: Number.POSITIVE_INFINITY,
  coarse: Number.POSITIVE_INFINITY,
};

/** Whether these bands leave every block of the window at full resolution. */
export const lodIsOff = (bands: LodBands): boolean =>
  !Number.isFinite(bands.full);

/**
 * The level of detail a cell is generated at, from its euclidean distance in
 * chunks from the player's cell. Each level doubles the voxel size, so a
 * block's voxel count drops by eight per level.
 */
export const lodAt = (
  cell: CellCoord,
  center: CellCoord,
  bands: LodBands = DEFAULT_LOD_BANDS,
): number => {
  const dx = cell.x - center.x;
  const dy = cell.y - center.y;
  const dz = cell.z - center.z;
  const distanceSquared = dx * dx + dy * dy + dz * dz;
  if (distanceSquared <= bands.full * bands.full) {
    return 0;
  }
  if (distanceSquared <= bands.coarse * bands.coarse) {
    return 1;
  }
  return 2;
};

/**
 * The voxel size of each of a cell's six neighbours, as its seam faces cull
 * against them. A neighbour built at a different level of detail has a
 * different voxel size, which the border of the block the sphere fills uses
 * to keep the shared boundary hole-free; the exact size is `VOXEL_SIZE`
 * doubled per level of detail.
 */
export const borderSizesOf = (
  cell: CellCoord,
  center: CellCoord,
  bands: LodBands = DEFAULT_LOD_BANDS,
): BorderSizes => {
  const at = (dx: number, dy: number, dz: number): number =>
    VOXEL_SIZE *
    (1 <<
      lodAt({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz }, center, bands));
  return {
    px: at(1, 0, 0),
    nx: at(-1, 0, 0),
    py: at(0, 1, 0),
    ny: at(0, -1, 0),
    pz: at(0, 0, 1),
    nz: at(0, 0, -1),
  };
};

export interface ChunkSphereParams {
  /** Chunk radius of the window in X and Z. */
  radius: number;
  /**
   * Chunk radius of the window in Y, defaulting to `radius` (a regular
   * ball). Smaller than `radius` flattens the window vertically, bounding
   * the pool to the terrain around the player instead of a full ball of
   * stone above and below it.
   */
  yRadius?: number;
  terrain: TerrainConfig;
  /**
   * Called whenever a slot's voxel data is ready to be reflected on screen —
   * during the initial fill, or when a scroll-revealed cell's fill lands. When
   * the block was meshed by the same worker job its fill ran in, the geometry
   * arrives with the voxels and the caller can adopt it directly.
   */
  onBlockChanged: (index: number, meshes?: BlockMeshes) => void;
  /**
   * Called when a slot takes a different world position (scroll), before its
   * new data has arrived.
   */
  onBlockReposition: (index: number, center: Dim3) => void;
  /**
   * Called just before a slot's current voxel data is discarded: an evicted
   * cell, or one refilled in place at a new level of detail. The slot still
   * answers for its old cell here, so the caller can snapshot anything worth
   * keeping (resting fluid) into the edit overlay before it is gone.
   */
  onBlockRelease?: (index: number) => void;
  customFillStore?: FillStoreFn;
  customFillStoreUrl?: string;
  /** Structures every block is stamped with, over its generated terrain. */
  structures?: StructurePlan;
  /** Applied to each block after its terrain is generated (see `FillClient`). */
  editLayer?: EditLayer;
  /**
   * The current atlas tile rectangles, read anew for each fill batch. When it
   * is supplied, the fill client's workers mesh each block right after
   * filling it, and the block's geometry arrives with its voxels.
   */
  tileRects?: () => VoxelTileConfig[];
  /**
   * The world's shared worker pool, used by the mesh client too. A caller
   * that hands over a pool pools one set of workers for both jobs; a caller
   * that hands over nothing gets a private pool of `hardwareConcurrency`-1
   * combined workers (or the main-thread fallback).
   */
  pool?: WorldWorkerPool;
  /**
   * Supplies the workers of the pool built when `pool` is omitted. A caller
   * that hands over one worker (or nothing) gets a single worker (or the
   * main-thread fallback) instead.
   */
  createWorker?: () => Worker | undefined;
}

/**
 * Requests a window's chunk data from a `FillClient` — every cell at
 * startup through `fillFrom`, then the cells each scroll reveals — and
 * keeps the ball (flattened to `yRadius` in Y) centred on the player.
 * `blocks` stays the same array reference across scrolling, so anything
 * holding onto it (e.g. `RendererSwitch`) sees updates in place.
 */
export class ChunkSphere {
  readonly blocks: WorldBlock[];
  radius: number;
  yRadius: number;
  /** How far each level of detail reaches, which `/world:lod` can move. */
  bands: LodBands = DEFAULT_LOD_BANDS;
  /**
   * Resolves a world point to the block whose cell contains it. Backs the
   * terrain queries (height, collision), which must stay O(1) per call.
   */
  readonly query: BlockQuery;

  private readonly cells: CellCoord[] = [];
  private cellIndex: CoordinateMap<number>;
  /**
   * Whether each slot's voxels are the terrain of the cell it currently
   * stands for. False from the moment a scroll points the slot at an entering
   * cell until that cell's fill lands, which is the window in which the slot
   * still physically holds the cell it left behind.
   */
  private readonly filled: boolean[] = [];
  private readonly free: number[] = [];
  private readonly onBlockReposition: (index: number, center: Dim3) => void;
  private readonly onBlockRelease?: (index: number) => void;
  private readonly fillClient: FillClient;
  /** The plan every block is being stamped with; `setStructures` replaces it. */
  private structures: StructurePlan | undefined;

  private centerCell: CellCoord = { x: 0, y: 0, z: 0 };

  constructor(params: ChunkSphereParams) {
    this.radius = params.radius;
    this.yRadius = params.yRadius ?? params.radius;
    this.onBlockReposition = params.onBlockReposition;
    this.onBlockRelease = params.onBlockRelease;

    const initial = sphereCells(
      { x: 0, y: 0, z: 0 },
      this.radius,
      this.yRadius,
    );
    // Room for the whole pool without a rehash: the window holds a fixed
    // number of cells, and every scroll removes and adds the same count.
    this.cellIndex = new CoordinateMap<number>(initial.length * 2);
    this.blocks = initial.map((cell) => {
      const center: Dim3 = [
        cell.x * BLOCK_WORLD[0],
        cell.y * BLOCK_WORLD[1],
        cell.z * BLOCK_WORLD[2],
      ];
      this.cells.push({ x: cell.x, y: cell.y, z: cell.z });
      this.filled.push(false);
      // A shell's empty store is sized to the LOD its first cell gets, so the
      // initial allocation is no larger than the fills that follow; a slot
      // later filled at a different LOD resizes in place.
      return buildBlockShell({
        center,
        lod: lodAt(cell, { x: 0, y: 0, z: 0 }, this.bands),
      });
    });

    this.query = (worldX, worldY, worldZ) => {
      const slot = this.slotAt(worldX, worldY, worldZ);
      return slot === undefined ? undefined : this.blocks[slot];
    };

    this.fillClient = new FillClient({
      terrain: params.terrain,
      blocks: this.blocks,
      onBlockChanged: (index, meshes) => {
        this.filled[index] = true;
        // A block lights itself from its own store alone, so a block's
        // near-seam columns only agree with a neighbour's copies if that
        // neighbour's light already reached them. The world's light engine
        // raises the shared seam columns and reports the raises to the
        // renderer outside this callback.
        params.onBlockChanged(index, meshes);
      },
      editLayer: params.editLayer,
      customFillStore: params.customFillStore,
      customFillStoreUrl: params.customFillStoreUrl,
      structures: params.structures,
      tileRects: params.tileRects,
      pool: params.pool,
      createWorker: params.createWorker,
    });
  }

  /**
   * Replaces the shapes every block is stamped with and regenerates the
   * window's cells that either this plan or the one it replaced reaches: the
   * cells whose ground a cleared shape sat on have to come back, and the cells
   * a new shape lands in have to get it. Each such slot keeps the cell it
   * stands for (as a scroll's level-of-detail refill does), so nothing outside
   * them is disturbed and the player stays where they are.
   *
   * @returns Whether the plan actually changed; a no-op plan leaves the world
   * exactly as it was.
   */
  setStructures(next: StructurePlan | undefined): boolean {
    if (plansEqual(next, this.structures)) {
      return false;
    }
    const prev = this.structures;
    this.structures = next;
    this.fillClient.setStructures(next);
    const touched = new Set<number>();
    for (const cell of [
      ...cellsTouchedByPlan(prev),
      ...cellsTouchedByPlan(next),
    ]) {
      const slot = this.cellIndex.get(cell.x, cell.y, cell.z);
      if (slot !== undefined) {
        touched.add(slot);
      }
    }
    if (touched.size === 0) {
      return true;
    }
    const focus: Dim3 = [
      this.centerCell.x * BLOCK_WORLD[0],
      this.centerCell.y * BLOCK_WORLD[1],
      this.centerCell.z * BLOCK_WORLD[2],
    ];
    const order = [...touched].sort(
      (a, b) =>
        this.distanceSquared(a, focus[0], focus[1], focus[2]) -
        this.distanceSquared(b, focus[0], focus[1], focus[2]),
    );
    for (const slot of order) {
      // A refill regenerates the slot's voxels (its resting fluid snapshotted
      // first); its cell and its `filled` flag stand, so queries and physics
      // keep answering until the new terrain lands.
      this.onBlockRelease?.(slot);
      this.blocks[slot].targetLod = lodAt(
        this.cells[slot],
        this.centerCell,
        this.bands,
      );
    }
    this.fillClient.requestFill(
      order,
      order.map((index) => this.blocks[index].center),
      order.map((index) =>
        lodAt(this.cells[index], this.centerCell, this.bands),
      ),
      order.map((index) =>
        borderSizesOf(this.cells[index], this.centerCell, this.bands),
      ),
      focus,
    );
    return true;
  }

  /**
   * The slot holding the cell that contains a world point, or `undefined`
   * when the window does not hold that cell, or holds it in a slot whose
   * terrain has not arrived. Backs `query` and the caller's "is this cell's
   * data ready" check, so a query about a cell being streamed is answered the
   * same way as one about a cell outside the window: nothing is there.
   */
  slotAt(worldX: number, worldY: number, worldZ: number): number | undefined {
    const [cx, cy, cz] = chunkCellOf(worldX, worldY, worldZ);
    const slot = this.cellIndex.get(cx, cy, cz);
    return slot === undefined || !this.filled[slot] ? undefined : slot;
  }

  /**
   * Whether a slot's voxels are the terrain of the cell it currently stands
   * for, for a caller walking the block array by index rather than asking
   * about a world point.
   */
  hasTerrain(slot: number): boolean {
    return this.filled[slot];
  }

  /** Slots waiting for terrain data, on a worker batch or on the main thread. */
  get fillPendingCount(): number {
    return this.fillClient.pendingCount;
  }

  /** Slots a worker is generating terrain data for right now. */
  get fillInFlightCount(): number {
    return this.fillClient.inFlightCount;
  }

  /**
   * Requests terrain for every cell of the window, nearest (`x`, `y`, `z`)
   * first, so the ball fills outward from under the player's feet. Results
   * land one block at a time through `onBlockChanged`.
   *
   * @returns The slot containing (`x`, `y`, `z`) — the one asked for first.
   */
  /**
   * Rebuilds the window at a different size, or at different level-of-detail
   * distances, around the cell it is already centred on. The pool grows or
   * shrinks to the new cell count and every slot is filled again, because a
   * cell that keeps its slot may still want different voxels: a wider window
   * moves the level-of-detail shells outward under cells that were already
   * held, and moving the shells directly does the same.
   *
   * `blocks` keeps its identity across this, which everything holding it
   * depends on, so the array is truncated or extended in place rather than
   * replaced. What draws the blocks is told the new size separately, before
   * this runs: a slot it still counted among a superchunk's members would keep
   * that superchunk waiting for a block the window no longer has.
   *
   * @param radius Chunk radius in X and Z.
   * @param yRadius Chunk radius in Y.
   * @param bands How far each level of detail reaches.
   * @returns The slot the window's centre now falls in.
   */
  reshape(radius: number, yRadius: number, bands: LodBands): number {
    const wanted = cellsInSphere(radius, yRadius);
    const before = this.blocks.length;
    // Every slot is about to stand for a different cell, or for none, so each
    // gives up the moving fluid it holds before its voxels go.
    for (let slot = 0; slot < before; slot++) {
      this.onBlockRelease?.(slot);
    }
    this.radius = radius;
    this.yRadius = yRadius;
    this.bands = bands;
    this.blocks.length = wanted;
    this.cells.length = wanted;
    this.filled.length = wanted;
    for (let slot = before; slot < wanted; slot++) {
      const cell = { x: 0, y: 0, z: 0 };
      this.blocks[slot] = buildBlockShell({
        center: [0, 0, 0],
        lod: lodAt(cell, cell, this.bands),
      });
      this.cells[slot] = cell;
      this.filled[slot] = false;
    }
    // Nothing keeps its cell, so the index and the free list start again
    // rather than being mended entry by entry.
    this.cellIndex = new CoordinateMap<number>(wanted * 2);
    this.free.length = 0;
    this.fillClient.resizeTo(wanted);
    const at = this.centerCell;
    return this.fillFrom(
      at.x * BLOCK_WORLD[0],
      at.y * BLOCK_WORLD[1],
      at.z * BLOCK_WORLD[2],
    );
  }

  fillFrom(x: number, y: number, z: number): number {
    const center = chunkCellOf(x, y, z);
    this.centerCell = { x: center[0], y: center[1], z: center[2] };
    const cells = sphereCells(this.centerCell, this.radius, this.yRadius);
    for (let i = 0; i < this.blocks.length; i++) {
      this.cells[i] = cells[i];
      this.cellIndex.set(cells[i].x, cells[i].y, cells[i].z, i);
      const c: Dim3 = [
        cells[i].x * BLOCK_WORLD[0],
        cells[i].y * BLOCK_WORLD[1],
        cells[i].z * BLOCK_WORLD[2],
      ];
      this.blocks[i].center = c;
      this.filled[i] = false;
      this.onBlockReposition(i, c);
    }

    const order = this.blocks.map((_, index) => index);
    order.sort(
      (a, b) =>
        this.distanceSquared(a, x, y, z) - this.distanceSquared(b, x, y, z),
    );
    const [nearest, ...rest] = order;
    // The nearest block is generated here, on the calling thread, and only the
    // rest are handed to the worker. Nothing can be drawn and the player
    // cannot be let in until this one block exists, and waiting for a worker
    // to start costs several times more than the block does.
    const nearestLod = lodAt(this.cells[nearest], this.centerCell, this.bands);
    this.blocks[nearest].targetLod = nearestLod;
    this.fillClient.fillNow(
      nearest,
      nearestLod,
      borderSizesOf(this.cells[nearest], this.centerCell, this.bands),
    );
    for (const index of rest) {
      this.blocks[index].targetLod = lodAt(
        this.cells[index],
        this.centerCell,
        this.bands,
      );
    }
    this.fillClient.requestFill(
      rest,
      rest.map((index) => this.blocks[index].center),
      rest.map((index) =>
        lodAt(this.cells[index], this.centerCell, this.bands),
      ),
      rest.map((index) =>
        borderSizesOf(this.cells[index], this.centerCell, this.bands),
      ),
      [x, y, z],
    );
    return nearest;
  }

  private distanceSquared(
    index: number,
    x: number,
    y: number,
    z: number,
  ): number {
    const [bx, by, bz] = this.blocks[index].center;
    return (bx - x) ** 2 + (by - y) ** 2 + (bz - z) ** 2;
  }

  /** The level of detail the slot's store is currently holding. */
  private lodOf(slot: number): number {
    return Math.round(Math.log2(this.blocks[slot].store.scale / VOXEL_SIZE));
  }

  /**
   * Keeps the window centred on the player: when they cross a chunk boundary,
   * the cells that leave the ball are evicted and the cells that enter claim
   * the freed slots. Every entering cell streams in through the worker pool;
   * the player's own cell is requested first, and the caller holds physics
   * until its fill lands.
   */
  scrollTo(x: number, y: number, z: number): void {
    const [cx, cy, cz] = chunkCellOf(x, y, z);
    if (
      cx === this.centerCell.x &&
      cy === this.centerCell.y &&
      cz === this.centerCell.z
    ) {
      return;
    }
    const center = { x: cx, y: cy, z: cz };
    probe.begin(Phase.scrollCells);
    const next = sphereCells(center, this.radius, this.yRadius);
    probe.end(Phase.scrollCells);

    // A cell that stays in the ball keeps its slot, but the level of detail
    // it was generated at was chosen for the old distance; one whose ring
    // changed is refilled in place at the new LOD, so a cell the player
    // walks toward sheds its coarse voxels before they come into view.
    const refill: number[] = [];
    probe.begin(Phase.scrollEvict);
    // Walked by slot rather than over the index, because removing an entry
    // from the index rearranges the entries after it to close the gap its
    // probe run left, which a walk over the index would then read as its own.
    for (let slot = 0; slot < this.blocks.length; slot++) {
      const cell = this.cells[slot];
      if (this.cellIndex.get(cell.x, cell.y, cell.z) !== slot) {
        continue; // freed by an earlier move and not yet claimed
      }
      if (!cellInSphere(cell, center, this.radius, this.yRadius)) {
        this.onBlockRelease?.(slot);
        this.cellIndex.delete(cell.x, cell.y, cell.z);
        this.free.push(slot);
        continue;
      }
      const desiredLod = lodAt(cell, center, this.bands);
      if (
        desiredLod !== this.lodOf(slot) &&
        desiredLod !== this.blocks[slot].targetLod
      ) {
        this.onBlockRelease?.(slot);
        refill.push(slot);
        this.blocks[slot].targetLod = desiredLod;
      }
    }
    probe.end(Phase.scrollEvict);

    const entering: number[] = [];
    probe.begin(Phase.scrollTeleport);
    for (const cell of next) {
      if (this.cellIndex.get(cell.x, cell.y, cell.z) !== undefined) {
        continue;
      }
      const slot = this.free.pop();
      if (slot === undefined) {
        throw new Error("[ChunkSphere] window pool exhausted");
      }
      this.cells[slot] = cell;
      this.cellIndex.set(cell.x, cell.y, cell.z, slot);
      const c: Dim3 = [
        cell.x * BLOCK_WORLD[0],
        cell.y * BLOCK_WORLD[1],
        cell.z * BLOCK_WORLD[2],
      ];
      this.blocks[slot].center = c;
      this.blocks[slot].targetLod = lodAt(cell, center, this.bands);
      // The slot still holds the cell it left behind, and now stands for this
      // one: until the fill lands it answers for neither, and every query
      // about it is turned away rather than the voxels being zeroed to make
      // the wrong answer a harmless one.
      this.filled[slot] = false;
      // reposition both renderers' meshes for this slot; the triangle
      // renderer also clears its geometry there to avoid flashing the old
      // block's surface at the new location
      this.onBlockReposition(slot, c);
      entering.push(slot);
    }
    probe.end(Phase.scrollTeleport);

    this.centerCell = center;

    const toFill = [...entering, ...refill];
    probe.count(Counter.scrolls);
    probe.count(Counter.blocksStreamed, toFill.length);
    if (toFill.length === 0) {
      return;
    }
    // Both the entering shell and the refill get a nearest-first order here
    // (which also decides what the no-worker path fills first), and the
    // player's position as the worker scheduler's focus, so the terrain being
    // walked toward streams before the shoreline that is not being walked.
    probe.begin(Phase.scrollOrder);
    const order = toFill.sort(
      (a, b) =>
        this.distanceSquared(a, x, y, z) - this.distanceSquared(b, x, y, z),
    );
    probe.end(Phase.scrollOrder);
    probe.begin(Phase.scrollRequest);
    this.fillClient.requestFill(
      order,
      order.map((index) => this.blocks[index].center),
      order.map((index) =>
        lodAt(this.cells[index], this.centerCell, this.bands),
      ),
      order.map((index) =>
        borderSizesOf(this.cells[index], this.centerCell, this.bands),
      ),
      [x, y, z],
    );
    probe.end(Phase.scrollRequest);
  }

  dispose(): void {
    this.fillClient.dispose();
  }
}
