// The event-driven fluid simulation: water and lava spread through the loaded
// blocks one cell at a time, paced per kind (water every 0.25 s, lava every
// 1.5 s) like Minecraft's scheduled fluid ticks. A fluid cell only ever runs
// after it has been *woken* — a placed or scooped source, a block edited
// beside it, or a chunk filling in underneath it — so the vast static oceans
// never tick, exactly as Minecraft's "stationary" water never does until a
// block update reaches it.
//
// The rules each woken cell applies, in order:
//  - a cell with open air below falls, becoming the full-height falling id of
//    its kind. A level-0 source that another cell of the same kind supports
//    sideways instead pours a falling cell below itself and stays, which is
//    how an ocean with a dug floor keeps a waterfall running without its
//    surface dropping;
//  - a cell resting directly on the other fluid kind turns that cell to stone
//    (the water/lava mix);
//  - a cell resting on its own kind is part of a body (a falling head landing
//    on the pool it feeds, a column cell) and is inert: it neither spreads
//    sideways nor becomes a source, so water landing on water adds volume to a
//    pool, never new production;
//  - a source — genuine, or a falling head that has just landed on ground —
//    resting on solid spreads sideways one level per cell, choosing the
//    horizontal neighbours with the shortest path to a way down, exactly as
//    Minecraft does;
//  - a flowing cell resting on solid ground forms a new source when two
//    sources flank it, spreads a level further when a lower-level neighbour
//    backs it (out to level 7), and drains when it has neither, so a puddle
//    recedes once its source is scooped.
//
// Cost stays bounded because every voxel is addressed O(1) through the loaded
// window's cell map (never a scan of all blocks), each cell is scheduled at
// most once per interval (a map keyed by voxel coalesces re-wakes), cells
// schedule work only when a fluid *leaves* a cell or a new one arrives — a
// stable neighbour is never re-ticked — and block light is recomputed only for
// blocks whose lava (an emitter) changed, not for water that merely moves.
import { type WorldBlock } from "./level-data";
import {
  blockWorldVoxelRange,
  worldVoxelToLocal,
  type WorldVoxel,
} from "./edit-layer";
import {
  VOXEL_AIR,
  VOXEL_STONE,
  FLUID_MAX_LEVEL,
  isFluidId,
  isLavaId,
  isWaterId,
  fluidLevel,
} from "./voxel-store";
import {
  FALLING_ID,
  SOURCE_ID,
  SPREAD_SECONDS,
  fluidKindOf,
  isKind,
  levelIdOf,
  type FluidKind,
} from "./fluid";
import { fillBlockLight } from "./block-light";

/** Most fluid cells to act on per frame, so a burst of pours cannot stall the mesh. */
const MAX_STEPS_PER_FRAME = 512;

/** How far ahead a horizontal spread looks for a way down when choosing a direction. */
const DROP_SEARCH = 4;

const keyOf = ([x, y, z]: WorldVoxel): string => `${x},${y},${z}`;

const fromKey = (key: string): WorldVoxel => {
  const [x, y, z] = key.split(",");
  return [Number(x), Number(y), Number(z)];
};

