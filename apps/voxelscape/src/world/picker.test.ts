// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildBlock } from "./level-data";
import { pickVoxel, DEFAULT_REACH } from "./picker";
import { VOXEL_GRASS } from "./voxel-store";

/** World voxel of local index `l` for a block at the origin (n/2 = 32 per axis). */
const wv = (lx: number, ly: number, lz: number): [number, number, number] => [
  lx - 32,
  ly - 32,
  lz - 32,
];

/** One empty block at the origin with a single solid voxel at local (lx, ly, lz). */
const blockWithSolidAt = (
  lx: number,
  ly: number,
  lz: number,
): ReturnType<typeof buildBlock> =>
  buildBlock({
    center: [0, 0, 0],
    customFillStore: (store) => store.set(lx, ly, lz, VOXEL_GRASS),
  });

describe("pickVoxel", () => {
  it("finds the solid voxel directly below the camera", () => {
    const block = blockWithSolidAt(32, 40, 32);
    const [wx, wy, wz] = wv(32, 40, 32);
    // camera a good way above the target column, aiming straight down
    const pick = pickVoxel(
      [block],
      [wx * 2, 180, wz * 2],
      [0, -1, 0],
      DEFAULT_REACH * 100,
    );
    expect(pick.target).toEqual([wx, wy, wz]);
    expect(pick.place).toEqual([wx, wy + 1, wz]);
  });

  it("returns no target past the reach distance", () => {
    const block = blockWithSolidAt(32, 0, 32);
    const [wx, wz] = wv(32, 0, 32);
    // the only solid voxel sits far below the short default reach
    const pick = pickVoxel(
      [block],
      [wx * 2, 60, wz * 2],
      [0, -1, 0],
      DEFAULT_REACH,
    );
    expect(pick.target).toBeNull();
  });

  it("finds the deep voxel when reach is generous", () => {
    const block = blockWithSolidAt(32, 0, 32);
    const [wx, wy, wz] = wv(32, 0, 32);
    const pick = pickVoxel(
      [block],
      [wx * 2, 60, wz * 2],
      [0, -1, 0],
      DEFAULT_REACH * 1000,
    );
    expect(pick.target).toEqual([wx, wy, wz]);
  });

  it("hits a wall to the side, with the placement cell on the near face", () => {
    const block = blockWithSolidAt(32, 40, 32);
    const [wx, wy, wz] = wv(32, 40, 32);
    // camera at the target's row, west of it, aiming +X
    const pick = pickVoxel(
      [block],
      [-40, wy * 2, wz * 2],
      [1, 0, 0],
      DEFAULT_REACH * 10,
    );
    expect(pick.target).toEqual([wx, wy, wz]);
    expect(pick.place).toEqual([wx - 1, wy, wz]);
  });

  it("skips solid voxels the camera starts inside", () => {
    const block = blockWithSolidAt(32, 40, 32);
    const [wx, wy, wz] = wv(32, 40, 32);
    // camera sits inside the solid voxel, aiming upward: it must exit the
    // solid before reporting its first hit
    const pick = pickVoxel(
      [block],
      [wx * 2, wy * 2, wz * 2],
      [0, 1, 0],
      DEFAULT_REACH * 100,
    );
    expect(pick.target).not.toEqual([wx, wy, wz]);
  });
});
