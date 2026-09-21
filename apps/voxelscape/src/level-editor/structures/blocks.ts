import {
  VOXEL_AIR,
  VOXEL_BRICK,
  VOXEL_CLOUD,
  VOXEL_DIRT,
  VOXEL_GRASS,
  VOXEL_GREYSTONE,
  VOXEL_ICE,
  VOXEL_LAVA,
  VOXEL_LEAVES,
  VOXEL_LOG,
  VOXEL_SAND,
  VOXEL_STONE,
  VOXEL_WATER,
  VOXEL_WOOD,
} from "../../world/voxel-store";

/** One block a structure can be built from, as the palette offers it. */
export interface BlockChoice {
  id: number;
  name: string;
}

/**
 * The blocks the palette offers, in the order it shows them. Air is included so
 * a box of it carves a section out of the generated terrain, the way a house's
 * door is cut.
 */
export const BLOCK_CHOICES: BlockChoice[] = [
  { id: VOXEL_AIR, name: "Air" },
  { id: VOXEL_STONE, name: "Stone" },
  { id: VOXEL_DIRT, name: "Dirt" },
  { id: VOXEL_GRASS, name: "Grass" },
  { id: VOXEL_WOOD, name: "Wood" },
  { id: VOXEL_BRICK, name: "Brick" },
  { id: VOXEL_GREYSTONE, name: "Greystone" },
  { id: VOXEL_LOG, name: "Log" },
  { id: VOXEL_LEAVES, name: "Leaves" },
  { id: VOXEL_SAND, name: "Sand" },
  { id: VOXEL_ICE, name: "Ice" },
  { id: VOXEL_CLOUD, name: "Cloud" },
  { id: VOXEL_WATER, name: "Water" },
  { id: VOXEL_LAVA, name: "Lava" },
];

/** The name the palette shows for a block id, or the id when it knows none. */
export const blockName = (id: number): string =>
  BLOCK_CHOICES.find((choice) => choice.id === id)?.name ?? `Block ${id}`;