/** The six axis neighbours of a world voxel. */
const SIX: WorldVoxel[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

export interface FlowControllerParams {
  /** The loaded block window, indexed as everywhere else in the world. */
  blocks: WorldBlock[];
  /**
   * Resolves a world voxel to its block's slot index in `blocks` in O(1),
   * backed by the chunk window's cell map. Omitted in tests, where a linear
   * scan over the few blocks stands in.
   */
  resolve?: (w: WorldVoxel) => number | undefined;
  /**
   * Called with the slot index of every block a moved fluid voxel belongs to,
   * exactly as player edits are reported, so the renderer rebuilds them.
   */
  onBlocksEdited: (indices: number[]) => void;
}

/**
 * Drives the fluid simulation against the live block window. Plain voxel
 * writes through the stores (never the edit overlay — resting fluid is
 * snapshotted separately), keeping the meshing borders and light channels in
 * step as `EditingController` does.
 */
export class FlowController {
  private readonly blocks: WorldBlock[];
  private readonly resolve?: (w: WorldVoxel) => number | undefined;
  private readonly onBlocksEdited: (indices: number[]) => void;
  /** World-voxel keys whose cells are due, to the second they may act. A key present means scheduled. */
  private readonly due = new Map<string, number>();
  private now = 0;
  /** Blocks holding a fluid write since the last renderer report. */
  private readonly touched = new Set<number>();
  /** Blocks whose lava (an emitter) changed and whose block light is stale. */
  private readonly emissive = new Set<number>();

  constructor(params: FlowControllerParams) {
    this.blocks = params.blocks;
    this.resolve = params.resolve;
    this.onBlocksEdited = params.onBlocksEdited;
  }

  /**
   * Wakes the cells a change at `w` may set moving: the cell itself when it is
   * now fluid, and every fluid cell beside it. Called for player edits, so a
   * placed source starts spreading and a dug block lets the water pour in.
   */
  wakeVoxel(w: WorldVoxel, nowId: number): void {
    if (isFluidId(nowId)) {
      this.schedule(w, fluidKindOf(nowId) as FluidKind);
    }
    this.wakeNeighbours(w);
  }

  /** Wakes every fluid cell of the six neighbours of `w`. */
  private wakeNeighbours(w: WorldVoxel): void {
    for (const d of SIX) {
      const n = [w[0] + d[0], w[1] + d[1], w[2] + d[2]] as WorldVoxel;
      const id = this.read(n);
      if (isFluidId(id)) {
        this.schedule(n, fluidKindOf(id) as FluidKind);
      }
    }
  }

  /**
   * Wakes the fluid resting in a freshly filled block — the cells that can now
   * act because the world around them landed. Falling heads paused at the edge
   * of the previously-loaded window are the cells of the block above, so that
   * block's bottom rows are scanned too.
   */
  wakeBlock(index: number): void {
    const block = this.blocks[index];
    // Only a block that carries fluid the terrain fill did not place — a
    // restored flow, a placed source — can need waking when its data lands.
    // A freshly generated ocean block is settled by construction, so it is
    // never scanned, which keeps streaming across a sea cheap.
    if (block.store.hasFlowing) {
      this.wakeUnstableIn(block);
    }
    // A falling head paused at the edge of the previously-loaded window sits
    // in the block above, whose bottom row only this fill could have freed.
    const above = this.blockIndexAtVoxel(
      block.center[0] / 2,
      block.center[1] / 2 + 64,
      block.center[2] / 2,
    );
    if (above !== undefined && above !== index) {
      const aboveBlock = this.blocks[above];
      // Only the above block that itself carries flow can hold such a head: a
      // falling cell marks its block the moment it is written, so a pristine
      // block above an ocean is never scanned row by row.
      if (aboveBlock.store.hasFlowing) {
        this.wakeBlockBottom(aboveBlock);
      }
    }
  }

  /** Scans a whole block for fluid cells that can act, with direct padded reads. */
  private wakeUnstableIn(block: WorldBlock): void {
    const store = block.store;
    const [nx, ny, nz] = store.voxels;
    for (let z = 0; z < nz; z++) {
      for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++) {
          const id = store.get(x, y, z);
          if (!isFluidId(id)) {
            continue;
          }
          const kind = fluidKindOf(id) as FluidKind;
          // Air below (fall) or an open side (spread) makes a cell able to act;
          // everything else in a settled ocean is already still.
          if (this.airBelowOrSide(x, y, z, store)) {
            this.schedule(this.toWorldVoxel(block, x, y, z), kind);
          }
        }
      }
    }
  }

  /** Scans only a block's bottom rows for a falling head above a newly-loaded block. */
  private wakeBlockBottom(block: WorldBlock): void {
    const store = block.store;
    const [nx, nz] = store.voxels;
    for (let z = 0; z < nz; z++) {
      for (let x = 0; x < nx; x++) {
        const id = store.get(x, 0, z);
        if (!isFluidId(id)) {
          continue;
        }
        const w = this.toWorldVoxel(block, x, 0, z);
        if (this.read([w[0], w[1] - 1, w[2]]) === VOXEL_AIR) {
          this.schedule(w, fluidKindOf(id) as FluidKind);
        }
      }
    }
  }

  /** Whether a cell has air below it or to one of its sides, read via its block's padded border. */
  private airBelowOrSide(
    x: number,
    y: number,
    z: number,
    store: WorldBlock["store"],
  ): boolean {
    if (store.atPadded(x, y - 1, z) === VOXEL_AIR) {
      return true;
    }
    const sides: Array<[number, number, number]> = [
      [x - 1, y, z],
      [x + 1, y, z],
      [x, y, z - 1],
      [x, y, z + 1],
    ];
    for (const [sx, sy, sz] of sides) {
      if (store.atPadded(sx, sy, sz) === VOXEL_AIR) {
        return true;
      }
    }
    return false;
  }

  /** The slot holding a world voxel, or undefined when none is loaded. */
  private blockIndexAtVoxel(
    x: number,
    y: number,
    z: number,
  ): number | undefined {
    if (this.resolve !== undefined) {
      return this.resolve([x, y, z]);
    }
    return this.findIndexLinear(x, y, z);
  }

  /** Whether the loaded window holds a world voxel at all. */
  private isLoaded(w: WorldVoxel): boolean {
    return this.blockIndexAtVoxel(w[0], w[1], w[2]) !== undefined;
  }

  /** Advances the fluid clock by `dt` seconds and lets due cells act. */
  tick(dt: number): void {
    this.now += dt;
    let steps = 0;
    // One pass over the currently-scheduled keys: cells a step wakes land in
    // the map behind this snapshot, due next interval, never this frame.
    const dueNow = [...this.due.keys()];
    for (const key of dueNow) {
      if (steps >= MAX_STEPS_PER_FRAME) {
        break;
      }
      const at = this.due.get(key);
      if (at === undefined || at > this.now) {
        continue;
      }
      this.due.delete(key);
      const w = fromKey(key);
      const id = this.read(w);
      if (!isFluidId(id)) {
        continue;
      }
      this.step(w, id);
      steps++;
    }
    this.flush();
  }

  /**
   * One cell's turn under the rules in the header. Every change it makes flows
   * through `write`, which schedules whoever that change may set moving.
   */
  private step(w: WorldVoxel, id: number): void {
    const kind = fluidKindOf(id);
    if (kind === null) {
      return;
    }
    const lv = fluidLevel(id);
    const belowWv = belowW(w);
    const belowLoaded = this.isLoaded(belowWv);
    // A cell whose below lies outside the loaded window is suspended: it must
    // not read as open air and fall into the void (that would drain the tail
    // and re-pour it forever, a churn that reads as a stream falling out of
    // the world). It waits, still and scheduled-free, until the block below
    // loads and `wakeBlock` wakes it again.
    if (!belowLoaded) {
      return;
    }
    const below = this.read(belowWv);

    // Falling: open air below. A laterally-supported source pours a falling
    // cell and stays (an ocean with a dug floor keeps a waterfall); anything
    // else — a poured bucket over a drop, the head of a stream — falls as one
    // unit, and the write wakes the cell above to follow.
    if (below === VOXEL_AIR) {
      if (lv === 0 && this.hasKindNeighbour(w, kind)) {
        this.write(belowWv, FALLING_ID[kind]);
      } else {
        this.write(w, VOXEL_AIR);
        this.write(belowWv, FALLING_ID[kind]);
      }
      return;
    }

    // A cell resting directly on the other fluid kind mixes to stone.
    if (isFluidId(below) && fluidKindOf(below) !== kind) {
      this.write(belowWv, VOXEL_STONE);
      return;
    }

    // A cell resting on its own kind is part of a body — the foot of a falling
    // stream landing on the pool it is feeding, a column cell, a placed source
    // sunk into an existing pool. It must neither spread sideways (that would
    // mint a fresh spreading centre on top of every pool, so one bucket poured
    // over a drop grows an endless lake) nor turn into a new source: water
    // landing on water adds volume to the body, never new production.
    if (isKind(kind, below)) {
      return;
    }

    // A source — genuine, or a falling head that has just landed on ground —
    // rests and spreads sideways.
    if (lv === 0) {
      this.spread(w, kind, 0);
      return;
    }

    // A flowing cell resting on ground. Water forms a new source when two
    // sources flank it on a floor; without a lower-level neighbour it is
    // unsupported and drains; otherwise it spreads a level further.
    if (kind === "water" && this.sourceNeighbourCount(w, kind) >= 2) {
      this.write(w, SOURCE_ID.water);
      return;
    }
    if (!this.hasLowerNeighbour(w, kind, lv)) {
      this.write(w, VOXEL_AIR);
      return;
    }
    if (lv < FLUID_MAX_LEVEL) {
      this.spread(w, kind, lv);
    }
  }

  /** Whether any of the four horizontal neighbours of `w` is a same-kind fluid. */
  private hasKindNeighbour(w: WorldVoxel, kind: FluidKind): boolean {
    for (const d of SIX) {
      if (d[1] !== 0) {
        continue;
      }
      const n: WorldVoxel = [w[0] + d[0], w[1], w[2] + d[2]];
      if (isKind(kind, this.read(n))) {
        return true;
      }
    }
    return false;
  }

  /** How many of the four horizontal neighbours of `w` are same-kind sources. */
  private sourceNeighbourCount(w: WorldVoxel, kind: FluidKind): number {
    let count = 0;
    for (const d of SIX) {
      if (d[1] !== 0) {
        continue;
      }
      const n: WorldVoxel = [w[0] + d[0], w[1], w[2] + d[2]];
      if (isKind(kind, this.read(n)) && fluidLevel(this.read(n)) === 0) {
        count++;
      }
    }
    return count;
  }

  /** Whether a same-kind neighbour of `w` carries a strictly lower level. */
  private hasLowerNeighbour(
    w: WorldVoxel,
    kind: FluidKind,
    lv: number,
  ): boolean {
    for (const d of SIX) {
      const n: WorldVoxel = [w[0] + d[0], w[1] + d[1], w[2] + d[2]];
      if (isKind(kind, this.read(n)) && fluidLevel(this.read(n)) < lv) {
        return true;
      }
    }
    return false;
  }

  /**
   * Spreads from a cell of level `lv` into the open horizontal neighbours
   * whose flow weight is lowest, writing them at `lv + 1`. The weight is the
   * distance to a way down within `DROP_SEARCH` cells of the neighbour's own
   * column, so a stream narrows to one block wide and runs for a cliff edge —
   * exactly Minecraft's direction rule.
   */
  private spread(w: WorldVoxel, kind: FluidKind, lv: number): void {
    const candidates: Array<{ w: WorldVoxel; weight: number }> = [];
    for (const d of SIX) {
      if (d[1] !== 0) {
        continue;
      }
      const n: WorldVoxel = [w[0] + d[0], w[1], w[2] + d[2]];
      // Never spread into a cell the window does not hold: it reads as air but
      // is unknown ground, and writing there would vanish without an effect.
      if (!this.isLoaded(n) || this.read(n) !== VOXEL_AIR) {
        continue;
      }
      candidates.push({ w: n, weight: this.dropDistance(n) });
    }
    if (candidates.length === 0) {
      return;
    }
    let best = Infinity;
    for (const c of candidates) {
      best = Math.min(best, c.weight);
    }
    const id = levelIdOf(kind, lv + 1);
    for (const c of candidates) {
      if (c.weight === best && this.read(c.w) === VOXEL_AIR) {
        this.write(c.w, id);
      }
    }
  }

  /**
   * The distance from a candidate cell down its own column to the first open
   * air, capped at `DROP_SEARCH`; `1000` when no way down is that close.
   */
  private dropDistance(w: WorldVoxel): number {
    for (let d = 1; d <= DROP_SEARCH; d++) {
      if (this.read([w[0], w[1] - d, w[2]]) === VOXEL_AIR) {
        return d;
      }
    }
    return 1000;
  }

  /** Schedules a cell to act again after its kind's spread interval. */
  private schedule(w: WorldVoxel, kind: FluidKind): void {
    this.due.set(keyOf(w), this.now + SPREAD_SECONDS[kind]);
  }

  /** The current voxel id at a world voxel, air outside the loaded window. */
  private read(w: WorldVoxel): number {
    const index = this.blockIndexAtVoxel(w[0], w[1], w[2]);
    if (index === undefined) {
      return VOXEL_AIR;
    }
    const block = this.blocks[index];
    const local = worldVoxelToLocal(block.store, block.center, w);
    return block.store.get(local[0], local[1], local[2]);
  }

  /**
   * The block's slot holding a world voxel. The O(1) resolver covers the
   * loaded window; the fallback scan is for the single-block test rigs.
   */
  private findIndexLinear(x: number, y: number, z: number): number | undefined {
    for (let i = 0; i < this.blocks.length; i++) {
      const { min, max } = blockWorldVoxelRange(this.blocks[i].center);
      if (
        x >= min[0] &&
        x <= max[0] &&
        y >= min[1] &&
        y <= max[1] &&
        z >= min[2] &&
        z <= max[2]
      ) {
        return i;
      }
    }
    return undefined;
  }

  /** The local interior coordinate of `w` in `block`. */
  private toWorldVoxel(
    block: WorldBlock,
    x: number,
    y: number,
    z: number,
  ): WorldVoxel {
    const s = block.store.scale;
    const [nx, ny, nz] = block.store.voxels;
    return [
      Math.round(block.center[0] / s - nx / 2 + x),
      Math.round(block.center[1] / s - ny / 2 + y),
      Math.round(block.center[2] / s - nz / 2 + z),
    ];
  }

  /**
   * Writes `id` at `w` across every block whose meshing border holds the voxel,
   * keeping the stores' flags and the changed blocks' light in step. Only the
   * resolved owner (and, via its O(1) neighbours, the blocks sharing the
   * voxel's 1-voxel border) are touched, never a scan of the whole window.
   * Writes schedule the new fluid cell itself, and — when fluid leaves a cell —
   * its fluid neighbours, so a drain relaxes inward and a falling head lets
   * the cell above it follow.
   */
  private write(w: WorldVoxel, id: number): void {
    let prev = VOXEL_AIR;
    const holders: number[] = [];
    if (this.resolve !== undefined) {
      // The blocks that hold `w` are those whose interior sits within a voxel
      // of it: probe the 27-cell cube around `w` through the O(1) resolver.
      const seen = new Set<number>();
      for (let dz = -1; dz <= 1; dz++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const index = this.resolve([w[0] + dx, w[1] + dy, w[2] + dz]);
            if (index !== undefined && !seen.has(index)) {
              seen.add(index);
              holders.push(index);
            }
          }
        }
      }
    } else {
      for (let i = 0; i < this.blocks.length; i++) {
        holders.push(i);
      }
    }
    let wroteAny = false;
    for (const index of holders) {
      const block = this.blocks[index];
      const [x, y, z] = worldVoxelToLocal(block.store, block.center, w);
      if (!block.store.inBoundsPadded(x, y, z)) {
        continue;
      }
      const at = block.store.paddedIndex(x, y, z);
      const before = block.store.data[at];
      if (before === id) {
        continue;
      }
      prev = before;
      block.store.data[at] = id;
      if (isWaterId(id)) {
        block.store.hasWater = true;
      } else if (id !== VOXEL_AIR) {
        block.store.mightHaveVoxels = true;
      }
      if (isFluidId(id)) {
        block.store.hasFlowing = true;
      }
      this.touched.add(index);
      if (isLavaId(before) || isLavaId(id)) {
        this.emissive.add(index);
      }
      wroteAny = true;
    }
    if (!wroteAny) {
      return;
    }
    if (isFluidId(id)) {
      this.schedule(w, fluidKindOf(id) as FluidKind);
    } else if (isFluidId(prev) && prev !== id) {
      this.wakeNeighbours(w);
    }
  }

  /** Recomputes the light only where lava moved, and reports the touched blocks once per frame. */
  private flush(): void {
    if (this.emissive.size > 0) {
      for (const i of this.emissive) {
        const block = this.blocks[i];
        fillBlockLight(block.store, block.light);
      }
      this.emissive.clear();
    }
    if (this.touched.size === 0) {
      return;
    }
    const indices = [...this.touched];
    this.touched.clear();
    this.onBlocksEdited(indices);
  }

  /** The number of cells currently waiting on their spread interval. */
  get pendingCount(): number {
    return this.due.size;
  }

  /** Whether any cells are scheduled to act. */
  get active(): boolean {
    return this.due.size > 0;
  }
}

/** The world voxel directly below `w`. */
const belowW = ([x, y, z]: WorldVoxel): WorldVoxel => [x, y - 1, z];
