// The shape vocabulary a structure plan is written in, and the one validator
// every reader of a plan shares. Kept apart from `structure-fill.ts`, which
// rasterizes the shapes and pulls in the voxel store, and from `plan.ts`, which
// compiles a place's plan and pulls in the bundler and the QuickJS sandbox: the
// effect validator (`places/effects.ts`) needs to accept a shape without
// reaching either, and a module with no dependencies is the only way to give it
// one without a cycle.

/** A point or extent in LOD-0 world voxel indices. */
export type Voxel3 = [number, number, number];

/** A filled axis-aligned box, bounds inclusive, in LOD-0 world voxel indices. */
export interface PlanBox {
  kind: "box";
  min: Voxel3;
  max: Voxel3;
  id: number;
}

/** A road: a straight, axis-aligned street `width` voxels wide. */
export interface PlanRoad {
  kind: "road";
  /** One end of the road's centreline, in LOD-0 world voxels. */
  from: Voxel3;
  /** The other end; only one horizontal axis may differ from `from`. */
  to: Voxel3;
  /** How many voxels wide the road is across its run. */
  width: number;
  id: number;
}

/**
 * A hollow house: a solid floor, a shell of walls up to a roof, and a two-voxel
 * door gap in the middle of the wall facing -Z.
 */
export interface PlanHouse {
  kind: "house";
  /** The corner the house starts at, in LOD-0 world voxels. */
  at: Voxel3;
  /** How far the house reaches along each axis, in voxels. */
  size: Voxel3;
  wall: number;
  roof: number;
  floor: number;
}

/** A solid staircase: `steps` treads climbing along one horizontal axis. */
export interface PlanStairs {
  kind: "stairs";
  /** The bottom corner the first tread starts at, in LOD-0 world voxels. */
  at: Voxel3;
  /** The horizontal axis the staircase climbs along. */
  along: "x" | "z";
  /** How many treads. */
  steps: number;
  /** How many voxels each tread rises above the one before it. */
  rise: number;
  /** How many voxels each tread runs along `along`. */
  run: number;
  /** How many voxels wide the staircase is across its run. */
  width: number;
  id: number;
}

/** A solid incline from one point to another, its top stepping one voxel at a time. */
export interface PlanRamp {
  kind: "ramp";
  /** The base of the low end, in LOD-0 voxels. */
  from: Voxel3;
  /** The top of the high end. */
  to: Voxel3;
  /** How many voxels wide the incline is across its run. */
  width: number;
  id: number;
}

/** How far one horizontal axis of a surface's footprint reaches. */
export type SurfaceReach = "bounds" | "infinite";

/**
 * A skin over the terrain: the top `depth` voxels of every column in the
 * footprint are replaced with `id`. Without a `level` it follows whatever
 * height the generated terrain reached there, which is how a place paints a
 * desert floor or a grass plain without knowing the height in advance. With a
 * `level` it grades instead: every column's top is brought to that flat voxel,
 * filling the air below it and cutting the terrain above it, so a road runs
 * level through hills and hollows. A `reach` of `"infinite"` on an axis
 * extends the footprint across every streamed chunk on that axis.
 */
export interface PlanSurface {
  kind: "surface";
  /**
   * The footprint's corners, in LOD-0 voxels, required on an axis bounded by
   * `reach` and ignored on an infinite one. y is ignored by the paint and only
   * widens the region a plan change refills.
   */
  min?: Voxel3;
  max?: Voxel3;
  /** How far the x axis reaches; defaults to `"bounds"`. */
  reachX?: SurfaceReach;
  /** How far the z axis reaches; defaults to `"bounds"`. */
  reachZ?: SurfaceReach;
  /**
   * The flat LOD-0 voxel top every column is graded to. Absent, the surface
   * follows the terrain height instead.
   */
  level?: number;
  /** How many voxels below each column's top surface to replace. */
  depth: number;
  id: number;
}

export type PlanShape =
  | PlanBox
  | PlanRoad
  | PlanHouse
  | PlanStairs
  | PlanRamp
  | PlanSurface;

/** Everything a script asks the filler to stamp, in the order it stamps it. */
export type StructurePlan = PlanShape[];

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
/** The most voxels deep a surface shape may replace below the terrain top. */
export const MAX_PLAN_SURFACE_DEPTH = 64;

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

const isCoord = (v: unknown): v is number =>
  isInt(v, -MAX_PLAN_COORD, MAX_PLAN_COORD);

const isVector = (v: unknown): v is Voxel3 =>
  Array.isArray(v) && v.length === 3 && v.every(isCoord);

const isBlockId = (v: unknown): v is number => isInt(v, 0, MAX_PLAN_BLOCK_ID);

const isReach = (v: unknown): v is SurfaceReach | undefined =>
  v === undefined || v === "bounds" || v === "infinite";

const isOptionalCoord = (v: unknown): v is number | undefined =>
  v === undefined || isCoord(v);

/** Whether `v` is one shape this world can rasterize, with every field bounded. */
export const isPlanShape = (v: unknown): v is PlanShape => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const shape = v as Record<string, unknown>;
  if (shape.kind === "box") {
    if (!isVector(shape.min) || !isVector(shape.max) || !isBlockId(shape.id)) {
      return false;
    }
    return shape.min.every((lo, axis) => lo <= (shape.max as Voxel3)[axis]);
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
    if (
      !isReach(shape.reachX) ||
      !isReach(shape.reachZ) ||
      !isInt(shape.depth, 1, MAX_PLAN_SURFACE_DEPTH) ||
      !isOptionalCoord(shape.level) ||
      !isBlockId(shape.id)
    ) {
      return false;
    }
    const reachX = shape.reachX ?? "bounds";
    const reachZ = shape.reachZ ?? "bounds";
    if (
      (reachX === "bounds" || reachZ === "bounds") &&
      (!isVector(shape.min) || !isVector(shape.max))
    ) {
      return false;
    }
    if (isVector(shape.min) && isVector(shape.max)) {
      if (
        (reachX === "bounds" && shape.min[0] > shape.max[0]) ||
        (reachZ === "bounds" && shape.min[2] > shape.max[2])
      ) {
        return false;
      }
    }
    return true;
  }
  return false;
};

/**
 * Whether `v` is a plan this world can generate. Every shape's coordinates,
 * sizes, and block ids are bounded, so a peer's plan bytes never reach the
 * filler unchecked.
 */
export const isStructurePlan = (v: unknown): v is StructurePlan =>
  Array.isArray(v) && v.length <= MAX_PLAN_SHAPES && v.every(isPlanShape);
