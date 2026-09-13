// "Zombies: The Mansion" — the world's built-in Call of Duty zombies arena. A
// roofless mansion of five rooms fronts an open courtyard, and an endless
// horde of zombies breathes in through the windows and the courtyard gate.
// Money comes from kills and buys the doors deeper into the mansion and the
// guns racked against its walls; a lethal double-tap starts a whole run over —
// cash spent, weapons taken, breached boards and doors resealed — the way a
// player fills their hearts and starts the next round fresh in the dark.
//
// The arena is a fixed finite map rather than the procedurally materialized
// population `zombies.ts` spawns, so the horde has to be steered through it:
// every breach is a wall gap the structure plan leaves open and a scripted
// prop stands in, zombies tear those props down to get in, and a route graph
// over the rooms and the land around them decides whose path swings which way.
// Windows are the one kind of gap a player never exits through — an invisible
// barrier blocks the player alone, so the horde bashes in while the rooms stay
// cage walls, doors bought open being the only way out past them.
// The round, the money, and every open or sealed breach are all derived state —
// every peer folds the same replicated facts over the same shared clock and
// arrives at the same breaches, the same zombies, and the same prices.
import {
  blocks,
  createBarrier,
  createNpc,
  createProp,
  dispatch,
  getHeightAt,
  getNow,
  getPlayers,
  getSolidAt,
  getWaterAt,
  onPlan,
  onTick,
  type ModelsByName,
  type NpcHandle,
} from "voxelscape";

// The structure plan is drawn in LOD-0 voxel coordinates, so `GROUND` is a
// voxel row: a floor laid on row 30 tops out at world y 62, which is the
// walkable surface every prop and NPC below stands its feet on (`FLOOR`).
const GROUND = 30;
const FLOOR = 62;

/** How often the arena's shared clock steps its horde. */
const TICK_MS = 120;
/** Ground-height rise a step will not climb, in world units. */
const STEP_LIMIT = 1.3;
/** Height above the ground a wall or water is sampled at. */
const BODY_Y = 0.6;
/** How far a zombie stops from a sealed breach to start tearing at it. */
const BASH_REACH = 3.2;
/** How close a zombie has to be to an open gap to step through it. */
const CROSS_REACH = 1.1;
/** How far a landed hit shoves a zombie away from whoever swung. */
const KNOCKBACK = 1.2;
/** How close a zombie stands before a swing lands, and how often. */
const ATTACK_RADIUS = 2.4;
/** Closest a zombie ever stands to whoever it attacks, so a player cannot
 * walk into its model's own geometry mid-fight. */
const MIN_ATTACK_DISTANCE = 1.4;
const ATTACK_INTERVAL_MS = 1000;
/** A player body's hit points: two taps finish it. */
const PLAYER_HP = 6;
/** Half a player's body, so the second tap the mouth of the horde lands ends
 * the run the way a Call of Duty death does. */
const ZOMBIE_DAMAGE = PLAYER_HP / 2;
const MAX_ZOMBIES = 40;

/** How often a zombie swings at a breach, and the work one nominal swing does. */
const BASH_INTERVAL_MS = 900;
/** A window's boards, and a door's frame, as swings one zombie needs. */
const BOARD_SWINGS = 4;
const DOOR_SWINGS = 8;

/** What a kill pays, and what boarding a broken window costs. */
const WIN_KILL_BOUNTY = 100;
const BOARD_REPAIR_COST = 150;

/** The walkable band each part of the map answers for. */
type Region =
  | "a" // the foyer, deepest room
  | "b"
  | "c"
  | "d"
  | "e"
  | "court"
  | "outW"
  | "outN"
  | "outE";

/** One breach: a wall gap the plan leaves open and a prop stands in. */
interface Gap {
  id: string;
  kind: "window" | "door";
  /** Border regions, the edge the gap makes between them. */
  a: Region;
  b: Region;
  /** The pass-through centre of the gap, in world units. */
  x: number;
  z: number;
  /** What buying or boarding it costs; 0 for the open entrance gate. */
  price: number;
  /** Swings a lone zombie needs, so a crowd splits the work. */
  swings: number;
  /** Accumulated work since it last sealed, in milliseconds of bashing. */
  work: number;
  /** How long a lone zombie must bash before this gap is open. */
  thresholdMs: number;
  /** The prop standing in the gap: a door to remove or a board to repair. */
  propId: string;
}

/** Whether a gap is currently open to the horde (and to players). */
const isOpen = (gap: Gap): boolean => gap.work >= gap.thresholdMs;

