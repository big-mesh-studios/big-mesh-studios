// The randomly generated caverns the built-in "Cube Cavern" demo descends
// through, on the original place's own shape: a themed grid of rooms threaded
// into a connected maze, entered from a start room and left through a hatch
// (or, on the last floor, a boss room). The source's own `_G.dungeon` picks
// one of three directional room pools and chains 8-12 hand-authored rooms;
// this rebuild keeps the themed enemy pool, the three-floor descent, the
// mid-run shop and the boss-on-the-last-floor, but lays the rooms on a grid so
// the world's own structure filler can stamp them.
//
// Kept apart from the demo's own script so it carries no `"voxelscape"`
// import and can be unit-tested on its own: it declares block ids and world
// coordinates the way `baldi-level.ts` does. World coordinates are voxel
// coordinates times two.
import type { PlanShape } from "../../world/plan-shapes";

// The world palette's block ids, mirrored here so this module stays pure (the
// `blocks` record lives in the sandbox and is never imported outside it).
const GREYSTONE = 28;
const WOOD = 26;

/** The slab row the graded ground stands on. */
export const GROUND = 30;
/** The top surface of the row-30 slab, in world units. */
export const FLOOR = (GROUND + 1) * 2;
/** Walls run from GROUND+1 through GROUND+4. */
export const WALL_TOP = GROUND + 4;
/** Below this world height the player is killed, for a fall off the grid. */
export const VOID_Y = -200;

/** A room cell's width and depth, in voxels. */
const CELL = 16;
/** The cavern grid is GRID by GRID cells. */
export const GRID = 5;
/**
 * The far corner of cell (0, 0), in voxels. The cavern sits just south of the
 * hub — inside the window the world streams and fills around the spawn — so a
 * run's floor is loaded before the player is moved onto it.
 */
const CAVERN_X0 = -40;
const CAVERN_Z0 = 25;
/** Half a doorway gap, in voxels, either side of a wall's centre. */
const DOOR_HALF = 2;

/** The hub's half-width in voxels; it spans -HUB to +HUB on each axis. */
export const HUB_HALF = 24;
/** Where the player wakes in the hub, in world units. */
export const HUB_ENTRANCE = { x: 0, z: 0 };
/** Where the shopkeeper stands, in world units. */
export const HUB_SHOPKEEPER = { x: -16, z: -16 };
/** Where the crafting table stands, in world units. */
export const HUB_CRAFT = { x: 16, z: -16 };
/** Where the cavern door stands, in world units. */
export const HUB_DOOR = { x: 0, z: 16 };
/** Where the shop sign stands, in world units. */
export const HUB_SIGN = { x: 0, z: -18 };

/** The world palette's own `key` item model and the world's default NPC model. */
export const HUB_KEEPER_MODEL = "npc-teacher";
export const CAVERN_DOOR_MODEL = "door";
export const HATCH_MODEL = "platform";

/** One seeded random source; the same seed always walks the same maze. */
export type Rng = () => number;

/** A 32-bit mulberry32 generator, seeded by the run's own deterministic seed. */
export const makeRng = (seed: number): Rng => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** A random integer from `a` to `b`, both included. */
export const randInt = (rng: Rng, a: number, b: number): number =>
  a + Math.floor(rng() * (b - a + 1));

/** One element of `items`, chosen from `rng`. */
export const pick = <T>(rng: Rng, items: readonly T[]): T =>
  items[Math.floor(rng() * items.length)];

/** A point in world units. */
export interface Vec2 {
  readonly x: number;
  readonly z: number;
}

/**
 * One cavern theme, keyed as the source's `dus.d` is: the colour its torches
 * burn, the enemy pool it spawns, and whether its last floor ends in a boss.
 */
export interface EnemyKind {
  readonly id: string;
  readonly name: string;
  readonly health: number;
  readonly damage: number;
  /** How close a player must come before it gives chase, in world units. */
  readonly dist: number;
  /** How fast it closes, in world units per second. */
  readonly speed: number;
  /** Whether it lobs a shot at the player rather than only touching. */
  readonly ranged: boolean;
  /** Whether it leaps the last stretch at the player. */
  readonly charge: boolean;
  readonly model: string;
}

export type ThemeId =
  "yellow" | "blue" | "red" | "green" | "orange" | "purple" | "black";

export interface Theme {
  readonly id: ThemeId;
  readonly name: string;
  /** Linear RGB the theme's torches burn. */
  readonly glow: [number, number, number];
  /** The theme's ordinary enemies. */
  readonly enemies: readonly EnemyKind[];
  /** The rare brute that sometimes replaces an ordinary one on deeper floors. */
  readonly mega: EnemyKind;
  /** Whether the theme's last floor ends in a boss. */
  readonly boss: boolean;
}

