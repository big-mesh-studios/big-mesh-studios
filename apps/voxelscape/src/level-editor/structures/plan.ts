import { expandShape } from "../../world/structure-fill";
import type { Dim3, PlanShape, StructurePlan, ToolKind } from "../types";
import { blockName } from "./blocks";

/** The inclusive LOD-0 voxel box a shape reaches, its composite parts unioned. */
export const shapeBounds = (shape: PlanShape): { min: Dim3; max: Dim3 } => {
  const min: Dim3 = [Infinity, Infinity, Infinity];
  const max: Dim3 = [-Infinity, -Infinity, -Infinity];
  for (const box of expandShape(shape)) {
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], box.min[axis]);
      max[axis] = Math.max(max[axis], box.max[axis]);
    }
  }
  return { min, max };
};

/** The inclusive box every shape in a plan reaches, or undefined for no plan. */
export const planBounds = (
  plan: StructurePlan,
): { min: Dim3; max: Dim3 } | undefined => {
  if (plan.length === 0) {
    return undefined;
  }
  const min: Dim3 = [Infinity, Infinity, Infinity];
  const max: Dim3 = [-Infinity, -Infinity, -Infinity];
  for (const shape of plan) {
    const bounds = shapeBounds(shape);
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], bounds.min[axis]);
      max[axis] = Math.max(max[axis], bounds.max[axis]);
    }
  }
  return { min, max };
};

const coord = (v: Dim3): string => `${v[0]}, ${v[1]}, ${v[2]}`;

/** One line naming a shape and where it sits, for the shape list. */
export const shapeLabel = (shape: PlanShape): string => {
  switch (shape.kind) {
    case "box":
      return `Box (${coord(shape.min)})–(${coord(shape.max)}) ${blockName(shape.id)}`;
    case "road":
      return `Road (${coord(shape.from)})→(${coord(shape.to)}) w${shape.width} ${blockName(shape.id)}`;
    case "house":
      return `House (${coord(shape.at)}) ${shape.size[0]}×${shape.size[1]}×${shape.size[2]}`;
    case "stairs":
      return `Stairs (${coord(shape.at)}) ${shape.steps}×${shape.rise}/${shape.run} ${shape.along}`;
    case "ramp":
      return `Ramp (${coord(shape.from)})→(${coord(shape.to)}) w${shape.width} ${blockName(shape.id)}`;
  }
};

/** A shape of `kind` starting at `at`, built from `blockId`. */
export const defaultShape = (
  kind: Exclude<ToolKind, "select">,
  at: Dim3,
  blockId: number,
): PlanShape => {
  const [x, y, z] = at;
  switch (kind) {
    case "box":
      return {
        kind: "box",
        min: [x, y, z],
        max: [x + 3, y + 3, z + 3],
        id: blockId,
      };
    case "road":
      return {
        kind: "road",
        from: [x, y, z],
        to: [x + 16, y, z],
        width: 3,
        id: blockId,
      };
    case "house":
      return {
        kind: "house",
        at: [x, y, z],
        size: [9, 5, 9],
        wall: blockId,
        roof: blockId,
        floor: blockId,
      };
    case "stairs":
      return {
        kind: "stairs",
        at: [x, y, z],
        along: "x",
        steps: 8,
        rise: 1,
        run: 1,
        width: 3,
        id: blockId,
      };
    case "ramp":
      return {
        kind: "ramp",
        from: [x, y, z],
        to: [x + 16, y + 8, z],
        width: 3,
        id: blockId,
      };
  }
};

/** A copy of `shape` shifted by `delta` voxels on every axis. */
export const translateShape = (shape: PlanShape, delta: Dim3): PlanShape => {
  const move = (v: Dim3): Dim3 => [
    v[0] + delta[0],
    v[1] + delta[1],
    v[2] + delta[2],
  ];
  switch (shape.kind) {
    case "box":
      return { ...shape, min: move(shape.min), max: move(shape.max) };
    case "road":
      return { ...shape, from: move(shape.from), to: move(shape.to) };
    case "house":
      return { ...shape, at: move(shape.at) };
    case "stairs":
      return { ...shape, at: move(shape.at) };
    case "ramp":
      return { ...shape, from: move(shape.from), to: move(shape.to) };
  }
};

/** A deep copy of `shape`, so an edit never mutates the one on the undo stack. */
export const cloneShape = (shape: PlanShape): PlanShape =>
  JSON.parse(JSON.stringify(shape)) as PlanShape;

/**
 * The place-script snippet that reproduces a plan: the `onPlan` handler a place
 * script calls, returning the plan's JSON. Paste it into a place's script to
 * stamp the same structures into that world.
 */
export const planScript = (plan: StructurePlan): string =>
  `onPlan(() =>\n  JSON.stringify(${JSON.stringify(plan, null, 2)}),\n);\n`;
