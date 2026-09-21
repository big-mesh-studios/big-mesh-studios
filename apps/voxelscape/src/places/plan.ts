// The structure plan a place's script hands the world before its terrain is
// generated: a script may call `engine.onPlan(fn)`, and `fn(contextJson)`
// answers with the boxes, roads and houses the trusted filler stamps into
// every chunk. The plan
// crosses the sandbox boundary as a JSON string and is validated here, the same
// way `events.ts` and `effects.ts` bound what a script may say, so a broken or
// hostile plan is refused rather than rasterized.
import { PlaceBundleError, bundlePlaceProject } from "./bundle";
import { createQuickJSSandbox } from "./quickjs-sandbox";
import { CHUNK_VOXELS, VOXEL_SIZE, type Dim3 } from "../world/level-data";
import type { PlanShape, StructurePlan } from "../world/structure-fill";
import {
  MAX_CONVEYOR_SPEED,
  MAX_MODEL_URI,
  MAX_NPC_COORD,
  MAX_NPC_NAME,
  MAX_PROP_HEIGHT,
  MAX_PROP_MODEL,
} from "./effects";

/** How many chunks either side of a place's spawn its plan may build within. */
export const PLAN_REGION_CHUNKS = 8;

/**
 * The LOD-0 voxel region a place's plan may address: a cube of
 * `PLAN_REGION_CHUNKS` chunks around the spawn, so a creator builds near where
 * the player begins without a plan being able to span the whole world.
 */
export const planRegionAround = (
  spawn: Dim3,
): {
  min: Dim3;
  max: Dim3;
} => {
  const radius = PLAN_REGION_CHUNKS * CHUNK_VOXELS;
  const voxel = (world: number): number => Math.floor(world / VOXEL_SIZE);
  return {
    min: [
      voxel(spawn[0]) - radius,
      voxel(spawn[1]) - radius,
      voxel(spawn[2]) - radius,
    ],
    max: [
      voxel(spawn[0]) + radius,
      voxel(spawn[1]) + radius,
      voxel(spawn[2]) + radius,
    ],
  };
};

/** The most shapes one plan may hold, bounding the work a block's fill can owe it. */
export const MAX_PLAN_SHAPES = 4096;
/** The most static NPCs or props a plan may place. */
export const MAX_PLAN_ENTITIES = 1024;
/** The furthest from the origin a plan's voxel coordinates may reach. */
export const MAX_PLAN_COORD = 1_000_000;
/** Voxel ids live in a `Uint8Array`, so 0..255 is every id a shape may name. */
export const MAX_PLAN_BLOCK_ID = 255;
/** The most voxels a house may reach along one axis. */
export const MAX_PLAN_HOUSE_SIZE = 256;
/** The most voxels wide a road may be. */
export const MAX_PLAN_ROAD_WIDTH = 64;
/** The most treads one staircase may hold. */
export const MAX_PLAN_STEPS = 128;
/** The tallest one staircase tread may rise. */
export const MAX_PLAN_STAIR_RISE = 64;
/** The longest one staircase tread may run. */
export const MAX_PLAN_STAIR_RUN = 64;
/** The most voxels long an incline's run may be. */
export const MAX_PLAN_RAMP_RUN = 256;
/** The most voxels deep a surface shape may replace below the terrain top. */
export const MAX_PLAN_SURFACE_DEPTH = 64;

/** Where a place's plan may build: the seed it is deterministic against, and its bounds. */
export interface PlanContext {
  /** The terrain seed the place's world is generated from. */
  seed: number;
  /** The LOD-0 voxel box a plan may address, inclusive on both corners. */
  region: { min: Dim3; max: Dim3 };
}

/** A static NPC a plan stands, at world feet coordinates like a script's `npc` effect. */
export interface PlanNpc {
  id: string;
  x: number;
  z: number;
  y?: number;
  yaw?: number;
  name?: string;
  model?: string;
  modelUri?: string;
}

/** A static prop a plan places, at world feet coordinates like a script's `prop` effect. */
export interface PlanProp {
  id: string;
  model: string;
  x: number;
  z: number;
  y?: number;
  yaw?: number;
  name?: string;
  height?: number;
  solid?: boolean;
  hazard?: boolean;
  conveyor?: { vx: number; vz: number };
}

export interface LevelPlan {
  structures: StructurePlan;
  npcs: PlanNpc[];
  props: PlanProp[];
}

