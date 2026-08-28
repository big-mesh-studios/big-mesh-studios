// Seeded 2D Perlin noise and fractal Brownian motion (fBm) height sampling
// for generating rolling terrain.

export class PerlinNoise2D {
  private perm: number[] = [];

  constructor(seed: number = 0) {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;

    let n = seed;
    for (let i = 255; i > 0; i--) {
      n = (n * 1103515245 + 12345) & 0x7fffffff;
      const j = n % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }

    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, z: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : z;
    const v = h < 2 ? z : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    z -= Math.floor(z);
    const u = this.fade(x);
    const v = this.fade(z);

    const A = this.perm[X] + Z;
    const B = this.perm[X + 1] + Z;

    return this.lerp(
      this.lerp(
        this.grad(this.perm[A], x, z),
        this.grad(this.perm[B], x - 1, z),
        u,
      ),
      this.lerp(
        this.grad(this.perm[A + 1], x, z - 1),
        this.grad(this.perm[B + 1], x - 1, z - 1),
        u,
      ),
      v,
    );
  }

  fbm(x: number, z: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise(x * frequency, z * frequency);
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / maxValue;
  }
}

export interface PlainsConfig {
  /** Seed for the second, flatness-mask noise. */
  seed: number;
  /**
   * World units per plain cell; plateaus are roughly one cell across. Should
   * be a multiple of the voxel size for clean edges.
   */
  cell: number;
  /** Cell flatness values above this threshold become flat land. */
  threshold: number;
  /**
   * Width of the smoothstep band around `threshold` where mountains and
   * plains blend. Larger values give softer transitions; smaller values
   * give sharper coastlines.
   */
  edge: number;
  /**
   * Frequency of the noise the plateau elevation is sampled from, much
   * lower than the mountain field's frequency so flat regions stay nearly
   * level across long spans. Defaults to 0.0005, which keeps flats within a
   * few units of level over a cell; raise it for more rolling, prairie-like
   * flats.
   */
  plateauFrequency?: number;
  plateauOctaves?: number;
}

export interface TerrainConfig {
  seed: number;
  /** Noise-space frequency; smaller values produce larger hills. */
  frequency: number;
  /**
   * Scales the fBm output — roughly in the range [-1, 1] — to a world-unit
   * height range.
   */
  amplitude: number;
  octaves: number;
  /** Base height added to the fBm output, in world units. */
  base: number;
  /**
   * Optional second, coarse noise that flattens patches of the terrain into
   * smooth plateaus. Omit it to get pure mountains.
   */
  plains?: PlainsConfig;
  /**
   * Optional global water level, in world units: columns that dip below
   * this height are filled with water up to it. Omit it for a fully dry
   * world.
   */
  seaLevel?: number;
}

export const DEFAULT_TERRAIN: TerrainConfig = {
  seed: 54321,
  frequency: 0.008,
  amplitude: 80,
  octaves: 4,
  base: 64,
  plains: {
    seed: 24680,
    cell: 48,
    threshold: -0.1,
    edge: 0.2,
    plateauFrequency: 0.0005,
    plateauOctaves: 2,
  },
  seaLevel: 56,
};

/**
 * One height sampler per seed, so repeated `heightAt` calls during a fill
 * don't rebuild the permutation table for every column.
 */
const samplerCache = new Map<number, PerlinNoise2D>();

const samplerFor = (seed: number): PerlinNoise2D => {
  let sampler = samplerCache.get(seed);
  if (sampler === undefined) {
    sampler = new PerlinNoise2D(seed);
    samplerCache.set(seed, sampler);
  }
  return sampler;
};

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const lerp = (a: number, b: number, t: number): number => a + t * (b - a);

/**
 * Bilinear interpolation of the four values surrounding a point in cell
 * space (a cell index plus a fractional offset), sampled from
 * `atCell(cx, cz)` at each of the four neighbouring cell centres.
 *
 * @param fx - Fractional cell-space X coordinate.
 * @param fz - Fractional cell-space Z coordinate.
 * @param atCell - Samples the field's value at an integer cell coordinate.
 * @returns The bilinearly interpolated value at (`fx`, `fz`).
 */
const bilinearCellField = (
  fx: number,
  fz: number,
  atCell: (cx: number, cz: number) => number,
): number => {
  const cx0 = Math.floor(fx);
  const cz0 = Math.floor(fz);
  const tx = fx - cx0;
  const tz = fz - cz0;
  const c00 = atCell(cx0, cz0);
  const c10 = atCell(cx0 + 1, cz0);
  const c01 = atCell(cx0, cz0 + 1);
  const c11 = atCell(cx0 + 1, cz0 + 1);
  return lerp(lerp(c00, c10, tx), lerp(c01, c11, tx), tz);
};

