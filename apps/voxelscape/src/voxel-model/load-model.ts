// Reads a model saved by rm-stacker: a zip holding six side PNGs (one per
// face, drawn in palette indices) and a palette.png. A side written as colours
// (the format rm-stacker saved before sides held indices) is migrated the same
// way the app does it: a palette is built from every colour the model uses.
// Ported from rm-stacker (MIT, big-mesh-studios).
import { decode } from "fast-png";
import JSZip from "jszip";
import { Bitmap, Dimensions3D, type RGBA } from "./data";
import { ZOMBIE_PALETTE } from "./default-zombie-model";

const PALETTE_FILE = "palette.png";

export const sideKinds = [
  "front",
  "back",
  "left",
  "right",
  "top",
  "bottom",
] as const;
export type SideKind = (typeof sideKinds)[number];

/** How many colours the material's palette can address. */
const PALETTE_LENGTH = 32;

export type LoadedModel = {
  sides: Record<SideKind, Bitmap>;
  palette: RGBA[];
  dimensions: Dimensions3D;
};

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
 * its colours sits in it. Every colour keeps an entry of its own; colours the
 * given palette already holds keep their slot. Whatever does not fit is left
 * out, and the cells drawn in it are emptied rather than approximated.
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
      indexOf.set(packedPalette[i], indexOf.get(packedPalette[i]) ?? i);
    } else {
      freeSlots.push(i);
    }
  }

  const unplaced = [...colours].filter((colour) => !indexOf.has(colour));

  for (const colour of unplaced) {
    const slot = freeSlots.shift();
    if (slot === undefined) {
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

  return { palette, indexOf };
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
    if (index !== undefined) {
      bitmap.data[i] = index;
    }
  }
  return bitmap;
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

interface DecodedImage {
  width: number;
  height: number;
  channels: number;
  data: ArrayLike<number>;
}

/**
 * Reads a model zip saved by rm-stacker and hands back the six side bitmaps,
 * the palette (the model's own when the zip holds one, else the default
 * zombie palette), and the model's grid dimensions (the sides are square, and
 * the grid is that size in every axis). Throws with a readable message when
 * the file is not a model rm-stacker wrote.
 */
export async function loadModel(
  input: Blob | ArrayBuffer | Uint8Array,
): Promise<LoadedModel> {
  const zip = await JSZip.loadAsync(input);
  const result: Partial<Record<SideKind, Bitmap>> = {};
  const asColours: Partial<Record<SideKind, DecodedImage>> = {};
  let palette: RGBA[] | undefined;
  let seenSize: number | undefined;

  for (const [_path, entry] of Object.entries(zip.files)) {
    const name = entry.name.toLowerCase();

    if (name === PALETTE_FILE) {
      palette = decodePalette(new Uint8Array(await entry.async("arraybuffer")));
      continue;
    }

    const match = /^([a-z]+)\.png$/.exec(name);
    if (match === null) {
      continue;
    }
    const side = match[1] as SideKind;
    if (!(sideKinds as readonly string[]).includes(side)) {
      continue;
    }

    const decoded = decode(new Uint8Array(await entry.async("arraybuffer")));

    seenSize ??= decoded.width;

    // Four channels means a model saved before sides held indices.
    if (decoded.channels === 4) {
      asColours[side] = decoded;
      continue;
    }

    result[side] = {
      width: decoded.width,
      height: decoded.height,
      data: new Uint8Array(decoded.data),
    };
  }

  const colourSides = Object.keys(asColours) as SideKind[];

  if (colourSides.length !== 0) {
    const images = colourSides.map((side) => asColours[side]!);
    const built = buildPalette(
      collectColours(images),
      palette ?? ZOMBIE_PALETTE,
    );
    palette = built.palette;
    for (const side of colourSides) {
      result[side] = toBitmap(asColours[side]!, built.indexOf);
    }
  }

  seenSize ??= 32;

  for (const side of sideKinds) {
    result[side] ??= Bitmap.create(seenSize, seenSize);
  }

  const size = result.front!.width;
  return {
    sides: result as Record<SideKind, Bitmap>,
    palette: palette ?? ZOMBIE_PALETTE,
    dimensions: { width: size, height: size, depth: size },
  };
}
