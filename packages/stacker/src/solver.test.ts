// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Bitmap } from "@big-mesh-studios/maths";
import { sideAxes, sideKinds, type Section, type Sides } from "./data";
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

describe("solveVoxels across a section", () => {
  const DIMS = { width: 3, height: 3, depth: 2 };

  /** Every side of the box `DIMS` describes, painted in `colour` throughout. */
  const paintedSides = (colour = 1): Sides => {
    const sides = {} as Sides;

    for (const kind of sideKinds) {
      const [across, down] = sideAxes[kind];
      const bitmap = Bitmap.create(DIMS[across], DIMS[down]);
      bitmap.data.fill(colour);
      sides[kind] = bitmap;
    }

    return sides;
  };

  /** A drawing the size of the front and back, painted in `colour` throughout. */
  const facingDepth = (colour = 1): Bitmap => {
    const bitmap = Bitmap.create(DIMS.width, DIMS.height);
    bitmap.data.fill(colour);
    return bitmap;
  };

  const isSolid = (out: Uint8Array, x: number, y: number, z: number): boolean =>
    out[(z * 9 + y * 3 + x) * 4 + 3] !== 0;

  const solidCount = (out: Uint8Array): number => {
    let solid = 0;

    for (let i = 3; i < out.length; i += 4) {
      if (out[i] !== 0) {
        solid++;
      }
    }

    return solid;
  };

  /**
   * A slab across the back of the box with two bumps standing on it, at
   * opposite corners of the front slice.
   *
   * The two sides that look along the width and the height can say that the
   * front slice is only x = 0 and x = 2, and only y = 0 and y = 2. Their
   * silhouettes meet at four corners rather than two, so six sides alone always
   * put up two bumps nobody drew.
   */
  const twoBumps = (): Sides => {
    const sides = paintedSides();
    // The top is drawn width across and depth down, so its cell (1, 1) is the
    // middle column of the front slice: the slice is solid at x = 0 and x = 2.
    sides.top.data[1 * DIMS.width + 1] = Bitmap.EMPTY;
    // The left is drawn depth across and height down, so its cell (1, 1) is the
    // middle row of that slice: solid at y = 0 and y = 2.
    sides.left.data[1 * DIMS.depth + 1] = Bitmap.EMPTY;
    return sides;
  };

  it("puts up two bumps nobody drew when the six sides are on their own", () => {
    const out = solveVoxels(DIMS, twoBumps());

    // the slab, whole
    expect(solidCount(out)).toBe(9 + 4);
    expect(isSolid(out, 0, 0, 1)).toBe(true);
    expect(isSolid(out, 2, 2, 1)).toBe(true);
    // the two nobody asked for
    expect(isSolid(out, 0, 2, 1)).toBe(true);
    expect(isSolid(out, 2, 0, 1)).toBe(true);
  });

  it("takes them away when a section gives the front slice a face of its own", () => {
    // The cut stands before the front slice, so that slice is opened by the
    // section's own face and the slab behind it is closed by the other.
    const after = Bitmap.create(DIMS.width, DIMS.height);
    // (px, py) is (width - 1 - x, height - 1 - y), the way the back is drawn
    after.data[2 * 3 + 2] = 1; // x = 0, y = 0
    after.data[0 * 3 + 0] = 1; // x = 2, y = 2

    const sections: Section[] = [
      { axis: "depth", at: 1, before: facingDepth(), after },
    ];

    const out = solveVoxels(DIMS, twoBumps(), sections);

    expect(solidCount(out)).toBe(9 + 2);
    expect(isSolid(out, 0, 0, 1)).toBe(true);
    expect(isSolid(out, 2, 2, 1)).toBe(true);
    expect(isSolid(out, 0, 2, 1)).toBe(false);
    expect(isSolid(out, 2, 0, 1)).toBe(false);
    // the slab behind the cut is untouched
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(isSolid(out, x, y, 0)).toBe(true);
      }
    }
  });

  it("leaves the shape alone when both faces are copies of the sides they parallel", () => {
    const sides = twoBumps();
    const sections: Section[] = [
      {
        axis: "depth",
        at: 1,
        before: { ...sides.front, data: new Uint8Array(sides.front.data) },
        after: { ...sides.back, data: new Uint8Array(sides.back.data) },
      },
    ];

    expect(solveVoxels(DIMS, sides, sections)).toEqual(
      solveVoxels(DIMS, sides),
    );
  });

  it("colours a voxel's face from the section that closes its stretch", () => {
    const sections: Section[] = [
      { axis: "depth", at: 1, before: facingDepth(3), after: facingDepth(1) },
    ];

    const out = solveVoxels(DIMS, paintedSides(1), sections);
    // the packed front face: the low five bits of the first byte
    const frontFace = (x: number, y: number, z: number) =>
      out[(z * 9 + y * 3 + x) * 4] & 0b11111;

    // the slice behind the cut looks forward at the section's face
    expect(frontFace(0, 0, 0)).toBe(3);
    // the slice in front of it still looks forward at the front side
    expect(frontFace(0, 0, 1)).toBe(1);
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
