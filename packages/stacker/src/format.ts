// The sprite stack file, for anything that has to read or write one: a zip of
// indexed pngs and a palette. A figure keeps each part's drawings in a folder
// of its own — its six sides, and two more for each cut across it — and lists
// where those parts sit, and where their cuts stand, in `parts.json`; a file
// holding one part keeps its drawings at the root and carries no list. Nothing
// here knows about drawing, undo, or the browser's file pickers — a reader gets
// the model and is left to do what it likes with it.
import { decode, encode } from "fast-png";
import JSZip from "jszip";
import {
  Bitmap,
  Vector3D,
  type Dimensions3D,
  type RGBA,
} from "@big-mesh-studios/maths";
import {
  axisSides,
  centrePivot,
  dimensionKinds,
  partDimensions,
  readSectionFace,
  sectionFaceKind,
  sideAxes,
  sideKinds,
  sideKindSet,
  type DimensionKind,
  type Figure,
  type Model,
  type PanelKind,
  type Part,
  type Section,
  type SideKind,
  type Sides,
} from "./data";

const PALETTE_FILE = "palette.png";
const PARTS_FILE = "parts.json";

/**
 * What the one part of a file written before figures is called. Such a file
 * keeps its drawings at the zip's root and says nothing about where they sit,
 * so the part it is read back as needs a name from somewhere.
 */
const ONLY_PART = "body";

/**
 * Where a figure's parts sit, as `parts.json` holds it. The drawings stay in
 * the folders; this carries only what cannot be read off a png.
 *
 * Version two added the cuts across a part, and version three how a part is
 * turned and how large it is drawn. A file written before either reads as parts
 * drawn on their six sides alone, standing square and at their own size.
 */
interface PartsManifest {
  version: 3;
  parts: {
    name: string;
    root: Vector3D;
    pivot: Vector3D;
    turn: Vector3D;
    scale: number;
    parent: string | null;
    /** Where each cut across the part stands. Its faces are pngs beside the sides. */
    sections: { axis: DimensionKind; at: number }[];
  }[];
}

/** What a section's face is written to the folder as: the name it is drawn on under. */
const sectionFileName = (cut: number, face: "before" | "after") =>
  `${sectionFaceKind(cut, face)}.png`;

/** The palette as the file holds it: a one-row png, one texel per colour. */
function encodePalettePng(palette: RGBA[]): Uint8Array {
  const data = new Uint8Array(palette.length * 4);

  palette.forEach(({ r, g, b, a }, i) => {
    const offset = i << 2;
    data[offset + 0] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = a;
  });

  return encode({
    width: palette.length,
    height: 1,
    data,
    channels: 4,
    depth: 8,
  });
}

function decodePalette(data: Uint8Array): RGBA[] {
  const decoded = decode(data);
  const palette: RGBA[] = [];

  for (let i = 0; i < decoded.width; i++) {
    const offset = i << 2;
    palette.push({
      r: decoded.data[offset + 0],
      g: decoded.data[offset + 1],
      b: decoded.data[offset + 2],
      a: decoded.data[offset + 3],
    });
  }

  return palette;
}

/** How many colours the preview shader can address. */
const PALETTE_LENGTH = 32;

/**
 * `data` is only read a byte at a time, so an image is taken as anything
 * indexable. Decoding a png hands back sixteen-bit samples for a sixteen-bit
 * image, which would be read here as though it were eight — no model written
 * here is one, and the caller turns anything that is away.
 */
interface DecodedImage {
  width: number;
  height: number;
  channels: number;
  data: ArrayLike<number>;
}

const packColour = (r: number, g: number, b: number) =>
  (r << 16) | (g << 8) | b;

/** Every colour a model saved as colours was drawn in, packed and deduplicated. */
function collectColours(images: DecodedImage[]): Set<number> {
  const colours = new Set<number>();

  for (const image of images) {
    for (let source = 0; source < image.width * image.height * 4; source += 4) {
      if (image.data[source + 3] === 0) {
        continue;
      }

      colours.add(
        packColour(
          image.data[source],
          image.data[source + 1],
          image.data[source + 2],
        ),
      );
    }
  }

  return colours;
}

/**
 * Works out a palette for a model that was saved as colours, and where each of
 * its colours sits in it.
 *
 * Every colour keeps an entry of its own, so nothing is approximated. A colour
 * the given palette already holds keeps that same slot, which leaves a model
 * drawn from an unedited palette with exactly the palette it was drawn from.
 * The rest take slots holding a colour the model never used.
 *
 * A model can hold more colours than the palette has room for, by having been
 * drawn in a colour that was later edited out of the palette, over and over.
 * Whatever does not fit is left out, and the cells drawn in it are emptied
 * rather than being moved to a colour nobody chose.
 */
