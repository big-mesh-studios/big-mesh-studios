// The fixed site the built-in "Raise a Floppa" demo raises its game on: a
// one-room house with the Interwebs terminal, a fenced back yard holding the
// food bowl's refill, the litter box, the catnip, the farm patches, the faith
// altar and the time machine, and — far to the east, reached only by the door
// that opens at night — the yellow backrooms. Kept apart from the demo's own
// script so it carries no `"voxelscape"` import and can be unit-tested on its
// own: it declares block ids and world coordinates the way `baldi-level.ts`
// does. World coordinates are voxel coordinates times two.
import type { PlanShape } from "../../world/plan-shapes";

// The world palette's block ids, mirrored here so this module stays pure (the
// `blocks` record lives in the sandbox and is never imported outside it).
const GRASS = 1;
const WOOD = 26;
const WOOL_YELLOW = 34;

/** The slab row the graded ground stands on. */
export const GROUND = 30;
/** The top surface of the row-30 slab, in world units: the house's floor. */
export const FLOOR = (GROUND + 1) * 2;
/** The highest voxel the house's walls reach. */
export const WALL_TOP = GROUND + 7;
/** How many voxels tall a fence stands. */
const FENCE_TOP = GROUND + 2;

/** Where the player wakes, in world units: the middle of the living room. */
export const SPAWN = { x: 0, z: 0 };

/** The Interwebs terminal, in the house's south wall. */
export const COMPUTER = { x: 0, z: 10 };
/** The food bowl, east of the hearth. */
export const BOWL = { x: 14, z: -6 };
/** The litter box, west of the hearth. */
export const LITTER_BOX = { x: -14, z: -6 };
/** The cat's own bed. */
export const CAT_BED = { x: -12, z: 4 };
/** The scratching post. */
export const SCRATCH_POST = { x: 16, z: 8 };
/** The two kitchen appliances the cooking corner needs. */
export const STOVE = { x: 12, z: -12 };
export const FRIDGE = { x: 6, z: -12 };

// The yard, north of the house's door, fenced on all four sides.
const YARD_MIN_X = -40;
const YARD_MAX_X = 40;
const YARD_MIN_Z = -58;
const YARD_MAX_Z = -9;
/** Where the catnip plant stands in the yard. */
export const CATNIP = { x: -30, z: -28 };
/** The south-west corner the farm patches fill east and north from. */
export const FARM_ORIGIN = { x: -20, z: -52 };
/** How far apart the farm patches sit, in world units. */
export const FARM_STRIDE = 16;
/** The faith altar, at the yard's north end. */
export const ALTAR = { x: 0, z: -78 };
/** The time machine, beside the altar. */
export const TIME_MACHINE = { x: 30, z: -78 };
/** The door in the yard's west fence that opens into the backrooms at night. */
export const BACKROOM_DOOR = { x: -40, z: -40 };

// The backrooms: a sealed yellow hall well east of everything else.
const BR_MIN_X = 55;
const BR_MAX_X = 105;
const BR_MIN_Z = -20;
const BR_MAX_Z = 20;
const BR_WALL_TOP = GROUND + 5;
const BR_CEILING = GROUND + 6;
/** Where a player stands when they fall through the backrooms door, in world units. */
export const BACKROOM_ENTRY = { x: 58 * 2, z: 0 };
/** Where the way home stands in the backrooms' far wall, in world units. */
export const BACKROOM_EXIT = { x: 102 * 2, z: 0 };
/** Where the Dark Web's stall stands in the backrooms, in world units. */
export const DARK_WEB = { x: 78 * 2, z: 12 * 2 };

/** A box shape, in voxels. */
const box = (
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
  id: number,
): PlanShape => ({
  kind: "box",
  min: [minX, minY, minZ],
  max: [maxX, maxY, maxZ],
  id,
});

