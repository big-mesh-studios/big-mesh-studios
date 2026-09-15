// The editor's public data model, re-exported from the world it edits so the
// feature names the same shapes the filler stamps.

export type { Dim3 } from "../world/level-data";
export type {
  PlanBox,
  PlanHouse,
  PlanRamp,
  PlanRoad,
  PlanShape,
  PlanStairs,
  StructurePlan,
} from "../world/structure-fill";

/** What a click in the viewport does. */
export type ToolKind = "select" | "box" | "road" | "house" | "stairs" | "ramp";

export const TOOL_KINDS: ToolKind[] = [
  "select",
  "box",
  "road",
  "house",
  "stairs",
  "ramp",
];
