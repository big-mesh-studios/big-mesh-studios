// ==========================================
// DAWNBRINGER 32 (DB32) COLOUR PALETTE
// ==========================================

import { hexToRgba } from "./utils/utils";

// Monochromes & Dark Neutrals
export const COLOUR_PURE_BLACK = "#000000" as const;
export const COLOUR_DARK_PURPLE_BLACK = "#222034" as const;
export const COLOUR_DEEP_MAROON_BROWN = "#45283c" as const;
export const COLOUR_DARK_RUST_BROWN = "#663931" as const;
export const COLOUR_MEDIUM_EARTH_BROWN = "#8f563b" as const;
export const COLOUR_VIBRANT_TERRACOTTA = "#df7126" as const;

// Warm Tones & Highlights
export const COLOUR_PALE_CREAM = "#f5ffe8" as const;
export const COLOUR_BRIGHT_LEMON_YEL = "#fbf236" as const;
export const COLOUR_LIME_GREEN = "#99e550" as const;
export const COLOUR_MID_MEADOW_GREEN = "#6abe30" as const;
export const COLOUR_DEEP_FOREST_GREEN = "#37946e" as const;
export const COLOUR_WARM_SANDY_TAN = "#d9a066" as const;

// Rich Earths, Pinks, & Reds
export const COLOUR_MUTED_GOLD = "#eed671" as const;
export const COLOUR_FAIR_SKIN_PEACH = "#eec39a" as const;
export const COLOUR_CORAL_RED = "#d95763" as const;
export const COLOUR_DEEP_CRIMSON = "#ac3232" as const;
export const COLOUR_ROYAL_PURPLE = "#76428a" as const;
export const COLOUR_CORNFLOWER_BLUE = "#5b6ee1" as const;

// Cool Oceans & Skies
export const COLOUR_BRIGHT_SKY_BLUE = "#639bff" as const;
export const COLOUR_VIVID_TURQUOISE = "#5fcde4" as const;
export const COLOUR_ICE_BLUE = "#cbdbfc" as const;
export const COLOUR_PURE_WHITE = "#ffffff" as const;
export const COLOUR_COOL_LIGHT_GRAY = "#9badb7" as const;
export const COLOUR_MEDIUM_SLATE_GRAY = "#847e87" as const;
export const COLOUR_OLIVE_DRAB = "#306230" as const;

// Muted Shadows & Foliage
export const COLOUR_DARK_OLIVE = "#4b692f" as const;
export const COLOUR_DEEP_TEAL_BLACK = "#323c39" as const;
export const COLOUR_DARK_INDIGO = "#3f3f74" as const;
export const COLOUR_NAVY_BLUE = "#30346d" as const;
export const COLOUR_CLASSIC_GRASS_GRN = "#44891a" as const;
export const COLOUR_NEUTRAL_MID_GRAY = "#a3a3a3" as const;
export const COLOUR_DARK_WARM_GRAY = "#595652" as const;

/**
 * Explicit template literal type to enforce the structure "#RRGGBB"
 * where each character after # is a hex digit.
 */
export type HexColour = `#${string}`;

/**
 * Strongly typed array containing the entire 32-Colour collection.
 */
export const DAWNBRINGER_32_PALETTE = [
  COLOUR_PURE_BLACK,
  COLOUR_DARK_PURPLE_BLACK,
  COLOUR_DEEP_MAROON_BROWN,
  COLOUR_DARK_RUST_BROWN,
  COLOUR_MEDIUM_EARTH_BROWN,
  COLOUR_VIBRANT_TERRACOTTA,
  COLOUR_PALE_CREAM,
  COLOUR_BRIGHT_LEMON_YEL,
  COLOUR_LIME_GREEN,
  COLOUR_MID_MEADOW_GREEN,
  COLOUR_DEEP_FOREST_GREEN,
  COLOUR_WARM_SANDY_TAN,
  COLOUR_MUTED_GOLD,
  COLOUR_FAIR_SKIN_PEACH,
  COLOUR_CORAL_RED,
  COLOUR_DEEP_CRIMSON,
  COLOUR_ROYAL_PURPLE,
  COLOUR_CORNFLOWER_BLUE,
  COLOUR_BRIGHT_SKY_BLUE,
  COLOUR_VIVID_TURQUOISE,
  COLOUR_ICE_BLUE,
  COLOUR_PURE_WHITE,
  COLOUR_COOL_LIGHT_GRAY,
  COLOUR_MEDIUM_SLATE_GRAY,
  COLOUR_OLIVE_DRAB,
  COLOUR_DARK_OLIVE,
  COLOUR_DEEP_TEAL_BLACK,
  COLOUR_DARK_INDIGO,
  COLOUR_NAVY_BLUE,
  COLOUR_CLASSIC_GRASS_GRN,
  COLOUR_NEUTRAL_MID_GRAY,
  COLOUR_DARK_WARM_GRAY,
].map(hexToRgba);

/**
 * Categorised record map for scenarios where you need to reference
 * Colours by their functional group.
 */
export const DB32_CATEGORIES: Record<string, HexColour[]> = {
  monochromesAndDarkNeutrals: [
    COLOUR_PURE_BLACK,
    COLOUR_DARK_PURPLE_BLACK,
    COLOUR_DEEP_MAROON_BROWN,
    COLOUR_DARK_RUST_BROWN,
    COLOUR_MEDIUM_EARTH_BROWN,
    COLOUR_VIBRANT_TERRACOTTA,
  ],
  warmTonesAndHighlights: [
    COLOUR_PALE_CREAM,
    COLOUR_BRIGHT_LEMON_YEL,
    COLOUR_LIME_GREEN,
    COLOUR_MID_MEADOW_GREEN,
    COLOUR_DEEP_FOREST_GREEN,
    COLOUR_WARM_SANDY_TAN,
  ],
  richEarthsPinksAndReds: [
    COLOUR_MUTED_GOLD,
    COLOUR_FAIR_SKIN_PEACH,
    COLOUR_CORAL_RED,
    COLOUR_DEEP_CRIMSON,
    COLOUR_ROYAL_PURPLE,
    COLOUR_CORNFLOWER_BLUE,
  ],
  coolOceansAndSkies: [
    COLOUR_BRIGHT_SKY_BLUE,
    COLOUR_VIVID_TURQUOISE,
    COLOUR_ICE_BLUE,
    COLOUR_PURE_WHITE,
    COLOUR_COOL_LIGHT_GRAY,
    COLOUR_MEDIUM_SLATE_GRAY,
    COLOUR_OLIVE_DRAB,
  ],
  mutedShadowsAndFoliage: [
    COLOUR_DARK_OLIVE,
    COLOUR_DEEP_TEAL_BLACK,
    COLOUR_DARK_INDIGO,
    COLOUR_NAVY_BLUE,
    COLOUR_CLASSIC_GRASS_GRN,
    COLOUR_NEUTRAL_MID_GRAY,
    COLOUR_DARK_WARM_GRAY,
  ],
};
