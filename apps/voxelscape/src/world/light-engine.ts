// Runtime light propagation across the loaded block window, replacing the
// per-block full re-lights plus seam reconciliation that kept runtime voxel
// changes lit before. It is Minecraft's LevelPropagator as two passes: a
// change clears the channels the affected cell held and queues a decrease
// from it, which clears every cell that depended on the removed light and
// re-queues the sources that still light them; then a monotone increase
// broadcast spreads what remains. Work lands on a budget per flush, so the
// overflow of a burst of edits or streaming waits for the next frames instead
// of stalling the one that queued it.
//
// A fill needs no two-pass work at all. Every block lights its own store from
// the shared terrain height field, so a pair of seam columns can only disagree
// by one side carrying less light than the other; `enqueueFaces` raises both
// copies to the brighter, which is exactly the union an increase flood would
// reach and costs a plane copy instead of a walk.
import {
  blockWorldVoxelRange,
  localToWorldVoxel,
  worldVoxelToLocal,
  type WorldVoxel,
} from "./edit-layer";
import { BLOCK_WORLD, type WorldBlock } from "./level-data";
import {
  EMISSIVE_LEVEL,
  LEVEL_MASK,
  MAX_LIGHT,
  shiftOfChannel,
} from "./light-store";
import { transmitsLight } from "./sky-light";

/** A light channel the engine keeps in step with the voxels. */
type Channel = "skylight" | "blocklight";

/** How many milliseconds one flush may run before the rest defers. */
const DEFAULT_BUDGET_MS = 1.5;

/** A voxel awaiting flood work, addressed to the block and column that own it. */
interface Cursor {
  b: number;
  x: number;
  y: number;
  z: number;
  level: number;
  /** Whether this cursor still carries full, straight-down sky. */
  fullSky: boolean;
}

/** A cursor plus the channel it acts on. */
interface Entry extends Cursor {
  channel: Channel;
}

/** The six axis directions a flood steps in. */
const SIX: Array<[number, number, number]> = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

export interface LightEngineParams {
  /** The loaded block window, indexed as everywhere else in the world. */
  blocks: WorldBlock[];
  /**
   * Resolves a world voxel to its block's slot index in `blocks` in O(1),
   * backed by the chunk window's cell map. Omitted in tests, where a linear
   * scan over the few blocks stands in.
   */
  resolve?: (w: WorldVoxel) => number | undefined;
  /**
   * Called with the slot index of every block whose light the flush wrote, so
   * the renderer rebuilds their meshes for the new light. Runs at most once
   * per flush, and only when something changed.
   */
  onChanged: (indices: number[]) => void;
  /**
   * Whether a slot holds the terrain of the cell it currently stands for, so a
   * seam never borrows light from a slot mid-scroll that still holds the cell
   * it left behind. Every slot reads as filled when omitted.
   */
  isFilled?: (index: number) => boolean;
  /**
   * How many milliseconds one flush may run before the rest defers to the
   * next. The world lands the light work of a busy frame on the following
   * frames instead of stalling the one that queued it.
   */
  budgetMs?: number;
}

/**
 * Incrementally propagates light through the loaded blocks after a voxel
 * changes or a block lands. Reads and writes the pair of channels a
 * `LightStore` holds, crossing block borders the two shared seam columns a
 * pair of stores keep of the same world column.
 */
export class LightEngine {
  private readonly blocks: WorldBlock[];
  private readonly resolve?: (w: WorldVoxel) => number | undefined;
  private readonly onChanged: (indices: number[]) => void;
  private readonly isFilled: (index: number) => boolean;
  private readonly budgetMs: number;
  private readonly increase: Entry[] = [];
  private readonly decrease: Entry[] = [];
  private incHead = 0;
  private decHead = 0;
  private readonly changed = new Set<number>();

  constructor(params: LightEngineParams) {
    this.blocks = params.blocks;
    this.resolve = params.resolve;
    this.onChanged = params.onChanged;
    this.budgetMs = params.budgetMs ?? DEFAULT_BUDGET_MS;
    this.isFilled = params.isFilled ?? (() => true);
  }

