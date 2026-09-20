import { Texture } from "@random-mesh/rmsl/scene";

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

export interface VoxelTiles {
  top: string;
  side: string;
  bottom: string;
}

/**
 * Which tile faces each voxel id uses. Voxel 0 is empty air and is never
 * textured. Adding a new voxel id requires an entry here.
 */
export const VOXEL_TILES: Record<number, VoxelTiles> = {
  1: { top: "grass_top", side: "dirt_grass", bottom: "dirt" },
  2: { top: "dirt", side: "dirt", bottom: "dirt" },
  4: { top: "stone", side: "stone", bottom: "stone" },
  5: { top: "snow", side: "snow", bottom: "snow" },
  6: { top: "lava", side: "lava", bottom: "lava" },
  7: { top: "trunk_top", side: "trunk_side", bottom: "trunk_bottom" },
  8: { top: "leaves", side: "leaves", bottom: "leaves" },
  25: { top: "brick_red", side: "brick_red", bottom: "brick_red" },
  26: { top: "wood", side: "wood", bottom: "wood" },
  27: { top: "ice", side: "ice", bottom: "ice" },
  28: { top: "greystone", side: "greystone", bottom: "greystone" },
  // Fire embers wear the lava glow, since they light exactly the same way.
  29: { top: "lava", side: "lava", bottom: "lava" },
  // Flowing lava is textured by the terrain mesh like its source, at whatever
  // partial height its level calls for; water flows are drawn by the water mesh.
  16: { top: "lava", side: "lava", bottom: "lava" },
  17: { top: "lava", side: "lava", bottom: "lava" },
  18: { top: "lava", side: "lava", bottom: "lava" },
  19: { top: "lava", side: "lava", bottom: "lava" },
  20: { top: "lava", side: "lava", bottom: "lava" },
  21: { top: "lava", side: "lava", bottom: "lava" },
  22: { top: "lava", side: "lava", bottom: "lava" },
  24: { top: "lava", side: "lava", bottom: "lava" },
  // Wool blocks (30-45): procedurally generated 32x32 spec wool textures in the atlas.
  30: { top: "wool_white", side: "wool_white", bottom: "wool_white" },
  31: { top: "wool_orange", side: "wool_orange", bottom: "wool_orange" },
  32: { top: "wool_magenta", side: "wool_magenta", bottom: "wool_magenta" },
  33: { top: "wool_light_blue", side: "wool_light_blue", bottom: "wool_light_blue" },
  34: { top: "wool_yellow", side: "wool_yellow", bottom: "wool_yellow" },
  35: { top: "wool_lime", side: "wool_lime", bottom: "wool_lime" },
  36: { top: "wool_pink", side: "wool_pink", bottom: "wool_pink" },
  37: { top: "wool_gray", side: "wool_gray", bottom: "wool_gray" },
  38: { top: "wool_light_gray", side: "wool_light_gray", bottom: "wool_light_gray" },
  39: { top: "wool_cyan", side: "wool_cyan", bottom: "wool_cyan" },
  40: { top: "wool_purple", side: "wool_purple", bottom: "wool_purple" },
  41: { top: "wool_blue", side: "wool_blue", bottom: "wool_blue" },
  42: { top: "wool_brown", side: "wool_brown", bottom: "wool_brown" },
  43: { top: "wool_green", side: "wool_green", bottom: "wool_green" },
  44: { top: "wool_red", side: "wool_red", bottom: "wool_red" },
  45: { top: "wool_black", side: "wool_black", bottom: "wool_black" },
};

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
