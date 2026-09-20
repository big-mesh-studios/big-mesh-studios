// Everything the player can hold, declared once. An item id is its own thing
// rather than a voxel id: a block item carries the voxel it places on its
// tool, so the two spaces meet only where the world and the hand exchange
// something — `BREAK_YIELD` when a voxel becomes an item, and each
// `BlockTool` when an item becomes a voxel again. Declaration order here is
// hotbar order.
import {
  VOXEL_BRICK,
  VOXEL_CLOUD,
  VOXEL_DIRT,
  VOXEL_GRASS,
  VOXEL_LEAVES,
  VOXEL_LOG,
  VOXEL_STONE,
  VOXEL_WOOD,
  VOXEL_WOOL_WHITE,
  VOXEL_WOOL_ORANGE,
  VOXEL_WOOL_MAGENTA,
  VOXEL_WOOL_LIGHT_BLUE,
  VOXEL_WOOL_YELLOW,
  VOXEL_WOOL_LIME,
  VOXEL_WOOL_PINK,
  VOXEL_WOOL_GRAY,
  VOXEL_WOOL_LIGHT_GRAY,
  VOXEL_WOOL_CYAN,
  VOXEL_WOOL_PURPLE,
  VOXEL_WOOL_BLUE,
  VOXEL_WOOL_BROWN,
  VOXEL_WOOL_GREEN,
  VOXEL_WOOL_RED,
  VOXEL_WOOL_BLACK,
} from "../world/voxel-store";
import { BlockTool } from "./tools/block-tool";
import { SwordTool } from "./tools/sword-tool";
import { BucketTool } from "./tools/bucket-tool";
import type { Tool, ToolContext } from "./tools/tool";

/** Everything the player can hold, one id per hotbar slot. */
export type ItemId =
  | "dirt"
  | "stone"
  | "cloud"
  | "brick"
  | "wood"
  | "bucket"
  | "sword"
  | "wool_white"
  | "wool_orange"
  | "wool_magenta"
  | "wool_light_blue"
  | "wool_yellow"
  | "wool_lime"
  | "wool_pink"
  | "wool_gray"
  | "wool_light_gray"
  | "wool_cyan"
  | "wool_purple"
  | "wool_blue"
  | "wool_brown"
  | "wool_green"
  | "wool_red"
  | "wool_black";

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
  /**
   * For wool blocks: the CSS colour used to draw the item icon procedurally.
   * Absent for non-wool items.
   */
  woolColor?: string;
}

