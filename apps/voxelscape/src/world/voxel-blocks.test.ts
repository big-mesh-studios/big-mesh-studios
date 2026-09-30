// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  blockIconTile,
  blockName,
  blocksOfGroup,
  VOXEL_BLOCKS,
} from "./voxel-blocks";
import { VOXEL_TILES } from "./voxel-tiles";
import {
  isLavaId,
  isWaterId,
  VOXEL_AIR,
  VOXEL_LAVA,
  VOXEL_WATER,
} from "./voxel-store";
import { WOOL_COLORS } from "../renderers/procedural-wool";
import { parseTileAtlasXml } from "../renderers/atlas";
import { BREAK_YIELD } from "../player/items";

/** The tile names the sheet is generated with rather than shipped carrying. */
const GENERATED = new Set([
  "obsidian",
  "glowstone",
  ...WOOL_COLORS.map((wool) => wool.name),
]);

/**
 * Whether an id is one of a fluid's flowing states, which the world's flow
 * derives from the source cell a structure places rather than anything naming
 * them.
 */
const isFlowingState = (id: number): boolean =>
  (isWaterId(id) && id !== VOXEL_WATER) || (isLavaId(id) && id !== VOXEL_LAVA);

/** The tiles the shipped spritesheet holds, read off the atlas beside it. */
const shippedTiles = (): Set<string> => {
  const xml = readFileSync(
    resolve("public/spritesheets/spritesheet_tiles.xml"),
    "utf8",
  );
  return new Set(parseTileAtlasXml(xml).keys());
};

describe("the block list", () => {
  it("names every block distinctly", () => {
    const ids = VOXEL_BLOCKS.map((block) => block.id);
    const scripts = VOXEL_BLOCKS.map((block) => block.script);
    expect(new Set(ids).size).toBe(VOXEL_BLOCKS.length);
    expect(new Set(scripts).size).toBe(VOXEL_BLOCKS.length);
  });

  it("has a name for every id it holds", () => {
    for (const block of VOXEL_BLOCKS) {
      expect(blockName(block.id)).toBe(block.name);
    }
  });

  it("gives every block but air a tile the world draws it with", () => {
    for (const block of VOXEL_BLOCKS) {
      if (block.id === VOXEL_AIR) {
        continue;
      }
      expect(
        VOXEL_TILES[block.id] !== undefined || block.icon !== undefined,
      ).toBe(true);
    }
  });

  it("offers every block the world tiles, bar a fluid's flowing states", () => {
    const tiled = Object.keys(VOXEL_TILES).map(Number);
    for (const id of tiled) {
      if (isFlowingState(id)) {
        continue;
      }
      expect(VOXEL_BLOCKS.some((block) => block.id === id)).toBe(true);
    }
  });

  it("groups every block under one of the families it lists", () => {
    const grouped = (["Terrain", "Nature", "Built", "Wool"] as const).flatMap(
      (group) => blocksOfGroup(group),
    );
    expect(grouped.map((block) => block.id)).toEqual(
      VOXEL_BLOCKS.map((block) => block.id),
    );
  });
});

describe("a block's icon tile", () => {
  it("is a tile the sheet carries or one the sheet is generated with", () => {
    const shipped = shippedTiles();
    for (const block of VOXEL_BLOCKS) {
      const tile = blockIconTile(block);
      if (tile === undefined) {
        expect(block.id).toBe(VOXEL_AIR);
        continue;
      }
      expect(shipped.has(tile) || GENERATED.has(tile)).toBe(true);
    }
  });

  it("is the one the world draws the block with, unless it names another", () => {
    for (const block of VOXEL_BLOCKS) {
      if (block.icon === undefined) {
        expect(blockIconTile(block)).toBe(VOXEL_TILES[block.id]?.side);
      }
    }
  });
});

describe("the wool blocks", () => {
  it("are generated under the name a script knows each by", () => {
    const scripts = new Set(
      VOXEL_BLOCKS.filter((block) => block.group === "Wool").map(
        (block) => block.script,
      ),
    );
    expect(WOOL_COLORS.map((wool) => wool.name).sort()).toEqual(
      [...scripts].sort(),
    );
  });

  it("carry their own voxel id", () => {
    const wools = VOXEL_BLOCKS.filter((block) => block.group === "Wool");
    for (const wool of WOOL_COLORS) {
      expect(wools.some((block) => block.id === wool.id)).toBe(true);
    }
  });

  it("are all breakable, yielding their own item", () => {
    for (const wool of WOOL_COLORS) {
      expect(BREAK_YIELD[wool.id]).toBe(wool.name);
    }
  });
});
