// The still clouds `fillStore` scatters through the cloud band: a seeded 3D
// Perlin field (`PerlinNoise3D`), sampled at the world's voxel scale so the
// layout is deterministic per terrain seed. Kept in its own module because the
// fill worker must not pull in rmsl; this module imports only `noise.ts`.
import { PerlinNoise3D } from "./noise";

/** World units per axis the cloud field is periodic over. */
const FILL_CLOUD_TILE = 1024;
/** Lattice periods of the cloud noise across that tile; the field recycles every `FILL_CLOUD_TILE` units. */
const FILL_CLOUD_PERIOD = 8;
/** The altitude, in world units, the still-cloud band is centred on. */
export const FILL_CLOUD_Y = 220;
/** Half the band's height in world units. */
export const FILL_CLOUD_HALF_HEIGHT = 64;
/** Noise frequency, in 1/world-units: exactly `FILL_CLOUD_PERIOD` periods across the tile. */
export const FILL_CLOUD_FREQUENCY = FILL_CLOUD_PERIOD / FILL_CLOUD_TILE;
/** How many times wider than tall the still clouds come out. */
export const FILL_CLOUD_FLATNESS = 5;
/** fBm octaves of the cloud noise. */
export const FILL_CLOUD_OCTAVES = 2;
/** The fBm value a voxel must clear to be cloud; raised to thin the cloud band and cap its triangle count. */
export const FILL_CLOUD_THRESHOLD = 0.52;
/** Coverage fBm value a column must clear to hold any cloud. */
export const FILL_CLOUD_COVERAGE_THRESHOLD = 0.15;
/** How strongly a column's coverage lowers the fill threshold, making denser banks. */
export const FILL_CLOUD_COVERAGE_DRIVE = 0.8;
/** Distinguishes the cloud seed stream from the terrain seed. */
export const FILL_CLOUD_SEED_MIX = 0xc10d5;

/** The knobs `fillStore` samples the still-cloud field with. */
export interface CloudFillOptions {
  /** Altitude the band is centred on, in world units. */
  y: number;
  /** Half the band's height, in world units. */
  halfHeight: number;
  /** Y coordinate of the 3D noise is scaled by this, compressing clouds vertically. */
  flatness: number;
  /** Noise frequency, in 1/world-units. */
  frequency: number;
  /** Lattice period of the cloud noise, in its own argument space. */
  period: number;
  /** fBm octaves of the cloud noise. */
  octaves: number;
  /** The fBm value a voxel must clear to be cloud. */
  threshold: number;
  /** Coverage fBm value a column must clear to hold any cloud. */
  coverageThreshold: number;
  /** How strongly coverage lowers the fill threshold. */
  coverageDrive: number;
}

export const CLOUD_FILL_DEFAULTS: CloudFillOptions = {
  y: FILL_CLOUD_Y,
  halfHeight: FILL_CLOUD_HALF_HEIGHT,
  flatness: FILL_CLOUD_FLATNESS,
  frequency: FILL_CLOUD_FREQUENCY,
  period: FILL_CLOUD_PERIOD,
  octaves: FILL_CLOUD_OCTAVES,
  threshold: FILL_CLOUD_THRESHOLD,
  coverageThreshold: FILL_CLOUD_COVERAGE_THRESHOLD,
  coverageDrive: FILL_CLOUD_COVERAGE_DRIVE,
};

/** One cloud noise per terrain seed, so repeated fills don't rebuild the permutation table. */
const noiseCache = new Map<number, PerlinNoise3D>();

/** The seeded, `opts.period`-periodic cloud noise the still clouds are sampled from, cached per seed. */
export const cloudFillNoise = (seed: number): PerlinNoise3D => {
  let noise = noiseCache.get(seed);
  if (noise === undefined) {
    noise = new PerlinNoise3D(
      seed ^ FILL_CLOUD_SEED_MIX,
      CLOUD_FILL_DEFAULTS.period,
    );
    noiseCache.set(seed, noise);
  }
  return noise;
};

/** The coverage value of the cloud field above a column, sampled at the band's centre height. */
export const cloudColumnCoverage = (
  noise: PerlinNoise3D,
  worldX: number,
  worldZ: number,
  opts: CloudFillOptions = CLOUD_FILL_DEFAULTS,
): number =>
  noise.fbm(
    worldX * opts.frequency,
    opts.y * opts.frequency,
    worldZ * opts.frequency,
    opts.octaves,
  );

/**
 * Whether the voxel at (`worldX`, `worldY`, `worldZ`) is still-cloud, given
 * the coverage of its column: the fill threshold drops where coverage is high,
 * so denser areas grow fatter banks.
 */
export const cloudVoxelAt = (
  noise: PerlinNoise3D,
  worldX: number,
  worldY: number,
  worldZ: number,
  coverage: number,
  opts: CloudFillOptions = CLOUD_FILL_DEFAULTS,
): boolean => {
  const s = noise.fbm(
    worldX * opts.frequency,
    worldY * opts.frequency * opts.flatness,
    worldZ * opts.frequency,
    opts.octaves,
  );
  return s > opts.threshold - Math.max(0, coverage) * opts.coverageDrive;
};
