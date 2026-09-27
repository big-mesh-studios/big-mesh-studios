import type { SubTexture } from "./atlas";
import { Texture } from "@random-mesh/rmsl/scene";
import {
  VOXEL_WOOL_BLACK,
  VOXEL_WOOL_BLUE,
  VOXEL_WOOL_BROWN,
  VOXEL_WOOL_CYAN,
  VOXEL_WOOL_GRAY,
  VOXEL_WOOL_GREEN,
  VOXEL_WOOL_LIGHT_BLUE,
  VOXEL_WOOL_LIGHT_GRAY,
  VOXEL_WOOL_LIME,
  VOXEL_WOOL_MAGENTA,
  VOXEL_WOOL_ORANGE,
  VOXEL_WOOL_PINK,
  VOXEL_WOOL_PURPLE,
  VOXEL_WOOL_RED,
  VOXEL_WOOL_WHITE,
  VOXEL_WOOL_YELLOW,
} from "../world/voxel-store";

/** How many source pixels one side of a wool tile is drawn at. */
const GRID = 32;

export interface WoolColorDef {
  /** The voxel id this colour is the wool block of. */
  id: number;
  name: string;
  base: string;
  dark1: string;
  dark2: string;
  light: string;
}

/** The colour a wool tile's body is drawn in, by the voxel id of that wool. */
export const woolTileColor = (id: number): string | undefined =>
  WOOL_COLORS.find((wool) => wool.id === id)?.base;

export const WOOL_COLORS: WoolColorDef[] = [
  {
    id: VOXEL_WOOL_WHITE,
    name: "wool_white",
    base: "#e9ecef",
    dark1: "#ced4da",
    dark2: "#adb5bd",
    light: "#f8f9fa",
  },
  {
    id: VOXEL_WOOL_ORANGE,
    name: "wool_orange",
    base: "#f08c00",
    dark1: "#d97706",
    dark2: "#b45309",
    light: "#f59f00",
  },
  {
    id: VOXEL_WOOL_MAGENTA,
    name: "wool_magenta",
    base: "#cc5de8",
    dark1: "#ae3ec9",
    dark2: "#8a2be2",
    light: "#da77f2",
  },
  {
    id: VOXEL_WOOL_LIGHT_BLUE,
    name: "wool_light_blue",
    base: "#4dabf7",
    dark1: "#339af0",
    dark2: "#1c7ed6",
    light: "#74c0fc",
  },
  {
    id: VOXEL_WOOL_YELLOW,
    name: "wool_yellow",
    base: "#fcc419",
    dark1: "#fab005",
    dark2: "#f59f00",
    light: "#ffe066",
  },
  {
    id: VOXEL_WOOL_LIME,
    name: "wool_lime",
    base: "#74b816",
    dark1: "#5c940d",
    dark2: "#42630e",
    light: "#8ce99a",
  },
  {
    id: VOXEL_WOOL_PINK,
    name: "wool_pink",
    base: "#f783ac",
    dark1: "#e64980",
    dark2: "#d6336c",
    light: "#faa2c1",
  },
  {
    id: VOXEL_WOOL_GRAY,
    name: "wool_gray",
    base: "#495057",
    dark1: "#343a40",
    dark2: "#212529",
    light: "#6c757d",
  },
  {
    id: VOXEL_WOOL_LIGHT_GRAY,
    name: "wool_light_gray",
    base: "#adb5bd",
    dark1: "#868e96",
    dark2: "#495057",
    light: "#ced4da",
  },
  {
    id: VOXEL_WOOL_CYAN,
    name: "wool_cyan",
    base: "#20c997",
    dark1: "#12b886",
    dark2: "#0ca678",
    light: "#3bc9db",
  },
  {
    id: VOXEL_WOOL_PURPLE,
    name: "wool_purple",
    base: "#845ef7",
    dark1: "#7048e8",
    dark2: "#5f3dc4",
    light: "#9c36b5",
  },
  {
    id: VOXEL_WOOL_BLUE,
    name: "wool_blue",
    base: "#339af0",
    dark1: "#1c7ed6",
    dark2: "#1971c2",
    light: "#4dabf7",
  },
  {
    id: VOXEL_WOOL_BROWN,
    name: "wool_brown",
    base: "#864e2e",
    dark1: "#6d3b1e",
    dark2: "#542c14",
    light: "#9a5b36",
  },
  {
    id: VOXEL_WOOL_GREEN,
    name: "wool_green",
    base: "#2b8a3e",
    dark1: "#237032",
    dark2: "#1b5526",
    light: "#37b24d",
  },
  {
    id: VOXEL_WOOL_RED,
    name: "wool_red",
    base: "#e03131",
    dark1: "#c92a2a",
    dark2: "#a61e1e",
    light: "#f03e3e",
  },
  {
    id: VOXEL_WOOL_BLACK,
    name: "wool_black",
    base: "#212529",
    dark1: "#16191d",
    dark2: "#0d0f12",
    light: "#343a40",
  },
];