function buildPalette(colours: Set<number>, fallbackPalette: RGBA[]) {
  const palette = Array.from(
    { length: PALETTE_LENGTH },
    (_, i): RGBA => fallbackPalette[i] ?? { r: 0, g: 0, b: 0, a: 255 },
  );
  const packedPalette = palette.map(({ r, g, b }) => packColour(r, g, b));

  const indexOf = new Map<number, number>();
  const freeSlots: number[] = [];

  for (let i = 0; i < PALETTE_LENGTH; i++) {
    if (colours.has(packedPalette[i])) {
      // Only the first slot holding this colour can be the one it means.
      indexOf.set(packedPalette[i], indexOf.get(packedPalette[i]) ?? i);
    } else {
      freeSlots.push(i);
    }
  }

  const unplaced = [...colours].filter((colour) => !indexOf.has(colour));
  const dropped: number[] = [];

  for (const colour of unplaced) {
    const slot = freeSlots.shift();

    if (slot === undefined) {
      dropped.push(colour);
      continue;
    }

    palette[slot] = {
      r: (colour >> 16) & 0xff,
      g: (colour >> 8) & 0xff,
      b: colour & 0xff,
      a: 255,
    };
    indexOf.set(colour, slot);
  }

  return { palette, indexOf, dropped };
}

function toBitmap(image: DecodedImage, indexOf: Map<number, number>): Bitmap {
  const bitmap = Bitmap.create(image.width, image.height);

  for (let i = 0; i < bitmap.data.length; i++) {
    const source = i << 2;

    if (image.data[source + 3] === 0) {
      continue;
    }

    const index = indexOf.get(
      packColour(
        image.data[source],
        image.data[source + 1],
        image.data[source + 2],
      ),
    );

    // A colour with no slot leaves its cell empty, which `create` already made it.
    if (index !== undefined) {
      bitmap.data[i] = index;
    }
  }

  return bitmap;
}

/** A model read from a file, and which of the two formats it arrived in. */
export interface LoadedModel extends Model {
  /**
   * Whether it arrived in the older format, where a side held colours rather
   * than palette indices. Callers need to know because anything else they kept
   * beside the model — an undo history naming colours, say — was written
   * against that format too.
   */
  migrated: boolean;
}

/**
 * Reads the first of a file's parts as a model on its own, for a reader that
 * draws one box and has nowhere to put the rest. A file holding a single part
 * is read whole.
 *
 * `dimensions` is the box that part's six sides describe, which they are
 * checked against: a side disagreeing with another about an axis they both
 * measure is refused.
 *
 * @param fallbackPalette Colours to seed the palette slots a colour-format
 * model does not fill. Left out, the palette is exactly the colours the file
 * uses, which is what a reader wants; an editor passes its own so a model
 * opened for drawing arrives with a full palette to draw from.
 * @throws When the file is not a model this format writes, or when its sides
 * are not faces of one box.
 */
export async function load(
  blob: Blob,
  fallbackPalette: RGBA[] = [],
): Promise<LoadedModel> {
  const figure = await loadFigure(blob, fallbackPalette);
  const part = figure.parts[0];

  return {
    sides: part.sides,
    palette: figure.palette,
    migrated: figure.migrated,
    dimensions: partDimensions(part),
  };
}

/** A figure read from a file, and which of the two formats it arrived in. */
export interface LoadedFigure extends Figure {
  /**
   * Whether any of its parts arrived in the older format, where a side held
   * colours rather than palette indices. Callers need to know because anything
   * else they kept beside the model — an undo history naming colours, say —
   * was written against that format too.
   */
  migrated: boolean;
}

