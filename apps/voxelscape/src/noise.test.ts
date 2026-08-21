// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_TERRAIN, PerlinNoise2D, heightAt } from "./noise";

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
});