/** Pseudo-random hash function for deterministic texture generation. */
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 144760829) ^ 0x5bf03635;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Draws one wool colour's speckle into a square `size` pixels across at
 * (`x`, `y`).
 *
 * @param ctx Where to draw, already sized to the sheet being extended.
 * @param x The tile's left edge, in the context's pixels.
 * @param y The tile's top edge, in the context's pixels.
 * @param size How wide and tall one side of the tile is drawn, in pixels.
 * @param wool The colour to speckle.
 * @param seed Which wool this is, counting from one, so that two colours
 *   sharing a base draw different specks.
 */
export function paintWoolTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  wool: WoolColorDef,
  seed: number,
): void {
  const scale = size / GRID;
  for (let py = 0; py < GRID; py++) {
    for (let px = 0; px < GRID; px++) {
      const val = (hash(px, py, seed) % 1000) / 1000;
      let color = wool.base;
      if (val < 0.25) {
        color = wool.dark1;
      } else if (val < 0.38) {
        color = wool.dark2;
      } else if (val < 0.48) {
        color = wool.light;
      }
      ctx.fillStyle = color;
      ctx.fillRect(
        x + px * scale,
        y + py * scale,
        Math.ceil(scale),
        Math.ceil(scale),
      );
    }
  }
}

/**
 * Extends the loaded atlas texture image with procedurally generated 32x32 wool tiles.
 */
export async function injectProceduralWoolTiles(
  sourceBitmap: ImageBitmap,
  width: number,
  height: number,
  atlas: Map<string, SubTexture>,
): Promise<{
  texture: Texture;
  bitmap: ImageBitmap;
  width: number;
  height: number;
}> {
  const firstSub = atlas.values().next().value as SubTexture | undefined;
  const tileW = firstSub?.w ?? 128;
  const tileH = firstSub?.h ?? 128;

  const cols = Math.round(width / tileW);
  const rowsNeeded = Math.ceil(WOOL_COLORS.length / cols);
  const newHeight = height + rowsNeeded * tileH;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = newHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      texture: new Texture(sourceBitmap),
      bitmap: sourceBitmap,
      width,
      height,
    };
  }

  // Copy original atlas bitmap
  ctx.drawImage(sourceBitmap, 0, 0);

  for (let i = 0; i < WOOL_COLORS.length; i++) {
    const wool = WOOL_COLORS[i];
    const index = Math.round(height / tileH) * cols + i;
    const tileX = (index % cols) * tileW;
    const tileY = Math.floor(index / cols) * tileH;

    atlas.set(wool.name, { x: tileX, y: tileY, w: tileW, h: tileH });

    paintWoolTile(ctx, tileX, tileY, tileW, wool, i + 1);
  }

  const bitmap = await createImageBitmap(canvas);
  return {
    texture: new Texture(bitmap),
    bitmap,
    width,
    height: newHeight,
  };
}
