// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Vector3 } from "@random-mesh/rmsl/scene";
import { VOXEL_SIZE } from "../../world/level-data";
import type { CameraRay } from "../camera/rig";
import type { Dim3, PlanItem, PlanNpc, PlanProp, PlanShape } from "../types";
import { pickItem, pickShape, type FigureSpecFor } from "./shape-picking";

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

/** A ray in world units, as a planned figure's feet are expressed. */
const rayWorld = (
  origin: [number, number, number],
  direction: [number, number, number],
): CameraRay => ({
  origin: new Vector3(...origin),
  direction: new Vector3(...direction),
});

const npcItem = (overrides: Partial<PlanNpc> & { id: string }): PlanItem => {
  const { id, ...rest } = overrides;
  return { type: "npc", value: { id, x: 0, z: 0, ...rest } };
};

const propItem = (
  overrides: Partial<PlanProp> & { id: string; model: string },
): PlanItem => {
  const { id, model, ...rest } = overrides;
  return {
    type: "prop",
    value: { id, model, x: 0, z: 0, ...rest },
  };
};

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

describe("pickItem", () => {
  it("picks the nearer of a shape and a figure", () => {
    const shape = {
      type: "structure" as const,
      value: box([8, 0, 0], [9, 1, 1]),
    };
    const prop = propItem({ id: "p", model: "chair.zip", x: 10, z: 1 });
    // Along +x at the figure's centre, the box's near face at world x = 16 is
    // further than the prop's near face at x = 9.4.
    expect(
      pickItem([shape, prop], rayWorld([-5, 1, 1], [1, 0, 0]), REACH)?.index,
    ).toBe(1);
  });

  it("picks a figure at the width its model draws, not the default body", () => {
    const prop = propItem({
      id: "p",
      model: "fridge.zip",
      x: 2.5,
      z: 0,
      height: 3,
    });
    const wide: FigureSpecFor = () => ({ half: 1.2, height: 3, yaw: 0, y: 0 });
    const ray = rayWorld([4, 1.6, 1.1], [-1, 0, 0]);
    // A ray a metre clear of the default body skims the fridge's side.
    expect(pickItem([prop], ray, REACH, wide)?.index).toBe(0);
    expect(pickItem([prop], ray, REACH)).toBeUndefined();
  });

  it("tests a prop as tall as its plan says before its model loads", () => {
    const tall = propItem({
      id: "t",
      model: "chair.zip",
      x: 10,
      z: 1,
      height: 3,
    });
    // A ray over the default 2-unit body still crosses the 3-unit one.
    expect(
      pickItem([tall], rayWorld([-5, 2.5, 1], [1, 0, 0]), REACH)?.index,
    ).toBe(0);
  });

  it("tests a figure where it stands, at the feet height its plan names", () => {
    const grounded = npcItem({ id: "g", x: 10, z: 1 });
    const raised = npcItem({ id: "r", x: 10, z: 1, y: 5 });
    const ray = rayWorld([-5, 1.6, 1], [1, 0, 0]);
    expect(pickItem([grounded], ray, REACH)?.index).toBe(0);
    expect(pickItem([raised], ray, REACH)).toBeUndefined();
  });
});
