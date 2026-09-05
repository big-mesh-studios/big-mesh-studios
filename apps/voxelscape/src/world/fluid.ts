// The behaviour vocabulary of flowing fluids, shared by the flow simulation,
// the meshers, the light channels and the editors: which voxel ids are water
// or lava, what level each carries, and how fast each kind spreads. A fluid
// voxel is its kind's *source* id at level 0 (a full, stationary cell — an
// ocean, a placed bucket, the pool at the foot of a fall) or one of its seven
// level ids, level k being k cells of flow from a source. The falling ids are
// the cells of a column on the move: full-height, carrying no level, and they
// land as source cells.
import {
  FLUID_MAX_LEVEL,
  VOXEL_LAVA,
  VOXEL_LAVA_FALLING,
  VOXEL_LAVA_LEVEL_1,
  VOXEL_WATER,
  VOXEL_WATER_FALLING,
  VOXEL_WATER_LEVEL_1,
  fluidLevel,
  isLavaId,
  isWaterId,
} from "./voxel-store";

export type FluidKind = "water" | "lava";

/** The source (level 0) voxel id of each fluid kind. */
export const SOURCE_ID: Record<FluidKind, number> = {
  water: VOXEL_WATER,
  lava: VOXEL_LAVA,
};

/** The full-height, on-the-move voxel id of each fluid kind. */
export const FALLING_ID: Record<FluidKind, number> = {
  water: VOXEL_WATER_FALLING,
  lava: VOXEL_LAVA_FALLING,
};

/** The first of a kind's seven flowing level ids, so `levelIdOf` can index it. */
const LEVEL_BASE: Record<FluidKind, number> = {
  water: VOXEL_WATER_LEVEL_1,
  lava: VOXEL_LAVA_LEVEL_1,
};

/** The kind a voxel id is, or null when it is not a fluid. */
export const fluidKindOf = (id: number): FluidKind | null =>
  isWaterId(id) ? "water" : isLavaId(id) ? "lava" : null;

/** Whether a voxel id is a fluid of `kind`. */
export const isKind = (kind: FluidKind, id: number): boolean =>
  kind === "water" ? isWaterId(id) : isLavaId(id);

/**
 * The voxel id encoding a fluid cell at `level` cells from its source: the
 * source id at level 0, a level id at 1..`FLUID_MAX_LEVEL`.
 */
export const levelIdOf = (kind: FluidKind, level: number): number =>
  level <= 0
    ? SOURCE_ID[kind]
    : LEVEL_BASE[kind] + Math.min(level, FLUID_MAX_LEVEL) - 1;

/**
 * The spread level a fluid voxel carries (`0` for a source; the falling ids
 * carry none, so they read as sources' level here for height purposes only —
 * prefer `fluidLevel` where "is a source" must be exact).
 */
export const levelOf = (id: number): number => fluidLevel(id);

/**
 * The fraction of its voxel height a fluid surface at `level` sits at: full
 * at a source, thinning by `1/8` per level of spread, matching Minecraft's
 * per-block drop.
 */
export const surfaceFractionOfLevel = (level: number): number =>
  (FLUID_MAX_LEVEL + 1 - level) / (FLUID_MAX_LEVEL + 1);

/** Seconds per cell of spread for each kind: water at Minecraft's speed, lava six times slower. */
export const SPREAD_SECONDS: Record<FluidKind, number> = {
  water: 0.25,
  lava: 1.5,
};
