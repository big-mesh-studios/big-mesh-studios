import { describe, expect, it } from "vitest";
import type { PlanShape } from "../../world/structure-fill";
import {
  defaultShape,
  planScript,
  shapeBounds,
  shapeLabel,
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

describe("shapeLabel", () => {
  it("names the kind and its anchor", () => {
    expect(shapeLabel(defaultShape("box", [1, 2, 3], 1))).toContain("Box");
    expect(shapeLabel(defaultShape("stairs", [1, 2, 3], 1))).toContain(
      "Stairs",
    );
  });
});
