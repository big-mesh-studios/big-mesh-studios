import {
  buildVoxelTileConfig,
  loadTileTexture,
  parseTileAtlasXml,
  type VoxelTiles,
} from "./atlas";
import type { TriangleRenderer } from "./triangle-renderer";

const TILE_URL = "./spritesheets/spritesheet_tiles.png";
const XML_URL = "./spritesheets/spritesheet_tiles.xml";

export interface LoadVoxelTilesOptions {
  tileUrl?: string;
  xmlUrl?: string;
  customVoxelTiles?: Record<number, VoxelTiles>;
}

/**
 * Loads the tile spritesheet (one 2D GPU texture) plus its atlas XML, and
 * applies the resulting per-voxel tile config to `rendererSwitch`. Failures
 * are logged and swallowed — voxels stay flat blue rather than blocking
 * startup.
 */
export const loadVoxelTiles = async (
  rendererSwitch: TriangleRenderer,
  options?: LoadVoxelTilesOptions,
): Promise<void> => {
  const tileUrl = options?.tileUrl ?? TILE_URL;
  const xmlUrl = options?.xmlUrl ?? XML_URL;
  try {
    const [loaded, xmlRes] = await Promise.all([
      loadTileTexture(tileUrl),
      fetch(xmlUrl),
    ]);
    if (!xmlRes.ok) {
      throw new Error(`failed to load "${xmlUrl}": ${xmlRes.status}`);
    }
    const atlas = parseTileAtlasXml(await xmlRes.text());
    const voxelTiles = buildVoxelTileConfig(
      atlas,
      loaded.width,
      loaded.height,
      options?.customVoxelTiles,
    );
    rendererSwitch.setTiles(voxelTiles, loaded.texture);
  } catch (err) {
    console.warn(
      "[atlas] spritesheet not applied; voxels stay flat blue.",
      err,
    );
  }
};