const hand = (id: string, name: string, model: string): EnemyKind => ({
  id,
  name,
  health: 5,
  damage: 1,
  dist: 30,
  speed: 85,
  ranged: false,
  charge: false,
  model,
});

const YELLOWHAND = hand("yellowhand", "Yellowhand", "cave-yellowhand");
const WORMLE: EnemyKind = {
  id: "wormle",
  name: "Wormle",
  health: 4,
  damage: 1,
  dist: 30,
  speed: 70,
  ranged: false,
  charge: true,
  model: "cave-wormle",
};
const POOPIE: EnemyKind = {
  id: "poopie",
  name: "Poopie",
  health: 6,
  damage: 1,
  dist: 35,
  speed: -10,
  ranged: true,
  charge: false,
  model: "cave-poopie",
};
const CHIK: EnemyKind = {
  id: "chik",
  name: "Chik",
  health: 7,
  damage: 2,
  dist: 30,
  speed: 65,
  ranged: false,
  charge: false,
  model: "cave-chik",
};
const MEGACHIK: EnemyKind = {
  id: "megachik",
  name: "Megachik",
  health: 14,
  damage: 2,
  dist: 35,
  speed: 60,
  ranged: false,
  charge: false,
  model: "cave-megachik",
};

/**
 * Every theme's enemy pool, with the source's own `health`/`dmg`/`dist`/
 * `speed` numbers. Only the yellow theme is built out — the rest are the real
 * stats with a yellow model stood in until their own art exists, so adding a
 * theme later is a model list and one line here.
 */
export const THEMES: Record<ThemeId, Theme> = {
  yellow: {
    id: "yellow",
    name: "Yellow Cavern",
    glow: [1.0, 0.78, 0.35],
    enemies: [YELLOWHAND, WORMLE, POOPIE, CHIK],
    mega: MEGACHIK,
    boss: true,
  },
  blue: {
    id: "blue",
    name: "Blue Cavern",
    glow: [0.45, 0.68, 1.0],
    enemies: [
      hand("bluehand", "Bluehand", "cave-yellowhand"),
      {
        id: "purp",
        name: "Purp",
        health: 4,
        damage: 1,
        dist: 35,
        speed: 90,
        ranged: false,
        charge: false,
        model: "cave-wormle",
      },
      {
        id: "gloober",
        name: "Gloober",
        health: 7,
        damage: 2,
        dist: 35,
        speed: 20,
        ranged: true,
        charge: false,
        model: "cave-poopie",
      },
      {
        id: "pill",
        name: "Pill",
        health: 6,
        damage: 1,
        dist: 30,
        speed: -10,
        ranged: true,
        charge: false,
        model: "cave-poopie",
      },
    ],
    mega: {
      id: "megapurp",
      name: "Megapurp",
      health: 11,
      damage: 1,
      dist: 30,
      speed: 120,
      ranged: false,
      charge: false,
      model: "cave-megachik",
    },
    boss: true,
  },
  red: {
    id: "red",
    name: "Red Cavern",
    glow: [1.0, 0.45, 0.35],
    enemies: [
      hand("redhand", "Redhand", "cave-yellowhand"),
      {
        id: "bull",
        name: "Bull",
        health: 6,
        damage: 1,
        dist: 30,
        speed: 210,
        ranged: false,
        charge: true,
        model: "cave-wormle",
      },
      {
        id: "teef",
        name: "Teef",
        health: 7,
        damage: 2,
        dist: 35,
        speed: 70,
        ranged: false,
        charge: false,
        model: "cave-chik",
      },
      {
        id: "wiz",
        name: "Wiz",
        health: 8,
        damage: 1,
        dist: 30,
        speed: 75,
        ranged: true,
        charge: false,
        model: "cave-poopie",
      },
    ],
    mega: MEGACHIK,
    boss: true,
  },
  green: {
    id: "green",
    name: "Green Cavern",
    glow: [0.5, 1.0, 0.55],
    enemies: [
      {
        id: "hyde",
        name: "Hyde",
        health: 6,
        damage: 2,
        dist: 25,
        speed: 75,
        ranged: false,
        charge: false,
        model: "cave-chik",
      },
      {
        id: "bug",
        name: "Bug",
        health: 7,
        damage: 2,
        dist: 30,
        speed: 65,
        ranged: false,
        charge: false,
        model: "cave-wormle",
      },
      hand("greenhand", "Greenhand", "cave-yellowhand"),
      {
        id: "ant",
        name: "Ant",
        health: 4,
        damage: 1,
        dist: 30,
        speed: 90,
        ranged: false,
        charge: false,
        model: "cave-wormle",
      },
    ],
    mega: MEGACHIK,
    boss: false,
  },
  orange: {
    id: "orange",
    name: "Orange Cavern",
    glow: [1.0, 0.62, 0.3],
    enemies: [
      {
        id: "elef",
        name: "Elef",
        health: 7,
        damage: 2,
        dist: 30,
        speed: 75,
        ranged: false,
        charge: true,
        model: "cave-megachik",
      },
      {
        id: "fenard",
        name: "Fenard",
        health: 4,
        damage: 1,
        dist: 35,
        speed: 95,
        ranged: false,
        charge: false,
        model: "cave-chik",
      },
      hand("orangehand", "Orangehand", "cave-yellowhand"),
    ],
    mega: MEGACHIK,
    boss: false,
  },
  purple: {
    id: "purple",
    name: "Purple Cavern",
    glow: [0.78, 0.55, 1.0],
    enemies: [
      hand("purplehand", "Purplehand", "cave-yellowhand"),
      {
        id: "bear",
        name: "Bear",
        health: 6,
        damage: 2,
        dist: 30,
        speed: 75,
        ranged: false,
        charge: false,
        model: "cave-megachik",
      },
      {
        id: "nite",
        name: "Nite",
        health: 6,
        damage: 1,
        dist: 35,
        speed: 95,
        ranged: false,
        charge: false,
        model: "cave-poopie",
      },
    ],
    mega: MEGACHIK,
    boss: false,
  },
  black: {
    id: "black",
    name: "Black Cavern",
    glow: [0.6, 0.6, 0.7],
    enemies: [
      hand("whitehand", "Whitehand", "cave-yellowhand"),
      {
        id: "spook",
        name: "Spook",
        health: 6,
        damage: 2,
        dist: 30,
        speed: 60,
        ranged: false,
        charge: false,
        model: "cave-poopie",
      },
      {
        id: "scorp",
        name: "Scorp",
        health: 4,
        damage: 1,
        dist: 30,
        speed: 150,
        ranged: false,
        charge: true,
        model: "cave-yellowhand",
      },
      {
        id: "soulchik",
        name: "Soulchik",
        health: 10,
        damage: 2,
        dist: 50,
        speed: 160,
        ranged: true,
        charge: false,
        model: "cave-chik",
      },
    ],
    mega: MEGACHIK,
    boss: false,
  },
};