// A window is a one-voxel gap in the mansion's west wall — never a player's
// way through, only theirs: an invisible barrier stands in every window from
// boot, drawn nothing, so walls close to a player that stay open to the horde.
// A door is a one-voxel gap an interior wall spans, sealed by a solid `door`
// prop until some player pays for it or the horde chews it down. Positions are
// the pass-through centres, in world units, and mirror the gaps the structure
// plan leaves open voxel for voxel.
const GAPS: Gap[] = [
  // Mansion windows, west wall.
  {
    id: "w-e",
    kind: "window",
    a: "e",
    b: "outW",
    x: -8,
    z: -30,
    price: BOARD_REPAIR_COST,
    swings: BOARD_SWINGS,
    work: 0,
    thresholdMs: 0,
    propId: "board.w-e",
  },
  {
    id: "w-d",
    kind: "window",
    a: "d",
    b: "outW",
    x: -8,
    z: -20,
    price: BOARD_REPAIR_COST,
    swings: BOARD_SWINGS,
    work: 0,
    thresholdMs: 0,
    propId: "board.w-d",
  },
  {
    id: "w-c",
    kind: "window",
    a: "c",
    b: "outW",
    x: -8,
    z: -10,
    price: BOARD_REPAIR_COST,
    swings: BOARD_SWINGS,
    work: 0,
    thresholdMs: 0,
    propId: "board.w-c",
  },
  {
    id: "w-b",
    kind: "window",
    a: "b",
    b: "outW",
    x: -8,
    z: -2,
    price: BOARD_REPAIR_COST,
    swings: BOARD_SWINGS,
    work: 0,
    thresholdMs: 0,
    propId: "board.w-b",
  },
  {
    id: "w-a",
    kind: "window",
    a: "a",
    b: "outW",
    x: -8,
    z: 10,
    price: BOARD_REPAIR_COST,
    swings: BOARD_SWINGS,
    work: 0,
    thresholdMs: 0,
    propId: "board.w-a",
  },
  // Courtyard windows.
  {
    id: "w-n1",
    kind: "window",
    a: "court",
    b: "outN",
    x: -5,
    z: -71,
    price: BOARD_REPAIR_COST,
    swings: BOARD_SWINGS,
    work: 0,
    thresholdMs: 0,
    propId: "board.w-n1",
  },
  {
    id: "w-n2",
    kind: "window",
    a: "court",
    b: "outN",
    x: 5,
    z: -71,
    price: BOARD_REPAIR_COST,
    swings: BOARD_SWINGS,
    work: 0,
    thresholdMs: 0,
    propId: "board.w-n2",
  },
  {
    id: "w-cw",
    kind: "window",
    a: "court",
    b: "outW",
    x: -15,
    z: -61,
    price: BOARD_REPAIR_COST,
    swings: BOARD_SWINGS,
    work: 0,
    thresholdMs: 0,
    propId: "board.w-cw",
  },
  {
    id: "w-ce",
    kind: "window",
    a: "court",
    b: "outE",
    x: 19,
    z: -49,
    price: BOARD_REPAIR_COST,
    swings: BOARD_SWINGS,
    work: 0,
    thresholdMs: 0,
    propId: "board.w-ce",
  },
  // The courtyard gate yawns open from the start; every interior door sells.
  {
    id: "d-court",
    kind: "door",
    a: "court",
    b: "e",
    x: -1,
    z: -35,
    price: 0,
    swings: DOOR_SWINGS,
    work: DOOR_SWINGS * BASH_INTERVAL_MS,
    thresholdMs: 0,
    propId: "door.court",
  },
  {
    id: "d-de",
    kind: "door",
    a: "e",
    b: "d",
    x: 1,
    z: -25,
    price: 1250,
    swings: DOOR_SWINGS,
    work: 0,
    thresholdMs: 0,
    propId: "door.de",
  },
  {
    id: "d-cd",
    kind: "door",
    a: "d",
    b: "c",
    x: 1,
    z: -15,
    price: 1000,
    swings: DOOR_SWINGS,
    work: 0,
    thresholdMs: 0,
    propId: "door.cd",
  },
  {
    id: "d-bc",
    kind: "door",
    a: "c",
    b: "b",
    x: 1,
    z: -5,
    price: 750,
    swings: DOOR_SWINGS,
    work: 0,
    thresholdMs: 0,
    propId: "door.bc",
  },
  {
    id: "d-ab",
    kind: "door",
    a: "b",
    b: "a",
    x: 1,
    z: 3,
    price: 500,
    swings: DOOR_SWINGS,
    work: 0,
    thresholdMs: 0,
    propId: "door.ab",
  },
];
for (const gap of GAPS) {
  gap.thresholdMs = gap.swings * BASH_INTERVAL_MS;
}
// The entrance gate is the one gap that starts standing open: its doors were
// bolted back before the horde came, so no price buys it and no reset seals it.
const OPEN_ENTRANCE = "d-court";

/** The box of each window gap that closes to a player forever, in world units,
 *  from the floor to well above the lintel. The wall the window pierces spans
 *  one axis (x on the west and courtyard-east walls, z on the courtyard-north)
 *  and the one-voxel opening spans the other, both halves of the same gap. */