  /** Whether either pass still holds unflushed work. */
  get pending(): boolean {
    return (
      this.increase.length - this.incHead > 0 ||
      this.decrease.length - this.decHead > 0
    );
  }

  /**
   * The slot index of the block whose interior holds `w`, through the O(1)
   * resolver or a scan over the window when none was supplied.
   */
  private slotOf(w: WorldVoxel): number | undefined {
    if (this.resolve !== undefined) {
      return this.resolve(w);
    }
    for (let i = 0; i < this.blocks.length; i++) {
      const { min, max } = blockWorldVoxelRange(this.blocks[i].center);
      if (
        w[0] >= min[0] &&
        w[0] <= max[0] &&
        w[1] >= min[1] &&
        w[1] <= max[1] &&
        w[2] >= min[2] &&
        w[2] <= max[2]
      ) {
        return i;
      }
    }
    return undefined;
  }

  /**
   * The block holding the cell at `(x, y, z)` when it lies outside `block`'s
   * padded volume, mapped through the world voxel both stores keep a copy of,
   * or null when nothing loaded and same-scale holds it.
   */
  private crossTarget(
    block: WorldBlock,
    x: number,
    y: number,
    z: number,
  ): {
    index: number;
    block: WorldBlock;
    x: number;
    y: number;
    z: number;
  } | null {
    const store = block.store;
    const scale = store.scale;
    const w = localToWorldVoxel(store, block.center, [x, y, z]);
    const index = this.slotOf(w);
    if (index === undefined) {
      return null;
    }
    const target = this.blocks[index];
    if (target.store.scale !== scale) {
      return null;
    }
    const [lx, ly, lz] = worldVoxelToLocal(target.store, target.center, w);
    return { index, block: target, x: lx, y: ly, z: lz };
  }

  /**
   * The block at `dir` across the boundary of the block at `index`, loaded and
   * filled and holding the same level of detail. Null when the window does not
   * hold it yet — the seam waits for the neighbour's own fill to enqueue it.
   */
  private neighbour(
    index: number,
    dx: number,
    dy: number,
    dz: number,
  ): number | undefined {
    const center = this.blocks[index].center;
    const w: WorldVoxel = [
      (center[0] + dx * BLOCK_WORLD[0]) / 2,
      (center[1] + dy * BLOCK_WORLD[1]) / 2,
      (center[2] + dz * BLOCK_WORLD[2]) / 2,
    ];
    const slot = this.slotOf(w);
    if (
      slot === undefined ||
      slot === index ||
      !this.isFilled(slot) ||
      this.blocks[slot].store.scale !== this.blocks[index].store.scale
    ) {
      return undefined;
    }
    return slot;
  }

  /**
   * The light a block's store holds at a flat index in one channel.
   */
  private levelAt(data: Uint8Array, at: number, shift: number): number {
    return (data[at] >>> shift) & LEVEL_MASK;
  }

  /**
   * Raises one channel of one voxel, returning whether it actually rose. A
   * seam pair only ever moves up, so the shared columns converge to the
   * brighter of the two copies.
   */
  private raise(
    data: Uint8Array,
    at: number,
    level: number,
    shift: number,
  ): boolean {
    if (level <= this.levelAt(data, at, shift)) {
      return false;
    }
    data[at] = (data[at] & ~(LEVEL_MASK << shift)) | (level << shift);
    return true;
  }

