// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { Vector3D, type RGBA } from "@big-mesh-studios/maths";
import JSZip from "jszip";
import { centrePivot, type Figure, type Part } from "../data";
import { sidesOfVolume } from "../sides";
import { createVolume } from "../volume";
import { printFigure, type PrintPart } from "./figure-print";
import { encodeThreeMf, MODEL_PART } from "./three-mf";

/** A palette of thirty-two opaque colours, slot `i` being `i` in every channel. */
const PALETTE: RGBA[] = Array.from({ length: 32 }, (_, i) => ({
  r: i,
  g: i,
  b: i,
  a: 255,
}));

/** A part of the given size, with every cell of it filled with one colour. */
const partOf = (
  name: string,
  extent: { width: number; height: number; depth: number },
  index = 3,
): Part => {
  const volume = createVolume(extent);
  volume.voxels.fill(index);

  return {
    name,
    sides: sidesOfVolume(volume),
    sections: [],
    root: Vector3D.create(),
    pivot: centrePivot(extent),
    turn: Vector3D.create(),
    scale: 1,
    parent: null,
  };
};

const figureOf = (...parts: Part[]): Figure => ({ parts, palette: [] });

/** Every part of the package, and the model part's markup. */
const readBack = async (blob: Blob) => {
  const zip = await JSZip.loadAsync(blob);
  const files = Object.keys(zip.files);
  const text = async (path: string) =>
    (await zip.file(path)?.async("string")) ?? "";

  return {
    files,
    contentTypes: await text("[Content_Types].xml"),
    rels: await text("_rels/.rels"),
    model: await text(MODEL_PART),
  };
};

/** The `attribute="value"` of every tag in `markup` carrying that attribute. */
const attributesOf = (markup: string, tag: string, attribute: string) =>
  [
    ...markup.matchAll(new RegExp(`<${tag} [^>]*?${attribute}="([^"]*)"`, "g")),
  ].map((match) => match[1]);

/** One part of the figure, printed, for a caller that wants the geometry alone. */
const printedOf = (name: string, index = 3): PrintPart =>
  printFigure(
    figureOf(partOf(name, { width: 2, height: 2, depth: 2 }, index)),
    {
      height: 20,
    },
  )[0];