/** The yard fence's four sides, holed at the door and the west gate. */
const fenceShapes = (): PlanShape[] => {
  const shapes: PlanShape[] = [
    box(
      YARD_MIN_X,
      GROUND + 1,
      YARD_MIN_Z,
      YARD_MAX_X,
      FENCE_TOP,
      YARD_MIN_Z,
      WOOD,
    ),
    box(
      YARD_MAX_X,
      GROUND + 1,
      YARD_MIN_Z,
      YARD_MAX_X,
      FENCE_TOP,
      YARD_MAX_Z,
      WOOD,
    ),
  ];
  // The west fence, holed where the backrooms door opens.
  shapes.push(
    box(YARD_MIN_X, GROUND + 1, YARD_MIN_Z, YARD_MIN_X, FENCE_TOP, -24, WOOD),
  );
  shapes.push(
    box(YARD_MIN_X, GROUND + 1, -16, YARD_MIN_X, FENCE_TOP, YARD_MAX_Z, WOOD),
  );
  // The south side is the house's own wall for most of its run; the fence only
  // closes the two stretches beside the back door, leaving the doorway open.
  shapes.push(
    box(YARD_MIN_X, GROUND + 1, YARD_MAX_Z, -3, FENCE_TOP, YARD_MAX_Z, WOOD),
  );
  shapes.push(
    box(3, GROUND + 1, YARD_MAX_Z, YARD_MAX_X, FENCE_TOP, YARD_MAX_Z, WOOD),
  );
  return shapes;
};

/** The backrooms hall: floor, ceiling, walls with a door at each end, pillars. */
const backroomShapes = (): PlanShape[] => {
  const shapes: PlanShape[] = [
    box(BR_MIN_X, GROUND, BR_MIN_Z, BR_MAX_X, GROUND, BR_MAX_Z, WOOL_YELLOW),
    box(
      BR_MIN_X,
      BR_CEILING,
      BR_MIN_Z,
      BR_MAX_X,
      BR_CEILING,
      BR_MAX_Z,
      WOOL_YELLOW,
    ),
    // The west wall, holed where the drop-in lands.
    box(BR_MIN_X, GROUND + 1, BR_MIN_Z, BR_MIN_X, BR_WALL_TOP, -3, WOOL_YELLOW),
    box(BR_MIN_X, GROUND + 1, 3, BR_MIN_X, BR_WALL_TOP, BR_MAX_Z, WOOL_YELLOW),
    // The east wall, holed where the way home stands.
    box(BR_MAX_X, GROUND + 1, BR_MIN_Z, BR_MAX_X, BR_WALL_TOP, -3, WOOL_YELLOW),
    box(BR_MAX_X, GROUND + 1, 3, BR_MAX_X, BR_WALL_TOP, BR_MAX_Z, WOOL_YELLOW),
    box(
      BR_MIN_X,
      GROUND + 1,
      BR_MIN_Z,
      BR_MAX_X,
      BR_WALL_TOP,
      BR_MIN_Z,
      WOOL_YELLOW,
    ),
    box(
      BR_MIN_X,
      GROUND + 1,
      BR_MAX_Z,
      BR_MAX_X,
      BR_WALL_TOP,
      BR_MAX_Z,
      WOOL_YELLOW,
    ),
  ];
  for (let x = 65; x <= 95; x += 15) {
    for (let z = -12; z <= 12; z += 12) {
      shapes.push(
        box(x, GROUND + 1, z, x + 2, BR_WALL_TOP, z + 2, WOOL_YELLOW),
      );
    }
  }
  return shapes;
};

/** The whole site, in the order it stamps: ground, then everything on it. */
export const worldShapes = (): PlanShape[] => [
  {
    kind: "surface",
    min: [YARD_MIN_X - 12, GROUND, YARD_MIN_Z - 4],
    max: [YARD_MAX_X + 12, GROUND, 12],
    level: GROUND,
    depth: 4,
    id: GRASS,
  },
  {
    kind: "surface",
    min: [BR_MIN_X - 2, GROUND, BR_MIN_Z - 2],
    max: [BR_MAX_X + 2, GROUND, BR_MAX_Z + 2],
    level: GROUND,
    depth: 4,
    id: WOOL_YELLOW,
  },
  {
    kind: "house",
    at: [-16, GROUND, -8],
    size: [32, 8, 16],
    wall: WOOD,
    roof: WOOD,
    floor: WOOD,
  },
  ...fenceShapes(),
  ...backroomShapes(),
];