  /**
   * Brings the block that just landed into agreement with each loaded
   * same-scale neighbour: a block holds copies of the two world columns that
   * border a face, and its neighbour holds the same two, so every shared
   * column is raised to the brighter of the two copies on both sides. A raise
   * also seeds an increase from the column, so the newly lit seam light
   * decays inward exactly as the neighbour's own fill would have spread it.
   */
  enqueueFaces(index: number): void {
    if (!this.isFilled(index)) {
      return;
    }
    const plane: number[] = [0, 0, 0];
    for (const [dx, dy, dz] of SIX) {
      const partner = this.neighbour(index, dx, dy, dz);
      if (partner === undefined) {
        continue;
      }
      const axis = dx !== 0 ? 0 : dy !== 0 ? 1 : 2;
      // The block on the minus side of the axis faces the one on the plus side,
      // whichever of the two is the one that just landed.
      const minus = dx + dy + dz > 0 ? partner : index;
      const plus = dx + dy + dz > 0 ? index : partner;
      const a1 = (axis + 1) % 3;
      const a2 = (axis + 2) % 3;
      const mData = this.blocks[minus].light.data;
      const pData = this.blocks[plus].light.data;
      const shifts = [shiftOfChannel("skylight"), shiftOfChannel("blocklight")];
      const n = this.blocks[minus].store.voxels[0];
      for (let q2 = 0; q2 < n; q2++) {
        for (let q1 = 0; q1 < n; q1++) {
          plane[a1] = q1;
          plane[a2] = q2;
          // The shared column pair (minus pad, plus interior) and the pair
          // (minus interior, plus pad) are the same two world columns, read
          // from the mesh's point of view in the two blocks.
          plane[axis] = n; // minus pad
          const mPad = this.blocks[minus].light.paddedIndex(
            plane[0],
            plane[1],
            plane[2],
          );
          plane[axis] = 0; // plus interior
          const pInt = this.blocks[plus].light.paddedIndex(
            plane[0],
            plane[1],
            plane[2],
          );
          plane[axis] = n - 1; // minus interior
          const mInt = this.blocks[minus].light.paddedIndex(
            plane[0],
            plane[1],
            plane[2],
          );
          plane[axis] = -1; // plus pad
          const pPad = this.blocks[plus].light.paddedIndex(
            plane[0],
            plane[1],
            plane[2],
          );
          for (const shift of shifts) {
            plane[axis] = n; // minus pad
            this.seamColumn(
              minus,
              plane[0],
              plane[1],
              plane[2],
              shift,
              mData,
              mPad,
              pInt,
            );
            plane[axis] = 0; // plus interior
            this.seamColumn(
              plus,
              plane[0],
              plane[1],
              plane[2],
              shift,
              pData,
              pInt,
              mPad,
            );
            plane[axis] = n - 1; // minus interior
            this.seamColumn(
              minus,
              plane[0],
              plane[1],
              plane[2],
              shift,
              mData,
              mInt,
              pPad,
            );
            plane[axis] = -1; // plus pad
            this.seamColumn(
              plus,
              plane[0],
              plane[1],
              plane[2],
              shift,
              pData,
              pPad,
              mInt,
            );
          }
        }
      }
    }
  }

  /**
   * Raises one block's copy of a shared column to the neighbour's when the
   * neighbour is brighter, and seeds the raised side so its light carries
   * inward through the block that was too dim.
   */
  private seamColumn(
    slot: number,
    x: number,
    y: number,
    z: number,
    shift: number,
    data: Uint8Array,
    at: number,
    other: number,
  ): void {
    const level = this.levelAt(data, other, shift);
    if (!this.raise(data, at, level, shift)) {
      return;
    }
    this.changed.add(slot);
    this.increase.push({
      b: slot,
      x,
      y,
      z,
      level,
      fullSky: shift === shiftOfChannel("skylight") && level === MAX_LIGHT,
      channel: shift === shiftOfChannel("skylight") ? "skylight" : "blocklight",
    });
  }

