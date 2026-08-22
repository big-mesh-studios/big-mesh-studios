import { Texture } from "@random-mesh/rmsl/scene";

// Subtexture rectangles read from a TexturePacker-style atlas XML file. All
// coordinates are in pixels from the top-left of the atlas image.
export interface SubTexture {
  x: number;
  y: number;
  w: number;
  h: number;
}

// A normalized [u0, v0, u1, v1] rect inside the atlas, inset by half a texel so
// the renderer's linear filtering never blends a neighbouring tile's pixels in.
// v0 is the top of the source tile (smallest pixel y); the shader flips the
// world-up axis when building face UVs, so grass sits on top of side faces.
export type TileRect = [number, number, number, number];

export interface VoxelTiles {
  top: string;
  side: string;
  bottom: string;
}

// Which tile faces each voxel id uses. Voxel 0 is empty air and is never
// textured. Future voxel ids just add an entry here.
export const VOXEL_TILES: Record<number, VoxelTiles> = {
  1: { top: "grass_top", side: "dirt_grass", bottom: "dirt" },
  2: { top: "dirt", side: "dirt", bottom: "dirt" },
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
  const du = 0.5 / atlasW;
  const dv = 0.5 / atlasH;
  return [
    (sub.x + 0.5) / atlasW,
    (sub.y + 0.5) / atlasH,
    (sub.x + sub.w - 0.5) / atlasW,
    (sub.y + sub.h - 0.5) / atlasH,
  ];
};

export interface VoxelTileConfig {
  id: number;
  top: TileRect;
  side: TileRect;
  bottom: TileRect;
}

export const buildVoxelTileConfig = (
  atlas: Map<string, SubTexture>,
  atlasW: number,
  atlasH: number,
): VoxelTileConfig[] => {
  const config: VoxelTileConfig[] = [];
  for (const id of Object.keys(VOXEL_TILES)) {
    const v = VOXEL_TILES[Number(id)];
    const resolve = (name: string): SubTexture => {
      const sub = atlas.get(name);
      if (sub === undefined) {
        throw new Error(`[atlas] missing subtexture "${name}"`);
      }
      return sub;
    };
    config.push({
      id: Number(id),
      top: tileRect(resolve(v.top), atlasW, atlasH),
      side: tileRect(resolve(v.side), atlasW, atlasH),
      bottom: tileRect(resolve(v.bottom), atlasW, atlasH),
    });
  }
  return config;
};

export interface LoadedTileTexture {
  texture: Texture;
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
    width: bitmap.width,
    height: bitmap.height,
  };
};