/** Reads `parts.json`, refusing anything that is not the list this format writes. */
function readManifest(text: string): PartsManifest {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${PARTS_FILE} is not readable as JSON: ${error}`);
  }

  const parts = (parsed as PartsManifest | null)?.parts;

  if (!Array.isArray(parts)) {
    throw new Error(`${PARTS_FILE} lists no parts`);
  }

  return {
    version: 3,
    parts: parts.map((part, index) => {
      const name = (part as { name?: unknown })?.name;

      if (typeof name !== "string" || name === "") {
        throw new Error(`${PARTS_FILE} gives part ${index} no name`);
      }

      const readVector = (value: unknown): Vector3D => {
        const { x, y, z } = (value ?? {}) as Record<string, unknown>;
        return Vector3D.create(
          typeof x === "number" ? x : 0,
          typeof y === "number" ? y : 0,
          typeof z === "number" ? z : 0,
        );
      };

      const parent = (part as { parent?: unknown }).parent;
      const listed = (part as { sections?: unknown }).sections;
      const scale = (part as { scale?: unknown }).scale;

      return {
        name,
        root: readVector((part as { root?: unknown }).root),
        pivot: readVector((part as { pivot?: unknown }).pivot),
        // A file written before a part could be turned or drawn at a size of
        // its own says neither, and stands square at the size it was drawn.
        turn: readVector((part as { turn?: unknown }).turn),
        scale: typeof scale === "number" && scale > 0 ? scale : 1,
        parent: typeof parent === "string" ? parent : null,
        sections: (Array.isArray(listed) ? listed : []).map((section, cut) => {
          const { axis, at } = (section ?? {}) as Record<string, unknown>;

          if (!dimensionKinds.includes(axis as DimensionKind)) {
            throw new Error(
              `${PARTS_FILE} cuts ${name} across "${axis}", which is not one of its axes`,
            );
          }

          if (typeof at !== "number") {
            throw new Error(
              `${PARTS_FILE} gives cut ${cut} of ${name} nowhere to stand`,
            );
          }

          return { axis: axis as DimensionKind, at };
        }),
      };
    }),
  };
}

/** The drawings of one part, as the zip carries them before they are read. */
interface PartEntry {
  indexed: Partial<Sides>;
  /** A section's faces, keyed by the cut they belong to as `parts.json` lists them. */
  sectionFaces: Map<number, Partial<Record<"before" | "after", Bitmap>>>;
  /**
   * Sides saved as colours, held back until every part has been read: the
   * palette is worked out from every colour the whole figure was drawn in, so
   * none of them can be turned into indices until all of them have been seen.
   */
  asColours: Partial<Record<SideKind, DecodedImage>>;
}

/**
 * Reads a figure, in whichever of the two formats it was written in.
 *
 * A file with a `parts.json` is read as the parts it lists, each from the
 * folder its name gives. A file without one holds a single part's drawings at
 * its root, and is read as one part called `body` pivoting on its own middle at
 * the origin — which is where a lone model has always been drawn.
 *
 * @param fallbackPalette Colours to seed the palette slots a colour-format
 * model does not fill. Left out, the palette is exactly the colours the file
 * uses, which is what a reader wants; an editor passes its own so a model
 * opened for drawing arrives with a full palette to draw from.
 * @throws When the file is not a model this format writes, when `parts.json`
 * is not the list this format writes, or when a part's sides are not faces of
 * one box.
 */
export async function loadFigure(
  blob: Blob,
  fallbackPalette: RGBA[] = [],
): Promise<LoadedFigure> {
  const zip = await JSZip.loadAsync(blob);
  // Keyed by the folder the drawings were found in; the empty string is the
  // zip's root, where a file written before figures keeps its only part.
  const entries = new Map<string, PartEntry>();
  let palette: RGBA[] | undefined;
  let manifest: PartsManifest | undefined;

  const entryFor = (folder: string): PartEntry => {
    let entry = entries.get(folder);

    if (entry === undefined) {
      entry = { indexed: {}, asColours: {}, sectionFaces: new Map() };
      entries.set(folder, entry);
    }

    return entry;
  };

  for (const [_path, entry] of Object.entries(zip.files)) {
    const lowercased = entry.name.toLowerCase();

    if (lowercased === PALETTE_FILE) {
      palette = decodePalette(
        new Uint8Array(await (await entry.async("blob")).arrayBuffer()),
      );
      continue;
    }

    if (lowercased === PARTS_FILE) {
      manifest = readManifest(await entry.async("text"));
      continue;
    }

    // A folder name keeps the case it was written in, because it has to match
    // the part name `parts.json` gives; only the side name is matched loosely.
    const match = /^(?:(.+)\/)?([^/]+)\.png$/i.exec(entry.name);

    if (match === null) {
      continue;
    }

    const folder = match[1] ?? "";
    const name = match[2].toLowerCase();
    const side = name as SideKind;
    const face = readSectionFace(name as PanelKind);

    if (!sideKindSet[side] && face === undefined) {
      continue;
    }

    const arrayBuffer = await (await entry.async("blob")).arrayBuffer();
    const decoded = decode(new Uint8Array(arrayBuffer));

    // Everything written here is eight bits a sample, and every reading below
    // takes one byte at a time. Anything else would be read as though it were
    // eight and come back in colours nobody drew, so say so instead.
    if (decoded.depth !== 8) {
      throw new Error(
        `${entry.name} holds ${decoded.depth} bits per sample, and only eight is read`,
      );
    }

    const bitmap = {
      width: decoded.width,
      height: decoded.height,
      data: new Uint8Array(decoded.data),
    };

    if (face !== undefined) {
      // Sections came after the format stopped writing colours, so a face
      // holding them is not a drawing this reader can place.
      if (decoded.channels === 4) {
        throw new Error(
          `${entry.name} holds colours, and a section's face is only read as palette indices`,
        );
      }

      const faces = entryFor(folder).sectionFaces;
      faces.set(face.cut, { ...faces.get(face.cut), [face.face]: bitmap });
      continue;
    }

    // Four channels means a model saved before sides held indices.
    if (decoded.channels === 4) {
      entryFor(folder).asColours[side] = decoded;
      continue;
    }

    entryFor(folder).indexed[side] = bitmap;
  }

  const colourImages = [...entries.values()].flatMap((entry) =>
    (Object.keys(entry.asColours) as SideKind[]).map(
      (side) => entry.asColours[side]!,
    ),
  );
  const migrated = colourImages.length !== 0;

  if (migrated) {
    const built = buildPalette(
      collectColours(colourImages),
      palette ?? fallbackPalette,
    );

    if (built.dropped.length !== 0) {
      console.error(
        `This model was drawn in ${built.dropped.length + PALETTE_LENGTH} colours and a palette ` +
          `holds ${PALETTE_LENGTH}. The cells drawn in the ${built.dropped.length} that did not ` +
          `fit have been emptied.`,
      );
    }

    palette = built.palette;

    for (const entry of entries.values()) {
      for (const side of Object.keys(entry.asColours) as SideKind[]) {
        entry.indexed[side] = toBitmap(entry.asColours[side]!, built.indexOf);
      }
    }
  }

  const placements: (Omit<PartsManifest["parts"][number], "pivot"> & {
    pivot?: Vector3D;
  })[] = manifest?.parts ?? [
    {
      name: ONLY_PART,
      root: Vector3D.create(),
      turn: Vector3D.create(),
      scale: 1,
      parent: null,
      sections: [],
    },
  ];

  const parts = placements.map(
    ({ name, root, pivot, turn, scale, parent, sections }): Part => {
      // A file without a list keeps its only part at the root, so that part's
      // name and the folder it was read from are not the same string.
      const folder = manifest === undefined ? "" : name;
      const sides = entries.get(folder)?.indexed ?? {};
      const dimensions = readDimensions(sides, folder);

      // A side the file does not carry is drawn as nothing, at the size the sides
      // that are there say it must be.
      for (const side of sideKinds) {
        const [across, down] = sideAxes[side];
        sides[side] ??= Bitmap.create(dimensions[across], dimensions[down]);
      }

      return {
        name,
        sides: sides as Sides,
        sections: readSections(sections, entries.get(folder), dimensions, name),
        root,
        pivot: pivot ?? centrePivot(dimensions),
        turn,
        scale,
        parent,
      };
    },
  );

  return { parts, palette: palette ?? fallbackPalette, migrated };
}

