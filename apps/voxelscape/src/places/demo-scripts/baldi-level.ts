// The school the "Baldi's Basics in Education and Learning" demo builds, on
// the original place's own module: a room is two cells, a hall is one, and the
// whole building is a grid of classrooms and special rooms off a crossing of
// halls. `baldi.rbxl` measures 98 studs to the cell; this rebuild takes a
// quarter of that, so a cell is 12 LOD-0 voxels (24 world units) and the
// school spans 15 cells by 9. World coordinates are voxel coordinates times
// two.
import { blocks } from "voxelscape";
import type { PlanShape } from "../../world/plan-shapes";

/** The slab row the school's floor stands on. */
export const GROUND = 30;
/** Walls run from GROUND+1 through GROUND+3; roofs sit at GROUND+4. */
export const WALL_TOP = GROUND + 3;
export const ROOF = GROUND + 4;
/** Floor feet height: the top surface of the row-30 slab, in world units. */
export const FLOOR = (GROUND + 1) * 2;
/** A desk's drawn height, and so where a notebook resting on one sits. */
export const DESK_HEIGHT = 2;
/** Below this world height is fatal. */
export const VOID_Y = 40;

/** Half the building's interior width and depth, in voxels. */
export const BX = 90;
export const BZ = 54;
/** A hall is one cell wide. */
export const HALL = 12;
/** The inner edge of the perimeter hall ring. */
export const INNER_X = BX - HALL;
export const INNER_Z = BZ - HALL;
/** Half the width of the central crossing halls. */
export const CROSS = 6;
/** A room door gap runs this far either side of its centre, in voxels. */
export const DOOR_HALF = 1;
/** How wide the barrier across a yellow door's hall half runs, in world units. */
export const HALL_DOOR_HALF = 12;

/** One room's interior rectangle, in voxels. */
export interface Room {
  readonly id: string;
  readonly name: string;
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
  /** Which wall its doorway is cut into. */
  readonly door: "north" | "south";
  /** The doorway centre, in voxels. */
  readonly doorX: number;
}

/**
 * The eight rooms around the crossing: four along the north band and four
 * along the south, each opening onto the hall at its centre's z.
 */
export const ROOMS: readonly Room[] = [
  {
    id: "library",
    name: "Library",
    x0: -78,
    z0: -42,
    x1: -42,
    z1: -6,
    door: "south",
    doorX: -60,
  },
  {
    id: "faculty",
    name: "Faculty Room",
    x0: -42,
    z0: -42,
    x1: -6,
    z1: -6,
    door: "south",
    doorX: -24,
  },
  {
    id: "cafeteria",
    name: "Cafeteria",
    x0: 6,
    z0: -42,
    x1: 42,
    z1: -6,
    door: "south",
    doorX: 24,
  },
  {
    id: "office",
    name: "Principal's Office",
    x0: 42,
    z0: -42,
    x1: 78,
    z1: -6,
    door: "south",
    doorX: 60,
  },
  {
    id: "classroom-a",
    name: "Classroom A",
    x0: -78,
    z0: 6,
    x1: -42,
    z1: 42,
    door: "north",
    doorX: -60,
  },
  {
    id: "classroom-b",
    name: "Classroom B",
    x0: -42,
    z0: 6,
    x1: -6,
    z1: 42,
    door: "north",
    doorX: -24,
  },
  {
    id: "classroom-c",
    name: "Classroom C",
    x0: 6,
    z0: 6,
    x1: 42,
    z1: 42,
    door: "north",
    doorX: 24,
  },
  {
    id: "detention",
    name: "Detention",
    x0: 42,
    z0: 6,
    x1: 78,
    z1: 42,
    door: "north",
    doorX: 60,
  },
];

/** One notebook's home, in world units, resting on the desk beneath it. */
export interface Notebook {
  readonly id: string;
  readonly room: string;
  readonly x: number;
  readonly z: number;
  /** The feet height it stands at, on top of the desk it sits on. */
  readonly y: number;
}

/** Seven notebooks, one to a room that is not the detention cell. */
export const NOTEBOOKS: readonly Notebook[] = [
  { id: "book-0", room: "Library", x: -120, z: -48, y: FLOOR + DESK_HEIGHT },
  { id: "book-1", room: "Classroom A", x: -120, z: 30, y: FLOOR + DESK_HEIGHT },
  { id: "book-2", room: "Classroom B", x: -48, z: 30, y: FLOOR + DESK_HEIGHT },
  { id: "book-3", room: "Classroom C", x: 48, z: 30, y: FLOOR + DESK_HEIGHT },
  { id: "book-4", room: "Cafeteria", x: 24, z: -36, y: FLOOR + DESK_HEIGHT },
  {
    id: "book-5",
    room: "Faculty Room",
    x: -48,
    z: -24,
    y: FLOOR + DESK_HEIGHT,
  },
  {
    id: "book-6",
    room: "Principal's Office",
    x: 120,
    z: -36,
    y: FLOOR + DESK_HEIGHT,
  },
];