const WINDOW_BARRIERS: Record<
  string,
  { minX: number; maxX: number; minZ: number; maxZ: number }
> = {
  "w-e": { minX: -8, maxX: -6, minZ: -30, maxZ: -28 },
  "w-d": { minX: -8, maxX: -6, minZ: -20, maxZ: -18 },
  "w-c": { minX: -8, maxX: -6, minZ: -10, maxZ: -8 },
  "w-b": { minX: -8, maxX: -6, minZ: -2, maxZ: 0 },
  "w-a": { minX: -8, maxX: -6, minZ: 10, maxZ: 12 },
  "w-n1": { minX: -6, maxX: -4, minZ: -72, maxZ: -70 },
  "w-n2": { minX: 4, maxX: 6, minZ: -72, maxZ: -70 },
  "w-cw": { minX: -16, maxX: -14, minZ: -62, maxZ: -60 },
  "w-ce": { minX: 18, maxX: 20, minZ: -50, maxZ: -48 },
};

/** A damage-scaled, speed-scaled zombie alive in the arena. */
interface Zombie {
  npc: NpcHandle<ModelsByName["zombie"]>;
  hp: number;
  speed: number;
  region: Region;
  ownerDid: string;
  lastAttackAt: number;
  lastBroadcastAt: number;
  wanderHeading: number;
  wanderUntil: number;
  /** Where the zombie first stood; a lost aim comes back around it. */
  homeX: number;
  homeZ: number;
}

/** A place a round's supply line pours zombies from, in world units. */
interface SpawnSite {
  x: number;
  z: number;
}

/** A racked gun a player can buy; holding it is a weapon (ADR 0051). */
interface Gun {
  id: string;
  name: string;
  cost: number;
  damage: number;
  reach: number;
  fireIntervalMs: number;
  sprite: string;
  rackId: string;
  rackX: number;
  rackZ: number;
}

const GUNS: Gun[] = [
  {
    id: "pistol",
    name: "Starter Pistol",
    cost: 500,
    damage: 6,
    reach: 34,
    fireIntervalMs: 240,
    sprite: "bowArrow.png",
    rackId: "rack.pistol",
    rackX: -4,
    rackZ: 8,
  },
  {
    id: "rifle",
    name: "Vault Rifle",
    cost: 1000,
    damage: 10,
    reach: 44,
    fireIntervalMs: 130,
    sprite: "axe_diamond.png",
    rackId: "rack.rifle",
    rackX: 6,
    rackZ: -1,
  },
  {
    id: "shotgun",
    name: "Room Sweeper",
    cost: 1500,
    damage: 16,
    reach: 30,
    fireIntervalMs: 850,
    sprite: "hammer_gold.png",
    rackId: "rack.shotgun",
    rackX: 6,
    rackZ: -20,
  },
  {
    id: "machine",
    name: "Horde Grinder",
    cost: 2500,
    damage: 9,
    reach: 40,
    fireIntervalMs: 80,
    sprite: "sword_gold.png",
    rackId: "rack.machine",
    rackX: 0,
    rackZ: -52,
  },
];

/** Where the round's supply line pours zombies from: one wing per wall. */
const SPAWN_SITES: SpawnSite[] = [
  { x: -26, z: -1 }, // out west, toward the foyer windows
  { x: -26, z: -30 }, // out west, toward the west rooms
  { x: -2, z: -84 }, // out north, over the courtyard wall
  { x: 26, z: -49 }, // out east, around the east wall
];

const WAVE_BASE = 12;
const WAVE_PER_ROUND = 6;
const ROUND_START_BREATHER_MS = 2500;
const ROUND_BETWEEN_MS = 6000;
const SPAWN_INTERVAL_MS = 1500;
/** How long the eerie holds before a fresh wave's first zombie materializes. */
const WAVE_EERIE_LEAD_MS = 2500;

let started = false;
const zombies = new Map<string, Zombie>();
/** Money each player holds, keyed by the DID the events were authored as. */
const money: Record<string, number> = {};
/** Which guns each player owns, so buying a gun you hold is a no-op. */
const owned: Record<string, Set<string>> = {};

let round = 1;
let wavePending = 0;
let waveAlive = 0;
/** Whether the current round's wave has already been let out, so the arena's
 * first empty moment starts round one rather than skipping ahead of it. */
let poured = false;
let nextWaveAt = 0;
let nextSpawnAt = 0;
let spawnSeq = 0;
let lastCashShown = -1;
let lastRoundShown = -1;

const dist2D = (ax: number, az: number, bx: number, bz: number): number =>
  Math.hypot(ax - bx, az - bz);

/**
 * The band of the map a point stands in, by where the walls actually run: the
 * courtyard shell beyond the mansion in every direction, then the five rooms
 * the interior walls split the mansion into, west to east.
 */
