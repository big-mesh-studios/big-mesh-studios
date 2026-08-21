// Seeded 2D Perlin noise + fractal-brownian-motion height sampling. Ported from
// melty-karts' `Track.ts` height field so both projects generate the same
// style of rolling terrain.

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

export interface TerrainConfig {
  seed: number;
  // noise space frequency; smaller => larger hills
  frequency: number;
  // fbm output is ~[-1, 1], scaled by this to get world-unit height range
  amplitude: number;
  octaves: number;
  // base height added to the fbm output (world units)
  base: number;
}

export const DEFAULT_TERRAIN: TerrainConfig = {
  seed: 54321,
  frequency: 0.008,
  amplitude: 80,
  octaves: 4,
  base: 64,
};

// One height sampler per seed, so repeated `heightAt` calls during a fill don't
// rebuild the permutation table every column.
const samplerCache = new Map<number, PerlinNoise2D>();

const samplerFor = (seed: number): PerlinNoise2D => {
  let sampler = samplerCache.get(seed);
  if (sampler === undefined) {
    sampler = new PerlinNoise2D(seed);
    samplerCache.set(seed, sampler);
  }
  return sampler;
};

// Analytic terrain height in world units at absolute (worldX, worldZ). Uses
// absolute coordinates so neighbouring blocks tile seamlessly. Mirrors the
// height field `fillStore` bakes into a `VoxelStore`.
export const heightAt = (
  worldX: number,
  worldZ: number,
  config: TerrainConfig = DEFAULT_TERRAIN,
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
