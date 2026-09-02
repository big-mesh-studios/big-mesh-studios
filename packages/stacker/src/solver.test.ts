// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Bitmap } from "@big-mesh-studios/maths";
import { sideKinds, type Sides } from "./data";
import { encodePalette, solveVoxels } from "./solver";

const DIMS = { width: 3, height: 3, depth: 3 };

const solidSides = (): Sides => {
  const sides = {} as Sides;
  for (const kind of sideKinds) {
    const bitmap = Bitmap.create(3, 3);
    bitmap.data.fill(1);
    sides[kind] = bitmap;
  }
  return sides;
};

describe("solveVoxels", () => {
  it("packs a fully solid volume into the 30-bit face-colour format", () => {
    const out = solveVoxels(DIMS, solidSides());
    expect(out.length).toBe(27 * 4);
    for (let i = 0; i < 27; i++) {
      const o = i * 4;
      // every face is index 1: f|b<<5, l<<2|r<<7, t<<4, bo<<1 plus the solid bits
      expect(out[o]).toBe(0x21);
      expect(out[o + 1]).toBe(0x84);
      expect(out[o + 2]).toBe(0x10);
      expect(out[o + 3]).toBe(0xc2);
    }
    // the top two alpha bits mark the voxel solid
    expect(out[3] & 0xc0).toBe(0xc0);
  });

  it("carves a run for an empty cell on every one of the six sides", () => {
    // Each side looks down one axis, so one empty cell takes three of the
    // twenty-seven voxels away whichever side it was erased from.
    for (const kind of sideKinds) {
      const sides = solidSides();
      sides[kind].data[1 * 3 + 1] = Bitmap.EMPTY;
      const out = solveVoxels(DIMS, sides);

      let solid = 0;
      for (let i = 3; i < out.length; i += 4) {
        if (out[i] !== 0) {
          solid++;
        }
      }

      expect(solid, `erased the middle cell of ${kind}`).toBe(24);
    }
  });

  it("carves the columns an empty side cell looks down", () => {
    const sides = solidSides();
    // front (px=1, py=0) maps to (x=1, y=height-1=2, z=0..2)
    sides.front.data[0 * 3 + 1] = Bitmap.EMPTY;
    const out = solveVoxels(DIMS, sides);
    const alpha = (x: number, y: number, z: number): number =>
      out[(z * 9 + y * 3 + x) * 4 + 3];
    expect(alpha(1, 2, 0)).toBe(0);
    expect(alpha(1, 2, 1)).toBe(0);
    expect(alpha(1, 2, 2)).toBe(0);
    expect(alpha(0, 2, 1)).not.toBe(0);
  });

  it("carves upwards from the cell the bottom is drawn on", () => {
    const sides = solidSides();
    // bottom (px=1, py=0) maps to (x=1, z=depth-1=2, y=0..2), the same cell the
    // packed face colour is read from.
    sides.bottom.data[0 * 3 + 1] = Bitmap.EMPTY;
    const out = solveVoxels(DIMS, sides);
    const alpha = (x: number, y: number, z: number): number =>
      out[(z * 9 + y * 3 + x) * 4 + 3];
    expect(alpha(1, 0, 2)).toBe(0);
    expect(alpha(1, 1, 2)).toBe(0);
    expect(alpha(1, 2, 2)).toBe(0);
    expect(alpha(1, 1, 1)).not.toBe(0);
  });
});

describe("encodePalette", () => {
  it("writes one RGBA texel per palette entry", () => {
    const palette = [
      { r: 1, g: 2, b: 3, a: 4 },
      { r: 5, g: 6, b: 7, a: 8 },
    ];
    expect(encodePalette(palette)).toEqual(
      new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
    );
  });
});