/** One room cell of a cavern floor. */
export interface RoomCell {
  /** `i + j * GRID`. */
  readonly index: number;
  readonly i: number;
  readonly j: number;
  /** The cell's far corner, in voxels. */
  readonly x0: number;
  readonly z0: number;
}

/** One enemy to stand when a floor opens, in world units. */
export interface EnemySpawn {
  readonly kind: EnemyKind;
  readonly x: number;
  readonly z: number;
  /** Whether the rare brute variant is the one stood. */
  readonly mega: boolean;
}

/** A generated floor: what stands in it and the shapes that lay it out. */
export interface FloorPlan {
  readonly floor: number;
  readonly theme: Theme;
  readonly rooms: readonly RoomCell[];
  /** The maze's open doorways, as "a-b" cell-index keys. */
  readonly connections: readonly string[];
  readonly entrance: Vec2;
  readonly shop: Vec2;
  readonly exit: Vec2;
  readonly enemySpawns: readonly EnemySpawn[];
  readonly chestSpawns: readonly Vec2[];
  readonly torchSpawns: readonly Vec2[];
  readonly shapes: readonly PlanShape[];
}

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

/** The world-unit centre of a room cell. */
export const cellCentre = (cell: RoomCell): Vec2 => ({
  x: (cell.x0 + CELL / 2) * 2,
  z: (cell.z0 + CELL / 2) * 2,
});

/** The cell at `i`, `j`, or null when it lies off the grid. */
const cellAt = (i: number, j: number): RoomCell | null =>
  i < 0 || j < 0 || i >= GRID || j >= GRID
    ? null
    : {
        index: i + j * GRID,
        i,
        j,
        x0: CAVERN_X0 + i * CELL,
        z0: CAVERN_Z0 + j * CELL,
      };

/** A key naming the boundary between two adjacent cells, smaller index first. */
const edgeKey = (a: number, b: number): string =>
  a < b ? `${a}-${b}` : `${b}-${a}`;