  /**
   * Records that a voxel changed from `before` to `after`: whatever light the
   * old id no longer supports is removed through a decrease, an emitter that
   * arrived seeds an increase, and a cell that opened to the sky is lit from
   * the six neighbours that surround before it. The write itself is the
   * caller's — the engine only keeps the light in step.
   */
  setVoxel(
    index: number,
    x: number,
    y: number,
    z: number,
    before: number,
    after: number,
  ): void {
    if (before === after) {
      return;
    }
    const transBefore = transmitsLight(before);
    const transAfter = transmitsLight(after);
    const emitAfter = EMISSIVE_LEVEL[after];
    if (
      transBefore === transAfter &&
      emitAfter === undefined &&
      EMISSIVE_LEVEL[before] === undefined
    ) {
      return;
    }
    const block = this.blocks[index];
    const light = block.light;
    const at = light.paddedIndex(x, y, z);
    const skyShift = shiftOfChannel("skylight");
    const blockShift = shiftOfChannel("blocklight");
    if (transBefore !== transAfter || EMISSIVE_LEVEL[before] !== undefined) {
      const oldBlock = this.levelAt(light.data, at, blockShift);
      if (oldBlock > 0) {
        light.data[at] &= ~(LEVEL_MASK << blockShift);
        this.changed.add(index);
        this.decrease.push({
          b: index,
          x,
          y,
          z,
          level: oldBlock,
          fullSky: false,
          channel: "blocklight",
        });
      }
    }
    if (transBefore !== transAfter) {
      const oldSky = this.levelAt(light.data, at, skyShift);
      if (oldSky > 0) {
        light.data[at] &= ~(LEVEL_MASK << skyShift);
        this.changed.add(index);
        this.decrease.push({
          b: index,
          x,
          y,
          z,
          level: oldSky,
          fullSky: oldSky === MAX_LIGHT,
          channel: "skylight",
        });
      }
      if (!transBefore && transAfter) {
        // An opening can only brighten the column around it, so every
        // neighbour that already carries light seeds the increase toward it —
        // the cell above at full sky pours straight down, the sides bleed in.
        for (const [dx, dy, dz] of SIX) {
          const t = this.crossTarget(block, x + dx, y + dy, z + dz);
          if (t === null) {
            continue;
          }
          const tData = t.block.light.data;
          const tAt = t.block.light.paddedIndex(t.x, t.y, t.z);
          if (!transmitsLight(t.block.store.data[tAt])) {
            continue;
          }
          for (const channel of ["skylight", "blocklight"] as const) {
            const shift = shiftOfChannel(channel);
            const level = this.levelAt(tData, tAt, shift);
            if (level > 0) {
              this.increase.push({
                b: t.index,
                x: t.x,
                y: t.y,
                z: t.z,
                level,
                fullSky: channel === "skylight" && level === MAX_LIGHT,
                channel,
              });
            }
          }
        }
      }
    }
    if (emitAfter !== undefined) {
      this.increase.push({
        b: index,
        x,
        y,
        z,
        level: emitAfter,
        fullSky: false,
        channel: "blocklight",
      });
    }
  }

  /**
   * Runs the two passes until both drain or `budgetMs` elapses, then reports
   * every block whose light changed since the last flush. A decrease left over
   * when the budget runs out holds the increase until the next flush, so a
   * re-seed never runs over damage that has not been fully cleared.
   */
  flush(budgetMs: number = this.budgetMs): void {
    const deadline = performance.now() + budgetMs;
    this.drainDecrease(deadline);
    if (this.decrease.length === 0) {
      this.drainIncrease(deadline);
    }
    if (this.changed.size > 0) {
      const out = Array.from(this.changed);
      this.changed.clear();
      this.onChanged(out);
    }
  }

  /** Clears every cell that depended on the removed light and re-queues sources. */
  private drainDecrease(deadline: number): void {
    const q = this.decrease;
    while (this.decHead < q.length && performance.now() < deadline) {
      this.decreaseAt(q[this.decHead]);
      this.decHead++;
    }
    if (this.decHead === q.length) {
      q.length = 0;
      this.decHead = 0;
    }
  }

  /** Spreads the re-seeded sources outward until the light settles. */
  private drainIncrease(deadline: number): void {
    const q = this.increase;
    while (this.incHead < q.length) {
      const e = q[this.incHead];
      this.incHead++;
      this.increaseAt(e);
      if (this.incHead < q.length && performance.now() >= deadline) {
        break;
      }
    }
    if (this.incHead === q.length) {
      q.length = 0;
      this.incHead = 0;
    }
  }

  /**
   * The level a step from a cursor at `level` hands its neighbour: full under
   * a full-sky column, one less everywhere else. The mirror of the link an
   * increase creates.
   */
  private stepIsFull(channel: Channel, fullSky: boolean, dy: number): boolean {
    return channel === "skylight" && fullSky && dy !== 0;
  }

