// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  stampStructures,
  type PlanHouse,
  type PlanRamp,
  type PlanRoad,
  type PlanStairs,
} from "./structure-fill";
import {
  VOXEL_AIR,
  VOXEL_BRICK,
  VOXEL_STONE,
  VOXEL_WOOD,
  VoxelStore,
} from "./voxel-store";

/**
 * A block whose centre sits half its world extent from the origin, so a plan's
 * LOD-0 voxel index lands on the block voxel of the same index: block voxel
 * `v`'s world span is `[v * scale, (v + 1) * scale)`.
 */
const storeAt = (
  voxels: [number, number, number],
  scale: number,
): { store: VoxelStore; center: [number, number, number] } => {
  const center: [number, number, number] = [
    (voxels[0] / 2) * scale,
    (voxels[1] / 2) * scale,
    (voxels[2] / 2) * scale,
  ];
  return {
    store: new VoxelStore({ dims: [16, 16, 16], voxels, scale }),
    center,
  };
};

describe("stampStructures", () => {
  it("fills a box's block voxels and leaves the rest air", () => {
    const { store, center } = storeAt([8, 8, 8], 2);
    stampStructures(store, center, [
      { kind: "box", min: [0, 0, 0], max: [1, 1, 1], id: VOXEL_BRICK },
    ]);
    for (let z = 0; z < 8; z++) {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const expected = x <= 1 && y <= 1 && z <= 1 ? VOXEL_BRICK : VOXEL_AIR;
          expect(store.get(x, y, z)).toBe(expected);
        }
      }
    }
    expect(store.mightHaveVoxels).toBe(true);
  });

  it("writes the meshing border too, so a box can sit on a chunk seam", () => {
    const { store, center } = storeAt([8, 8, 8], 2);
    stampStructures(store, center, [
      { kind: "box", min: [-1, -1, -1], max: [-1, 1, 1], id: VOXEL_BRICK },
    ]);
    expect(store.atPadded(-1, 0, 0)).toBe(VOXEL_BRICK);
    expect(store.atPadded(-1, -1, -1)).toBe(VOXEL_BRICK);
    expect(store.atPadded(-1, 2, 0)).toBe(VOXEL_AIR);
  });

  it("rasterizes a box at a coarser level of detail", () => {
    // LOD 1: four world units per voxel, so the box's [0, 4) world span is one
    // block voxel.
    const { store, center } = storeAt([4, 4, 4], 4);
    stampStructures(store, center, [
      { kind: "box", min: [0, 0, 0], max: [1, 1, 1], id: VOXEL_BRICK },
    ]);
    expect(store.get(0, 0, 0)).toBe(VOXEL_BRICK);
    expect(store.get(2, 2, 2)).toBe(VOXEL_AIR);
  });

  it("builds a house as a floor, walls, a roof, and a door gap", () => {
    const { store, center } = storeAt([16, 16, 16], 2);
    const house: PlanHouse = {
      kind: "house",
      at: [0, 0, 0],
      size: [5, 4, 5],
      wall: VOXEL_BRICK,
      roof: VOXEL_WOOD,
      floor: VOXEL_STONE,
    };
    stampStructures(store, center, [house]);

    expect(store.get(2, 0, 2)).toBe(VOXEL_STONE); // floor
    expect(store.get(2, 3, 2)).toBe(VOXEL_WOOD); // roof
    expect(store.get(0, 1, 2)).toBe(VOXEL_BRICK); // wall
    expect(store.get(2, 1, 2)).toBe(VOXEL_AIR); // hollow middle
    expect(store.get(2, 1, 0)).toBe(VOXEL_AIR); // door gap
    expect(store.get(2, 2, 0)).toBe(VOXEL_AIR); // door gap is two tall
    expect(store.get(0, 1, 0)).toBe(VOXEL_BRICK); // wall beside the door
  });

  it("builds a staircase as solid columns that rise one tread at a time", () => {
    const { store, center } = storeAt([16, 16, 16], 2);
    const stairs: PlanStairs = {
      kind: "stairs",
      at: [0, 0, 0],
      along: "x",
      steps: 3,
      rise: 1,
      run: 2,
      width: 3,
      id: VOXEL_BRICK,
    };
    stampStructures(store, center, [stairs]);

    // The first tread spans x 0..1 at y 0; the third spans x 4..5 up to y 2.
    expect(store.get(0, 0, 1)).toBe(VOXEL_BRICK);
    expect(store.get(2, 0, 1)).toBe(VOXEL_BRICK);
    expect(store.get(2, 1, 1)).toBe(VOXEL_BRICK);
    expect(store.get(4, 2, 1)).toBe(VOXEL_BRICK);
    // Air above a tread and beyond the run's width.
    expect(store.get(0, 1, 1)).toBe(VOXEL_AIR);
    expect(store.get(4, 3, 1)).toBe(VOXEL_AIR);
    expect(store.get(4, 2, 4)).toBe(VOXEL_AIR);
  });

  it("builds an incline as columns stepping from the low end to the high end", () => {
    const { store, center } = storeAt([16, 16, 16], 2);
    const ramp: PlanRamp = {
      kind: "ramp",
      from: [0, 0, 0],
      to: [4, 4, 0],
      width: 1,
      id: VOXEL_STONE,
    };
    stampStructures(store, center, [ramp]);

    expect(store.get(0, 0, 0)).toBe(VOXEL_STONE);
    expect(store.get(4, 4, 0)).toBe(VOXEL_STONE);
    expect(store.get(2, 2, 0)).toBe(VOXEL_STONE);
    expect(store.get(2, 3, 0)).toBe(VOXEL_AIR);
  });

  it("sweeps a road along its run and no further", () => {
    const { store, center } = storeAt([16, 16, 16], 2);
    const road: PlanRoad = {
      kind: "road",
      from: [0, 0, 0],
      to: [10, 0, 0],
      width: 3,
      id: VOXEL_STONE,
    };
    stampStructures(store, center, [road]);
    expect(store.get(5, 0, 0)).toBe(VOXEL_STONE);
    expect(store.get(5, 0, 1)).toBe(VOXEL_STONE);
    expect(store.get(5, 0, 3)).toBe(VOXEL_AIR);
    expect(store.get(5, 1, 0)).toBe(VOXEL_AIR);
  });
});
