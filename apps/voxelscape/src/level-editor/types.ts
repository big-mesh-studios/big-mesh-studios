// The editor's public data model, re-exported from the world it edits so the
// feature names the same shapes the filler stamps.

import type { PlanShape } from "../world/structure-fill";
import type { PlanNpc, PlanProp } from "../places/plan";

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
export type { LevelPlan, PlanNpc, PlanProp } from "../places/plan";

export type PlanItem =
  | { type: "structure"; value: PlanShape }
  | { type: "npc"; value: PlanNpc }
  | { type: "prop"; value: PlanProp };

/** What a click in the viewport does. */
export type ToolKind =
  "select" | "box" | "road" | "house" | "stairs" | "ramp" | "npc" | "prop";

export const TOOL_KINDS: ToolKind[] = [
  "select",
  "box",
  "road",
  "house",
  "stairs",
  "ramp",
  "npc",
  "prop",
];