/** The maze's connections as a set of edge keys, from a seeded depth-first walk. */
const carveMaze = (rng: Rng): Set<string> => {
  const connected = new Set<string>();
  const seen = new Set<number>([0]);
  const stack: RoomCell[] = [cellAt(0, 0)!];
  const steps: ReadonlyArray<readonly [number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (stack.length > 0) {
    const cell = stack[stack.length - 1];
    const options: RoomCell[] = [];
    for (const [di, dj] of steps) {
      const next = cellAt(cell.i + di, cell.j + dj);
      if (next !== null && !seen.has(next.index)) {
        options.push(next);
      }
    }
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const next = pick(rng, options);
    seen.add(next.index);
    connected.add(edgeKey(cell.index, next.index));
    stack.push(next);
  }
  // A few extra doors, so the maze has loops rather than a single path.
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const a = cellAt(i, j);
      if (a === null || rng() >= 0.14) {
        continue;
      }
      const neighbour = pick(
        rng,
        [cellAt(i + 1, j), cellAt(i, j + 1)].filter(
          (c): c is RoomCell => c !== null,
        ),
      );
      if (neighbour !== undefined) {
        connected.add(edgeKey(a.index, neighbour.index));
      }
    }
  }
  return connected;
};

/** How many floors a run descends before its boss. */
export const FLOORS_PER_RUN = 3;

/** Which theme the demo plays; the rest are table data until their art exists. */
export const DEFAULT_THEME: ThemeId = "yellow";

/**
 * Builds one floor of a run: its maze, its theme's enemies, its shop and
 * chests, and the shapes that lay the rooms and walls down. The same seed and
 * floor always return the same floor.
 *
 * @param seed - The run's deterministic seed.
 * @param floor - The floor number, 1 through `FLOORS_PER_RUN`.
 * @param themeId - Which theme's pool and torch colour the floor takes.
 */
export const buildFloor = (
  seed: number,
  floor: number,
  themeId: ThemeId = DEFAULT_THEME,
): FloorPlan => {
  const theme = THEMES[themeId];
  const rng = makeRng(seed * 2_654_435_761 + floor);
  const connected = carveMaze(rng);

  // The entrance is the northern middle cell, so the run starts at the hub's
  // south edge; the shop sits at the grid's centre and the exit at its far end.
  const entrance = cellAt(Math.floor(GRID / 2), 0)!;
  const shop = cellAt(Math.floor(GRID / 2), Math.floor(GRID / 2))!;
  const exit = cellAt(Math.floor(GRID / 2), GRID - 1)!;

  const rooms: RoomCell[] = [];
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      rooms.push(cellAt(i, j)!);
    }
  }

  // The grid's floor is graded flat in `hubShapes`, part of the boot plan, so
  // it exists in every streamed cell before a run's own shapes arrive; the
  // rooms below only lay a floor slab and walls over it.
  const shapes: PlanShape[] = [];
  for (const cell of rooms) {
    shapes.push(
      box(
        cell.x0,
        GROUND,
        cell.z0,
        cell.x0 + CELL,
        GROUND,
        cell.z0 + CELL,
        GREYSTONE,
      ),
    );
  }

  // Walls on every cell boundary, holed where the maze joins two cells.
  for (let i = 0; i <= GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const west = cellAt(i - 1, j);
      const east = cellAt(i, j);
      const open =
        west !== null &&
        east !== null &&
        connected.has(edgeKey(west.index, east.index));
      pushWall(shapes, CAVERN_X0 + i * CELL, "x", CAVERN_Z0 + j * CELL, open);
    }
  }
  for (let j = 0; j <= GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const north = cellAt(i, j - 1);
      const south = cellAt(i, j);
      const open =
        north !== null &&
        south !== null &&
        connected.has(edgeKey(north.index, south.index));
      pushWall(shapes, CAVERN_Z0 + j * CELL, "z", CAVERN_X0 + i * CELL, open);
    }
  }

  const enemySpawns: EnemySpawn[] = [];
  const chestSpawns: Vec2[] = [];
  const torchSpawns: Vec2[] = [];
  for (const cell of rooms) {
    // A torch at one corner of every room, and one at the other on deeper floors.
    torchSpawns.push({ x: cell.x0 * 2 + 6, z: cell.z0 * 2 + 6 });
    if (floor >= 2) {
      torchSpawns.push({
        x: (cell.x0 + CELL) * 2 - 6,
        z: (cell.z0 + CELL) * 2 - 6,
      });
    }
    if (cell.index === entrance.index || cell.index === shop.index) {
      continue;
    }
    const count = Math.min(5, 1 + floor + (rng() < 0.4 ? 1 : 0));
    for (let n = 0; n < count; n++) {
      const kind = pick(rng, theme.enemies);
      const mega = floor > 1 && rng() < 0.12 + floor * 0.05;
      enemySpawns.push({
        kind: mega ? theme.mega : kind,
        mega,
        x: (cell.x0 + randInt(rng, 4, CELL - 4)) * 2,
        z: (cell.z0 + randInt(rng, 4, CELL - 4)) * 2,
      });
    }
    if (cell.index !== exit.index && rng() < 0.22) {
      chestSpawns.push({
        x: (cell.x0 + CELL / 2) * 2,
        z: (cell.z0 + CELL / 2) * 2,
      });
    }
  }

  return {
    floor,
    theme,
    rooms,
    connections: [...connected],
    entrance: cellCentre(entrance),
    shop: cellCentre(shop),
    exit: cellCentre(exit),
    enemySpawns,
    chestSpawns,
    torchSpawns,
    shapes,
  };
};

