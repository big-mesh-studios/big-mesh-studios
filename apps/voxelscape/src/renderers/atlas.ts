import { Texture } from "@random-mesh/rmsl/scene";
import { VOXEL_TILES, type VoxelTiles } from "../world/voxel-tiles";

/**
 * Subtexture rectangle read from a TexturePacker-style atlas XML file. All
 * coordinates are in pixels from the top-left of the atlas image.
 */
export interface SubTexture {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A normalized [u0, v0, u1, v1] rectangle inside the atlas, inset by half a
 * texel so the renderer's linear filtering never blends a neighbouring
 * tile's pixels in. v0 is the top of the source tile (smallest pixel y);
 * the shader flips the world-up axis when building face UVs, so grass sits
 * on top of side faces.
 */
export type TileRect = [number, number, number, number];

export const parseTileAtlasXml = (xmlText: string): Map<string, SubTexture> => {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  const atlas = new Map<string, SubTexture>();
  const nodes = doc.querySelectorAll("SubTexture");
  for (const node of nodes) {
    const name = node.getAttribute("name");
    if (name === null) {
      continue;
    }
    atlas.set(name.replace(/\.png$/i, ""), {
      x: Number(node.getAttribute("x")),
      y: Number(node.getAttribute("y")),
      w: Number(node.getAttribute("width")),
      h: Number(node.getAttribute("height")),
    });
  }
  return atlas;
};

export const tileRect = (
  sub: SubTexture,
  atlasW: number,
  atlasH: number,
): TileRect => {
  return [
    (sub.x + 0.5) / atlasW,
    (sub.y + 0.5) / atlasH,
    (sub.x + sub.w - 0.5) / atlasW,
    (sub.y + sub.h - 0.5) / atlasH,
  ];
};

/**
 * Where the sheet's tiles sit: they are one size, laid out in a grid, so a
 * tile is addressed by the cell it occupies rather than by the rectangle it
 * covers. The material rebuilds the rectangle from this, which is four
 * numbers a vertex does not have to carry.
 */
export interface AtlasGrid {
  /** Cells across the sheet. */
  columns: number;
  /** One cell's size in pixels. */
  tilePixels: [number, number];
  /** The whole sheet's size in pixels. */
  sheetPixels: [number, number];
}

/**
 * The grid `atlas` is laid out on, or null when its tiles are not one size —
 * a sheet like that has to be addressed by rectangle, which nothing here
 * supports.
 *
 * @param atlas Every subtexture the sheet holds.
 * @param atlasW The sheet's width in pixels.
 * @param atlasH Its height.
 * @returns The grid, or null.
 */
export const atlasGridOf = (
  atlas: Map<string, SubTexture>,
  atlasW: number,
  atlasH: number,
): AtlasGrid | null => {
  const tiles = [...atlas.values()];
  const first = tiles[0];
  if (first === undefined) {
    return null;
  }
  const onGrid = tiles.every(
    (tile) =>
      tile.w === first.w &&
      tile.h === first.h &&
      tile.x % first.w === 0 &&
      tile.y % first.h === 0,
  );
  if (!onGrid) {
    return null;
  }
  return {
    columns: Math.round(atlasW / first.w),
    tilePixels: [first.w, first.h],
    sheetPixels: [atlasW, atlasH],
  };
};

/** Which cell of `grid` a subtexture occupies, counting across then down. */
export const tileIndexOf = (sub: SubTexture, grid: AtlasGrid): number =>
  Math.round(sub.y / grid.tilePixels[1]) * grid.columns +
  Math.round(sub.x / grid.tilePixels[0]);

/** Which tile of the sheet each of a voxel's three faces shows. */
export interface VoxelTileConfig {
  id: number;
  top: number;
  side: number;
  bottom: number;
}

export const buildVoxelTileConfig = (
  atlas: Map<string, SubTexture>,
  grid: AtlasGrid,
  customVoxelTiles?: Record<number, VoxelTiles>,
): VoxelTileConfig[] => {
  const config: VoxelTileConfig[] = [];
  const mergedTiles = { ...VOXEL_TILES, ...customVoxelTiles };
  for (const id of Object.keys(mergedTiles)) {
    const v = mergedTiles[Number(id)];
    const resolve = (name: string): SubTexture => {
      const sub = atlas.get(name);
      if (sub === undefined) {
        throw new Error(`[atlas] missing subtexture "${name}"`);
      }
      return sub;
    };
    config.push({
      id: Number(id),
      top: tileIndexOf(resolve(v.top), grid),
      side: tileIndexOf(resolve(v.side), grid),
      bottom: tileIndexOf(resolve(v.bottom), grid),
    });
  }
  return config;
};

export interface LoadedTileTexture {
  texture: Texture;
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

export const loadTileTexture = async (
  url: string,
): Promise<LoadedTileTexture> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`[atlas] failed to load "${url}": ${res.status}`);
  }
  const bitmap = await createImageBitmap(await res.blob());
  return {
    texture: new Texture(bitmap),
    bitmap,
    width: bitmap.width,
    height: bitmap.height,
  };
};
