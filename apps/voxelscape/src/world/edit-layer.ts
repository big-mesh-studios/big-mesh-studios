// Persistent, world-coordinate sparse store of voxel edits, independent of
// any particular `WorldBlock` slot. Terrain is generated deterministically
// from a noise height field, so an edit is meaningful only as a delta keyed
// by its absolute voxel position — not by which ring slot happened to hold it
// when the player acted. `WorldRing` refills scrolled-in slots from the noise
// field, so a build recorded only in a `VoxelStore` would vanish the moment
// the player walks away and that slot re-fills; keeping edits here, keyed by
// world voxel, lets a refilled block re-apply them (`applyToBlock`) and lets
// atproto sync treat each edit as a stable, coordinate-addressed record.
//
// Edits are addressed in the LOD-0 voxel grid: one voxel is `VOXEL_SIZE`
// world units. Every block the ring builds is LOD 0, so `block.store.scale`
// equals `VOXEL_SIZE` and the local<->world mapping below is exact.
import {
  BLOCK_WORLD,
  VOXEL_SIZE,
  type Dim3,
  type WorldBlock,
} from "./level-data";
import type { VoxelStore } from "./voxel-store";

/** A single recorded edit: the world voxel's new id plus when it was made. */
export interface VoxelEdit {
  /** Voxel id to put at the coordinate; `VOXEL_AIR` (0) removes a block. */
  id: number;
  /** Milliseconds since epoch (Date.now()); drives last-write-wins reconcile. */
  updatedAt: number;
}

export type WorldVoxel = [number, number, number];

const keyOf = ([x, y, z]: WorldVoxel): string => `${x},${y},${z}`;

/** Parses the packed string key back into a world voxel coordinate. */
const fromKey = (key: string): WorldVoxel => {
  const [x, y, z] = key.split(",");
  return [Number(x), Number(y), Number(z)];
};

/**
 * The LOD-0 voxel coordinate of a block's local interior voxel: a bijection
 * onto the integer grid where the block covers `[-n/2, n/2)` voxels (matching
 * `blockWorldVoxelRange`). The store's own world-position formula is
 * `center + (l + 0.5 - n/2) * scale`, so a voxel's representative position
 * sits at `(worldVoxel + 0.5) * VOXEL_SIZE` — the same +0.5 convention the
 * mesh and fill use.
 */
export const localToWorldVoxel = (
  store: VoxelStore,
  center: Dim3,
  l: Dim3,
): WorldVoxel => {
  const { x: nx, y: ny, z: nz } = store.voxels;
  const [cx, cy, cz] = center;
  const s = store.scale;
  return [
    Math.round(cx / s - nx / 2 + l[0]),
    Math.round(cy / s - ny / 2 + l[1]),
    Math.round(cz / s - nz / 2 + l[2]),
  ];
};

/**
 * Converts a world voxel coordinate back to a block's local interior voxel
 * index. The inverse of `localToWorldVoxel`.
 */
export const worldVoxelToLocal = (
  store: VoxelStore,
  center: Dim3,
  w: WorldVoxel,
): Dim3 => {
  const { x: nx, y: ny, z: nz } = store.voxels;
  const [cx, cy, cz] = center;
  const s = store.scale;
  return [
    Math.round(w[0] - cx / s + nx / 2),
    Math.round(w[1] - cy / s + ny / 2),
    Math.round(w[2] - cz / s + nz / 2),
  ];
};

/**
 * The world-voxel extent (min and max, inclusive) spanned by a block's
 * interior volume, in the LOD-0 grid.
 */
export const blockWorldVoxelRange = (
  center: Dim3,
): { min: WorldVoxel; max: WorldVoxel } => {
  const min: WorldVoxel = [
    Math.round((center[0] - BLOCK_WORLD.x / 2) / VOXEL_SIZE),
    Math.round((center[1] - BLOCK_WORLD.y / 2) / VOXEL_SIZE),
    Math.round((center[2] - BLOCK_WORLD.z / 2) / VOXEL_SIZE),
  ];
  const max: WorldVoxel = [
    min[0] + BLOCK_WORLD.x / VOXEL_SIZE - 1,
    min[1] + BLOCK_WORLD.y / VOXEL_SIZE - 1,
    min[2] + BLOCK_WORLD.z / VOXEL_SIZE - 1,
  ];
  return { min, max };
};

