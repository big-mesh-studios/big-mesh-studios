// Seeding the ember a scripted fire burns on: the fire's floor voxel is turned
// into ember, so the place the flame sits on kindles and block light spreads
// from it exactly as it does from lava. The copy is written into the containing
// block's store and every block whose meshing border reaches it — the same
// crowd a player edit updates, and for the same reason: each holder culls its
// seam faces against its own copy. The writes are deliberately *not* recorded
// on the edit layer: a fire is scenery for the demo, nothing a player placed,
// so it neither persists, syncs, nor shows up in the edit stream. Because it is
// not an edit, `FireEmbers` also remembers what each voxel held, so a script
// restart can put the floor back instead of leaving a dead ember glowing.
import {
  blockWorldVoxelRange,
  worldVoxelToLocal,
  type WorldVoxel,
} from "./edit-layer";
import type { WorldBlock } from "./level-data";
import { LightEngine } from "./light-engine";
import { isFluidId, isWaterId, VOXEL_AIR, VOXEL_EMBER } from "./voxel-store";

/**
 * One scripted blaze: where it burns in the world, and how tall the flame is
 * drawn. Owned by the world area so both the place host that lights it and the
 * renderer that draws it can speak the same record without reaching across
 * areas; the place host re-exports it as its own vocabulary.
 */
export interface ScriptedFire {
  id: string;
  /** Base position, in world units. */
  x: number;
  y: number;
  z: number;
  /** Drawn height of the flame in world units. */
  height: number;
}

/**
 * The world voxel a fire's flame stands on: the solid column below its base.
 * The world runs at two units per voxel, so a base at world `y` sits on the
 * voxel whose top is `round(y / 2) * 2`, i.e. one id below the base voxel.
 */
export const fireFloorVoxel = (fire: ScriptedFire): WorldVoxel => [
  Math.round(fire.x / 2),
  Math.floor(fire.y / 2) - 1,
  Math.round(fire.z / 2),
];

/**
 * The world point a flame is drawn from: the centre of its ember voxel at the
 * fire's base height, so the plume sits square over the block that kindles it
 * rather than on the corner the script's coordinates happen to name. A voxel
 * `v` covers world units `[2v, 2v + 2)`, so its centre is `2v + 1`.
 */
export const fireAnchor = (
  fire: ScriptedFire,
): { x: number; y: number; z: number } => {
  const [vx, , vz] = fireFloorVoxel(fire);
  return { x: vx * 2 + 1, y: fire.y, z: vz * 2 + 1 };
};

/** Visits every loaded block whose padded copy holds the world voxel `w`. */
const eachHolder = (
  blocks: WorldBlock[],
  w: WorldVoxel,
  visit: (
    block: WorldBlock,
    index: number,
    x: number,
    y: number,
    z: number,
  ) => void,
): void => {
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const { min, max } = blockWorldVoxelRange(block.center);
    if (
      w[0] < min[0] ||
      w[0] > max[0] ||
      w[1] < min[1] ||
      w[1] > max[1] ||
      w[2] < min[2] ||
      w[2] > max[2]
    ) {
      continue;
    }
    const [x, y, z] = worldVoxelToLocal(block.store, block.center, w);
    if (block.store.inBoundsPadded(x, y, z)) {
      visit(block, i, x, y, z);
    }
  }
};

/**
 * Keeps a store's bookkeeping flags in step with a raw voxel write: whether it
 * holds water, any voxel at all, or fluid that may spread.
 */
const noteVoxel = (block: WorldBlock, id: number): void => {
  if (isWaterId(id)) {
    block.store.hasWater = true;
  } else if (id !== VOXEL_AIR) {
    block.store.mightHaveVoxels = true;
  }
  if (isFluidId(id)) {
    block.store.hasFlowing = true;
  }
};

/** Reads the current id at world voxel `w` from whichever block holds it. */
const readVoxel = (blocks: WorldBlock[], w: WorldVoxel): number => {
  let id = VOXEL_AIR;
  eachHolder(blocks, w, (block, _index, x, y, z) => {
    id = block.store.atPadded(x, y, z);
  });
  return id;
};

/**
 * Tracks the floor voxels a place's fires have kindled, so the whole set can be
 * restored when the script restarts and the fires go out. Seeding and clearing
 * both write through every holder and notify the renderer.
 */
export class FireEmbers {
  private readonly kindled = new Map<
    string,
    { voxel: WorldVoxel; was: number }
  >();

  constructor(
    private readonly blocks: WorldBlock[],
    private readonly onBlocksChanged: (indices: number[]) => void,
    private readonly light: LightEngine,
  ) {}

  /**
   * Kindles the floor voxel under `fire`, remembering what it replaces. The
   * ember is the one voxel that changed, so its light is seeded and spread
   * from there rather than rescanning the whole block for every emitter, which
   * is what the fill-time pass does and is far more work than one new source
   * needs.
   */
  seed(fire: ScriptedFire): void {
    const w = fireFloorVoxel(fire);
    const key = w.join(",");
    if (this.kindled.has(key)) {
      return;
    }
    const was = readVoxel(this.blocks, w);
    const holders: number[] = [];
    eachHolder(this.blocks, w, (block, index, x, y, z) => {
      block.store.data[block.store.paddedIndex(x, y, z)] = VOXEL_EMBER;
      noteVoxel(block, VOXEL_EMBER);
      this.light.setVoxel(index, x, y, z, was, VOXEL_EMBER);
      holders.push(index);
    });
    if (holders.length === 0) {
      return;
    }
    this.kindled.set(key, { voxel: w, was });
    this.onBlocksChanged(holders);
  }

  /**
   * Puts every kindled voxel back the way it was, so a restart leaves the floor
   * as it was built rather than glowing under a fire that is gone. Removing a
   * source cannot be done by spreading from it — light from several emitters
   * combines — but the incremental engine walks the cells that depended on the
   * ember's light instead of recomputing the block.
   */
  clear(): void {
    const holders = new Set<number>();
    for (const { voxel, was } of this.kindled.values()) {
      eachHolder(this.blocks, voxel, (block, index, x, y, z) => {
        block.store.data[block.store.paddedIndex(x, y, z)] = was;
        noteVoxel(block, was);
        this.light.setVoxel(index, x, y, z, VOXEL_EMBER, was);
        holders.add(index);
      });
    }
    this.kindled.clear();
    if (holders.size > 0) {
      this.onBlocksChanged([...holders]);
    }
  }
}
