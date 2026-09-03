// The lava that `fillStore` pools at the bottom of deep caves: a seeded 3D
// Perlin field (as in `cloud-fill.ts`) sampled per column decides which caves
// hold lava, so only some of them do. Kept in its own module because the fill
// worker must not pull in rmsl; this module imports only `noise.ts`.
import { PerlinNoise3D } from "./noise";

/** Distinguishes the lava seed stream from the terrain and cave seeds. */
export const FILL_LAVA_SEED_MIX = 0x1a7a1;

/** Noise frequency, in 1/world-units, of the column gate that picks which caves get lava. */
export const FILL_LAVA_FREQUENCY = 1 / 1500;

/** fBm octaves of the lava column gate. */
export const FILL_LAVA_OCTAVES = 2;

/**
 * The gate value a column's lava noise must clear to hold lava at its cave
 * bottom. Just above the near-zero centre of the fBm field, so broad regions —
 * not every deep cave — pool with lava.
 */
export const FILL_LAVA_THRESHOLD = 0.02;

/** World units above the cave-bottom pool the lava surface sits at. */
export const LAVA_DEPTH = 30;

/** One lava noise per terrain seed, so repeated fills don't rebuild the permutation table. */
const noiseCache = new Map<number, PerlinNoise3D>();

/** The seeded lava-gate noise, cached per terrain seed. */
export const lavaFillNoise = (seed: number): PerlinNoise3D => {
  let noise = noiseCache.get(seed);
  if (noise === undefined) {
    noise = new PerlinNoise3D(seed ^ FILL_LAVA_SEED_MIX, 256);
    noiseCache.set(seed, noise);
  }
  return noise;
};

/** Whether the column through (`worldX`, `worldZ`) holds lava at its cave bottom. */
export const columnHasLava = (
  noise: PerlinNoise3D,
  worldX: number,
  worldZ: number,
): boolean =>
  noise.fbm(
    worldX * FILL_LAVA_FREQUENCY,
    0,
    worldZ * FILL_LAVA_FREQUENCY,
    FILL_LAVA_OCTAVES,
  ) > FILL_LAVA_THRESHOLD;
