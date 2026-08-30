// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { encode } from "fast-png";
import JSZip from "jszip";
import { load, loadFigure, save, saveFigure } from "./format";
import {
  composeRoot,
  partDimensions,
  sideAxes,
  sideKinds,
  type Figure,
  type Part,
  type SideKind,
} from "./data";
import { Bitmap, Vector3D } from "@big-mesh-studios/maths";

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

describe("sides and palette", () => {
  it("reads the drawn cells and the palette they address", async () => {
    const { sides, palette, migrated } = await load(
      await zipOf(boxOf(3, 3, 3)),
    );

    expect([...sides.front.data]).toEqual(new Array(9).fill(1));
    expect([...sides.back.data]).toEqual(new Array(9).fill(1));
    expect(palette).toHaveLength(32);
    expect(palette[1]).toEqual({ r: 1, g: 1, b: 1, a: 255 });
    expect(migrated).toBe(false);
  });

  it("migrates a model whose sides hold colours rather than palette indices", async () => {
    // Every pixel is the colour (1, 1, 1); reading it back finds that colour
    // one palette slot, and every cell drawn in it names that slot.
    const pixels = new Uint8Array(3 * 3 * 4);
    for (let p = 0; p < 9; p++) {
      pixels.set([1, 1, 1, 255], p * 4);
    }
    const drawn = encode({
      width: 3,
      height: 3,
      data: pixels,
      channels: 4,
      depth: 8,
    });
    const colourSides = Object.fromEntries(
      sideKinds.map((kind) => [kind, drawn]),
    ) as Record<SideKind, Uint8Array>;

    const { sides, palette, migrated, dimensions } = await load(
      await zipOf(colourSides),
    );

    expect(migrated).toBe(true);
    expect(dimensions).toEqual({ width: 3, height: 3, depth: 3 });
    const slot = sides.front.data[0];
    expect(palette[slot]).toEqual({ r: 1, g: 1, b: 1, a: 255 });
    expect([...sides.front.data]).toEqual(new Array(9).fill(slot));
  });
});

/** A part of the given size, drawn in one palette slot, sitting where it is put. */
const partOf = (
  name: string,
  extent: { width: number; height: number; depth: number },
  placement: Partial<Pick<Part, "root" | "pivot" | "parent">> = {},
): Part => ({
  name,
  sides: Object.fromEntries(
    sideKinds.map((kind) => {
      const [across, down] = sideAxes[kind];
      const bitmap = Bitmap.create(extent[across], extent[down]);
      bitmap.data.fill(1);
      return [kind, bitmap];
    }),
  ) as Part["sides"],
  root: placement.root ?? Vector3D.create(),
  pivot: placement.pivot ?? Vector3D.create(),
  parent: placement.parent ?? null,
});

const figureOf = (...parts: Part[]): Figure => ({
  parts,
  palette: Array.from({ length: 32 }, (_, i) => ({
    r: i,
    g: i,
    b: i,
    a: 255,
  })),
});

describe("a figure of several parts", () => {
  it("survives a round trip, keeping each part's box and placement", async () => {
    const figure = figureOf(
      partOf("torso", { width: 6, height: 8, depth: 4 }),
      partOf(
        "head",
        { width: 4, height: 4, depth: 4 },
        {
          root: Vector3D.create(0, 8, 0),
          pivot: Vector3D.create(2, 0, 2),
          parent: "torso",
        },
      ),
    );

    const reread = await loadFigure(await saveFigure(figure));

    expect(reread.parts.map((part) => part.name)).toEqual(["torso", "head"]);
    expect(partDimensions(reread.parts[0])).toEqual({
      width: 6,
      height: 8,
      depth: 4,
    });
    expect(partDimensions(reread.parts[1])).toEqual({
      width: 4,
      height: 4,
      depth: 4,
    });
    expect(reread.parts[1].root).toEqual({ x: 0, y: 8, z: 0 });
    expect(reread.parts[1].pivot).toEqual({ x: 2, y: 0, z: 2 });
    expect(reread.parts[1].parent).toBe("torso");
    expect(reread.migrated).toBe(false);
  });

  it("keeps each part's drawings apart", async () => {
    const figure = figureOf(
      partOf("torso", { width: 2, height: 2, depth: 2 }),
      partOf("head", { width: 3, height: 3, depth: 3 }),
    );
    figure.parts[1].sides.front.data.fill(7);

    const reread = await loadFigure(await saveFigure(figure));

    expect([...reread.parts[0].sides.front.data]).toEqual(new Array(4).fill(1));
    expect([...reread.parts[1].sides.front.data]).toEqual(new Array(9).fill(7));
  });

  it("names the part in a refusal, so it is clear which box does not close", async () => {
    const figure = figureOf(partOf("head", { width: 4, height: 3, depth: 2 }));
    // top is width across; the front says width is 4
    figure.parts[0].sides.top = Bitmap.create(5, 2);

    await expect(loadFigure(await saveFigure(figure))).rejects.toThrow(
      /head\/top\.png makes the model 5 wide, and head\/front\.png makes it 4/,
    );
  });

  it("refuses a name that cannot be a folder", async () => {
    await expect(
      saveFigure(
        figureOf(partOf("arm/left", { width: 2, height: 2, depth: 2 })),
      ),
    ).rejects.toThrow(/"arm\/left" cannot name a part/);
  });

  it("refuses two parts sharing a name, which would write over each other", async () => {
    await expect(
      saveFigure(
        figureOf(
          partOf("arm", { width: 2, height: 2, depth: 2 }),
          partOf("arm", { width: 3, height: 3, depth: 3 }),
        ),
      ),
    ).rejects.toThrow(/Two parts are called "arm"/);
  });
});