/** A doorway a `door` prop stands in, with how many notebooks it wants. */
export interface Doorway {
  readonly id: string;
  /** World units. */
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  /** How far either side of its centre the barrier across it reaches, in world units. */
  readonly half: number;
  /** Notebooks needed before it will open; 0 opens to anyone. */
  readonly books: number;
  /** A fake exit, an exit, or an ordinary door. */
  readonly kind: "door" | "yellow" | "exit" | "fake-exit";
}

/**
 * Every door in the school. The four north rooms and four south rooms each
 * have one onto the crossing hall; two yellow doors gate the north and south
 * halls until two notebooks are held; the entrance and the true exit stand in
 * the west and east walls, with three fake exits in the other walls.
 */
export const DOORWAYS: readonly Doorway[] = [
  {
    id: "door-library",
    x: -120,
    z: 12,
    yaw: 0,
    half: 3,
    books: 0,
    kind: "door",
  },
  {
    id: "door-faculty",
    x: -48,
    z: 12,
    yaw: 0,
    half: 3,
    books: 0,
    kind: "door",
  },
  {
    id: "door-cafeteria",
    x: 48,
    z: 12,
    yaw: 0,
    half: 3,
    books: 0,
    kind: "door",
  },
  { id: "door-office", x: 120, z: 12, yaw: 0, half: 3, books: 0, kind: "door" },
  {
    id: "door-classroom-a",
    x: -120,
    z: -12,
    yaw: 0,
    half: 3,
    books: 0,
    kind: "door",
  },
  {
    id: "door-classroom-b",
    x: -48,
    z: -12,
    yaw: 0,
    half: 3,
    books: 0,
    kind: "door",
  },
  {
    id: "door-classroom-c",
    x: 48,
    z: -12,
    yaw: 0,
    half: 3,
    books: 0,
    kind: "door",
  },
  {
    id: "door-detention",
    x: 120,
    z: -12,
    yaw: 0,
    half: 3,
    books: 0,
    kind: "door",
  },
  {
    id: "door-hall-north",
    x: 0,
    z: -24,
    yaw: 0,
    half: HALL_DOOR_HALF,
    books: 2,
    kind: "yellow",
  },
  {
    id: "door-hall-south",
    x: 0,
    z: 24,
    yaw: 0,
    half: HALL_DOOR_HALF,
    books: 2,
    kind: "yellow",
  },
  {
    id: "door-entrance",
    x: -182,
    z: 0,
    yaw: Math.PI / 2,
    half: 5,
    books: 0,
    kind: "door",
  },
  {
    id: "door-exit",
    x: 182,
    z: -60,
    yaw: Math.PI / 2,
    half: 5,
    books: 0,
    kind: "exit",
  },
  {
    id: "door-fake-1",
    x: 0,
    z: -110,
    yaw: 0,
    half: 5,
    books: 0,
    kind: "fake-exit",
  },
  {
    id: "door-fake-2",
    x: 0,
    z: 110,
    yaw: 0,
    half: 5,
    books: 0,
    kind: "fake-exit",
  },
  {
    id: "door-fake-3",
    x: 182,
    z: 60,
    yaw: Math.PI / 2,
    half: 5,
    books: 0,
    kind: "fake-exit",
  },
];

/** The hinge a swinging door turns about, in world units from its centre. */
export const DOOR_HINGE = 1.2;
/** How long one door takes to swing open. */
export const DOOR_SWING_MS = 400;

/** Where the player starts, just outside the west entrance, in world units. */
export const SPAWN: readonly [number, number, number] = [-200, FLOOR, 0];
/** Where a caught player is put back, at the west entrance. */
export const GAME_SPAWN: readonly [number, number, number] = [-168, FLOOR, 0];
/** Where detention serves its time. */
export const DETENTION_SPAWN: readonly [number, number, number] = [
  150,
  FLOOR,
  24,
];
/** The centre of the school, where Baldi waits out phase one. */
export const BALDI_SPAWN = { x: 0, z: 0 };
/** The friendly Baldi's mark, in the west perimeter hall. */
export const NORMAL_BALDI_SPAWN = { x: -168, z: 0 };

/** One piece of furniture or dressing, in world units. */
export interface Fixture {
  readonly id: string;
  readonly model:
    | "desk"
    | "chair"
    | "locker"
    | "bookshelf"
    | "cafeteria-table"
    | "poster"
    | "platform";
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  readonly height: number;
  readonly y?: number;
}

