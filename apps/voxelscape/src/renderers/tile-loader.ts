import {
  atlasGridOf,
  buildVoxelTileConfig,
  loadTileTexture,
  parseTileAtlasXml,
} from "./atlas";
import {
  TILE_ATLAS_URL,
  TILE_SHEET_URL,
  type VoxelTiles,
} from "../world/voxel-tiles";
import { injectProceduralWoolTiles } from "./procedural-wool";
import { injectProceduralObsidianTile } from "./procedural-obsidian";
import { injectProceduralGlowstoneTile } from "./procedural-glowstone";
import type { TriangleRenderer } from "./triangle-renderer";

export interface LoadVoxelTilesOptions {
  tileUrl?: string;
  xmlUrl?: string;
  customVoxelTiles?: Record<number, VoxelTiles>;
}

/**
 * Loads the tile spritesheet (one 2D GPU texture) plus its atlas XML, injects
 * procedural 32x32 wool textures for the wool voxel IDs, and applies the
 * resulting per-voxel tile config to `renderer`.
 */
export const loadVoxelTiles = async (
  renderer: TriangleRenderer,
  options?: LoadVoxelTilesOptions,
): Promise<void> => {
  const tileUrl = options?.tileUrl ?? TILE_SHEET_URL;
  const xmlUrl = options?.xmlUrl ?? TILE_ATLAS_URL;
  try {
    const [loaded, xmlRes] = await Promise.all([
      loadTileTexture(tileUrl),
      fetch(xmlUrl),
    ]);
    if (!xmlRes.ok) {
      throw new Error(`failed to load "${xmlUrl}": ${xmlRes.status}`);
    }
    const atlas = parseTileAtlasXml(await xmlRes.text());

    // Inject procedural 32x32 spec wool textures for the 16 wool block colors into atlas
    const woolAtlas = await injectProceduralWoolTiles(
      loaded.bitmap,
      loaded.width,
      loaded.height,
      atlas,
    );
    // Inject the procedurally drawn obsidian tile a portal frame is built from.
    const atlasWithObsidian = await injectProceduralObsidianTile(
      woolAtlas.bitmap,
      woolAtlas.width,
      woolAtlas.height,
      atlas,
    );
    // Inject the procedurally drawn glowstone tile that lights a sealed room.
    const atlasWithGlowstone = await injectProceduralGlowstoneTile(
      atlasWithObsidian.bitmap,
      atlasWithObsidian.width,
      atlasWithObsidian.height,
      atlas,
    );

    const grid = atlasGridOf(
      atlas,
      atlasWithGlowstone.width,
      atlasWithGlowstone.height,
    );
    if (grid === null) {
      throw new Error(
        "[atlas] the sheet's tiles are not one size on a grid, which is the only layout a tile index can name",
      );
    }
    const voxelTiles = buildVoxelTileConfig(
      atlas,
      grid,
      options?.customVoxelTiles,
    );
    renderer.setTiles(voxelTiles, atlasWithGlowstone.texture, grid);
  } catch (err) {
    console.warn(
      "[atlas] spritesheet not applied; voxels stay flat blue.",
      err,
    );
  }
};
