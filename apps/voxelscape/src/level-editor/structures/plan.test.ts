import { describe, expect, it } from "vitest";
import { VOXEL_SIZE } from "../../world/level-data";
import type { PlanShape } from "../../world/structure-fill";
import {
  defaultNpc,
  defaultProp,
  defaultShape,
  planScript,
  shapeBounds,
  shapeLabel,
  translateItem,
  translateShape,
} from "./plan";

describe("shapeBounds", () => {
  it("returns a box's own corners", () => {
    const shape: PlanShape = {
      kind: "box",
      min: [1, 2, 3],
      max: [4, 5, 6],
      id: 1,
    };
    expect(shapeBounds(shape)).toEqual({ min: [1, 2, 3], max: [4, 5, 6] });
  });

  it("unions the boxes a staircase expands into", () => {
    const shape: PlanShape = {
      kind: "stairs",
      at: [0, 0, 0],
      along: "x",
      steps: 3,
      rise: 2,
      run: 1,
      width: 2,
      id: 1,
    };
    const bounds = shapeBounds(shape);
    expect(bounds.min).toEqual([0, 0, 0]);
    expect(bounds.max).toEqual([2, 5, 1]);
  });
});

describe("translateShape", () => {
  it("shifts every coordinate of a house", () => {
    const house = defaultShape("house", [0, 0, 0], 1);
    const moved = translateShape(house, [5, 1, -2]);
    expect(moved.kind).toBe("house");
    if (moved.kind === "house") {
      expect(moved.at).toEqual([5, 1, -2]);
    }
  });

  it("shifts both ends of a road", () => {
    const road = defaultShape("road", [0, 0, 0], 1);
    const moved = translateShape(road, [0, 3, 0]);
    if (moved.kind === "road") {
      expect(moved.from).toEqual([0, 3, 0]);
      expect(moved.to).toEqual([16, 3, 0]);
    }
  });
});

describe("planScript", () => {
  it("wraps the plan in an onPlan handler", () => {
    const script = planScript([defaultShape("box", [0, 0, 0], 1)]);
    expect(script).toContain("onPlan(");
    expect(script).toContain("JSON.stringify(");
    expect(script).toContain('"kind": "box"');
  });
});

describe("defaultNpc and defaultProp", () => {
  it("stand a figure at the world feet of the voxel it was placed at", () => {
    expect(defaultNpc([4, 30, -8])).toMatchObject({
      x: 4 * VOXEL_SIZE,
      y: 30 * VOXEL_SIZE,
      z: -8 * VOXEL_SIZE,
    });
    expect(defaultProp([4, 30, -8])).toMatchObject({
      x: 4 * VOXEL_SIZE,
      y: 30 * VOXEL_SIZE,
      z: -8 * VOXEL_SIZE,
    });
  });
});

describe("translateItem", () => {
  it("shifts a plan's NPC by voxel steps in world units", () => {
    const moved = translateItem(
      { type: "npc", value: defaultNpc([4, 30, -8]) },
      [1, 0, 1],
    );
    expect(moved.type).toBe("npc");
    if (moved.type === "npc") {
      expect(moved.value.x).toBe(5 * VOXEL_SIZE);
      expect(moved.value.y).toBe(30 * VOXEL_SIZE);
      expect(moved.value.z).toBe(-7 * VOXEL_SIZE);
    }
  });

  it("shifts a plan's prop by voxel steps in world units", () => {
    const moved = translateItem(
      { type: "prop", value: defaultProp([4, 30, -8]) },
      [0, 1, 0],
    );
    expect(moved.type).toBe("prop");
    if (moved.type === "prop") {
      expect(moved.value.y).toBe(31 * VOXEL_SIZE);
    }
  });
});

describe("shapeLabel", () => {
  it("names the kind and its anchor", () => {
    expect(shapeLabel(defaultShape("box", [1, 2, 3], 1))).toContain("Box");
    expect(shapeLabel(defaultShape("stairs", [1, 2, 3], 1))).toContain(
      "Stairs",
    );
  });
});
