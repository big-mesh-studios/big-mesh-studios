// The portal frame's own tile, generated rather than shipped: a near-black
// body flecked with violet, so a portal frame reads as obsidian without adding
// an artist-made image to the sheet. It is injected onto the end of the tile
// atlas the same way the wool colours are, and only the world's own loader and
// the renderer's tile config ever look for it.
import type { SubTexture } from "./atlas";
import { Texture } from "@random-mesh/rmsl/scene";

/** The dark body of the tile, and the violet flecks that break it up. */
const OBSIDIAN_SHADES = ["#0b0710", "#170c27", "#2e1a4a", "#5a2f8f", "#9a6ad0"];

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
 * Extends the loaded atlas with a procedurally generated obsidian tile,
 * returning the texture and dimensions that now include it.
 */
export async function injectProceduralObsidianTile(
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

  const index = Math.round(height / tileH) * Math.round(width / tileW);
  const tileX = (index % Math.round(width / tileW)) * tileW;
  const tileY = Math.floor(index / Math.round(width / tileW)) * tileH;
  atlas.set("obsidian", { x: tileX, y: tileY, w: tileW, h: tileH });

  // A coarse 8x8 field makes clustered veins; a fine field dusts them with
  // brighter specks, so the tile does not read as flat noise.
  const gridSize = 32;
  const scale = tileW / gridSize;
  for (let py = 0; py < gridSize; py++) {
    for (let px = 0; px < gridSize; px++) {
      const vein = pick(Math.floor(px / 4), Math.floor(py / 4), 11);
      const speck = pick(px, py, 5);
      let shade = OBSIDIAN_SHADES[0];
      if (vein > 0.78) {
        shade = OBSIDIAN_SHADES[2];
      } else if (vein > 0.6) {
        shade = OBSIDIAN_SHADES[1];
      }
      if (speck > 0.9) {
        shade = OBSIDIAN_SHADES[3];
      }
      if (speck > 0.975) {
        shade = OBSIDIAN_SHADES[4];
      }
      ctx.fillStyle = shade;
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
