import { VOXEL_SIZE } from "../../world/level-data";
import { expandShape } from "../../world/structure-fill";
import type {
  Dim3,
  LevelPlan,
  PlanItem,
  PlanNpc,
  PlanProp,
  PlanShape,
  StructurePlan,
  ToolKind,
} from "../types";
import { blockName } from "./blocks";

/** Converts a LOD-0 voxel index to its low-corner world unit, the geometry a figure's feet stand on. */
const feet = (v: number): number => v * VOXEL_SIZE;

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
    case "surface":
      return `Surface (${coord(shape.min)})–(${coord(shape.max)}) d${shape.depth} ${blockName(shape.id)}`;
  }
};

export const itemLabel = (item: PlanItem): string => {
  switch (item.type) {
    case "structure":
      return shapeLabel(item.value);
    case "npc":
      return `NPC ${item.value.name ?? item.value.id} (${item.value.x}, ${item.value.y ?? "ground"}, ${item.value.z})`;
    case "prop":
      return `Prop ${item.value.name ?? item.value.id} (${item.value.x}, ${item.value.y ?? "ground"}, ${item.value.z}) ${item.value.model}`;
  }
};

/** A shape of `kind` starting at `at`, built from `blockId`. */
export const defaultShape = (
  kind: Exclude<ToolKind, "select" | "npc" | "prop">,
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

export const defaultNpc = (at: Dim3): PlanNpc => ({
  id: `npc-${at[0]}-${at[1]}-${at[2]}`,
  name: "NPC",
  model: "npc-sable.zip",
  x: feet(at[0]),
  y: feet(at[1]),
  z: feet(at[2]),
  yaw: 0,
});

export const defaultProp = (at: Dim3): PlanProp => ({
  id: `prop-${at[0]}-${at[1]}-${at[2]}`,
  name: "Prop",
  model: "chair.zip",
  x: feet(at[0]),
  y: feet(at[1]),
  z: feet(at[2]),
  yaw: 0,
  height: 2,
  solid: false,
  hazard: false,
});

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
    case "surface":
      return { ...shape, min: move(shape.min), max: move(shape.max) };
  }
};

export const translateItem = (item: PlanItem, delta: Dim3): PlanItem => {
  if (item.type === "structure") {
    return { type: "structure", value: translateShape(item.value, delta) };
  }
  // A figure's coordinates are world units, so a voxel-step move is scaled
  // back into them.
  const moved = {
    x: (item.value.x ?? 0) + feet(delta[0]),
    y: (item.value.y ?? 0) + feet(delta[1]),
    z: (item.value.z ?? 0) + feet(delta[2]),
  };
  return item.type === "npc"
    ? { type: "npc", value: { ...item.value, ...moved } }
    : { type: "prop", value: { ...item.value, ...moved } };
};

/** A deep copy of `shape`, so an edit never mutates the one on the undo stack. */
export const cloneShape = (shape: PlanShape): PlanShape =>
  JSON.parse(JSON.stringify(shape)) as PlanShape;

export const cloneItem = (item: PlanItem): PlanItem =>
  JSON.parse(JSON.stringify(item)) as PlanItem;

/**
 * The place-script snippet that reproduces a plan: the `onPlan` handler a place
 * script calls, returning the plan's JSON. Paste it into a place's script to
 * stamp the same structures into that world.
 */
export const planScript = (plan: StructurePlan | LevelPlan): string =>
  `onPlan(() =>\n  JSON.stringify(${JSON.stringify(plan, null, 2)}),\n);\n`;