const inRange = (w: WorldVoxel, min: WorldVoxel, max: WorldVoxel): boolean =>
  w[0] >= min[0] &&
  w[0] <= max[0] &&
  w[1] >= min[1] &&
  w[1] <= max[1] &&
  w[2] >= min[2] &&
  w[2] <= max[2];

/**
 * The sparse world-coordinate edit overlay. Immutable snapshots are fed in
 * from persistence (or a remote sync) at construction; the instance mutates
 * as the player edits.
 */
export class EditLayer {
  private readonly edits: Map<string, VoxelEdit>;

  constructor(initial?: Map<string, VoxelEdit>) {
    this.edits = new Map(initial ?? []);
  }

  /** Number of recorded edits. */
  get size(): number {
    return this.edits.size;
  }

  /**
   * Records an edit at a world voxel. Returns true when the edit is new or
   * changes the stored id; a later edit at the same voxel refreshes its
   * `updatedAt` for reconcile.
   */
  set(w: WorldVoxel, id: number, updatedAt: number): boolean {
    const key = keyOf(w);
    const prev = this.edits.get(key);
    if (prev !== undefined && prev.id === id) {
      prev.updatedAt = Math.max(prev.updatedAt, updatedAt);
      return false;
    }
    this.edits.set(key, { id, updatedAt });
    return true;
  }

  /** The recorded edit at a world voxel, or undefined when it has none. */
  get(w: WorldVoxel): VoxelEdit | undefined {
    return this.edits.get(keyOf(w));
  }

  /** All edits whose voxel lies within the inclusive bounding box. */
  queryRange(
    min: WorldVoxel,
    max: WorldVoxel,
  ): Array<{ w: WorldVoxel; edit: VoxelEdit }> {
    const out: Array<{ w: WorldVoxel; edit: VoxelEdit }> = [];
    for (const [key, edit] of this.edits) {
      const w = fromKey(key);
      if (inRange(w, min, max)) {
        out.push({ w, edit });
      }
    }
    return out;
  }

  /**
   * Applies every edit intersecting `block`'s interior to its `store`. The
   * caller must re-run `syncLevelFromStore` (and, for the triangle renderer,
   * `onBlockChanged`) when this returns a count above zero.
   *
   * @returns The number of store voxels written.
   */
  applyToBlock(block: WorldBlock): number {
    const { min, max } = blockWorldVoxelRange(block.center);
    const matches = this.queryRange(min, max);
    if (matches.length === 0) {
      return 0;
    }
    let written = 0;
    for (const { w, edit } of matches) {
      const local = worldVoxelToLocal(block.store, block.center, w);
      if (block.store.inBounds(local[0], local[1], local[2])) {
        block.store.set(local[0], local[1], local[2], edit.id);
        written++;
      }
    }
    return written;
  }

  /**
   * An immutable snapshot of all edits, for persistence (IndexedDB) and for
   * chunking into atproto records.
   */
  snapshot(): Array<{ w: WorldVoxel; edit: VoxelEdit }> {
    const out: Array<{ w: WorldVoxel; edit: VoxelEdit }> = [];
    for (const [key, edit] of this.edits) {
      out.push({ w: fromKey(key), edit });
    }
    return out;
  }
}

/**
 * Rebuild a fresh `EditLayer` from a list of world voxel + edit pairs,
 * replacing the current overlay wholesale (used to adopt an IndexedDB load or
 * a remote reconcile).
 */
export const editLayerFromSnapshot = (
  entries: Array<{ w: WorldVoxel; edit: VoxelEdit }>,
): EditLayer => {
  const map = new Map<string, VoxelEdit>();
  for (const { w, edit } of entries) {
    map.set(keyOf(w), edit);
  }
  return new EditLayer(map);
};