export const emptyLevelPlan = (): LevelPlan => ({
  structures: [],
  npcs: [],
  props: [],
});

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

const isCoord = (v: unknown): v is number =>
  isInt(v, -MAX_PLAN_COORD, MAX_PLAN_COORD);

const isVector = (v: unknown): v is Dim3 =>
  Array.isArray(v) && v.length === 3 && v.every(isCoord);

const isBlockId = (v: unknown): v is number => isInt(v, 0, MAX_PLAN_BLOCK_ID);

const isShape = (v: unknown): v is PlanShape => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const shape = v as Record<string, unknown>;
  if (shape.kind === "box") {
    if (!isVector(shape.min) || !isVector(shape.max) || !isBlockId(shape.id)) {
      return false;
    }
    return shape.min.every((lo, axis) => lo <= (shape.max as Dim3)[axis]);
  }
  if (shape.kind === "road") {
    return (
      isVector(shape.from) &&
      isVector(shape.to) &&
      isInt(shape.width, 1, MAX_PLAN_ROAD_WIDTH) &&
      isBlockId(shape.id)
    );
  }
  if (shape.kind === "house") {
    return (
      isVector(shape.at) &&
      isVector(shape.size) &&
      shape.size.every((n) => isInt(n, 1, MAX_PLAN_HOUSE_SIZE)) &&
      isBlockId(shape.wall) &&
      isBlockId(shape.roof) &&
      isBlockId(shape.floor)
    );
  }
  if (shape.kind === "stairs") {
    return (
      isVector(shape.at) &&
      (shape.along === "x" || shape.along === "z") &&
      isInt(shape.steps, 1, MAX_PLAN_STEPS) &&
      isInt(shape.rise, 1, MAX_PLAN_STAIR_RISE) &&
      isInt(shape.run, 1, MAX_PLAN_STAIR_RUN) &&
      isInt(shape.width, 1, MAX_PLAN_ROAD_WIDTH) &&
      isBlockId(shape.id)
    );
  }
  if (shape.kind === "ramp") {
    if (
      !isVector(shape.from) ||
      !isVector(shape.to) ||
      !isInt(shape.width, 1, MAX_PLAN_ROAD_WIDTH) ||
      !isBlockId(shape.id)
    ) {
      return false;
    }
    const [fx, , fz] = shape.from;
    const [tx, , tz] = shape.to;
    return Math.max(Math.abs(tx - fx), Math.abs(tz - fz)) <= MAX_PLAN_RAMP_RUN;
  }
  if (shape.kind === "surface") {
    return (
      isVector(shape.min) &&
      isVector(shape.max) &&
      shape.min[0] <= shape.max[0] &&
      shape.min[2] <= shape.max[2] &&
      isInt(shape.depth, 1, MAX_PLAN_SURFACE_DEPTH) &&
      isBlockId(shape.id)
    );
  }
  return false;
};

const isName = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= max;

const isOptionalName = (v: unknown, max: number): v is string | undefined =>
  v === undefined || isName(v, max);

const isWorldCoord = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= MAX_NPC_COORD;

const isYaw = (v: unknown): v is number | undefined =>
  v === undefined || (typeof v === "number" && Number.isFinite(v));

const isBoolean = (v: unknown): v is boolean | undefined =>
  v === undefined || typeof v === "boolean";

export const isPlanNpc = (v: unknown): v is PlanNpc => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const npc = v as Record<string, unknown>;
  return (
    isName(npc.id, MAX_NPC_NAME) &&
    isWorldCoord(npc.x) &&
    isWorldCoord(npc.z) &&
    (npc.y === undefined || isWorldCoord(npc.y)) &&
    isYaw(npc.yaw) &&
    isOptionalName(npc.name, MAX_NPC_NAME) &&
    isOptionalName(npc.model, MAX_PROP_MODEL) &&
    isOptionalName(npc.modelUri, MAX_MODEL_URI)
  );
};