/**
 * Pushes the wall standing on one cell boundary, leaving the middle open when
 * `open` joins the two cells across it.
 */
const pushWall = (
  shapes: PlanShape[],
  along: number,
  axis: "x" | "z",
  spanStart: number,
  open: boolean,
): void => {
  const centre = spanStart + CELL / 2;
  if (axis === "x") {
    if (!open) {
      shapes.push(
        box(
          along,
          GROUND + 1,
          spanStart,
          along,
          WALL_TOP,
          spanStart + CELL,
          GREYSTONE,
        ),
      );
      return;
    }
    shapes.push(
      box(
        along,
        GROUND + 1,
        spanStart,
        along,
        WALL_TOP,
        centre - DOOR_HALF - 1,
        GREYSTONE,
      ),
    );
    shapes.push(
      box(
        along,
        GROUND + 1,
        centre + DOOR_HALF,
        along,
        WALL_TOP,
        spanStart + CELL,
        GREYSTONE,
      ),
    );
    return;
  }
  if (!open) {
    shapes.push(
      box(
        spanStart,
        GROUND + 1,
        along,
        spanStart + CELL,
        WALL_TOP,
        along,
        GREYSTONE,
      ),
    );
    return;
  }
  shapes.push(
    box(
      spanStart,
      GROUND + 1,
      along,
      centre - DOOR_HALF - 1,
      WALL_TOP,
      along,
      GREYSTONE,
    ),
  );
  shapes.push(
    box(
      centre + DOOR_HALF,
      GROUND + 1,
      along,
      spanStart + CELL,
      WALL_TOP,
      along,
      GREYSTONE,
    ),
  );
};

/**
 * The hub's own fixed plan: a walled stone room around the spawn, and the flat
 * cavern site beside it graded ahead of the first run so a floor is already
 * underfoot whenever the player is moved onto one.
 */
export const hubShapes = (): PlanShape[] => {
  const shapes: PlanShape[] = [
    {
      kind: "surface",
      min: [-HUB_HALF - 2, GROUND, -HUB_HALF - 2],
      max: [HUB_HALF + 2, GROUND, HUB_HALF + 2],
      level: GROUND,
      depth: 4,
      id: GREYSTONE,
    },
    {
      kind: "surface",
      min: [CAVERN_X0 - 4, GROUND, CAVERN_Z0 - 4],
      max: [CAVERN_X0 + GRID * CELL + 4, GROUND, CAVERN_Z0 + GRID * CELL + 4],
      level: GROUND,
      depth: 4,
      id: GREYSTONE,
    },
    box(-HUB_HALF, GROUND, -HUB_HALF, HUB_HALF, GROUND, HUB_HALF, WOOD),
  ];
  // Four walls, each a solid run with no doorway: the hub is left only by the
  // cavern door, a prop the script answers.
  shapes.push(
    box(
      -HUB_HALF,
      GROUND + 1,
      -HUB_HALF,
      -HUB_HALF,
      WALL_TOP,
      HUB_HALF,
      GREYSTONE,
    ),
    box(
      HUB_HALF,
      GROUND + 1,
      -HUB_HALF,
      HUB_HALF,
      WALL_TOP,
      HUB_HALF,
      GREYSTONE,
    ),
    box(
      -HUB_HALF,
      GROUND + 1,
      -HUB_HALF,
      HUB_HALF,
      WALL_TOP,
      -HUB_HALF,
      GREYSTONE,
    ),
    box(
      -HUB_HALF,
      GROUND + 1,
      HUB_HALF,
      HUB_HALF,
      WALL_TOP,
      HUB_HALF,
      GREYSTONE,
    ),
  );
  return shapes;
};