describe("a file written before figures", () => {
  it("is read as one part sitting at the origin", async () => {
    const figure = await loadFigure(await zipOf(boxOf(4, 3, 2)));

    expect(figure.parts).toHaveLength(1);
    expect(figure.parts[0].name).toBe("body");
    expect(figure.parts[0].root).toEqual({ x: 0, y: 0, z: 0 });
    expect(figure.parts[0].parent).toBe(null);
    expect(partDimensions(figure.parts[0])).toEqual({
      width: 4,
      height: 3,
      depth: 2,
    });
  });

  it("still loads through load, which reads one box", async () => {
    const { dimensions, migrated } = await load(await zipOf(boxOf(4, 3, 2)));

    expect(dimensions).toEqual({ width: 4, height: 3, depth: 2 });
    expect(migrated).toBe(false);
  });
});

describe("load, given a figure", () => {
  it("hands back the first part, for a reader that draws one box", async () => {
    const figure = figureOf(
      partOf("torso", { width: 6, height: 8, depth: 4 }),
      partOf("head", { width: 4, height: 4, depth: 4 }),
    );

    const { dimensions } = await load(await saveFigure(figure));

    expect(dimensions).toEqual({ width: 6, height: 8, depth: 4 });
  });
});

describe("composeRoot", () => {
  it("sums a part's root with every root above it", () => {
    const figure = figureOf(
      partOf(
        "torso",
        { width: 2, height: 2, depth: 2 },
        {
          root: Vector3D.create(1, 2, 3),
        },
      ),
      partOf(
        "arm",
        { width: 2, height: 2, depth: 2 },
        {
          root: Vector3D.create(10, 0, 0),
          parent: "torso",
        },
      ),
      partOf(
        "hand",
        { width: 2, height: 2, depth: 2 },
        {
          root: Vector3D.create(0, -5, 0),
          parent: "arm",
        },
      ),
    );

    expect(composeRoot(figure, figure.parts[2])).toEqual({
      x: 11,
      y: -3,
      z: 3,
    });
  });

  it("places a part whose parent the figure does not hold", () => {
    const figure = figureOf(
      partOf(
        "hand",
        { width: 2, height: 2, depth: 2 },
        {
          root: Vector3D.create(4, 0, 0),
          parent: "arm",
        },
      ),
    );

    expect(composeRoot(figure, figure.parts[0])).toEqual({ x: 4, y: 0, z: 0 });
  });

  it("places a part caught in a cycle of parents rather than looping", () => {
    const figure = figureOf(
      partOf(
        "a",
        { width: 2, height: 2, depth: 2 },
        {
          root: Vector3D.create(1, 0, 0),
          parent: "b",
        },
      ),
      partOf(
        "b",
        { width: 2, height: 2, depth: 2 },
        {
          root: Vector3D.create(0, 1, 0),
          parent: "a",
        },
      ),
    );

    expect(composeRoot(figure, figure.parts[0])).toEqual({ x: 1, y: 1, z: 0 });
  });
});