function regionFor(x: number, z: number): Region {
  if (z < -71.5) {
    return "outN";
  }
  if (x < -15.5 || (x < -8 && z < -36) || (x < -8 && z >= 16)) {
    return "outW";
  }
  if (
    x > 17.5 ||
    (x > 8 && z >= -36 && z < 16) ||
    (x > 8 && z < -36 && z >= -71.5)
  ) {
    return "outE";
  }
  if (z < -36) {
    return "court";
  }
  if (x < -8) {
    return "outW";
  }
  if (x > 8) {
    return "outE";
  }
  if (z < -25) {
    return "e";
  }
  if (z < -15) {
    return "d";
  }
  if (z < -5) {
    return "c";
  }
  if (z < 3) {
    return "b";
  }
  return "a";
}

/**
 * The gap a route from `from` to `to` must cross first, or null when the two
 * regions border directly. Broad, because the graph is nine nodes.
 */
function nextGap(from: Region, to: Region): Gap | null {
  if (from === to) {
    return null;
  }
  const came = new Map<Region, Gap>();
  const seen = new Set<Region>([from]);
  const queue: Region[] = [from];
  while (queue.length > 0) {
    const here = queue.shift()!;
    for (const gap of GAPS) {
      const across = gap.a === here ? gap.b : gap.b === here ? gap.a : null;
      if (across === null || seen.has(across)) {
        continue;
      }
      seen.add(across);
      came.set(across, gap);
      if (across === to) {
        // Walk the parent chain back to the gap `from` actually steps into.
        let at: Region = to;
        while (true) {
          const gapHere = came.get(at)!;
          const previous = gapHere.a === at ? gapHere.b : gapHere.a;
          if (previous === from) {
            return gapHere;
          }
          at = previous;
        }
      }
      queue.push(across);
    }
  }
  return null;
}

/** Whether stepping from the current ground to (x, z) is walkable: not too
 * steep a rise, and neither solid nor water at body height once there. */
function walkable(fromX: number, fromZ: number, x: number, z: number): boolean {
  const ground = getHeightAt(x, z);
  if (Math.abs(ground - getHeightAt(fromX, fromZ)) > STEP_LIMIT) {
    return false;
  }
  const y = ground + BODY_Y;
  return !getSolidAt(x, y, z) && !getWaterAt(x, y, z);
}

/** Moves (x, z) one step toward yaw at speed, sliding along whichever axis
 * is still free when the direct line is blocked. */
function moveStep(
  x: number,
  z: number,
  yaw: number,
  speed: number,
  dtMs: number,
): { x: number; z: number } {
  const dt = dtMs / 1000;
  const stepX = Math.sin(yaw) * speed * dt;
  const stepZ = Math.cos(yaw) * speed * dt;
  let nx = x;
  let nz = z;
  if (walkable(x, z, x + stepX, z)) {
    nx = x + stepX;
  }
  if (walkable(x, z, x, z + stepZ)) {
    nz = z + stepZ;
  }
  return { x: nx, z: nz };
}

const aside = (gap: Gap, from: Region): Region =>
  gap.a === from ? gap.b : gap.a;

/** Where a zombie lands after being shoved away from whoever struck it,
 * unless the shove would land it in a wall or water, which would only stick
 * it there. */
function knockedBack(
  x: number,
  z: number,
  attacker: { x: number; z: number },
): { x: number; z: number } {
  const dx = x - attacker.x;
  const dz = z - attacker.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 1e-6) {
    return { x, z };
  }
  const push = Math.min(KNOCKBACK, distance);
  const nx = x + (dx / distance) * push;
  const nz = z + (dz / distance) * push;
  return walkable(x, z, nx, nz) ? { x: nx, z: nz } : { x, z };
}

/** One run of a wall, split around the gaps the plan leaves open, three
 * voxels tall from the floor line up — tall enough to answer a lintel. */
function splitWall(
  id: number,
  fixed: number,
  axis: "x" | "z",
  from: number,
  to: number,
  gaps: Array<[number, number]>,
): unknown[] {
  const box = (lo: number, hi: number): unknown =>
    axis === "x"
      ? {
          kind: "box",
          min: [lo, GROUND + 1, fixed],
          max: [hi, GROUND + 4, fixed],
          id,
        }
      : {
          kind: "box",
          min: [fixed, GROUND + 1, lo],
          max: [fixed, GROUND + 4, hi],
          id,
        };
  const out: unknown[] = [];
  let cursor = from;
  for (const [lo, hi] of gaps) {
    if (lo > cursor) {
      out.push(box(cursor, lo - 1));
    }
    cursor = Math.max(cursor, hi + 1);
  }
  if (to >= cursor) {
    out.push(box(cursor, to));
  }
  return out;
}

