// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  DEFAULT_TERRAIN,
  PerlinNoise2D,
  heightAt,
  mountainHeightAt,
  plateauHeightAt,
} from "./noise";

describe("PerlinNoise2D", () => {
  it("is deterministic for a given seed", () => {
    const a = new PerlinNoise2D(42);
    const b = new PerlinNoise2D(42);
    for (let i = 0; i < 50; i++) {
      const x = i * 0.37 - 12;
      const z = i * 1.13 + 5;
      expect(a.noise(x, z)).toBe(b.noise(x, z));
    }
  });

  it("outputs bounded values close to [-1, 1]", () => {
    const n = new PerlinNoise2D(7);
    for (let x = -4; x <= 4; x++) {
      for (let z = -4; z <= 4; z++) {
        expect(Math.abs(n.noise(x, z))).toBeLessThanOrEqual(1.5);
      }
    }
  });

  it("differs between seeds", () => {
    const a = new PerlinNoise2D(1);
    const b = new PerlinNoise2D(2);
    let differing = 0;
    for (let x = 0; x < 20; x++) {
      for (let z = 0; z < 20; z++) {
        if (a.noise(x + 0.37, z + 0.61) !== b.noise(x + 0.37, z + 0.61)) {
          differing++;
        }
      }
    }
    expect(differing).toBeGreaterThan(0);
  });

  it("fbm stays bounded regardless of octaves", () => {
    const n = new PerlinNoise2D(12345);
    for (let octaves = 1; octaves <= 6; octaves++) {
      for (let i = 0; i < 40; i++) {
        const v = n.fbm(i * 0.7, i * 0.31, octaves);
        expect(Math.abs(v)).toBeLessThanOrEqual(1.5);
      }
    }
  });
});

describe("heightAt", () => {
  it("is deterministic for a given config", () => {
    const p = [13.5, -27.25, 0.001, 999.9];
    for (const x of p) {
      for (const z of p) {
        expect(heightAt(x, z, DEFAULT_TERRAIN)).toBe(
          heightAt(x, z, DEFAULT_TERRAIN),
        );
      }
    }
  });

  it("differs between seeds", () => {
    const a = { ...DEFAULT_TERRAIN, seed: 100 };
    const b = { ...DEFAULT_TERRAIN, seed: 200 };
    let differing = 0;
    for (let x = 0; x < 50; x++) {
      for (let z = 0; z < 50; z++) {
        if (heightAt(x, z, a) !== heightAt(x, z, b)) differing++;
      }
    }
    expect(differing).toBeGreaterThan(0);
  });

  it("is deterministic for a given plains config", () => {
    const p = [13.5, -27.25, 0.001, 999.9];
    for (const x of p) {
      for (const z of p) {
        expect(heightAt(x, z, DEFAULT_TERRAIN)).toBe(
          heightAt(x, z, DEFAULT_TERRAIN),
        );
      }
    }
  });

  it("stays within base ± amplitude even with plains enabled", () => {
    const lo = DEFAULT_TERRAIN.base - DEFAULT_TERRAIN.amplitude;
    const hi = DEFAULT_TERRAIN.base + DEFAULT_TERRAIN.amplitude;
    for (let i = 0; i < 500; i++) {
      const x = ((i * 37.7) % 200) - 100;
      const z = ((i * 91.3) % 200) - 100;
      const h = heightAt(x, z, DEFAULT_TERRAIN);
      expect(h).toBeGreaterThanOrEqual(lo);
      expect(h).toBeLessThanOrEqual(hi);
    }
  });

  it("matches pure mountains when the threshold can never be crossed", () => {
    const cfg: typeof DEFAULT_TERRAIN = {
      ...DEFAULT_TERRAIN,
      plains: { seed: 24680, cell: 40, threshold: 1.5, edge: 0.1 },
    };
    for (let i = 0; i < 100; i++) {
      const x = i * 3.7;
      const z = i * 1.1 + 5;
      expect(heightAt(x, z, cfg)).toBe(mountainHeightAt(x, z, cfg));
    }
  });

  it("averages the four surrounding plateau heights at a cell centre", () => {
    const cfg: typeof DEFAULT_TERRAIN = {
      ...DEFAULT_TERRAIN,
      plains: { seed: 24680, cell: 40, threshold: -1.5, edge: 0.1 },
    };
    const cx = 2;
    const cz = 3;
    const x = (cx + 0.5) * 40;
    const z = (cz + 0.5) * 40;
    // a cell-centre point is a bilinear corner: it weights all four
    // neighbouring plateau elevations equally
    const expected =
      (plateauHeightAt(cx, cz, cfg) +
        plateauHeightAt(cx + 1, cz, cfg) +
        plateauHeightAt(cx, cz + 1, cfg) +
        plateauHeightAt(cx + 1, cz + 1, cfg)) /
      4;
    expect(heightAt(x, z, cfg)).toBeCloseTo(expected, 6);
  });

  it("is nearly level across the middle of an always-flat cell", () => {
    const cfg: typeof DEFAULT_TERRAIN = {
      ...DEFAULT_TERRAIN,
      plains: { seed: 24680, cell: 40, threshold: -1.5, edge: 0.1 },
    };
    const cx = 2;
    const cz = 3;
    const x = (cx + 0.5) * 40;
    const z = (cz + 0.5) * 40;
    const centre = heightAt(x, z, cfg);
    // the plateau elevation is a low-frequency field, so a stride around the
    // centre stays very close to level (voxel size is 2, so <4u is ~flat)
    for (let dx = -8; dx <= 8; dx += 4) {
      for (let dz = -8; dz <= 8; dz += 4) {
        const h = heightAt(x + dx, z + dz, cfg);
        expect(Math.abs(h - centre)).toBeLessThan(4);
      }
    }
  });

  it("flat land undulates far less than the mountains", () => {
    const cfg: typeof DEFAULT_TERRAIN = {
      ...DEFAULT_TERRAIN,
      plains: { seed: 24680, cell: 40, threshold: -1.5, edge: 0.1 },
    };
    const cx = 2;
    const cz = 3;
    const x = (cx + 0.5) * 40;
    const z = (cz + 0.5) * 40;
    let flatSpread = 0;
    for (let i = 0; i < 40; i++) {
      const h = heightAt(x + i, z + i, cfg);
      flatSpread = Math.max(flatSpread, Math.abs(h - heightAt(x, z, cfg)));
    }
    let mountainSpread = 0;
    for (let i = 0; i < 40; i++) {
      const h = mountainHeightAt(x + i, z + i, cfg);
      mountainSpread = Math.max(
        mountainSpread,
        Math.abs(h - mountainHeightAt(x, z, cfg)),
      );
    }
    // the whole point of the plateau field: over a 40u run the flat land moves
    // a fraction of what the underlying mountains do
    expect(flatSpread).toBeLessThan(mountainSpread * 0.35);
  });
});
