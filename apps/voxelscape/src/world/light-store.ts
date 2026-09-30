// CPU-side per-voxel light, held in step with a `VoxelStore`. One `LightStore`
// per block carries two channels of 0..15 values, sky light (sunlight from
// above) and block light (the spread of emissive voxels), laid out in the same
// padded buffer as the store's voxels so the mesh builders read a corner's
// light across the meshing border exactly as they read its voxel.
//
// Both channels share one byte a voxel, four bits each. A level runs 0..15 and
// that is what four bits hold, so the pair costs what one of them used to.
import type { Dim3 } from "./level-data";
import {
  paddedVoxelCount,
  VOXEL_LAVA,
  VOXEL_LAVA_LEVEL_1,
  VOXEL_LAVA_LEVEL_7,
  VOXEL_LAVA_FALLING,
  VOXEL_EMBER,
  VOXEL_GLOWSTONE,
  VOXEL_PADDING,
  type VoxelStore,
} from "./voxel-store";

/** The highest light level; light falls off by one per propagated voxel. */
export const MAX_LIGHT = 15;

/** The four bits one channel's level occupies, before it is shifted into place. */
export const LEVEL_MASK = 0xf;

/** Where sky light sits in the byte the two channels share. */
const SKY_SHIFT = 0;

/** Where block light sits in that same byte. */
const BLOCK_SHIFT = 4;

/**
 * Light levels per voxel id for the emissive blocks that seed block light.
 * Lava, fire embers, and glowstone all shine at full strength. A block that
 * glows but does not burn, like a glowstone set into a ceiling, is a solid id
 * of its own rather than one of the two, so it never spreads, flows, or burns
 * the place it lights.
 */
export const EMISSIVE_LEVEL: Record<number, number> = (() => {
  const levels: Record<number, number> = {
    [VOXEL_LAVA]: MAX_LIGHT,
    [VOXEL_EMBER]: MAX_LIGHT,
    [VOXEL_GLOWSTONE]: MAX_LIGHT,
  };
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

/** A light channel acted on as one value; sky light or block light. */
export type LightChannel = "skylight" | "blocklight";

/**
 * Which four bits of a shared byte a channel occupies. What a caller reading or
 * writing a channel it was handed by name shifts by, so the layout stays the
 * one thing this module decides.
 */
export const shiftOfChannel = (channel: LightChannel): number =>
  channel === "skylight" ? SKY_SHIFT : BLOCK_SHIFT;

/**
 * A block's two light channels, sized and padded exactly like the `VoxelStore`
 * they shadow. The same world-coordinate terrain that generates the voxel
 * border seeds the sky border, so a seam face reads its neighbour's light level
 * from its own copy. Values are indices into the 16-step light ramp from 0 (no
 * light) to `MAX_LIGHT`.
 */
export class LightStore {
  /**
   * One byte a padded voxel, holding both channels: sky light in the low four
   * bits, block light in the high four.
   */
  data: Uint8Array;
  readonly padding: number = VOXEL_PADDING;

  /**
   * @param voxels The interior volume this shadows, border excluded.
   * @param data Light to adopt, border included. A store built without it
   *   allocates its own, which is what the window does once for each of its
   *   slots; a worker that has just lit a slot hands the array it wrote.
   */
  constructor(
    public voxels: Dim3,
    data?: Uint8Array,
  ) {
    this.data = data ?? new Uint8Array(paddedVoxelCount(voxels, this.padding));
  }

  /** The flat index of a signed voxel, border included. */
  paddedIndex(x: number, y: number, z: number): number {
    const [nx, ny] = this.voxels;
    const p = this.padding;
    return ((z + p) * (ny + 2 * p) + (y + p)) * (nx + 2 * p) + (x + p);
  }

  /** The sky light at a flat index. */
  skylightAt(index: number): number {
    return this.data[index] & LEVEL_MASK;
  }

  /** The block light at a flat index. */
  blocklightAt(index: number): number {
    return this.data[index] >>> BLOCK_SHIFT;
  }

  /** Writes the sky light at a flat index, leaving the block light beside it. */
  setSkylightAt(index: number, level: number): void {
    this.data[index] = (this.data[index] & ~LEVEL_MASK) | level;
  }

  /** Writes the block light at a flat index, leaving the sky light beside it. */
  setBlocklightAt(index: number, level: number): void {
    this.data[index] = (this.data[index] & LEVEL_MASK) | (level << BLOCK_SHIFT);
  }

  /** Empties the block light channel, leaving the sky light beside it. */
  clearBlocklight(): void {
    const data = this.data;
    for (let i = 0; i < data.length; i++) {
      data[i] &= LEVEL_MASK;
    }
  }
}

/**
 * Builds a `LightStore` sized to shadow `store`, adopting the store's dims and
 * padding. The channels are returned empty (all zeros) until a fill ends them.
 */
export const emptyLightStore = (store: VoxelStore): LightStore =>
  new LightStore(store.voxels);
