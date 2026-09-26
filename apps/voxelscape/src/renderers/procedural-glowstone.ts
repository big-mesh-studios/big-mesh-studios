// The glowstone block's own tile: warm clustered lumps with bright domed cores.
// It is injected onto the end of the tile atlas the same way the wool colours
// and the obsidian tile are, and only the world's tile loader and the
// renderer's tile config ever look for it.
import type { SubTexture } from "./atlas";
import { Texture } from "@random-mesh/rmsl/scene";

/** The mortar between the lumps, the lumps themselves, and the cores on them. */
const GLOWSTONE_SHADES = [
  "#241705",
  "#4d3210",
  "#8f5f18",
  "#d99b32",
  "#ffeaa8",
];

/** How many source pixels one side of the tile is drawn at. */
const GRID = 32;

/** How many of those pixels one lump spans, so a tile carries eight by eight. */
const LUMP = 4;

/** Pseudo-random hash, deterministic per pixel and seed. */
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 144760829) ^ 0x5bf03635;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

/** A 0..1 value from the hash at a pixel. */
const pick = (x: number, y: number, seed: number): number =>
  (hash(x, y, seed) % 1000) / 1000;

/**
 * Extends the loaded atlas with a procedurally generated glowstone tile,
 * returning the texture and dimensions that now include it.
 */
export async function injectProceduralGlowstoneTile(
  sourceBitmap: ImageBitmap,
  width: number,
  height: number,
  atlas: Map<string, SubTexture>,
): Promise<{ texture: Texture; width: number; height: number }> {
  const firstSub = atlas.values().next().value as SubTexture | undefined;
  const tileW = firstSub?.w ?? 128;
  const tileH = firstSub?.h ?? 128;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height + tileH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { texture: new Texture(sourceBitmap), width, height };
  }
  ctx.drawImage(sourceBitmap, 0, 0);

  const columns = Math.round(width / tileW);
  const index = Math.round(height / tileH) * columns;
  const tileX = (index % columns) * tileW;
  const tileY = Math.floor(index / columns) * tileH;
  atlas.set("glowstone", { x: tileX, y: tileY, w: tileW, h: tileH });

  // A coarse hashed field fixes one shade per lump and so clusters the tile
  // into cells; brightening towards each lump's centre domes it, and a fine
  // field dusts the whole tile with the occasional brilliant core.
  const scale = tileW / GRID;
  for (let py = 0; py < GRID; py++) {
    for (let px = 0; px < GRID; px++) {
      const lump = pick(Math.floor(px / LUMP), Math.floor(py / LUMP), 23);
      const lx = (px % LUMP) / (LUMP - 1) - 0.5;
      const ly = (py % LUMP) / (LUMP - 1) - 0.5;
      const dome = 1 - Math.min(1, Math.hypot(lx, ly) * 1.4);
      let shade = lump < 0.28 ? 0 : lump < 0.58 ? 1 : lump < 0.84 ? 2 : 3;
      if (dome > 0.72) {
        shade = Math.min(GLOWSTONE_SHADES.length - 1, shade + 1);
      }
      if (pick(px, py, 7) > 0.96) {
        shade = GLOWSTONE_SHADES.length - 1;
      }
      ctx.fillStyle = GLOWSTONE_SHADES[shade];
      ctx.fillRect(
        tileX + px * scale,
        tileY + py * scale,
        Math.ceil(scale),
        Math.ceil(scale),
      );
    }
  }

  const bitmap = await createImageBitmap(canvas);
  return { texture: new Texture(bitmap), width, height: height + tileH };
}