/**
 * The cuts across one part, each listed in `parts.json` and drawn on the two
 * pngs beside its sides.
 *
 * A cut whose faces the file does not carry is left out rather than read as two
 * blank faces, which would carve the part away either side of it. What is left
 * is the shape the six sides describe — the same shape a reader that knows
 * nothing of sections draws.
 *
 * @throws When a face is not the size of the sides it is drawn like, since it
 * would then carve a run nobody drew.
 */
function readSections(
  listed: PartsManifest["parts"][number]["sections"],
  entry: PartEntry | undefined,
  dimensions: Dimensions3D,
  name: string,
): Section[] {
  const sections: Section[] = [];

  listed.forEach(({ axis, at }, cut) => {
    const faces = entry?.sectionFaces.get(cut);

    if (faces?.before === undefined || faces.after === undefined) {
      return;
    }

    // A section's faces are drawn the way the two sides that look along its
    // axis are drawn, so they measure the same as those two do.
    const [across, down] = sideAxes[axisSides[axis][0]];

    for (const face of [faces.before, faces.after]) {
      if (
        face.width !== dimensions[across] ||
        face.height !== dimensions[down]
      ) {
        throw new Error(
          `${name}'s cut ${cut} is drawn ${face.width} by ${face.height}, ` +
            `and the ${axis} it cuts across makes it ${dimensions[across]} by ${dimensions[down]}`,
        );
      }
    }

    sections.push({ axis, at, before: faces.before, after: faces.after });
  });

  return sections;
}

