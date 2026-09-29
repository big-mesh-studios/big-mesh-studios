// A set of printed parts written as a 3MF package.
//
// A 3MF file is a zip, but not any zip: it is an Open Packaging Conventions
// archive, which has to say what is inside it in three agreed places before a
// slicer will look at any of it. The content types say what kind of each part
// is, the root relationships say which of them is the model, and the model part
// itself is XML saying what the model is.
//
// A 3MF carries a unit and a colour per face, which is what a file meant to be
// printed rather than edited wants and a triangle soup cannot give it.
import type { RGBA } from "@big-mesh-studios/maths";
import JSZip from "jszip";
import type { PrintPart } from "./figure-print";

/** The namespace the core specification gives the elements of a model part. */
const CORE = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02";

/** The namespace the materials extension gives its colour groups. */
const MATERIAL =
  "http://schemas.microsoft.com/3dmanufacturing/material/2015/02";

/** The namespace this writer qualifies the names of its own with. */
const OWN = "https://big-mesh-studios.io/ns/stacker";

/** The content type the specification gives the model part. */
const MODEL_CONTENT_TYPE =
  "application/vnd.ms-package.3dmanufacturing-3dmodel+xml";

/** The content type a `.rels` part has, which nothing here overrides. */
const RELATIONSHIPS =
  "application/vnd.openxmlformats-package.relationships+xml";

/** The relationship that names the part a slicer opens. */
const START_PART =
  "http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel";

/** The relationship that names a picture of the model. */
const THUMBNAIL =
  "http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail";

/** Where the model part sits in the package. */
export const MODEL_PART = "3D/3dmodel.model";

/** Where a picture of the model sits in the package. */
const THUMBNAIL_PART = "Metadata/thumbnail.png";

/**
 * How many decimal places a measurement is written to.
 *
 * A millimetre is a thousandth of a metre, so three places is a micron — well
 * under what a printer can hold, and short enough that a corner does not come
 * out as `3.0999999999999996`.
 */
const MILLIMETRES = 3;

/** The colour a face falls back to when the palette holds none for its slot. */
const NOTHING: RGBA = { r: 0, g: 0, b: 0, a: 255 };

/** What a 3MF file says about the model beyond its geometry. */
export interface ThreeMfOptions {
  /** The name a slicer shows the file under. */
  title?: string;
  /** A picture of the model as a PNG, for somebody choosing between files. */
  thumbnail?: Uint8Array;
}

/**
 * `parts` as the bytes of a 3MF file.
 *
 * @throws when there are no parts, because a model part with nothing in it is
 * not a model, and a slicer will say so by refusing the file.
 */
export async function encodeThreeMf(
  parts: readonly PrintPart[],
  palette: readonly RGBA[],
  options: ThreeMfOptions = {},
): Promise<Blob> {
  if (parts.length === 0) {
    throw new Error("there is nothing in this figure to print");
  }

  const zip = new JSZip();
  // A package names its parts and nothing else, so the folders the paths imply
  // are not written as parts of their own. In this order too, because the
  // content types are what a consumer reads first and an archive that buries
  // them is one some consumers will not find.
  const add = (path: string, data: string | Uint8Array) =>
    zip.file(path, data, { createFolders: false });

  add("[Content_Types].xml", contentTypes());
  add("_rels/.rels", rootRels(options.thumbnail !== undefined));

  if (options.thumbnail !== undefined) {
    add(THUMBNAIL_PART, options.thumbnail);
  }

  add(MODEL_PART, modelXml(parts, palette, options));

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
  });
}

/** What every part of the package is, so a consumer knows how to read it. */
function contentTypes(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    `  <Default Extension="rels" ContentType="${RELATIONSHIPS}" />`,
    '  <Default Extension="png" ContentType="image/png" />',
    `  <Override PartName="/${MODEL_PART}" ContentType="${MODEL_CONTENT_TYPE}" />`,
    "</Types>",
    "",
  ].join("\n");
}

/** Which parts of the package are reachable, and what they are for. */
function rootRels(thumbnail: boolean): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    `  <Relationship Id="rel-1" Type="${START_PART}" Target="/${MODEL_PART}" />`,
    ...(thumbnail
      ? [
          `  <Relationship Id="rel-2" Type="${THUMBNAIL}" Target="/${THUMBNAIL_PART}" />`,
        ]
      : []),
    "</Relationships>",
    "",
  ].join("\n");
}

