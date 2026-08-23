import {
  buildVoxelTileConfig,
  loadTileTexture,
  parseTileAtlasXml,
} from "./atlas";
import type { RendererSwitch } from "./renderer-switch";

const TILE_URL = "./spritesheets/spritesheet_tiles.png";
const XML_URL = "./spritesheets/spritesheet_tiles.xml";

/**
 * Loads the tile spritesheet (one 2D GPU texture) plus its atlas XML, and
 * applies the resulting per-voxel tile config to `rendererSwitch`. Failures
 * are logged and swallowed — voxels stay flat blue rather than blocking
 * startup.
 */
export const loadVoxelTiles = async (
  rendererSwitch: RendererSwitch,
): Promise<void> => {
  try {
    const [loaded, xmlRes] = await Promise.all([
      loadTileTexture(TILE_URL),
      fetch(XML_URL),
    ]);
    if (!xmlRes.ok) {
      throw new Error(`failed to load "${XML_URL}": ${xmlRes.status}`);
    }
    const atlas = parseTileAtlasXml(await xmlRes.text());
    const voxelTiles = buildVoxelTileConfig(atlas, loaded.width, loaded.height);
    rendererSwitch.setTiles(voxelTiles, loaded.texture);
  } catch (err) {
    console.warn(
      "[atlas] spritesheet not applied; voxels stay flat blue.",
      err,
    );
  }
};
