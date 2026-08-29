// The sword the player holds, as a `rm-stacker` voxel model built from the
// items spritesheet. The bronze-sword sprite is cropped to its drawn pixels,
// downsampled to 24×24, and given a one-pixel black outline by turning every
// empty cell touching a solid one black; that is the front face, the back face
// is its horizontal flip, and the left, right, top and bottom faces are each a
// single black line. The solver's silhouette carving turns that into a flat
// sword card a voxel thick with a black rim, exactly the drawing a held item
// needs.
import { decode } from "fast-png";
import { Bitmap, type Dimensions3D, type RGBA } from "@big-mesh-studios/maths";
import type { Model } from "@big-mesh-studios/stacker/renderer";
import { parseTileAtlasXml } from "../renderers/atlas";

/** The resolution every face of the sword model is built at. */
const SIDE = 24;

/** The sprite that becomes the sword, as the atlas XML names it. */
export const SWORD_SPRITE = "sword_bronze";

export const SPRITESHEET_URL = "./spritesheets/spritesheet_items.png";
const SPRITESHEET_XML_URL = "./spritesheets/spritesheet_items.xml";

/** The items spritesheet's size, in pixels. */
export const SPRITESHEET_WIDTH = 896;
export const SPRITESHEET_HEIGHT = 1024;

/** The rectangle of the sword's drawn pixels in the spritesheet, for an icon. */
export const SWORD_SPRITE_BBOX = { x: 17, y: 651, w: 99, h: 108 };

/** Alpha above which a sampled sprite pixel counts as solid sword. */
const ALPHA_SOLID = 100;

/** Black, the palette entry the outline and the side lines are drawn in. */
const BLACK: RGBA = { r: 0, g: 0, b: 0, a: 255 };

/** How many colours a model palette can hold. */
const PALETTE_CAP = 32;

/** The sprite's drawn pixels, dropped to this resolution: row-major RGBA. */
export type SpritePixels = { width: number; height: number; data: Uint8Array };

/**
 * Samples a rectangle of an atlas sprite out of a decoded png as RGBA, so the
 * model builder only ever sees plain pixels rather than the png's own palette.
 */
export const sampleSpriteRegion = (
  png: { width: number; channels: number; data: ArrayLike<number> },
  palette: readonly number[][] | undefined,
  sub: { x: number; y: number; w: number; h: number },
): SpritePixels => {
  const data = new Uint8Array(sub.w * sub.h * 4);
  for (let y = 0; y < sub.h; y++) {
    for (let x = 0; x < sub.w; x++) {
      const source = (sub.y + y) * png.width + (sub.x + x);
      const target = (y * sub.w + x) << 2;
      if (png.channels === 1 && palette !== undefined) {
        const entry = palette[png.data[source]];
        data[target] = entry[0];
        data[target + 1] = entry[1];
        data[target + 2] = entry[2];
        data[target + 3] = entry.length > 3 ? entry[3] : 255;
      } else {
        const rgba = source << 2;
        data[target] = png.data[rgba];
        data[target + 1] = png.data[rgba + 1];
        data[target + 2] = png.data[rgba + 2];
        data[target + 3] = png.data[rgba + 3];
      }
    }
  }
  return { width: sub.w, height: sub.h, data };
};

/**
 * Builds the sword model from the sprite's drawn pixels at their original
 * resolution: crops to the opaque rectangle, downsamples to 24×24, outlines
 * the silhouette in black, and lays the six faces out for the stacker solver.
 */