onPlan(() => {
  const b = blocks;
  const shapes: unknown[] = [
    { kind: "box", min: [-80, 0, -80], max: [80, GROUND - 1, 80], id: b.dirt },
    {
      kind: "box",
      min: [-80, GROUND, -80],
      max: [80, GROUND, 80],
      id: b.grass,
    },
    // raze whatever the terrain raised over the whole arena
    { kind: "box", min: [-80, GROUND + 1, -80], max: [80, 160, 80], id: 0 },
    // the stone floor the mansion and courtyard stand on
    {
      kind: "box",
      min: [-4, GROUND, -18],
      max: [4, GROUND, 8],
      id: b.greystone,
    },
    {
      kind: "box",
      min: [-8, GROUND, -36],
      max: [9, GROUND, -18],
      id: b.greystone,
    },
    // the mansion shell, west wall holed by every room's window
    ...splitWall(b.brick, -4, "z", -18, 8, [
      [-15, -15],
      [-10, -10],
      [-5, -5],
      [-1, -1],
      [5, 5],
    ]),
    ...splitWall(b.brick, 4, "z", -18, 8, []),
    // the courtyard gate in the mansion's own north wall, and the solid south
    ...splitWall(b.brick, -18, "x", -4, 4, [[-1, -1]]),
    ...splitWall(b.brick, 8, "x", -4, 4, []),
    // the interior walls, each holed by its one sellable doorway
    ...splitWall(b.brick, -13, "x", -4, 4, [[0, 0]]),
    ...splitWall(b.brick, -8, "x", -4, 4, [[0, 0]]),
    ...splitWall(b.brick, -3, "x", -4, 4, [[0, 0]]),
    ...splitWall(b.brick, 1, "x", -4, 4, [[0, 0]]),
    // the courtyard's own walls, holed by its windows
    ...splitWall(b.greystone, -8, "z", -36, -18, [[-31, -31]]),
    ...splitWall(b.greystone, 9, "z", -36, -18, [[-25, -25]]),
    ...splitWall(b.greystone, -36, "x", -8, 9, [
      [-3, -2],
      [2, 3],
    ]),
  ];
  return JSON.stringify(shapes);
});

function say(text: string): void {
  dispatch("toast", { player: "", text });
}

function stash(owner: string): number {
  return money[owner] ?? 0;
}

function spend(owner: string, cost: number): void {
  money[owner] = (money[owner] ?? 0) - cost;
}

function has(owner: string): Set<string> {
  let set = owned[owner];
  if (set === undefined) {
    set = new Set();
    owned[owner] = set;
  }
  return set;
}

/** Refreshes the local player's money HUD whenever it actually changed. */
function showCash(): void {
  const held = stash("");
  if (held !== lastCashShown) {
    lastCashShown = held;
    dispatch("hud", {
      player: "",
      id: "cash",
      kind: "text",
      label: "",
      text: `$${held}`,
    });
  }
}

/** Refreshes the local player's round HUD whenever the round changes. */
function showRound(): void {
  if (round !== lastRoundShown) {
    lastRoundShown = round;
    dispatch("hud", {
      player: "",
      id: "round",
      kind: "text",
      label: "",
      text: `ROUND ${round}`,
    });
  }
}

/** The arena's furniture and racks, stood once at boot. */
function standTheSet(): void {
  createProp({ id: "table.e", model: "table", x: 5, z: -30, solid: true });
  createProp({ id: "bench.c", model: "bench", x: -5, z: -10, solid: true });
  createProp({ id: "trash.d", model: "trash", x: 6, z: -20, solid: true });
  createProp({
    id: "poster.a",
    model: "poster",
    x: 6,
    z: 10,
    solid: false,
    height: 3,
  });
  createProp({ id: "bench.court", model: "bench", x: 9, z: -50, solid: true });
  for (const gun of GUNS) {
    createProp({
      id: gun.rackId,
      model: "shelf",
      x: gun.rackX,
      z: gun.rackZ,
      solid: true,
      height: 3,
    });
  }
  // Windows the player can never slip through, whatever breaks open beside
  // them — the horde keeps pouring through the same gaps its own side made.
  for (const gap of GAPS) {
    if (gap.kind === "window") {
      const box = WINDOW_BARRIERS[gap.id];
      createBarrier({
        id: "bar." + gap.id,
        min: [box.minX, FLOOR, box.minZ],
        max: [box.maxX, 80, box.maxZ],
      });
    }
  }
}

/** Every board over its window and every sealed door standing in its frame,
 * waited on at boot and re-waited after a death strips the arena bare. */
function standBreaches(): void {
  for (const gap of GAPS) {
    if (gap.kind === "window") {
      createProp({
        id: gap.propId,
        model: "bench",
        x: gap.x,
        z: gap.z,
        solid: false,
        height: 2,
      });
    } else if (gap.id !== OPEN_ENTRANCE && !isOpen(gap)) {
      createProp({
        id: gap.propId,
        model: "door",
        x: gap.x,
        z: gap.z,
        solid: true,
        height: 8,
      });
    }
  }
}