export const isPlanProp = (v: unknown): v is PlanProp => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const prop = v as Record<string, unknown>;
  const conveyor = prop.conveyor as Record<string, unknown> | undefined;
  return (
    isName(prop.id, MAX_NPC_NAME) &&
    isName(prop.model, MAX_PROP_MODEL) &&
    isWorldCoord(prop.x) &&
    isWorldCoord(prop.z) &&
    (prop.y === undefined || isWorldCoord(prop.y)) &&
    isYaw(prop.yaw) &&
    isOptionalName(prop.name, MAX_NPC_NAME) &&
    (prop.height === undefined ||
      (typeof prop.height === "number" &&
        Number.isFinite(prop.height) &&
        prop.height > 0 &&
        prop.height <= MAX_PROP_HEIGHT)) &&
    isBoolean(prop.solid) &&
    isBoolean(prop.hazard) &&
    (prop.conveyor === undefined ||
      (typeof conveyor === "object" &&
        conveyor !== null &&
        typeof conveyor.vx === "number" &&
        Number.isFinite(conveyor.vx) &&
        Math.abs(conveyor.vx) <= MAX_CONVEYOR_SPEED &&
        typeof conveyor.vz === "number" &&
        Number.isFinite(conveyor.vz) &&
        Math.abs(conveyor.vz) <= MAX_CONVEYOR_SPEED))
  );
};

/**
 * Whether `v` is a plan this world can generate. Every shape's coordinates,
 * sizes, and block ids are bounded, so a peer's plan bytes never reach the
 * filler unchecked.
 */
export const isStructurePlan = (v: unknown): v is StructurePlan =>
  Array.isArray(v) && v.length <= MAX_PLAN_SHAPES && v.every(isShape);

export const isLevelPlan = (v: unknown): v is LevelPlan => {
  if (isStructurePlan(v)) {
    return true;
  }
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    return false;
  }
  const plan = v as Record<string, unknown>;
  const structures = plan.structures ?? [];
  const npcs = plan.npcs ?? [];
  const props = plan.props ?? [];
  return (
    isStructurePlan(structures) &&
    Array.isArray(npcs) &&
    npcs.length <= MAX_PLAN_ENTITIES &&
    npcs.every(isPlanNpc) &&
    Array.isArray(props) &&
    props.length <= MAX_PLAN_ENTITIES &&
    props.every(isPlanProp)
  );
};

export const normalizeLevelPlan = (v: StructurePlan | LevelPlan): LevelPlan =>
  Array.isArray(v)
    ? { structures: v, npcs: [], props: [] }
    : {
        structures: v.structures,
        npcs: v.npcs,
        props: v.props,
      };

/**
 * Parses a script's plan text, or null when it is not JSON or not a plan this
 * world can generate. An empty or absent plan reads as a plan of no shapes.
 */
export const parseStructurePlan = (text: string): StructurePlan | null => {
  if (text.trim() === "") {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  return isStructurePlan(parsed) ? parsed : null;
};

export const parseLevelPlan = (text: string): LevelPlan | null => {
  if (text.trim() === "") {
    return emptyLevelPlan();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  return isLevelPlan(parsed) ? normalizeLevelPlan(parsed) : null;
};

/** A place's compiled level plan, or a refusal naming what went wrong. */
export interface CompilePlanParams {
  /** The place's script files, keyed by manifest-relative path. */
  files: Record<string, string>;
  /** The file execution starts from; it or a file it imports may call `engine.onPlan`. */
  entry: string;
  /** The place's attached model files, keyed by name, for a `with { type: "model" }` import to resolve against. */
  models?: Record<string, Uint8Array>;
  /** The seed every peer's plan is generated against. */
  seed: number;
  /** The LOD-0 voxel box the plan may build within. */
  region: { min: Dim3; max: Dim3 };
}

/**
 * Runs the plan handler a place registers with `engine.onPlan` in a fresh
 * sandbox and returns the validated plan, or an empty plan when the script
 * registers none. The interpreter exists only for this one call: a tick
 * handler runs in the place's long-lived host, not here.
 *
 * @throws {PlaceBundleError} When the scripts do not compile, or when their
 * plan is malformed or larger than this world can generate.
 */
export const compilePlacePlan = async (
  params: CompilePlanParams,
): Promise<LevelPlan> => {
  const code = await bundlePlaceProject(
    params.files,
    params.entry,
    params.models ?? {},
  );
  const sandbox = await createQuickJSSandbox({
    seed: params.seed,
    getNow: () => 0,
  });
  try {
    sandbox.load(code);
    const context: PlanContext = { seed: params.seed, region: params.region };
    const text = sandbox.plan(JSON.stringify(context));
    const plan = parseLevelPlan(text);
    if (plan === null) {
      throw new PlaceBundleError(
        "the plan handler did not return a level plan this world can generate",
      );
    }
    return plan;
  } finally {
    sandbox.dispose();
  }
};