export const buildSwordModel = (sprite: SpritePixels): Model => {
  const { width, height, data } = sprite;
  const alphaAt = (x: number, y: number): number =>
    data[(y * width + x) * 4 + 3];

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alphaAt(x, y) < ALPHA_SOLID) {
        continue;
      }
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  // A sprite drawn as nothing still builds a model; it just renders as nothing.
  if (maxX < 0) {
    minX = 0;
    minY = 0;
    maxX = width - 1;
    maxY = height - 1;
  }

  const drawnW = maxX - minX + 1;
  const drawnH = maxY - minY + 1;

  /** The average colour of the drawn pixels a 24×24 cell covers, or null. */
  const cellColour = (
    ox: number,
    oy: number,
  ): { r: number; g: number; b: number } | null => {
    const x0 = minX + Math.floor((ox * drawnW) / SIDE);
    const x1 = minX + Math.floor(((ox + 1) * drawnW) / SIDE);
    const y0 = minY + Math.floor((oy * drawnH) / SIDE);
    const y1 = minY + Math.floor(((oy + 1) * drawnH) / SIDE);
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (alphaAt(x, y) < ALPHA_SOLID) {
          continue;
        }
        r += data[(y * width + x) * 4];
        g += data[(y * width + x) * 4 + 1];
        b += data[(y * width + x) * 4 + 2];
        n++;
      }
    }
    if (n === 0) {
      return null;
    }
    return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
  };

  // The outline is palette index zero and the drawn colours take what is left,
  // so at most thirty-one distinct downsample colours can survive.
  const quantize = (channel: number): number =>
    Math.min(255, Math.round(channel / 16) * 16);

  const counts = new Map<string, number>();
  const solidCells: {
    ox: number;
    oy: number;
    colour: { r: number; g: number; b: number };
  }[] = [];
  for (let oy = 0; oy < SIDE; oy++) {
    for (let ox = 0; ox < SIDE; ox++) {
      const colour = cellColour(ox, oy);
      if (colour === null) {
        continue;
      }
      solidCells.push({ ox, oy, colour });
      const key = `${quantize(colour.r)},${quantize(colour.g)},${quantize(colour.b)}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const palette: RGBA[] = [BLACK];
  const paletteColours: { r: number; g: number; b: number }[] = [];
  for (const key of [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, PALETTE_CAP - 1)
    .map(([key]) => key)) {
    const [r, g, b] = key.split(",").map(Number);
    paletteColours.push({ r, g, b });
    palette.push({ r, g, b, a: 255 });
  }

  /** The palette entry closest to a colour, the outline's black included. */
  const nearestIndex = ({
    r,
    g,
    b,
  }: {
    r: number;
    g: number;
    b: number;
  }): number => {
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < palette.length; i++) {
      const dr = palette[i].r - r;
      const dg = palette[i].g - g;
      const db = palette[i].b - b;
      const distance = dr * dr + dg * dg + db * db;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    return best;
  };

  const front = Bitmap.create(SIDE, SIDE);
  for (const { ox, oy, colour } of solidCells) {
    front.data[oy * SIDE + ox] = nearestIndex(colour);
  }

  // The outline is decided against the solid drawing as it was before any
  // black was written: copying the indices first keeps the check reading only
  // what the sprite drew, so a painted outline cell can never spread the
  // outline to its own neighbours. Looking at the four neighbours only would
  // leave gaps at the diagonal corners.
  const silhouette = new Uint8Array(front.data);
  const isSolid = (ox: number, oy: number): boolean =>
    ox >= 0 &&
    oy >= 0 &&
    ox < SIDE &&
    oy < SIDE &&
    silhouette[oy * SIDE + ox] !== Bitmap.EMPTY;

  for (let oy = 0; oy < SIDE; oy++) {
    for (let ox = 0; ox < SIDE; ox++) {
      if (silhouette[oy * SIDE + ox] !== Bitmap.EMPTY) {
        continue;
      }
      for (let ny = oy - 1; ny <= oy + 1; ny++) {
        for (let nx = ox - 1; nx <= ox + 1; nx++) {
          if (isSolid(nx, ny)) {
            front.data[oy * SIDE + ox] = 0;
          }
        }
      }
    }
  }

  // The back is the front mirrored, and each of the four edge faces is one
  // black line: the column or row the solver's silhouette carving leaves as
  // the card's single voxel of depth, so the sword stays a voxel thick.
  const back = Bitmap.create(SIDE, SIDE);
  for (let oy = 0; oy < SIDE; oy++) {
    for (let ox = 0; ox < SIDE; ox++) {
      back.data[oy * SIDE + (SIDE - 1 - ox)] = front.data[oy * SIDE + ox];
    }
  }

  const left = Bitmap.create(SIDE, SIDE);
  const right = Bitmap.create(SIDE, SIDE);
  const top = Bitmap.create(SIDE, SIDE);
  const bottom = Bitmap.create(SIDE, SIDE);
  for (let i = 0; i < SIDE; i++) {
    left.data[i * SIDE + 12] = 0;
    right.data[i * SIDE + 11] = 0;
    top.data[12 * SIDE + i] = 0;
    bottom.data[11 * SIDE + i] = 0;
  }

  const dimensions: Dimensions3D = { width: SIDE, height: SIDE, depth: SIDE };

  return {
    sides: { front, back, left, right, top, bottom },
    palette,
    dimensions,
  };
};

/**
 * Reads the bronze-sword sprite out of the items spritesheet and its atlas
 * XML, decodes it, and builds the sword model. Throws when any of the files or
 * the sprite itself is missing, which a caller is expected to swallow.
 */
export const loadSwordModel = async (): Promise<Model> => {
  const [pngRes, xmlRes] = await Promise.all([
    fetch(SPRITESHEET_URL),
    fetch(SPRITESHEET_XML_URL),
  ]);
  if (!pngRes.ok) {
    throw new Error(`failed to load "${SPRITESHEET_URL}": ${pngRes.status}`);
  }
  if (!xmlRes.ok) {
    throw new Error(
      `failed to load "${SPRITESHEET_XML_URL}": ${xmlRes.status}`,
    );
  }
  const atlas = parseTileAtlasXml(await xmlRes.text());
  const sub = atlas.get(SWORD_SPRITE);
  if (sub === undefined) {
    throw new Error(`the items spritesheet has no "${SWORD_SPRITE}"`);
  }
  const png = decode(new Uint8Array(await pngRes.arrayBuffer()));
  if (png.depth !== 8) {
    throw new Error(`the items spritesheet is not an 8-bit png`);
  }
  const sprite = sampleSpriteRegion(png, png.palette, sub);
  return buildSwordModel(sprite);
};