function armTick(): void {
  dispatch("timer", { id: "zm-tick", afterMs: TICK_MS });
}

/** How many zombies the current round pours out, under the arena's cap. */
function waveTarget(): number {
  return Math.min(WAVE_BASE + (round - 1) * WAVE_PER_ROUND, MAX_ZOMBIES);
}

/** Spawns zombies of the current wave under the cap, at a rotating site. */
function spawnZombies(now: number): void {
  while (wavePending > 0 && zombies.size < MAX_ZOMBIES && now >= nextSpawnAt) {
    const site = SPAWN_SITES[spawnSeq % SPAWN_SITES.length];
    spawnSeq += 1;
    const id = `zombie-${round}-${spawnSeq}`;
    const pose = { x: site.x, z: site.z, yaw: Math.random() * Math.PI * 2 };
    const npc = createNpc({
      model: "zombie",
      id,
      x: pose.x,
      z: pose.z,
      name: "Zombie",
      yaw: pose.yaw,
      y: getHeightAt(pose.x, pose.z),
    });
    zombies.set(id, {
      npc,
      hp: 20 + (round - 1) * 8,
      speed: Math.min(2.4 + (round - 1) * 0.15, 4.6),
      region: regionFor(pose.x, pose.z),
      ownerDid: "",
      lastAttackAt: 0,
      lastBroadcastAt: now,
      wanderHeading: 0,
      wanderUntil: 0,
      homeX: pose.x,
      homeZ: pose.z,
    });
    wavePending -= 1;
    waveAlive += 1;
    nextSpawnAt = now + SPAWN_INTERVAL_MS;
  }
}

/**
 * Advances one zombie one tick. Every peer runs this from the same live
 * positions, but ownership decides whose result actually counts: the nearest
 * player owns it, kept while the current owner is only marginally farther.
 * Only the owner moves it and broadcasts the live update — a peer that isn't
 * the owner leaves its copy where the last broadcast put it, which every peer
 * still folds over identically.
 */
function stepZombie(
  z: Zombie,
  players: Array<{ did: string; x: number; y: number; z: number }>,
  now: number,
): void {
  if (players.length === 0) {
    return;
  }
  const self = players[0].did;
  let x = z.npc.x;
  let zPos = z.npc.z;

  let nearest = players[0];
  let nearestDistance = dist2D(x, zPos, nearest.x, nearest.z);
  for (let i = 1; i < players.length; i++) {
    const p = players[i];
    const d = dist2D(x, zPos, p.x, p.z);
    if (d < nearestDistance) {
      nearestDistance = d;
      nearest = p;
    }
  }
  let owner = nearest;
  if (z.ownerDid !== "" && z.ownerDid !== nearest.did) {
    const current = players.find((p) => p.did === z.ownerDid);
    if (current !== undefined) {
      const currentDistance = dist2D(x, zPos, current.x, current.z);
      if (currentDistance <= nearestDistance + 2) {
        owner = current;
      }
    }
  }
  z.ownerDid = owner.did;
  if (owner.did !== self) {
    return;
  }

  const ownerX = owner.x;
  const ownerZ = owner.z;

  // A swing lands at arm's reach; two taps carry `PLAYER_HP` and end a run,
  // so the horde's pacing leans on that window rather than a raw dps dial.
  if (nearestDistance <= ATTACK_RADIUS) {
    const yaw = Math.atan2(ownerX - x, ownerZ - zPos);
    if (nearestDistance < MIN_ATTACK_DISTANCE) {
      const moved = moveStep(x, zPos, yaw + Math.PI, z.speed, TICK_MS);
      x = moved.x;
      zPos = moved.z;
    }
    if (now - z.lastAttackAt >= ATTACK_INTERVAL_MS) {
      z.lastAttackAt = now;
      dispatch("sound", { player: "", name: "zombie-growl" });
      dispatch("player-damage", {
        player: owner.did,
        amount: ZOMBIE_DAMAGE,
        source: z.npc.id,
      });
    }
    z.npc.move({
      x,
      z: zPos,
      yaw,
      y: getHeightAt(x, zPos),
      live: true,
    });
    return;
  }

  // Otherwise the zombie walks the route graph toward the player's region:
  // each leg ends at the first gap on the way, which it bashes while sealed
  // and steps through once the horde has opened it.
  const playerRegion = regionFor(ownerX, ownerZ);
  const goal = nextGap(z.region, playerRegion);
  let targetX = ownerX;
  let targetZ = ownerZ;
  let moving = true;
  if (goal !== null) {
    const open = isOpen(goal);
    targetX = goal.x;
    targetZ = goal.z;
    const gapDistance = dist2D(x, zPos, goal.x, goal.z);
    if (open && gapDistance <= CROSS_REACH) {
      z.region = aside(goal, z.region);
      moving = false;
    } else if (!open && gapDistance <= BASH_REACH) {
      moving = false; // bashing, not walking — the gap keeps its own work
    }
  }
  if (moving) {
    const heading = Math.atan2(targetX - x, targetZ - zPos);
    const moved = moveStep(x, zPos, heading, z.speed, TICK_MS);
    x = moved.x;
    zPos = moved.z;
  }

  const dueToBroadcast =
    nearestDistance > ATTACK_RADIUS || now - z.lastBroadcastAt >= 2000;
  if (dueToBroadcast) {
    z.lastBroadcastAt = now;
  }
  z.npc.move({
    x,
    z: zPos,
    yaw: Math.atan2(ownerX - x, ownerZ - zPos),
    y: getHeightAt(x, zPos),
    live: dueToBroadcast,
  });
}