  /** One decrease entry: clear every cell its level supported, re-seed the rest. */
  private decreaseAt(e: Entry): void {
    const block = this.blocks[e.b];
    const store = block.store;
    const shift = shiftOfChannel(e.channel);
    const n = store.voxels[0];
    const p = store.padding;
    for (const [dx, dy, dz] of SIX) {
      const x = e.x + dx;
      const y = e.y + dy;
      const z = e.z + dz;
      let target = block;
      let tIndex = e.b;
      let tx = x;
      let ty = y;
      let tz = z;
      if (
        x < -p ||
        x >= n + p ||
        y < -p ||
        y >= n + p ||
        z < -p ||
        z >= n + p
      ) {
        const t = this.crossTarget(block, x, y, z);
        if (t === null) {
          continue;
        }
        target = t.block;
        tIndex = t.index;
        tx = t.x;
        ty = t.y;
        tz = t.z;
      }
      const tData = target.light.data;
      const tAt = target.light.paddedIndex(tx, ty, tz);
      const nbLevel = this.levelAt(tData, tAt, shift);
      if (nbLevel === 0) {
        continue;
      }
      const fullLink = this.stepIsFull(e.channel, e.fullSky, dy);
      if (nbLevel <= e.level - (fullLink ? 0 : 1)) {
        // The neighbour rested on this cell's light: clear it and walk on.
        tData[tAt] &= ~(LEVEL_MASK << shift);
        this.changed.add(tIndex);
        this.decrease.push({
          b: tIndex,
          x: tx,
          y: ty,
          z: tz,
          level: nbLevel,
          fullSky: e.channel === "skylight" && nbLevel === MAX_LIGHT,
          channel: e.channel,
        });
        // An emitter cleared with its light is re-seeded on its own.
        if (e.channel === "blocklight") {
          const emission = EMISSIVE_LEVEL[target.store.data[tAt]];
          if (emission !== undefined) {
            this.increase.push({
              b: tIndex,
              x: tx,
              y: ty,
              z: tz,
              level: emission,
              fullSky: false,
              channel: "blocklight",
            });
          }
        }
      } else {
        // The neighbour has light of its own: feed it back toward the cell.
        this.increase.push({
          b: tIndex,
          x: tx,
          y: ty,
          z: tz,
          level: nbLevel,
          fullSky: e.channel === "skylight" && nbLevel === MAX_LIGHT,
          channel: e.channel,
        });
      }
    }
  }

  /** One increase entry: raise its cell, then spread one step outward. */
  private increaseAt(e: Entry): void {
    const block = this.blocks[e.b];
    const store = block.store;
    const light = block.light;
    const shift = shiftOfChannel(e.channel);
    const data = light.data;
    const n = store.voxels[0];
    const p = store.padding;
    const at = light.paddedIndex(e.x, e.y, e.z);
    if (e.level > this.levelAt(data, at, shift)) {
      this.raise(data, at, e.level, shift);
      this.changed.add(e.b);
    }
    for (const [dx, dy, dz] of SIX) {
      const x = e.x + dx;
      const y = e.y + dy;
      const z = e.z + dz;
      let target = block;
      let tIndex = e.b;
      let tx = x;
      let ty = y;
      let tz = z;
      if (
        x < -p ||
        x >= n + p ||
        y < -p ||
        y >= n + p ||
        z < -p ||
        z >= n + p
      ) {
        const t = this.crossTarget(block, x, y, z);
        if (t === null) {
          continue;
        }
        target = t.block;
        tIndex = t.index;
        tx = t.x;
        ty = t.y;
        tz = t.z;
      }
      const tData = target.light.data;
      const tAt = target.light.paddedIndex(tx, ty, tz);
      // Light never rests in a solid voxel; an emitter's own cell is seeded by
      // its entry, but a step only writes where the light can carry.
      if (!transmitsLight(target.store.data[tAt])) {
        continue;
      }
      const here = this.levelAt(tData, tAt, shift);
      const next = this.stepIsFull(e.channel, e.fullSky, dy)
        ? MAX_LIGHT
        : e.level - 1;
      if (next <= here) {
        continue;
      }
      this.raise(tData, tAt, next, shift);
      this.changed.add(tIndex);
      this.increase.push({
        b: tIndex,
        x: tx,
        y: ty,
        z: tz,
        level: next,
        fullSky: e.channel === "skylight" && next === MAX_LIGHT,
        channel: e.channel,
      });
    }
  }
}
