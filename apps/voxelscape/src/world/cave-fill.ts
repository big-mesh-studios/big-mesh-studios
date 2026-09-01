import { PerlinNoise3D } from "./noise";

/** Distinguishes the cave seed stream from terrain and cloud seeds. */
export const FILL_CAVE_SEED_MIX = 0xca7e5;

/** Noise frequency for 3D cave tunnels (1 / world_units). */
/** Noise frequency for 3D cave tunnels (1 / world_units).
 *  Lowered from 1/100 → 1/200 to space caves further apart (fewer per area, same individual size). */
export const FILL_CAVE_FREQUENCY = 1 / 200;

/** fBm octaves of cave noise. */
export const FILL_CAVE_OCTAVES = 2;

/** Threshold for 3D worm noise to carve a cave. */
/**
 * Threshold for 3D worm noise to carve a cave.
 * Reduced from original 0.04 → 0.004 so caves are ~10% as common.
 */
export const FILL_CAVE_THRESHOLD = 0.004;

/** Dirt layer depth below surface height (in world units). Below this is stone. */
export const DIRT_LAYER_DEPTH = 6;

const caveNoiseCache = new Map<number, PerlinNoise3D>();

/** The seeded 3D Perlin noise for caves, cached per seed. */
export const caveFillNoise = (seed: number): PerlinNoise3D => {
  let noise = caveNoiseCache.get(seed);
  if (noise === undefined) {
    noise = new PerlinNoise3D(seed ^ FILL_CAVE_SEED_MIX, 256);
    caveNoiseCache.set(seed, noise);
  }
  return noise;
};

/**
 * Evaluates whether a world location (wx, wy, wz) is inside a cave.
 * Uses 3D Perlin noise (dual-sampled worm noise) to carve winding 3D underground tunnels.
 * Allows caves to break through to the surface while fading out above terrain.
 */
export const isCaveVoxel = (
  noise: PerlinNoise3D,
  wx: number,
  wy: number,
  wz: number,
  surfaceHeight: number,
  amplitude?: number,
): boolean => {
  // Flat synthetic test terrain (amplitude === 0) has no caves
  if (amplitude === 0 || wy > surfaceHeight + 4) {
    return false;
  }
  const freq = FILL_CAVE_FREQUENCY;
  // Y-freq multiplier at 2.0: noise changes faster vertically than horizontally,
  // squashing caves into flat slabs without rapid oscillation (which would add triangles).
  const yFreqScale = 2.0;
  const n1 = noise.fbm(wx * freq, wy * freq * yFreqScale, wz * freq, FILL_CAVE_OCTAVES);
  const n2 = noise.fbm(
    (wx + 317) * freq,
    (wy + 317) * freq * yFreqScale,
    (wz + 317) * freq,
    FILL_CAVE_OCTAVES,
  );
  let val = n1 * n1 + n2 * n2;
  // Attenuate near surface so cave mouths are occasional
  if (wy > surfaceHeight - 4) {
    const diff = wy - (surfaceHeight - 4);
    val += diff * 0.005;
  }
  return val < FILL_CAVE_THRESHOLD;
};
