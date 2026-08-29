// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildBlock, buildBlockShell, buildBlockData } from "./level-data";
import { DEFAULT_TERRAIN } from "./noise";
import { VOXEL_AIR, VOXEL_GRASS } from "./voxel-store";

/** Reading every voxel: what asking the flag replaces. */
const holdsAnything = (data: Uint8Array): boolean =>
  data.some((voxel) => voxel !== VOXEL_AIR);

describe("whether a block is worth meshing", () => {
  it("is false for a block nothing has filled", () => {
    const block = buildBlockShell({ center: [0, 0, 0] });

    expect(block.store.mightHaveVoxels).toBe(false);
    expect(holdsAnything(block.store.data)).toBe(false);
  });

  it("is true for terrain, and agrees with reading the voxels", () => {
    const block = buildBlock({ center: [0, 0, 0], terrain: DEFAULT_TERRAIN });

    expect(block.store.mightHaveVoxels).toBe(true);
    expect(holdsAnything(block.store.data)).toBe(true);
  });

  it("is false for a block of nothing but sky, which is the costly one to read", () => {
    // Far above any terrain: every voxel is air, so reading them means reading
    // all of them before finding out. This is the case the flag exists for.
    const block = buildBlock({
      center: [0, 1_000_000, 0],
      terrain: DEFAULT_TERRAIN,
    });

    expect(block.store.mightHaveVoxels).toBe(false);
    expect(holdsAnything(block.store.data)).toBe(false);
  });

  it("is raised by putting a voxel into an empty block", () => {
    const block = buildBlockShell({ center: [0, 0, 0] });

    block.store.set(1, 1, 1, VOXEL_GRASS);

    expect(block.store.mightHaveVoxels).toBe(true);
  });

  it("crosses to the worker with the voxels it describes", () => {
    const sky = buildBlockData({
      center: [0, 1_000_000, 0],
      terrain: DEFAULT_TERRAIN,
    });
    const ground = buildBlockData({
      center: [0, 0, 0],
      terrain: DEFAULT_TERRAIN,
    });

    expect(sky.mightHaveVoxels).toBe(false);
    expect(ground.mightHaveVoxels).toBe(true);
  });
});
