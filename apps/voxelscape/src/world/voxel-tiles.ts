// Which tile faces each voxel id wears, and where the sheet those tiles live is
// served from. Kept apart from `renderers/atlas.ts`, which reads the sheet and
// builds a texture out of it, so that everything naming a block's tile — the
// palette, the place editor's custom blocks, the icon a block is drawn as in the
// level editor's picker — can do so without a graphics context in its import
// graph.

// Served from the site's own root, the same folder every other address in
// this application is built from (see `vite.config.ts`'s `base`).
export const TILE_SHEET_URL = `${import.meta.env.BASE_URL}spritesheets/spritesheet_tiles.png`;
export const TILE_ATLAS_URL = `${import.meta.env.BASE_URL}spritesheets/spritesheet_tiles.xml`;

/** The tile spritesheet's size, in pixels. */
export const TILE_SHEET_WIDTH = 1152;
export const TILE_SHEET_HEIGHT = 1280;

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
  33: {
    top: "wool_light_blue",
    side: "wool_light_blue",
    bottom: "wool_light_blue",
  },
  34: { top: "wool_yellow", side: "wool_yellow", bottom: "wool_yellow" },
  35: { top: "wool_lime", side: "wool_lime", bottom: "wool_lime" },
  36: { top: "wool_pink", side: "wool_pink", bottom: "wool_pink" },
  37: { top: "wool_gray", side: "wool_gray", bottom: "wool_gray" },
  38: {
    top: "wool_light_gray",
    side: "wool_light_gray",
    bottom: "wool_light_gray",
  },
  39: { top: "wool_cyan", side: "wool_cyan", bottom: "wool_cyan" },
  40: { top: "wool_purple", side: "wool_purple", bottom: "wool_purple" },
  41: { top: "wool_blue", side: "wool_blue", bottom: "wool_blue" },
  42: { top: "wool_brown", side: "wool_brown", bottom: "wool_brown" },
  43: { top: "wool_green", side: "wool_green", bottom: "wool_green" },
  44: { top: "wool_red", side: "wool_red", bottom: "wool_red" },
  45: { top: "wool_black", side: "wool_black", bottom: "wool_black" },
  // Sand wears the sheet's own tile on every face.
  46: { top: "sand", side: "sand", bottom: "sand" },
  // Obsidian wears the procedurally generated portal-frame tile on every face.
  47: { top: "obsidian", side: "obsidian", bottom: "obsidian" },
  // Glowstone wears the procedurally generated tile of warm lumps on every face.
  48: { top: "glowstone", side: "glowstone", bottom: "glowstone" },
};
