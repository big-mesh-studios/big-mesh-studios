// CPU-side per-voxel light, held in step with a `VoxelStore`. One `LightStore`
// per block carries two channels of 0..15 values, `skylight` (sunlight from
// above) and `blocklight` (the spread of emissive voxels), each laid out in
// the same padded buffer as the store's voxels so the mesh builders read a
// corner's light across the meshing border exactly as they read its voxel.
import type { Dim3 } from "./level-data";
import {
  VOXEL_LAVA,
  VOXEL_LAVA_LEVEL_1,
  VOXEL_LAVA_LEVEL_7,
  VOXEL_LAVA_FALLING,
  VOXEL_PADDING,
  type VoxelStore,
} from "./voxel-store";

/** The highest light level; light falls off by one per propagated voxel. */
export const MAX_LIGHT = 15;

/** Light levels per voxel id for the emissive blocks that seed block light. */
export const EMISSIVE_LEVEL: Record<number, number> = (() => {
  const levels: Record<number, number> = { [VOXEL_LAVA]: MAX_LIGHT };
  for (let id = VOXEL_LAVA_LEVEL_1; id <= VOXEL_LAVA_LEVEL_7; id++) {
    levels[id] = MAX_LIGHT;
  }
  levels[VOXEL_LAVA_FALLING] = MAX_LIGHT;
  return levels;
})();

/**
 * The rendered strength of the highest light level, so a light level `l`
 * renders as `l / MAX_LIGHT` at full energy. Kept as a named value so the
 * mesher and the tests normalize light the same way.
 */
export const LIGHT_TO_UNIT = (level: number): number => level * (1 / MAX_LIGHT);

/**
 * A block's two light channels, `skylight` and `blocklight`, sized and padded
 * exactly like the `VoxelStore` they shadow. The same world-coordinate terrain
 * that generates the voxel border seeds the sky border, so a seam face reads
 * its neighbour's light level from its own copy. Values are indices into the
 * 16-step light ramp from 0 (no light) to `MAX_LIGHT`.
 */
export class LightStore {
  /** One 0..15 value per padded voxel, a full byte each for simplicity. */
  skylight: Uint8Array;
  blocklight: Uint8Array;
  readonly padding: number = VOXEL_PADDING;

  constructor(public voxels: Dim3) {
    const p = this.padding;
    const size =
      (voxels[0] + 2 * p) * (voxels[1] + 2 * p) * (voxels[2] + 2 * p);
    this.skylight = new Uint8Array(size);
    this.blocklight = new Uint8Array(size);
  }

  /** The flat index of a signed voxel, border included. */
  paddedIndex(x: number, y: number, z: number): number {
    const [nx, ny] = this.voxels;
    const p = this.padding;
    return ((z + p) * (ny + 2 * p) + (y + p)) * (nx + 2 * p) + (x + p);
  }
}

/** A light channel acted on as one value; `skylight` or `blocklight`. */
export type LightChannel = "skylight" | "blocklight";

/**
 * Builds a `LightStore` sized to shadow `store`, adopting the store's dims and
 * padding. The two arrays are returned empty (all zeros) until a fill ends them.
 */
export const emptyLightStore = (store: VoxelStore): LightStore =>
  new LightStore(store.voxels);
