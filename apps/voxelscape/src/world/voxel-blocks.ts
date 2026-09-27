// Every block a structure in this world can be built from: what it is called,
// what a place script calls it, and which family it belongs to. The ids are the
// world's own, from `voxel-store.ts`, and the tile each one wears is read out of
// `voxel-tiles.ts` rather than restated, so a block and its tile cannot drift
// apart.
//
// The list is the whole set, not a hand-picked subset. The level editor's
// palette offers every entry, a place script's `engine.blocks` names every entry
// as its `script`, and the shape list labels a shape with its `name`.

import {
  VOXEL_AIR,
  VOXEL_BRICK,
  VOXEL_CLOUD,
  VOXEL_DIRT,
  VOXEL_EMBER,
  VOXEL_GRASS,
  VOXEL_GREYSTONE,
  VOXEL_GLOWSTONE,
  VOXEL_ICE,
  VOXEL_LAVA,
  VOXEL_LEAVES,
  VOXEL_LOG,
  VOXEL_OBSIDIAN,
  VOXEL_SAND,
  VOXEL_STONE,
  VOXEL_WATER,
  VOXEL_WOOD,
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
} from "./voxel-store";
import { VOXEL_TILES } from "./voxel-tiles";

/** The families a block belongs to, in the order the palette groups them. */
export type VoxelBlockGroup = "Terrain" | "Nature" | "Built" | "Wool";

export interface VoxelBlock {
  id: number;
  /** The name the world shows for it. */
  name: string;
  /**
   * The name a place script names it by, in `engine.blocks`. Also the name its
   * wool tile is generated under.
   */
  script: string;
  /**
   * The tile a drawing of this block shows, where that is not the one the world
   * draws it with. Water is drawn by the water mesh rather than the terrain
   * mesh, so it names the sheet's own water tile here; air has no tile at all
   * and leaves this unset. Every other block is drawn as its side face.
   */
  icon?: string;
  group: VoxelBlockGroup;
}

const block = (
  id: number,
  name: string,
  script: string,
  group: VoxelBlockGroup,
  icon?: string,
): VoxelBlock => ({ id, name, script, group, ...(icon ? { icon } : {}) });

/** Every block a structure can be built from, in the order the palette shows them. */
export const VOXEL_BLOCKS: VoxelBlock[] = [
  // Air is offered so a box of it carves a section out of the generated
  // terrain, the way a house's door is cut.
  block(VOXEL_AIR, "Air", "air", "Terrain"),
  block(VOXEL_STONE, "Stone", "stone", "Terrain"),
  block(VOXEL_DIRT, "Dirt", "dirt", "Terrain"),
  block(VOXEL_GRASS, "Grass", "grass", "Terrain"),
  block(VOXEL_SAND, "Sand", "sand", "Terrain"),
  block(VOXEL_GREYSTONE, "Greystone", "greystone", "Terrain"),
  block(VOXEL_OBSIDIAN, "Obsidian", "obsidian", "Terrain"),
  block(VOXEL_ICE, "Ice", "ice", "Terrain"),
  block(VOXEL_CLOUD, "Cloud", "cloud", "Terrain"),
  block(VOXEL_WATER, "Water", "water", "Terrain", "water"),
  block(VOXEL_LAVA, "Lava", "lava", "Terrain"),
  block(VOXEL_LOG, "Log", "log", "Nature"),
  block(VOXEL_LEAVES, "Leaves", "leaves", "Nature"),
  block(VOXEL_WOOD, "Wood", "wood", "Built"),
  block(VOXEL_BRICK, "Brick", "brick", "Built"),
  block(VOXEL_GLOWSTONE, "Glowstone", "glowstone", "Built"),
  block(VOXEL_EMBER, "Ember", "ember", "Built"),
  block(VOXEL_WOOL_WHITE, "White Wool", "wool_white", "Wool"),
  block(VOXEL_WOOL_ORANGE, "Orange Wool", "wool_orange", "Wool"),
  block(VOXEL_WOOL_MAGENTA, "Magenta Wool", "wool_magenta", "Wool"),
  block(VOXEL_WOOL_LIGHT_BLUE, "Light Blue Wool", "wool_light_blue", "Wool"),
  block(VOXEL_WOOL_YELLOW, "Yellow Wool", "wool_yellow", "Wool"),
  block(VOXEL_WOOL_LIME, "Lime Wool", "wool_lime", "Wool"),
  block(VOXEL_WOOL_PINK, "Pink Wool", "wool_pink", "Wool"),
  block(VOXEL_WOOL_GRAY, "Gray Wool", "wool_gray", "Wool"),
  block(VOXEL_WOOL_LIGHT_GRAY, "Light Gray Wool", "wool_light_gray", "Wool"),
  block(VOXEL_WOOL_CYAN, "Cyan Wool", "wool_cyan", "Wool"),
  block(VOXEL_WOOL_PURPLE, "Purple Wool", "wool_purple", "Wool"),
  block(VOXEL_WOOL_BLUE, "Blue Wool", "wool_blue", "Wool"),
  block(VOXEL_WOOL_BROWN, "Brown Wool", "wool_brown", "Wool"),
  block(VOXEL_WOOL_GREEN, "Green Wool", "wool_green", "Wool"),
  block(VOXEL_WOOL_RED, "Red Wool", "wool_red", "Wool"),
  block(VOXEL_WOOL_BLACK, "Black Wool", "wool_black", "Wool"),
];

/** The blocks of one family, in palette order. */
export const blocksOfGroup = (group: VoxelBlockGroup): VoxelBlock[] =>
  VOXEL_BLOCKS.filter((entry) => entry.group === group);

/** The name the world shows for a block id, or the id when it knows none. */
export const blockName = (id: number): string =>
  VOXEL_BLOCKS.find((entry) => entry.id === id)?.name ?? `Block ${id}`;

/** The tile a drawing of this block shows: its own `icon`, or its side face. */
export const blockIconTile = (entry: VoxelBlock): string | undefined =>
  entry.icon ?? VOXEL_TILES[entry.id]?.side;