/** The default extent of an axis no side in the file measures. */
const UNMEASURED = 32;

/**
 * The box the sides describe, in voxels.
 *
 * Each side measures two of the three axes, and each axis is measured by four
 * of the six sides, so a file that holds more than one side says the same thing
 * about an axis more than once. Disagreeing about it means the six drawings are
 * not faces of one box and nothing further can be believed about them, so it is
 * refused here rather than solved into a shape nobody drew.
 *
 * @param folder Which folder in the zip the sides were read from, so a refusal
 * names the part it is about. Empty for a file that keeps its drawings at the
 * root.
 * @throws When two sides give an axis different extents.
 */
function readDimensions(sides: Partial<Sides>, folder: string): Dimensions3D {
  const measured: Partial<Record<DimensionKind, { by: SideKind; of: number }>> =
    {};

  for (const side of sideKinds) {
    const bitmap = sides[side];

    if (bitmap === undefined) {
      continue;
    }

    const [across, down] = sideAxes[side];

    for (const [axis, extent] of [
      [across, bitmap.width],
      [down, bitmap.height],
    ] as const) {
      const already = measured[axis];

      if (already === undefined) {
        measured[axis] = { by: side, of: extent };
        continue;
      }

      if (already.of !== extent) {
        const where = folder === "" ? "" : `${folder}/`;
        throw new Error(
          `${where}${side}.png makes the model ${extent} ${axis === "height" ? "high" : axis === "width" ? "wide" : "deep"}, ` +
            `and ${where}${already.by}.png makes it ${already.of} — the six sides are not faces of one box`,
        );
      }
    }
  }

  return {
    width: measured.width?.of ?? UNMEASURED,
    height: measured.height?.of ?? UNMEASURED,
    depth: measured.depth?.of ?? UNMEASURED,
  };
}

export async function save(sides: Sides, palette: RGBA[]): Promise<Blob> {
  const zip = new JSZip();

  for (const side of sideKinds) {
    const { width, height, data } = sides[side];
    zip.file(
      `${side}.png`,
      encode({ width, height, data, channels: 1, depth: 8 }),
    );
  }

  zip.file(PALETTE_FILE, encodePalettePng(palette));

  return zip.generateAsync({ type: "blob" });
}

/**
 * Whether `name` can be a part's name.
 *
 * A part's drawings are written to a folder called after it, so a name has to
 * be a folder name a reader will find them under again: a name holding a
 * slash would be read back as a folder inside a folder, and one made of dots
 * addresses somewhere else entirely.
 */
export function isPartName(name: string): boolean {
  return name !== "" && !/[/\\]/.test(name) && name !== "." && name !== "..";
}

/**
 * Writes a figure: each part's drawings in a folder called after it — the six
 * sides, and the two faces of each cut across it — the palette they all
 * address, and the list saying where the parts sit and where their cuts stand.
 *
 * @throws When a part is named something that cannot be a folder, or when two
 * parts share a name and so would be written over each other.
 */
export async function saveFigure(figure: Figure): Promise<Blob> {
  const zip = new JSZip();
  const written = new Set<string>();

  for (const part of figure.parts) {
    if (!isPartName(part.name)) {
      throw new Error(`"${part.name}" cannot name a part`);
    }

    if (written.has(part.name)) {
      throw new Error(`Two parts are called "${part.name}"`);
    }

    written.add(part.name);

    for (const side of sideKinds) {
      const { width, height, data } = part.sides[side];
      zip.file(
        `${part.name}/${side}.png`,
        encode({ width, height, data, channels: 1, depth: 8 }),
      );
    }

    part.sections.forEach((section, cut) => {
      for (const face of ["before", "after"] as const) {
        const { width, height, data } = section[face];
        zip.file(
          `${part.name}/${sectionFileName(cut, face)}`,
          encode({ width, height, data, channels: 1, depth: 8 }),
        );
      }
    });
  }

  const manifest: PartsManifest = {
    version: 3,
    parts: figure.parts.map(
      ({ name, root, pivot, turn, scale, parent, sections }) => ({
        name,
        root,
        pivot,
        turn,
        scale,
        parent,
        sections: sections.map(({ axis, at }) => ({ axis, at })),
      }),
    ),
  };

  zip.file(PARTS_FILE, JSON.stringify(manifest, null, 2));
  zip.file(PALETTE_FILE, encodePalettePng(figure.palette));

  return zip.generateAsync({ type: "blob" });
}