/**
 * The pure mountain field, with no plateau flattening applied. Exposed
 * separately so `heightAt` can sample plateau elevations from it and tests
 * can compare against it.
 *
 * @param worldX - World-space X coordinate.
 * @param worldZ - World-space Z coordinate.
 * @param config - Terrain configuration to sample from.
 * @returns The mountain-field height, in world units, at (`worldX`, `worldZ`).
 */
export const mountainHeightAt = (
  worldX: number,
  worldZ: number,
  config: TerrainConfig,
): number => {
  const sampler = samplerFor(config.seed);
  return (
    config.base +
    sampler.fbm(
      worldX * config.frequency,
      worldZ * config.frequency,
      config.octaves,
    ) *
      config.amplitude
  );
};

/**
 * One flatness-mask value per plain cell, cached by (seed, cx, cz) because a
 * block fill calls `heightAt` once per column and adjacent columns share
 * cells.
 */
const flatnessCellCache = new Map<string, number>();
const flatnessCell = (plains: PlainsConfig, cx: number, cz: number): number => {
  const key = `${plains.seed}|${cx}|${cz}`;
  let v = flatnessCellCache.get(key);
  if (v === undefined) {
    // sample at the cell centre (+0.5): at exact integer lattice points this
    // Perlin implementation always returns 0, which would zero the whole mask
    v = samplerFor(plains.seed).noise(cx + 0.5, cz + 0.5);
    flatnessCellCache.set(key, v);
  }
  return v;
};

/**
 * One plateau elevation per plain cell, cached alongside the flatness mask.
 * The elevation is sampled from the mountain sampler at a much lower
 * frequency (`plateauFrequency`), so adjacent cells differ only slightly and
 * flat regions read as nearly level land rather than as the local mountain
 * height.
 */
const flatHeightCellCache = new Map<string, number>();
const flatHeightCell = (
  config: TerrainConfig,
  plains: PlainsConfig,
  cx: number,
  cz: number,
): number => {
  const freq = plains.plateauFrequency ?? 0.0005;
  const octaves = plains.plateauOctaves ?? 2;
  const key = `${config.seed}|${plains.cell}|${freq}|${octaves}|${cx}|${cz}`;
  let v = flatHeightCellCache.get(key);
  if (v === undefined) {
    const sampler = samplerFor(config.seed);
    v =
      config.base +
      sampler.fbm(
        (cx + 0.5) * plains.cell * freq,
        (cz + 0.5) * plains.cell * freq,
        octaves,
      ) *
        config.amplitude;
    flatHeightCellCache.set(key, v);
  }
  return v;
};

/**
 * The plateau elevation, in world units, of the plain cell (`cx`, `cz`).
 * Exposed so tests can verify the bilinear plateau field against it.
 *
 * @param cx - Plain-cell X index.
 * @param cz - Plain-cell Z index.
 * @param config - Terrain configuration to sample from.
 * @returns The plateau elevation, in world units.
 */
export const plateauHeightAt = (
  cx: number,
  cz: number,
  config: TerrainConfig,
): number => {
  if (config.plains === undefined) {
    return mountainHeightAt((cx + 0.5) * 1, (cz + 0.5) * 1, config);
  }
  return flatHeightCell(config, config.plains, cx, cz);
};

/**
 * Analytic terrain height, in world units, at absolute (`worldX`, `worldZ`).
 * Uses absolute coordinates so neighbouring blocks tile seamlessly, and
 * mirrors the height field `fillStore` bakes into a `VoxelStore`. With
 * `config.plains` set, a coarse second noise flattens patches of the
 * mountain field into smooth rolling plateaus, blending through a
 * smoothstep band around the threshold.
 *
 * @param worldX - Absolute world-space X coordinate.
 * @param worldZ - Absolute world-space Z coordinate.
 * @param config - Terrain configuration to sample from; defaults to `DEFAULT_TERRAIN`.
 * @returns Terrain height, in world units, at (`worldX`, `worldZ`).
 */
export const heightAt = (
  worldX: number,
  worldZ: number,
  config: TerrainConfig = DEFAULT_TERRAIN,
): number => {
  const mountain = mountainHeightAt(worldX, worldZ, config);
  if (config.plains === undefined) {
    return mountain;
  }
  const { cell, threshold, edge } = config.plains;
  const fx = worldX / cell;
  const fz = worldZ / cell;
  // bilinear smooth fields (in cell space) so plateau coastlines and elevations
  // interpolate between cells instead of stepping
  const flatness = bilinearCellField(fx, fz, (cx, cz) =>
    flatnessCell(config.plains!, cx, cz),
  );
  const flatHeight = bilinearCellField(fx, fz, (cx, cz) =>
    flatHeightCell(config, config.plains!, cx, cz),
  );
  const t = smoothstep(threshold - edge, threshold + edge, flatness);
  return lerp(mountain, flatHeight, t);
};