/** The model part: one solid per part, the colours they show, and what to build. */
function modelXml(
  parts: readonly PrintPart[],
  palette: readonly RGBA[],
  options: ThreeMfOptions,
): string {
  const colours = colourGroup(parts, palette);
  // The colour group takes the first resource identifier, so the solids start
  // after it and the two can never be confused for one another.
  const idOf = (index: number) => index + 2;

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    // `requiredextensions` is deliberately absent, though `m` is declared: it
    // would make a consumer that has never heard of the materials extension
    // refuse the file rather than open it without the colour. A model that
    // prints grey is worth more here than one that does not open.
    `<model unit="millimeter" xml:lang="en-US" xmlns="${CORE}" xmlns:m="${MATERIAL}" xmlns:s="${OWN}">`,
    '  <metadata name="Application">rm-stacker</metadata>',
    ...(options.title === undefined || options.title === ""
      ? []
      : [`  <metadata name="Title">${escapeXml(options.title)}</metadata>`]),
    // The specification has no name on a solid of its own — naming one belongs
    // to an extension — so a part's name is said here, against the solid it
    // became, which is the only place in the file that can be looked up.
    ...parts.flatMap((part, index) => [
      `  <metadata name="s:part:${idOf(index)}">${escapeXml(part.name)}</metadata>`,
    ]),
    "  <resources>",
    '    <m:colorgroup id="1">',
    ...colours.entries.map((entry) => `      <m:color color="${entry}" />`),
    "    </m:colorgroup>",
    ...parts.flatMap((part, index) => solid(part, idOf(index), colours)),
    "  </resources>",
    "  <build>",
    ...parts.map((_part, index) => `    <item objectid="${idOf(index)}" />`),
    "  </build>",
    "</model>",
    "",
  ].join("\n");
}

/**
 * The colours the parts show, and which colour each palette slot became.
 *
 * A triangle names its colour by its position in this group, so the group holds
 * the slots the model actually shows rather than every slot the palette has. A
 * slot the palette has no colour for is left out, and a face naming one takes
 * the solid's own colour instead, which is a wrong colour rather than a file a
 * slicer rejects.
 *
 * The group is never empty, because a solid's own colour is the first of it and
 * an empty group would leave that pointing at a colour that is not there.
 */
function colourGroup(
  parts: readonly PrintPart[],
  palette: readonly RGBA[],
): { entries: string[]; groupIndexOf: Map<number, number> } {
  const shown = new Set<number>();
  for (const part of parts) {
    for (const slot of part.colour) {
      shown.add(slot);
    }
  }

  const entries: string[] = [];
  const groupIndexOf = new Map<number, number>();

  for (const slot of [...shown].sort((a, b) => a - b)) {
    const colour = palette[slot];
    if (colour === undefined) {
      continue;
    }
    groupIndexOf.set(slot, entries.length);
    entries.push(`#${hex(colour)}`);
  }

  if (entries.length === 0) {
    entries.push(`#${hex(NOTHING)}`);
  }

  return { entries, groupIndexOf };
}

/** One part as a solid: its corners, its triangles, and the colour of each face. */
function solid(
  part: PrintPart,
  id: number,
  colours: ReturnType<typeof colourGroup>,
): string {
  const lines = [
    // `pindex` is the colour a face takes when it does not name one of its own,
    // which is the first colour in the group.
    `    <object id="${id}" type="model" pid="1" pindex="0">`,
    "      <mesh>",
    "        <vertices>",
  ];

  for (let v = 0; v < part.vertices.length; v += 3) {
    lines.push(
      `          <vertex x="${millimetres(part.vertices[v])}" y="${millimetres(
        part.vertices[v + 1],
      )}" z="${millimetres(part.vertices[v + 2])}" />`,
    );
  }

  lines.push("        </vertices>", "        <triangles>");

  for (let t = 0; t < part.triangles.length; t += 3) {
    const shown = colours.groupIndexOf.get(part.colour[t / 3]);
    lines.push(
      `          <triangle v1="${part.triangles[t]}" v2="${
        part.triangles[t + 1]
      }" v3="${part.triangles[t + 2]}"${
        shown === undefined ? "" : ` p1="${shown}"`
      } />`,
    );
  }

  lines.push("        </triangles>", "      </mesh>", "    </object>");

  return lines.join("\n");
}

/** A length in millimetres, written to the precision a printer can hold. */
function millimetres(value: number): string {
  return `${Number.parseFloat(value.toFixed(MILLIMETRES))}`;
}

/** A colour as the eight hex digits 3MF writes, which is `#RRGGBBAA`. */
function hex({ r, g, b, a }: RGBA): string {
  return [r, g, b, a]
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase();
}

/** `text` with the five characters that would otherwise end a markup token. */
function escapeXml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );
}
