// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  atlasGridOf,
  buildVoxelTileConfig,
  tileIndexOf,
  type SubTexture,
} from "./atlas";
import { VOXEL_TILES } from "../world/voxel-tiles";
import { VOXEL_BRICK, VOXEL_WOOD } from "../world/voxel-store";

/** A 128×128 sheet holding every named built-in tile on a 16-pixel grid. */
const sheetOf = (extra: string[] = []): Map<string, SubTexture> => {
  const names = new Set(extra);
  for (const { top, side, bottom } of Object.values(VOXEL_TILES)) {
    names.add(top);
    names.add(side);
    names.add(bottom);
  }
  const atlas = new Map<string, SubTexture>();
  [...names].forEach((name, i) => {
    atlas.set(name, {
      x: (i % 8) * 16,
      y: Math.floor(i / 8) * 16,
      w: 16,
      h: 16,
    });
  });
  return atlas;
};

describe("buildVoxelTileConfig", () => {
  it("gives brick and wood the tiles the sheet names", () => {
    const atlas = sheetOf();
    const grid = atlasGridOf(atlas, 128, 128)!;
    const config = buildVoxelTileConfig(atlas, grid);
    const byId = new Map(config.map((one) => [one.id, one]));

    const brick = byId.get(VOXEL_BRICK);
    expect(brick).toBeDefined();
    expect(brick!.side).toBe(tileIndexOf(atlas.get("brick_red")!, grid));
    expect(brick!.top).toBe(brick!.side);
    expect(brick!.bottom).toBe(brick!.side);

    const wood = byId.get(VOXEL_WOOD);
    expect(wood).toBeDefined();
    expect(wood!.side).toBe(tileIndexOf(atlas.get("wood")!, grid));
  });

  it("merges a place's own voxel tiles over the built-in map", () => {
    const atlas = sheetOf();
    const grid = atlasGridOf(atlas, 128, 128)!;
    const config = buildVoxelTileConfig(atlas, grid, {
      99: { top: "stone", side: "dirt", bottom: "grass_top" },
    });
    const added = config.find((one) => one.id === 99);
    expect(added).toEqual({
      id: 99,
      top: tileIndexOf(atlas.get("stone")!, grid),
      side: tileIndexOf(atlas.get("dirt")!, grid),
      bottom: tileIndexOf(atlas.get("grass_top")!, grid),
    });
  });
});
