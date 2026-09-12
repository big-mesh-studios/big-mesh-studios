// The structure plan a place's script hands the world before its terrain is
// generated: an optional `bmsPlan(contextJson)` export that answers with the
// boxes, roads and houses the trusted filler stamps into every chunk. The plan
// crosses the sandbox boundary as a JSON string and is validated here, the same
// way `events.ts` and `effects.ts` bound what a script may say, so a broken or
// hostile plan is refused rather than rasterized.
import { PlaceBundleError, bundlePlaceProject } from "./bundle";
import { createQuickJSSandbox } from "./quickjs-sandbox";
import { CHUNK_VOXELS, VOXEL_SIZE, type Dim3 } from "../world/level-data";
import type { PlanShape, StructurePlan } from "../world/structure-fill";

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

/** Where a place's plan may build: the seed it is deterministic against, and its bounds. */
export interface PlanContext {
  /** The terrain seed the place's world is generated from. */
  seed: number;
  /** The LOD-0 voxel box a plan may address, inclusive on both corners. */
  region: { min: Dim3; max: Dim3 };
}

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
  return false;
};

/**
 * Whether `v` is a plan this world can generate. Every shape's coordinates,
 * sizes, and block ids are bounded, so a peer's plan bytes never reach the
 * filler unchecked.
 */
export const isStructurePlan = (v: unknown): v is StructurePlan =>
  Array.isArray(v) && v.length <= MAX_PLAN_SHAPES && v.every(isShape);

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

/** A place's compiled structure plan, or a refusal naming what went wrong. */
export interface CompilePlanParams {
  /** The place's script files, keyed by manifest-relative path. */
  files: Record<string, string>;
  /** The file execution starts from; its module may export `bmsPlan`. */
  entry: string;
  /** The seed every peer's plan is generated against. */
  seed: number;
  /** The LOD-0 voxel box the plan may build within. */
  region: { min: Dim3; max: Dim3 };
}

/**
 * Runs a place's `bmsPlan` in a fresh sandbox and returns the validated plan,
 * or an empty plan when the script defines none. The interpreter exists only
 * for this one call: `bmsTick` runs in the place's long-lived host, not here.
 *
 * @throws {PlaceBundleError} When the scripts do not compile, or when their
 * plan is malformed or larger than this world can generate.
 */
export const compilePlacePlan = async (
  params: CompilePlanParams,
): Promise<StructurePlan> => {
  const code = await bundlePlaceProject(params.files, params.entry);
  const sandbox = await createQuickJSSandbox({
    seed: params.seed,
    now: () => 0,
  });
  try {
    sandbox.load(code);
    const context: PlanContext = { seed: params.seed, region: params.region };
    const text = sandbox.plan(JSON.stringify(context));
    const plan = parseStructurePlan(text);
    if (plan === null) {
      throw new PlaceBundleError(
        "bmsPlan did not return a structure plan this world can generate",
      );
    }
    return plan;
  } finally {
    sandbox.dispose();
  }
};