const deskAt = (id: string, x: number, z: number, yaw: number): Fixture => ({
  id,
  model: "desk",
  x,
  z,
  yaw,
  height: DESK_HEIGHT,
});
const chairAt = (id: string, x: number, z: number, yaw: number): Fixture => ({
  id,
  model: "chair",
  x,
  z,
  yaw,
  height: 1.5,
});

/** A classroom's single desk and chair, facing its doorway. */
const classroomFurniture = (
  id: string,
  cx: number,
  cz: number,
  facing: number,
): Fixture[] => [
  deskAt(`desk-${id}`, cx, cz, facing),
  chairAt(`chair-${id}`, cx, cz + 12, facing + Math.PI),
];

/** The furniture and dressing the school stands up on top of the plan. */
export const FIXTURES: readonly Fixture[] = [
  ...classroomFurniture("cla", -120, 30, 0),
  ...classroomFurniture("clb", -48, 30, 0),
  ...classroomFurniture("clc", 48, 30, 0),
  // Library: shelves against the far wall and a reading desk.
  {
    id: "shelf-lib-1",
    model: "bookshelf",
    x: -144,
    z: -72,
    yaw: 0,
    height: 3,
  },
  {
    id: "shelf-lib-2",
    model: "bookshelf",
    x: -120,
    z: -72,
    yaw: 0,
    height: 3,
  },
  {
    id: "shelf-lib-3",
    model: "bookshelf",
    x: -96,
    z: -72,
    yaw: 0,
    height: 3,
  },
  {
    id: "shelf-lib-4",
    model: "bookshelf",
    x: -144,
    z: -24,
    yaw: Math.PI,
    height: 3,
  },
  { id: "desk-lib", model: "desk", x: -120, z: -48, yaw: 0, height: 2 },
  // Cafeteria: three long tables.
  {
    id: "table-caf-1",
    model: "cafeteria-table",
    x: 24,
    z: -36,
    yaw: Math.PI / 2,
    height: 2,
  },
  {
    id: "table-caf-2",
    model: "cafeteria-table",
    x: 48,
    z: -36,
    yaw: Math.PI / 2,
    height: 2,
  },
  {
    id: "table-caf-3",
    model: "cafeteria-table",
    x: 72,
    z: -36,
    yaw: Math.PI / 2,
    height: 2,
  },
  // Office: the principal's desk, chair, and a ruler on top.
  { id: "desk-off", model: "desk", x: 120, z: -36, yaw: Math.PI, height: 2 },
  { id: "chair-off", model: "chair", x: 120, z: -24, yaw: 0, height: 1.5 },
  {
    id: "ruler",
    model: "platform",
    x: 120,
    z: -36,
    y: FLOOR + 0.9,
    yaw: Math.PI / 2,
    height: 0.5,
  },
  // Faculty room: a desk and chair.
  { id: "desk-fac", model: "desk", x: -48, z: -24, yaw: Math.PI, height: 2 },
  { id: "chair-fac", model: "chair", x: -48, z: -12, yaw: 0, height: 1.5 },
  // Detention: a bare desk.
  { id: "desk-det", model: "desk", x: 120, z: 24, yaw: 0, height: 2 },
  // Lockers down the central hall, and a poster near the entrance.
  {
    id: "locker-hall-1",
    model: "locker",
    x: -48,
    z: 0,
    yaw: Math.PI / 2,
    height: 2.5,
  },
  {
    id: "locker-hall-2",
    model: "locker",
    x: 48,
    z: 0,
    yaw: Math.PI / 2,
    height: 2.5,
  },
  { id: "locker-hall-3", model: "locker", x: 0, z: -72, yaw: 0, height: 2.5 },
  {
    id: "locker-hall-4",
    model: "locker",
    x: 0,
    z: 72,
    yaw: Math.PI,
    height: 2.5,
  },
  {
    id: "poster-entry",
    model: "poster",
    x: -168,
    z: -24,
    yaw: Math.PI / 2,
    height: 2.5,
  },
];

/** The hall points an NPC wanders between, in world units. */
export const HALL_POINTS: readonly [number, number][] = [
  [0, 0],
  [0, -96],
  [168, -96],
  [168, 0],
  [168, 96],
  [0, 96],
  [-168, 96],
  [-168, 0],
  [-168, -96],
];

/** The marks the Bully stands between, in world units. */
export const BULLY_POINTS: readonly [number, number][] = [
  [-168, 48],
  [168, 48],
  [-84, -96],
  [84, -96],
];

