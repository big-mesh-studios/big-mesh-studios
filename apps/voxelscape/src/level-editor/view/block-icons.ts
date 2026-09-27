// A drawing of each block, for the level editor's block picker to show one per
// block it offers.
//
// Most tiles are crops of the tile spritesheet the world itself is drawn from,
// cropped by background position exactly as a hotbar item crops the items sheet.
// The rest are drawn rather than shipped — the sixteen wools, obsidian and
// glowstone are generated onto the end of the sheet at load — so their drawings
// come from calling the same generator the sheet is built from, at the size a
// picker icon wants rather than a full sheet cell.

import { parseTileAtlasXml, type SubTexture } from "../../renderers/atlas";
import { paintGlowstoneTile } from "../../renderers/procedural-glowstone";
import { paintObsidianTile } from "../../renderers/procedural-obsidian";
import {
  paintWoolTile,
  WOOL_COLORS,
  type WoolColorDef,
} from "../../renderers/procedural-wool";
import {
  VOXEL_BLOCKS,
  blockIconTile,
  type VoxelBlock,
} from "../../world/voxel-blocks";
import {
  TILE_ATLAS_URL,
  TILE_SHEET_HEIGHT,
  TILE_SHEET_URL,
  TILE_SHEET_WIDTH,
} from "../../world/voxel-tiles";

/**
 * How wide and tall an icon is drawn, in pixels. A crop's background properties
 * are worked out for exactly this box, so the element showing one has to be this
 * size; the picker scales it from there with a custom property.
 */
export const BLOCK_ICON_SIZE = 36;

type TilePainter = (ctx: CanvasRenderingContext2D, size: number) => void;

/** How each tile the sheet does not carry is drawn, by the tile's name. */
const GENERATED_TILES = new Map<string, TilePainter>([
  ["obsidian", (ctx, size) => paintObsidianTile(ctx, 0, 0, size)],
  ["glowstone", (ctx, size) => paintGlowstoneTile(ctx, 0, 0, size)],
  ...WOOL_COLORS.map(
    (wool: WoolColorDef, index: number): [string, TilePainter] => [
      wool.name,
      (ctx, size) => paintWoolTile(ctx, 0, 0, size, wool, index + 1),
    ],
  ),
]);

/**
 * How a block is drawn in the picker: cropped from the sheet, painted by the
 * generator that makes its tile, the nothing that air is, or nothing at all
 * when its tile could not be found.
 */
export type BlockIcon =
  | { kind: "sheet"; rect: SubTexture }
  | { kind: "painted"; canvas: HTMLCanvasElement }
  | { kind: "absent" }
  | { kind: "empty" };

/** The background that crops a sheet tile out of the tile spritesheet, centred. */
export const sheetIconStyle = (rect: SubTexture): Record<string, string> => {
  const scale = BLOCK_ICON_SIZE / Math.max(rect.w, rect.h);
  const w = rect.w * scale;
  const h = rect.h * scale;
  return {
    "background-image": `url("${TILE_SHEET_URL}")`,
    "background-repeat": "no-repeat",
    "background-size": `${TILE_SHEET_WIDTH * scale}px ${TILE_SHEET_HEIGHT * scale}px`,
    "background-position": `${(BLOCK_ICON_SIZE - w) / 2 - rect.x * scale}px ${(BLOCK_ICON_SIZE - h) / 2 - rect.y * scale}px`,
  };
};

const paintedTile = (paint: TilePainter): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = BLOCK_ICON_SIZE;
  canvas.height = BLOCK_ICON_SIZE;
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    paint(ctx, BLOCK_ICON_SIZE);
  }
  return canvas;
};

const iconOf = (
  entry: VoxelBlock,
  atlas: Map<string, SubTexture>,
): BlockIcon => {
  const tile = blockIconTile(entry);
  if (tile === undefined) {
    return { kind: "empty" };
  }
  const paint = GENERATED_TILES.get(tile);
  if (paint !== undefined) {
    return { kind: "painted", canvas: paintedTile(paint) };
  }
  const rect = atlas.get(tile);
  return rect === undefined ? { kind: "absent" } : { kind: "sheet", rect };
};

/** The sheet's tile rectangles, or an empty atlas when it cannot be read. */
const readTileAtlas = async (): Promise<Map<string, SubTexture>> => {
  const response = await fetch(TILE_ATLAS_URL);
  if (!response.ok) {
    throw new Error(`failed to load "${TILE_ATLAS_URL}": ${response.status}`);
  }
  return parseTileAtlasXml(await response.text());
};

const buildIcons = async (): Promise<Map<number, BlockIcon>> => {
  const atlas = await readTileAtlas().catch(
    () => new Map<string, SubTexture>(),
  );
  return new Map(
    VOXEL_BLOCKS.map((entry) => [entry.id, iconOf(entry, atlas)] as const),
  );
};

let icons: Promise<Map<number, BlockIcon>> | undefined;

/**
 * A drawing of every block the world offers, keyed by voxel id. The sheet is
 * read once and the generated tiles drawn once, however many times the editor is
 * opened, since the spritesheet is already in the browser's cache from the world
 * that loaded it.
 */
export const loadBlockIcons = (): Promise<Map<number, BlockIcon>> => {
  icons ??= buildIcons();
  return icons;
};
