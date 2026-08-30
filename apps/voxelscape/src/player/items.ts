// Everything the player can hold, declared once. An item id is its own thing
// rather than a voxel id: a block item carries the voxel it places on its
// tool, so the two spaces meet only where the world and the hand exchange
// something — `BREAK_YIELD` when a voxel becomes an item, and each
// `BlockTool` when an item becomes a voxel again. Declaration order here is
// hotbar order.
import { VOXEL_CLOUD, VOXEL_DIRT, VOXEL_GRASS } from "../world/voxel-store";
import { BlockTool } from "./tools/block-tool";
import { SwordTool } from "./tools/sword-tool";
import type { Tool, ToolContext } from "./tools/tool";

/** Everything the player can hold, one id per hotbar slot. */
export type ItemId = "dirt" | "cloud" | "sword";

export interface ItemDefinition {
  /** The name the hotbar shows, and the one edit messages are phrased with. */
  name: string;
  /** Whether more than one can be carried; a tool is carried exactly once. */
  stackable: boolean;
  /**
   * The items-spritesheet sprite the held model and the hotbar icon are both
   * cut from, or null for an item that draws neither.
   */
  sprite: string | null;
  /** Builds what wielding this item means, once the world it acts on exists. */
  tool: (ctx: ToolContext) => Tool;
}

export const ITEMS: Record<ItemId, ItemDefinition> = {
  dirt: {
    name: "Dirt",
    stackable: true,
    sprite: null,
    tool: (ctx) => new BlockTool(ctx, "dirt", VOXEL_DIRT),
  },
  cloud: {
    name: "Cloud",
    stackable: true,
    sprite: null,
    tool: (ctx) => new BlockTool(ctx, "cloud", VOXEL_CLOUD),
  },
  sword: {
    name: "Sword",
    stackable: false,
    sprite: "sword_bronze",
    tool: (ctx) => new SwordTool(ctx),
  },
};

/** The hotbar's slots, in the order it draws them. */
export const ITEM_ORDER = Object.keys(ITEMS) as ItemId[];

/**
 * What breaking each breakable voxel yields: grass and dirt both collect as
 * plain dirt, and a voxel absent here cannot be broken into anything.
 */
export const BREAK_YIELD: Record<number, ItemId> = {
  [VOXEL_GRASS]: "dirt",
  [VOXEL_DIRT]: "dirt",
  [VOXEL_CLOUD]: "cloud",
};