/**
 * Every shape the school is stamped from, in LOD-0 voxels. Walls are built by
 * grid line rather than by room, so two rooms sharing an edge share the one
 * wall between them.
 */
export const planShapes = (): PlanShape[] => {
  const b = blocks;
  const shapes: PlanShape[] = [];
  const box = (
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    id: number,
  ): void => {
    shapes.push({ kind: "box", min: [x0, y0, z0], max: [x1, y1, z1], id });
  };
  // A wall running along x at row z, from ax to bx, minus its gaps.
  const wallX = (
    z: number,
    ax: number,
    bx: number,
    gaps: ReadonlyArray<readonly [number, number]>,
  ): void => {
    const start = Math.min(ax, bx);
    const end = Math.max(ax, bx);
    const ordered = [...gaps].sort((g, h) => g[0] - h[0]);
    let cursor = start;
    for (const gap of ordered) {
      if (gap[0] > cursor) {
        box(cursor, GROUND + 1, z, gap[0] - 1, WALL_TOP, z, b.greystone);
      }
      cursor = Math.max(cursor, gap[1] + 1);
    }
    if (cursor <= end) {
      box(cursor, GROUND + 1, z, end, WALL_TOP, z, b.greystone);
    }
  };
  // A wall running along z at column x, from az to bz, minus its gaps.
  const wallZ = (
    x: number,
    az: number,
    bz: number,
    gaps: ReadonlyArray<readonly [number, number]>,
  ): void => {
    const start = Math.min(az, bz);
    const end = Math.max(az, bz);
    const ordered = [...gaps].sort((g, h) => g[0] - h[0]);
    let cursor = start;
    for (const gap of ordered) {
      if (gap[0] > cursor) {
        box(x, GROUND + 1, cursor, x, WALL_TOP, gap[0] - 1, b.greystone);
      }
      cursor = Math.max(cursor, gap[1] + 1);
    }
    if (cursor <= end) {
      box(x, GROUND + 1, cursor, x, WALL_TOP, end, b.greystone);
    }
  };

  // The plaza: first graded flat to the school's floor so the generated
  // mountains are cut down, then skinned with dirt and grass.
  shapes.push({
    kind: "surface",
    min: [-110, 0, -80],
    max: [110, 0, 80],
    level: GROUND,
    depth: 2,
    id: b.grass,
  });
  box(-110, 0, -80, 110, GROUND - 1, 80, b.dirt);
  box(-110, GROUND, -80, 110, GROUND, 80, b.grass);

  // The school's floor and roof.
  box(-BX, GROUND, -BZ, BX, GROUND, BZ, b.wood);
  box(-BX - 1, ROOF, -BZ - 1, BX + 1, ROOF, BZ + 1, b.greystone);

  const centreGap = [-CROSS, CROSS] as const;
  const gapsAt = (
    centres: readonly number[],
  ): ReadonlyArray<readonly [number, number]> => [
    centreGap,
    ...centres.map(
      (at) => [at - DOOR_HALF, at + DOOR_HALF] as readonly [number, number],
    ),
  ];

  // Outer walls, with the entrance in the west and the exit mouths in the
  // east, north, and south.
  wallZ(-BX - 1, -BZ - 1, BZ + 1, [[-2, 2]]);
  wallZ(BX + 1, -BZ - 1, BZ + 1, [
    [-32, -28],
    [28, 32],
  ]);
  wallX(-BZ - 1, -BX - 1, BX + 1, [[-2, 2]]);
  wallX(BZ + 1, -BX - 1, BX + 1, [[-2, 2]]);

  // The perimeter ring's inner wall, open where the crossing halls pass.
  wallZ(-INNER_X, -INNER_Z, INNER_Z, [centreGap]);
  wallZ(INNER_X, -INNER_Z, INNER_Z, [centreGap]);
  wallX(-INNER_Z, -INNER_X, INNER_X, [centreGap]);
  wallX(INNER_Z, -INNER_X, INNER_X, [centreGap]);

  // The room grid's internal separators, each open where the crossing hall
  // passes through it.
  for (const x of [-42, 42, -CROSS, CROSS]) {
    wallZ(x, -INNER_Z, INNER_Z, [centreGap]);
  }
  // The wall each room's doorway is cut into, once per line rather than once
  // per room, so every door's gap survives the whole run.
  const northRow = ROOMS.filter((room) => room.door === "south").map(
    (room) => room.doorX,
  );
  const southRow = ROOMS.filter((room) => room.door === "north").map(
    (room) => room.doorX,
  );
  wallX(-CROSS, -INNER_X, INNER_X, gapsAt(northRow));
  wallX(CROSS, -INNER_X, INNER_X, gapsAt(southRow));

  return shapes;
};