export const ITEMS: Record<ItemId, ItemDefinition> = {
  dirt: {
    name: "Dirt",
    stackable: true,
    sprite: null,
    tool: (ctx) => new BlockTool(ctx, "dirt", VOXEL_DIRT),
  },
  stone: {
    name: "Stone",
    stackable: true,
    sprite: null,
    tool: (ctx) => new BlockTool(ctx, "stone", VOXEL_STONE),
  },
  cloud: {
    name: "Cloud",
    stackable: true,
    sprite: null,
    tool: (ctx) => new BlockTool(ctx, "cloud", VOXEL_CLOUD),
  },
  brick: {
    name: "Brick",
    stackable: true,
    sprite: null,
    tool: (ctx) => new BlockTool(ctx, "brick", VOXEL_BRICK),
  },
  wood: {
    name: "Wood",
    stackable: true,
    sprite: null,
    tool: (ctx) => new BlockTool(ctx, "wood", VOXEL_WOOD),
  },
  bucket: {
    name: "Bucket",
    stackable: false,
    sprite: "bucket",
    tool: (ctx) => new BucketTool(ctx),
  },
  sword: {
    name: "Sword",
    stackable: false,
    sprite: "sword_bronze",
    tool: (ctx) => new SwordTool(ctx),
  },
  // ─── 16 wool blocks ───────────────────────────────────────────────────────
  wool_white: {
    name: "White Wool",
    stackable: true,
    sprite: null,
    woolColor: "#f9fafb",
    tool: (ctx) => new BlockTool(ctx, "wool_white", VOXEL_WOOL_WHITE),
  },
  wool_orange: {
    name: "Orange Wool",
    stackable: true,
    sprite: null,
    woolColor: "#f97316",
    tool: (ctx) => new BlockTool(ctx, "wool_orange", VOXEL_WOOL_ORANGE),
  },
  wool_magenta: {
    name: "Magenta Wool",
    stackable: true,
    sprite: null,
    woolColor: "#d946ef",
    tool: (ctx) => new BlockTool(ctx, "wool_magenta", VOXEL_WOOL_MAGENTA),
  },
  wool_light_blue: {
    name: "Light Blue Wool",
    stackable: true,
    sprite: null,
    woolColor: "#7dd3fc",
    tool: (ctx) => new BlockTool(ctx, "wool_light_blue", VOXEL_WOOL_LIGHT_BLUE),
  },
  wool_yellow: {
    name: "Yellow Wool",
    stackable: true,
    sprite: null,
    woolColor: "#fde047",
    tool: (ctx) => new BlockTool(ctx, "wool_yellow", VOXEL_WOOL_YELLOW),
  },
  wool_lime: {
    name: "Lime Wool",
    stackable: true,
    sprite: null,
    woolColor: "#84cc16",
    tool: (ctx) => new BlockTool(ctx, "wool_lime", VOXEL_WOOL_LIME),
  },
  wool_pink: {
    name: "Pink Wool",
    stackable: true,
    sprite: null,
    woolColor: "#f9a8d4",
    tool: (ctx) => new BlockTool(ctx, "wool_pink", VOXEL_WOOL_PINK),
  },
  wool_gray: {
    name: "Gray Wool",
    stackable: true,
    sprite: null,
    woolColor: "#6b7280",
    tool: (ctx) => new BlockTool(ctx, "wool_gray", VOXEL_WOOL_GRAY),
  },
  wool_light_gray: {
    name: "Light Gray Wool",
    stackable: true,
    sprite: null,
    woolColor: "#d1d5db",
    tool: (ctx) => new BlockTool(ctx, "wool_light_gray", VOXEL_WOOL_LIGHT_GRAY),
  },
  wool_cyan: {
    name: "Cyan Wool",
    stackable: true,
    sprite: null,
    woolColor: "#06b6d4",
    tool: (ctx) => new BlockTool(ctx, "wool_cyan", VOXEL_WOOL_CYAN),
  },
  wool_purple: {
    name: "Purple Wool",
    stackable: true,
    sprite: null,
    woolColor: "#9333ea",
    tool: (ctx) => new BlockTool(ctx, "wool_purple", VOXEL_WOOL_PURPLE),
  },
  wool_blue: {
    name: "Blue Wool",
    stackable: true,
    sprite: null,
    woolColor: "#3b82f6",
    tool: (ctx) => new BlockTool(ctx, "wool_blue", VOXEL_WOOL_BLUE),
  },
  wool_brown: {
    name: "Brown Wool",
    stackable: true,
    sprite: null,
    woolColor: "#92400e",
    tool: (ctx) => new BlockTool(ctx, "wool_brown", VOXEL_WOOL_BROWN),
  },
  wool_green: {
    name: "Green Wool",
    stackable: true,
    sprite: null,
    woolColor: "#166534",
    tool: (ctx) => new BlockTool(ctx, "wool_green", VOXEL_WOOL_GREEN),
  },
  wool_red: {
    name: "Red Wool",
    stackable: true,
    sprite: null,
    woolColor: "#dc2626",
    tool: (ctx) => new BlockTool(ctx, "wool_red", VOXEL_WOOL_RED),
  },
  wool_black: {
    name: "Black Wool",
    stackable: true,
    sprite: null,
    woolColor: "#1f2937",
    tool: (ctx) => new BlockTool(ctx, "wool_black", VOXEL_WOOL_BLACK),
  },
};

/** All item ids in their declared order (used by ITEM_ORDER). */
export const ITEM_ORDER = Object.keys(ITEMS) as ItemId[];

/**
 * What breaking each breakable voxel yields: grass and dirt both collect as
 * plain dirt, stone collects as stone, and a voxel absent here cannot be broken.
 */
export const BREAK_YIELD: Record<number, ItemId> = {
  [VOXEL_GRASS]: "dirt",
  [VOXEL_DIRT]: "dirt",
  [VOXEL_STONE]: "stone",
  [VOXEL_CLOUD]: "cloud",
  [VOXEL_LOG]: "wood",
  [VOXEL_LEAVES]: "wood",
  [VOXEL_BRICK]: "brick",
  [VOXEL_WOOD]: "wood",
  [VOXEL_WOOL_WHITE]: "wool_white",
  [VOXEL_WOOL_ORANGE]: "wool_orange",
  [VOXEL_WOOL_MAGENTA]: "wool_magenta",
  [VOXEL_WOOL_LIGHT_BLUE]: "wool_light_blue",
  [VOXEL_WOOL_YELLOW]: "wool_yellow",
  [VOXEL_WOOL_LIME]: "wool_lime",
  [VOXEL_WOOL_PINK]: "wool_pink",
  [VOXEL_WOOL_GRAY]: "wool_gray",
  [VOXEL_WOOL_LIGHT_GRAY]: "wool_light_gray",
  [VOXEL_WOOL_CYAN]: "wool_cyan",
  [VOXEL_WOOL_PURPLE]: "wool_purple",
  [VOXEL_WOOL_BLUE]: "wool_blue",
  [VOXEL_WOOL_BROWN]: "wool_brown",
  [VOXEL_WOOL_GREEN]: "wool_green",
  [VOXEL_WOOL_RED]: "wool_red",
  [VOXEL_WOOL_BLACK]: "wool_black",
};