/** Removes the prop standing in a breach once the horde has bashed it open,
 * so the breach reads as a hole rather than a still-standing board. */
function clearBreach(gap: Gap): void {
  dispatch("prop-remove", { id: gap.propId });
}

/** Boards a broken window back up and restores its sealed door, the price the
 * horde's owners paid by dying. */
function sealBreach(gap: Gap): void {
  if (gap.kind === "window") {
    createProp({
      id: gap.propId,
      model: "bench",
      x: gap.x,
      z: gap.z,
      solid: false,
      height: 2,
    });
  } else if (gap.id !== OPEN_ENTRANCE) {
    createProp({
      id: gap.propId,
      model: "door",
      x: gap.x,
      z: gap.z,
      solid: true,
      height: 8,
    });
  }
}

onTick((_clockMs, events) => {
  const now = getNow();
  const players = getPlayers();
  // The console stamps the local player's own facts with "" (the wire's local
  // author), which is also what the test harness feeds in — so a fact is
  // "mine" when its producer is either that local key or my own DID.
  const me = players[0]?.did ?? "";
  const isMine = (producer: string): boolean =>
    producer === "" || producer === me;

  if (!started) {
    started = true;
    // Pinned night, the foyer as the respawn, and the guns the racks sell —
    // the pistol already in hand, whole for the first round.
    dispatch("time", { seconds: 13_800, speed: 0 });
    dispatch("player-checkpoint", { player: "", x: 0, z: 8, y: FLOOR });
    lastCashShown = 0;
    lastRoundShown = 1;
    dispatch("hud", {
      player: "",
      id: "cash",
      kind: "text",
      label: "",
      text: "$0",
    });
    dispatch("hud", {
      player: "",
      id: "round",
      kind: "text",
      label: "",
      text: "ROUND 1",
    });
    for (const gun of GUNS) {
      dispatch("item-define", {
        id: gun.id,
        name: gun.name,
        sprite: gun.sprite,
        stackable: false,
        weapon: {
          damage: gun.damage,
          reach: gun.reach,
          fireIntervalMs: gun.fireIntervalMs,
        },
      });
    }
    dispatch("item-give", { player: "", item: "pistol", count: 1 });
    dispatch("item-hold", { player: "", item: "pistol" });
    standTheSet();
    standBreaches();
    say(
      "Welcome to the Mansion. The horde comes in rounds — the windows break.",
    );
    nextWaveAt = now + ROUND_START_BREATHER_MS;
    armTick();
  }

  let ticked = false;
  for (const e of events) {
    if (e.kind === "timer" && e.timerId === "zm-tick") {
      ticked = true;
    } else if (
      e.kind === "entity-hit" &&
      e.entityId !== undefined &&
      e.amount !== undefined
    ) {
      const target = zombies.get(e.entityId);
      if (target !== undefined) {
        target.hp -= e.amount;
        if (target.hp <= 0) {
          zombies.delete(target.npc.id);
          target.npc.die();
          waveAlive -= 1;
          dispatch("sound", { player: "", name: "zombie-die" });
          if (waveAlive === 0 && wavePending === 0) {
            dispatch("sound", { player: "", name: "wave-complete" });
          }
          spend(e.producer, -WIN_KILL_BOUNTY);
          if (isMine(e.producer)) {
            say(`A zombie falls — +$${WIN_KILL_BOUNTY}.`);
          }
          showCash();
        } else {
          const pushed = knockedBack(target.npc.x, target.npc.z, {
            x: e.attackerX ?? target.npc.x,
            z: e.attackerZ ?? target.npc.z,
          });
          target.npc.move({
            x: pushed.x,
            z: pushed.z,
            y: getHeightAt(pushed.x, pushed.z),
            live: true,
          });
        }
      }
    } else if (e.kind === "entity-used" && e.entityId !== undefined) {
      if (zombies.has(e.entityId)) {
        dispatch("toast", { player: e.producer, text: "The zombie snarls." });
        continue;
      }
      const gap = GAPS.find((g) => g.propId === e.entityId);
      if (gap !== undefined) {
        if (gap.kind === "window") {
          if (gap.work === 0) {
            dispatch("toast", {
              player: e.producer,
              text: "These boards are solid.",
            });
          } else if (stash(e.producer) >= BOARD_REPAIR_COST) {
            spend(e.producer, BOARD_REPAIR_COST);
            gap.work = 0;
            sealBreach(gap);
            dispatch("toast", {
              player: e.producer,
              text: `Boarded up — $${BOARD_REPAIR_COST}.`,
            });
            showCash();
          } else {
            dispatch("toast", {
              player: e.producer,
              text: `You need $${BOARD_REPAIR_COST}.`,
            });
          }
        } else if (gap.id === OPEN_ENTRANCE) {
          dispatch("toast", { player: e.producer, text: "The gate is open." });
        } else if (!isOpen(gap)) {
          const price = gap.price;
          if (stash(e.producer) >= price) {
            spend(e.producer, price);
            gap.work = gap.thresholdMs;
            clearBreach(gap);
            dispatch("toast", { player: e.producer, text: "Door open." });
            showCash();
          } else {
            dispatch("toast", {
              player: e.producer,
              text: `You need $${price}.`,
            });
          }
        }
      } else {
        const gun = GUNS.find((g) => g.rackId === e.entityId);
        if (gun !== undefined) {
          if (has(e.producer).has(gun.id)) {
            dispatch("toast", {
              player: e.producer,
              text: "You already carry that.",
            });
          } else if (stash(e.producer) >= gun.cost) {
            spend(e.producer, gun.cost);
            has(e.producer).add(gun.id);
            if (isMine(e.producer)) {
              dispatch("item-give", { player: "", item: gun.id, count: 1 });
              dispatch("item-hold", { player: "", item: gun.id });
            }
            dispatch("toast", {
              player: e.producer,
              text: `${gun.name} — got it.`,
            });
            showCash();
          } else {
            dispatch("toast", {
              player: e.producer,
              text: `You need $${gun.cost}.`,
            });
          }
        }
      }
    } else if (e.kind === "player-died") {
      // A full reset, the way a Call of Duty death runs its run over: cash
      // gone, weapons taken, every breach reboarded and resealed, the round
      // kept. The world itself stands the player back up at the foyer.
      if (!isMine(e.producer)) {
        continue;
      }
      money[e.producer] = 0;
      for (const gun of GUNS) {
        dispatch("item-take", { player: "", item: gun.id, count: 1 });
      }
      dispatch("item-hold", { player: "", item: "" });
      for (const gap of GAPS) {
        gap.work = gap.id === OPEN_ENTRANCE ? gap.thresholdMs : 0;
      }
      for (const gap of GAPS) {
        sealBreach(gap);
      }
      has(e.producer).clear();
      dispatch("item-give", { player: "", item: "pistol", count: 1 });
      dispatch("item-hold", { player: "", item: "pistol" });
      showCash();
      dispatch("toast", {
        player: "",
        text: `You died in round ${round}. Cash gone — the mansion boards itself up.`,
      });
    }
  }

  // The wave clock: refill after the breathing room, then pour the supply
  // line out under the cap, and rest between rounds once it is spent and dead.
  if (ticked) {
    if (wavePending === 0 && waveAlive === 0 && now >= nextWaveAt) {
      // The arena's first empty moment is round one's own wave, let out after
      // the opening breather; only a wave the player then cleared refills the
      // arena by raising the round.
      if (poured) {
        round += 1;
        showRound();
      }
      poured = true;
      dispatch("sound", { player: "", name: "wave-eerie" });
      wavePending = waveTarget();
      nextSpawnAt = now + WAVE_EERIE_LEAD_MS;
      nextWaveAt = now + ROUND_BETWEEN_MS;
    }
    if (wavePending > 0 && now >= nextSpawnAt) {
      spawnZombies(now);
    }

    // Sways and work the horde does on the breaches it reached, so every
    // peer's copy opens the same gap at the same shared-clock moment.
    for (const gap of GAPS) {
      if (isOpen(gap)) {
        continue;
      }
      let bashers = 0;
      for (const z of zombies.values()) {
        if (dist2D(z.npc.x, z.npc.z, gap.x, gap.z) <= BASH_REACH) {
          bashers += 1;
        }
      }
      if (bashers > 0) {
        gap.work += bashers * TICK_MS;
        if (gap.work >= gap.thresholdMs) {
          clearBreach(gap);
        }
      }
    }

    for (const z of zombies.values()) {
      stepZombie(z, players, now);
    }
    armTick();
  }
});