describe("encodeThreeMf", () => {
  it("carries a model part, a content type for it, and a relationship to it", async () => {
    const { files, contentTypes, rels } = await readBack(
      await encodeThreeMf([printedOf("body")], PALETTE),
    );

    // The three places an Open Packaging Conventions archive has to agree with
    // itself before a slicer will read any of it. The folders the paths imply
    // are not parts, and are not written.
    expect(files).toEqual(["[Content_Types].xml", "_rels/.rels", MODEL_PART]);
    expect(contentTypes).toContain(
      `PartName="/${MODEL_PART}" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"`,
    );
    expect(rels).toContain(
      `Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"`,
    );
    expect(rels).toContain(`Target="/${MODEL_PART}"`);
  });

  it("says what the model's measurements are in", async () => {
    const { model } = await readBack(
      await encodeThreeMf([printedOf("body")], PALETTE),
    );

    expect(model).toContain('unit="millimeter"');
  });

  it("declares the colour extension without requiring it", async () => {
    const { model } = await readBack(
      await encodeThreeMf([printedOf("body")], PALETTE),
    );

    // Declared, so a consumer that knows colour reads it; not required, so one
    // that does not takes the shape and leaves the paint.
    expect(model).toContain(
      'xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02"',
    );
    expect(model).not.toContain("requiredextensions");
  });

  it("writes a solid's corners and faces as its triangles", async () => {
    const { model } = await readBack(
      await encodeThreeMf([printedOf("body")], PALETTE),
    );

    // A solid box of two cells to a side is six faces, and the mesher merges each
    // face into one rectangle: six quads, twelve triangles, twenty-four corners.
    expect(attributesOf(model, "vertex", "x")).toHaveLength(24);
    expect(attributesOf(model, "triangle", "v1")).toHaveLength(12);
  });

  it("writes every measurement to the precision a printer can hold", async () => {
    const { model } = await readBack(
      await encodeThreeMf([printedOf("body")], PALETTE),
    );

    for (const measurement of attributesOf(model, "vertex", "x")) {
      expect(measurement).toMatch(/^-?\d+(\.\d{1,3})?$/);
    }
  });

  it("names a colour once and points each face at the one it shows", async () => {
    const { model } = await readBack(
      await encodeThreeMf([printedOf("body", 5)], PALETTE),
    );

    // One colour in the group, and every face of a part drawn in one colour
    // naming the same one, whatever the palette index was.
    expect(attributesOf(model, "m:color", "color")).toEqual(["#050505FF"]);
    expect(attributesOf(model, "triangle", "p1")).toEqual(
      Array.from({ length: 12 }, () => "0"),
    );
  });

  it("writes one colour for each of the colours a figure shows", async () => {
    const printed = printFigure(
      figureOf(
        partOf("body", { width: 2, height: 2, depth: 2 }, 1),
        partOf("trim", { width: 1, height: 1, depth: 1 }, 9),
      ),
      { height: 20 },
    );
    const { model } = await readBack(await encodeThreeMf(printed, PALETTE));

    expect(attributesOf(model, "m:color", "color")).toEqual([
      "#010101FF",
      "#090909FF",
    ]);
    // The second part shows the second colour, so its faces name the second of
    // the group rather than repeating an index of their own.
    expect(new Set(attributesOf(model, "triangle", "p1"))).toEqual(
      new Set(["0", "1"]),
    );
  });

  it("gives a face a palette slot the palette cannot hold the solid's own colour", async () => {
    // Drawn against a four-slot palette, so slot five is a slot nothing holds.
    // The face takes the solid's own colour rather than naming one that is not
    // there, and the group is not left empty for that colour to point at.
    const short: RGBA[] = PALETTE.slice(0, 4);
    const { model } = await readBack(
      await encodeThreeMf([printedOf("body", 5)], short),
    );

    expect(attributesOf(model, "m:color", "color")).toEqual(["#000000FF"]);
    expect(attributesOf(model, "triangle", "p1")).toEqual([]);
    expect(model).toContain('pindex="0"');
  });

  it("writes a solid per part and builds each of them", async () => {
    const printed = printFigure(
      figureOf(
        partOf("head", { width: 2, height: 2, depth: 2 }),
        partOf("arm", { width: 1, height: 3, depth: 1 }),
      ),
      { height: 20 },
    );
    const { model } = await readBack(await encodeThreeMf(printed, PALETTE));

    // The colour group takes the first identifier, so a solid's identifier and
    // the colour group's can never be mistaken for one another.
    const objects = attributesOf(model, "object", "id");
    expect(objects).toEqual(["2", "3"]);
    expect(attributesOf(model, "item", "objectid")).toEqual(["2", "3"]);
  });

  it("names each part against the solid it became", async () => {
    const printed = printFigure(
      figureOf(
        partOf("head", { width: 2, height: 2, depth: 2 }),
        partOf("arm", { width: 1, height: 3, depth: 1 }),
      ),
      { height: 20 },
    );
    const { model } = await readBack(await encodeThreeMf(printed, PALETTE));

    // The specification has no name on a solid of its own, so a part's name is
    // said as metadata against the identifier it became.
    expect(model).toContain('<metadata name="s:part:2">head</metadata>');
    expect(model).toContain('<metadata name="s:part:3">arm</metadata>');
  });

  it("escapes a name that would otherwise end a markup token", async () => {
    const printed = printFigure(
      figureOf(partOf('a & b <c> "d"', { width: 2, height: 2, depth: 2 })),
      { height: 20 },
    );
    const { model } = await readBack(await encodeThreeMf(printed, PALETTE));

    expect(model).toContain(
      '<metadata name="s:part:2">a &amp; b &lt;c&gt; &quot;d&quot;</metadata>',
    );
  });

  it("writes a title only when there is one", async () => {
    const named = await readBack(
      await encodeThreeMf([printedOf("body")], PALETTE, {
        title: "my monster",
      }),
    );
    const anonymous = await readBack(
      await encodeThreeMf([printedOf("body")], PALETTE, { title: "" }),
    );

    expect(named.model).toContain(
      '<metadata name="Title">my monster</metadata>',
    );
    expect(anonymous.model).not.toContain('name="Title"');
  });

  it("carries a picture of the model when it is given one", async () => {
    const picture = new Uint8Array([137, 80, 78, 71]);
    const { files, rels, contentTypes } = await readBack(
      await encodeThreeMf([printedOf("body")], PALETTE, {
        thumbnail: picture,
      }),
    );

    expect(files).toContain("Metadata/thumbnail.png");
    expect(contentTypes).toContain('Extension="png" ContentType="image/png"');
    expect(rels).toContain(
      'Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail"',
    );
    expect(rels).toContain('Target="/Metadata/thumbnail.png"');
  });

  it("leaves the picture out when it is given none", async () => {
    const { files, rels } = await readBack(
      await encodeThreeMf([printedOf("body")], PALETTE),
    );

    expect(files).toContain("[Content_Types].xml");
    expect(rels).not.toContain("thumbnail");
  });

  it("refuses a model with nothing in it", async () => {
    await expect(encodeThreeMf([], PALETTE)).rejects.toThrow(
      /nothing in this figure/,
    );
  });
});
