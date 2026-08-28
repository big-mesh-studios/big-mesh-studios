// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { encode } from "fast-png";
import JSZip from "jszip";
import { load, save } from "./format";
import { sideAxes, sideKinds, type SideKind } from "./data";

const PALETTE = Array.from({ length: 32 }, (_, i) => [i, i, i, 255]);

const side = (width: number, height: number): Uint8Array =>
  encode({
    width,
    height,
    data: new Uint8Array(width * height).fill(1),
    channels: 1,
    depth: 8,
    palette: PALETTE,
  });

/** A zip holding the named sides at the sizes given, and a palette. */
const zipOf = async (sides: Partial<Record<SideKind, Uint8Array>>) => {
  const zip = new JSZip();
  for (const [kind, png] of Object.entries(sides)) {
    zip.file(`${kind}.png`, png);
  }
  const palette = new Uint8Array(32 * 4);
  for (let i = 0; i < 32; i++) {
    palette.set([i, i, i, 255], i * 4);
  }
  zip.file(
    "palette.png",
    encode({ width: 32, height: 1, data: palette, channels: 4 }),
  );
  return zip.generateAsync({ type: "blob" });
};

/** Every side of a box, each drawn at the size of the two axes it spans. */
const boxOf = (width: number, height: number, depth: number) => {
  const extent = { width, height, depth };
  return Object.fromEntries(
    sideKinds.map((kind) => {
      const [across, down] = sideAxes[kind];
      return [kind, side(extent[across], extent[down])];
    }),
  ) as Record<SideKind, Uint8Array>;
};

describe("dimensions", () => {
  it("reads a box that is not a cube", async () => {
    const { dimensions } = await load(await zipOf(boxOf(4, 3, 2)));

    expect(dimensions).toEqual({ width: 4, height: 3, depth: 2 });
  });

  it("reads a cube", async () => {
    const { dimensions } = await load(await zipOf(boxOf(3, 3, 3)));

    expect(dimensions).toEqual({ width: 3, height: 3, depth: 3 });
  });

  it("survives a round trip through save", async () => {
    const original = await load(await zipOf(boxOf(6, 5, 4)));

    const reread = await load(await save(original.sides, original.palette));

    expect(reread.dimensions).toEqual({ width: 6, height: 5, depth: 4 });
  });
});

describe("sides that are not faces of one box", () => {
  it("refuses two sides that disagree about the width", async () => {
    const sides = boxOf(4, 3, 2);
    sides.top = side(5, 2); // top is width across; the front says width is 4

    await expect(load(await zipOf(sides))).rejects.toThrow(
      /top\.png makes the model 5 wide, and front\.png makes it 4/,
    );
  });

  it("refuses two sides that disagree about the height", async () => {
    const sides = boxOf(4, 3, 2);
    sides.left = side(2, 7); // left is height down; the front says height is 3

    await expect(load(await zipOf(sides))).rejects.toThrow(
      /left\.png makes the model 7 high, and front\.png makes it 3/,
    );
  });

  it("refuses two sides that disagree about the depth", async () => {
    const sides = boxOf(4, 3, 2);
    sides.right = side(9, 3); // right is depth across; the left says depth is 2

    await expect(load(await zipOf(sides))).rejects.toThrow(
      /right\.png makes the model 9 deep, and left\.png makes it 2/,
    );
  });
});

describe("a side the file does not carry", () => {
  it("is drawn as nothing at the size the other sides give it", async () => {
    const sides = boxOf(4, 3, 2);
    delete (sides as Partial<Record<SideKind, Uint8Array>>).top;

    const { sides: read, dimensions } = await load(await zipOf(sides));

    // top spans width across and depth down: 4 by 2, not a square
    expect(read.top.width).toBe(4);
    expect(read.top.height).toBe(2);
    expect(read.top.data.every((cell) => cell === 255)).toBe(true);
    expect(dimensions).toEqual({ width: 4, height: 3, depth: 2 });
  });

  it("falls back to a default extent for an axis nothing measures", async () => {
    // front alone measures width and height; nothing measures depth
    const { sides, dimensions } = await load(
      await zipOf({ front: side(4, 3) }),
    );

    expect(dimensions).toEqual({ width: 4, height: 3, depth: 32 });
    expect(sides.left.width).toBe(32);
    expect(sides.left.height).toBe(3);
  });
});
