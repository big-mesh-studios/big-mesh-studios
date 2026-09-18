// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Vector3 } from "@random-mesh/rmsl/scene";
import { VOXEL_SIZE } from "../../world/level-data";
import type { CameraRay } from "../camera/rig";
import type { Dim3, PlanShape } from "../types";
import { pickShape } from "./shape-picking";

/** A box shape spanning the voxel corners `min` to `max`, inclusive. */
const box = (min: Dim3, max: Dim3, id = 1): PlanShape => ({
  kind: "box",
  min,
  max,
  id,
});

/** A ray whose origin is given in LOD-0 voxels, as the editor camera's is. */
const rayFrom = (voxel: Dim3, direction: Dim3): CameraRay => ({
  origin: new Vector3(
    voxel[0] * VOXEL_SIZE,
    voxel[1] * VOXEL_SIZE,
    voxel[2] * VOXEL_SIZE,
  ),
  direction: new Vector3(...direction),
});

const REACH = 512;

describe("pickShape", () => {
  it("picks the nearest shape the ray crosses", () => {
    const near = box([0, 0, 0], [1, 1, 1]);
    const far = box([4, 0, 0], [5, 1, 1]);
    const pick = pickShape([near, far], rayFrom([-5, 1, 1], [1, 0, 0]), REACH);
    expect(pick?.index).toBe(0);
  });

  it("ignores a box the camera sits inside and picks one nested within it", () => {
    const outer = box([0, 0, 0], [9, 9, 9]);
    const inner = box([4, 4, 4], [5, 5, 5]);
    const pick = pickShape(
      [outer, inner],
      rayFrom([1, 5, 5], [1, 0, 0]),
      REACH,
    );
    expect(pick?.index).toBe(1);
  });

  it("picks nothing when the camera sits inside the only box", () => {
    const only = box([0, 0, 0], [9, 9, 9]);
    expect(
      pickShape([only], rayFrom([5, 5, 5], [1, 0, 0]), REACH),
    ).toBeUndefined();
  });

  it("reaches past the box it starts in to one beyond it", () => {
    const outer = box([0, 0, 0], [5, 5, 5]);
    const beyond = box([8, 2, 2], [9, 3, 3]);
    const pick = pickShape(
      [outer, beyond],
      rayFrom([3, 3, 3], [1, 0, 0]),
      REACH,
    );
    expect(pick?.index).toBe(1);
  });

  it("still picks a shape that is not a box when the camera is inside it", () => {
    const road: PlanShape = {
      kind: "road",
      from: [0, 0, 0],
      to: [0, 0, 16],
      width: 3,
      id: 1,
    };
    const pick = pickShape([road], rayFrom([0, 0, 8], [0, 0, -1]), REACH);
    expect(pick?.index).toBe(0);
  });

  it("misses a shape beyond the reach", () => {
    const far = box([0, 0, 0], [1, 1, 1]);
    expect(pickShape([far], rayFrom([-5, 1, 1], [1, 0, 0]), 1)).toBeUndefined();
  });
});
