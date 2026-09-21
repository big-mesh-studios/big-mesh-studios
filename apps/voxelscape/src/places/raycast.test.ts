// @vitest-environment node
import { describe, expect, it } from "vitest";
import { raycastAabb, raycastVoxels, unitDirection } from "./raycast";

/** Whether a world point is at or below y 0, an infinite half-space floor. */
const floorBelowZero = (_x: number, y: number, _z: number): boolean => y < 0;

describe("unitDirection", () => {
  it("normalizes a direction and refuses a zero one", () => {
    expect(unitDirection(0, 4, 0)).toEqual([0, 1, 0]);
    expect(unitDirection(0, 0, 0)).toBeNull();
  });
});

describe("raycastVoxels", () => {
  it("finds the first solid voxel and the face it entered", () => {
    const hit = raycastVoxels([0, 5, 0], 0, -1, 0, 20, floorBelowZero);
    expect(hit).not.toBeNull();
    expect(hit?.distance).toBeCloseTo(5, 6);
    expect(hit?.ny).toBe(1);
  });

  it("reports distance zero when the origin is already inside a solid voxel", () => {
    const hit = raycastVoxels([1, -1, 1], 0, -1, 0, 20, floorBelowZero);
    expect(hit?.distance).toBe(0);
  });

  it("misses when the solid voxel lies past the distance limit", () => {
    expect(raycastVoxels([0, 5, 0], 0, -1, 0, 4, floorBelowZero)).toBeNull();
  });

  it("gives up rather than walking an axis-aligned ray forever", () => {
    expect(
      raycastVoxels([0, 5, 0], 1, 0, 0, 1_000_000, () => false),
    ).toBeNull();
  });
});

describe("raycastAabb", () => {
  it("finds the near face of a box and its normal", () => {
    const hit = raycastAabb(
      [-5, 1, 1],
      1,
      0,
      0,
      { min: [0, 0, 0], max: [2, 2, 2] },
      20,
    );
    expect(hit?.distance).toBeCloseTo(5, 6);
    expect(hit?.nx).toBe(-1);
  });

  it("counts an origin inside the box as a hit with no normal", () => {
    const hit = raycastAabb(
      [1, 1, 1],
      1,
      0,
      0,
      { min: [0, 0, 0], max: [2, 2, 2] },
      20,
    );
    expect(hit?.distance).toBe(0);
    expect([hit?.nx, hit?.ny, hit?.nz]).toEqual([0, 0, 0]);
  });

  it("misses a box the ray passes beside", () => {
    expect(
      raycastAabb([-5, 5, 1], 1, 0, 0, { min: [0, 0, 0], max: [2, 2, 2] }, 20),
    ).toBeNull();
  });
});
