// The "A Dusty Trip" demo's place script — a small port of the Roblox driving
// survival game. It stands a sand plain and a road at boot, puts a car on it,
// and lets a player get in and steer. Fuel burns as the car travels; a dust
// storm chases from behind and bites anyone it overtakes; gas stations along
// the road refill the tank, and the distance driven is shown as a readout.
//
// The car is a solid seat prop the script drives itself: every tick it reads
// the local player's held input, steps a simple arcade body, and moves the prop
// with the velocity that carries whoever is standing on it. The storm is a
// scalar that closes on the car; the readouts are `hud` effects. Mutants are
// NPCs that chase whoever is nearest.
//
// ALL voxel coordinates × 2 = world coordinates. The plan handler takes voxel
// coordinates; props, NPCs, fields, and the player take world coordinates.
import {
  blocks,
  createNpc,
  createProp,
  createDecal,
  createStorm,
  createStructure,
  dispatch,
  getEntity,
  getHeightAt,
  getInput,
  getNow,
  getPlayers,
  getSolidAt,
  log,
  onPlan,
  onTick,
  type ModelsByName,
  type NpcHandle,
  type PlanShape,
  type PropHandle,
  type StormHandle,
  type StructureHandle,
} from "voxelscape";

// ---------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------
/** How often the trip steps, in milliseconds. */
const TICK_MS = 40;
const CAR_HEIGHT = 3;
const MAX_SPEED = 22;
const REVERSE_SPEED = 8;
const ACCEL = 16;
const BRAKE = 30;
const DRAG = 0.9;
const TURN_RATE = 1.7;
const FUEL_MAX = 60;
/** Litres burned per world unit travelled. */
const FUEL_PER_UNIT = 0.02;
const STORM_SPEED = 16;
/** Half the storm front's width, in world units; the span it bites across. */
const STORM_HALF_WIDTH = 40;
/** How close the storm front must be to sting, in world units. */
const STORM_REACH = 6;
const STORM_DAMAGE = 2;
/** Milliseconds between storm bites. */
const STORM_BITE_MS = 700;
/** Where the storm front begins, far enough behind that a stationary player has time to set off. */
const STORM_START_Z = -200;
/** How far behind the car the dust wall is invisible, in world units. */
const STORM_VISIBLE = 180;
const ZOMBIE_CAP = 8;
const ZOMBIE_SPEED = 3.2;
const ZOMBIE_DAMAGE = 2;
const ZOMBIE_ATTACK_MS = 1_000;
const ZOMBIE_ATTACK_RANGE = 3;
/** How long after the trip begins the first mutant appears, in milliseconds. */
const ZOMBIE_GRACE_MS = 15_000;
/** How far ahead of the car a mutant materializes, in world units. */
const ZOMBIE_SPAWN_AHEAD = 40;
/** The flat LOD-0 voxel top the road is graded to, near the terrain's base. */
const ROAD_LEVEL = 32;
/** The first LOD-0 voxel above the graded ground a building may stand on. */
const FLOOR_Y = ROAD_LEVEL + 1;
/** World units per LOD-0 voxel; plan shapes are written in voxels, props in world units. */
const VOXEL = 2;
/** LOD-0 voxels between one structure site and the next (~80 world units). */
const STRUCTURE_CELL = 40;
/** The world distance between structure sites. */
const STRUCTURE_SPACING = STRUCTURE_CELL * VOXEL;
/** How many sites ahead of the car stay built. */
const STRUCTURE_AHEAD = 2;
/** How many sites behind the car stay built. */
const STRUCTURE_BEHIND = 1;
/** How far past the road edge a building starts, in LOD-0 voxels. */
const SHOULDER = 3;
/** The road's half-width in LOD-0 voxels, matching the road `onPlan` lays below. */
const HALF_ROAD = 4;
/** How far a graded pad reaches past its building, in LOD-0 voxels. */
const PAD_MARGIN = 2;
/** This place's own structure seed, so every site is the same for every peer. */
const STRUCTURE_SEED = 0x1d57a9e3;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const CAR = "car";
const EXIT_BIND = "exit-car";
const FUEL_ITEM = "fuel";

let started = false;
let car: PropHandle<ModelsByName["platform"]> | null = null;
let x = 0;
let z = 0;
let y = 0;
let yaw = 0;
let speed = 0;
let fuel = FUEL_MAX;
let travelled = 0;
let driving = false;
let lastUseHeld = false;
let stormZ = STORM_START_Z;
let storm: StormHandle | null = null;
let lastBiteAt = 0;
let nextZombieAt = 0;
let zombieSeq = 0;
const zombies = new Map<
  string,
  { npc: NpcHandle<ModelsByName["zombie"]>; lastAttackAt: number }
>();

/** Sends the car prop to its current pose, carrying riders at its velocity. */
const moveCar = (): void => {
  car?.move({
    x,
    z,
    y,
    yaw,
    vx: Math.sin(yaw) * speed,
    vy: 0,
    vz: Math.cos(yaw) * speed,
  });
};

/** Shows the driving hint, fuel, and distance readouts to the local player. */
const showReadouts = (): void => {
  dispatch("hud", {
    player: "",
    id: "hint",
    kind: "text",
    label: "Controls",
    text: driving
      ? "Dig / W to accelerate · A D or stick to steer · R or use to get out"
      : "Walk to the car and use it to drive",
  });
  dispatch("hud", {
    player: "",
    id: "fuel",
    kind: "bar",
    label: "Fuel",
    value: Math.max(0, fuel),
    max: FUEL_MAX,
  });
  dispatch("hud", {
    player: "",
    id: "trip",
    kind: "text",
    label: "Distance",
    text: Math.round(travelled) + " m",
  });
};

/** Puts the local player in the driver's seat and hands them the wheel. */
const enterCar = (): void => {
  driving = true;
  dispatch("player-control", { player: "", locked: true });
  dispatch("player-place", { player: "", x, z, y: y + CAR_HEIGHT });
  dispatch("camera-follow", {
    player: "",
    entityId: CAR,
    back: 9,
    up: 4.5,
    lookAhead: 6,
  });
  dispatch("toast", { player: "", text: "Press R to get out." });
};

/** Puts the driver down beside the car and gives them back their body. */
const exitCar = (): void => {
  driving = false;
  dispatch("player-control", { player: "", locked: false });
  dispatch("camera-follow-clear", { player: "" });
  dispatch("player-place", {
    player: "",
    x: x + Math.cos(yaw) * 3,
    z: z - Math.sin(yaw) * 3,
  });
};

/** Steps the car one tick from the local player's held input. */
const driveTick = (dt: number): void => {
  const input = getInput();
  // Keyboard and the touch joystick both drive the movement axes; the touch
  // dig button held is a second accelerator, so a phone player can steer with
  // the stick and hold dig to go.
  const forward =
    input !== null && (input.moveY > 0.2 || (driving && input.primaryHeld));
  const reversing = input !== null && input.moveY < -0.2;
  const throttle = !driving ? 0 : forward ? 1 : reversing ? -1 : 0;
  const steer = driving && input !== null ? input.moveX : 0;
  const powered = fuel > 0 && throttle !== 0;

  if (powered) {
    speed += throttle > 0 ? throttle * ACCEL * dt : throttle * BRAKE * dt;
  }
  speed -= speed * DRAG * dt;
  speed = Math.max(-REVERSE_SPEED, Math.min(MAX_SPEED, speed));

  const grip = 0.25 + Math.min(1, Math.abs(speed) / 8);
  // A positive `moveX` is the driver's right, but the follow camera puts +x on
  // their left, so a right turn is the way yaw decreases.
  yaw -= steer * TURN_RATE * grip * dt;

  const nx = x + Math.sin(yaw) * speed * dt;
  const nz = z + Math.cos(yaw) * speed * dt;
  const aheadGround = getHeightAt(nx, nz);
  if (getSolidAt(nx, aheadGround + 1, nz)) {
    speed = 0;
  } else {
    travelled += Math.hypot(nx - x, nz - z);
    fuel = Math.max(0, fuel - Math.hypot(nx - x, nz - z) * FUEL_PER_UNIT);
    x = nx;
    z = nz;
    y = aheadGround;
  }
  moveCar();

  // A driver who falls off is set back on the seat, so a fast corner never
  // strands them behind the car.
  if (driving) {
    const me = getPlayers()[0];
    if (me !== undefined && Math.hypot(me.x - x, me.z - z) > 5) {
      dispatch("player-place", { player: "", x, z, y: y + CAR_HEIGHT });
    }
  }
};

/** Advances the storm and bites a player the front has caught. */
const stormTick = (dt: number, now: number): void => {
  // The front only ever moves forward: a driver who outruns it keeps their
  // lead, and one who stops is eventually overtaken.
  stormZ += STORM_SPEED * dt;
  dispatch("field", {
    id: "storm",
    kind: "push",
    min: [x - STORM_HALF_WIDTH, y - 8, stormZ - 30],
    max: [x + STORM_HALF_WIDTH, y + 12, stormZ],
    vz: STORM_SPEED,
  });
  // The wall stays centred on the car and fades in as the front closes, so a
  // driver who outruns it sees the dust settle back over the horizon.
  const intensity = Math.max(0, Math.min(1, 1 - (z - stormZ) / STORM_VISIBLE));
  storm?.move({
    x,
    z: stormZ - 15,
    y: getHeightAt(x, stormZ),
    yaw: 0,
    width: STORM_HALF_WIDTH,
    height: 20,
    depth: 30,
    intensity,
  });
  // The bite follows the player, not the car: a driver whose car is swallowed
  // while they stand clear is not in the dust, and a passenger on foot inside
  // the front is.
  const me = getPlayers()[0];
  const inStorm =
    me !== undefined &&
    me.z - stormZ < STORM_REACH &&
    Math.abs(me.x - x) < STORM_HALF_WIDTH;
  if (inStorm && now - lastBiteAt >= STORM_BITE_MS) {
    lastBiteAt = now;
    dispatch("player-damage", {
      player: "",
      amount: STORM_DAMAGE,
      source: "storm",
    });
  }
};

/** Materializes a mutant ahead of the car and walks the tracked ones in. */
const zombiesTick = (dt: number, now: number): void => {
  if (zombies.size < ZOMBIE_CAP && now >= nextZombieAt) {
    nextZombieAt = now + 6_000;
    const zx = x + 8;
    const zz = z + ZOMBIE_SPAWN_AHEAD;
    const id = "mutant-" + zombieSeq++;
    zombies.set(id, {
      npc: createNpc({
        model: "zombie",
        id,
        x: zx,
        z: zz,
        y: getHeightAt(zx, zz),
        name: "Mutant",
      }),
      lastAttackAt: 0,
    });
  }
  const me = getPlayers()[0];
  if (me === undefined) {
    return;
  }
  for (const [, zombie] of zombies) {
    const dx = me.x - zombie.npc.x;
    const dz = me.z - zombie.npc.z;
    const distance = Math.hypot(dx, dz);
    if (distance < ZOMBIE_ATTACK_RANGE) {
      if (now - zombie.lastAttackAt >= ZOMBIE_ATTACK_MS) {
        zombie.lastAttackAt = now;
        dispatch("player-damage", {
          player: "",
          amount: ZOMBIE_DAMAGE,
          source: zombie.npc.id,
        });
      }
      continue;
    }
    const step = ZOMBIE_SPEED * dt;
    const heading = Math.atan2(dx, dz);
    const nx = zombie.npc.x + (dx / distance) * step;
    const nz = zombie.npc.z + (dz / distance) * step;
    zombie.npc.move({
      x: nx,
      z: nz,
      y: getHeightAt(nx, nz),
      yaw: heading,
      live: true,
    });
  }
};

/** Reorders the trip's tick timer. */
const armTick = (): void => {
  dispatch("timer", { id: "trip-tick", afterMs: TICK_MS });
};

// ---------------------------------------------------------------------------
// Roadside structures
//
// The buildings are structures the world stamps into its terrain, not props:
// the script asks for a named group of plan shapes per site, and the world
// regenerates only the cells the group reaches — so a building appears as the
// car drives toward it, and the ground under it comes back when it is left
// behind. The gas pumps and the food inside are props, placed and removed with
// their building. Every site is a pure function of its cell index, so two
// peers replaying the script build the same road.
// ---------------------------------------------------------------------------

/** The kinds of random building a site may draw. */
type StructureKind =
  | "petrol"
  | "garage"
  | "house"
  | "store"
  | "warehouse"
  | "water-tower"
  | "watchtower";

/** The kinds the seeded stream chooses among, apart from the petrol cadence. */
const STRUCTURE_KINDS: StructureKind[] = [
  "garage",
  "house",
  "store",
  "warehouse",
  "water-tower",
  "watchtower",
];

/** A prop a building stands: a pump, or a piece of food to pick up. */
interface StructureProp {
  model: "gas-pump" | "chips" | "cola" | "egg";
  /** Its local LOD-0 voxel x, measured from the building's road-side edge. */
  x: number;
  /** Its absolute LOD-0 voxel z. */
  z: number;
  height: number;
  name: string;
  /** The item it gives when used, or "" for a pump. */
  item: string;
}

/** What a built site stands for: the group the world stamps and the props on it. */
interface Structure {
  group: StructureHandle;
  props: Array<{ remove(): void }>;
}

const structures = new Map<number, Structure>();

/** A small, fast, seedable generator, deterministic from its seed. */
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable 32-bit hash of four integers, for a site's own stream. */
function hashInt(a: number, b: number, c: number, d: number): number {
  let h =
    (a ^
      Math.imul(b, 0x9e3779b1) ^
      Math.imul(c, 0x85ebca6b) ^
      Math.imul(d, 0xc2b2ae35)) |
    0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h ^= h >>> 16;
  return h | 0;
}

/** The LOD-0 voxel x a building's local `localX` sits at on `side`. */
const structureX = (localX: number, side: number): number =>
  side > 0 ? HALF_ROAD + SHOULDER + localX : -HALF_ROAD - SHOULDER - localX;

/** The world x a prop at local `localX` stands at on `side`. */
const structurePropX = (localX: number, side: number): number =>
  (structureX(localX, side) + 0.5) * VOXEL;

/** A box shape from a building's local coordinates on `side`. */
const structureBox = (
  side: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  id: number,
): PlanShape => {
  const ax = structureX(x0, side);
  const bx = structureX(x1, side);
  return {
    kind: "box",
    min: [Math.min(ax, bx), y0, z0] as [number, number, number],
    max: [Math.max(ax, bx), y1, z1] as [number, number, number],
    id,
  };
};

/** A hollow house from a building's local coordinates on `side`. */
const structureHouse = (
  side: number,
  x0: number,
  z0: number,
  w: number,
  h: number,
  d: number,
  wall: number,
  roof: number,
  floor: number,
): PlanShape => {
  const a = structureX(x0, side);
  const b = structureX(x0 + w - 1, side);
  return {
    kind: "house",
    at: [Math.min(a, b), FLOOR_Y, z0] as [number, number, number],
    size: [w, h, d] as [number, number, number],
    wall,
    roof,
    floor,
  };
};

/** A flat ground pad a site stands on, graded to the road's own level. */
const structurePad = (
  side: number,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
): PlanShape => {
  const a = structureX(x0, side);
  const b = structureX(x1, side);
  return {
    kind: "surface",
    min: [Math.min(a, b) - PAD_MARGIN, ROAD_LEVEL, z0 - PAD_MARGIN] as [
      number,
      number,
      number,
    ],
    max: [Math.max(a, b) + PAD_MARGIN, ROAD_LEVEL, z1 + PAD_MARGIN] as [
      number,
      number,
      number,
    ],
    level: ROAD_LEVEL,
    depth: 2,
    id: blocks.greystone,
  };
};

/** One to three pieces of food inside a building, from its own stream. */
const structureLoot = (z0: number, rng: () => number): StructureProp[] => {
  const items: Array<"chips" | "cola" | "egg"> = ["chips", "cola", "egg"];
  const props: StructureProp[] = [];
  const count = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < count; i++) {
    const model = items[Math.floor(rng() * items.length)];
    props.push({
      model,
      x: 2 + i,
      z: z0 + 1 + i * 2,
      height: 0.6,
      name: "Supplies",
      item: model,
    });
  }
  return props;
};

/** Every shape and prop a site of `kind` stands, in LOD-0 voxels. */
function structurePlan(
  kind: StructureKind,
  side: number,
  centerZ: number,
  rng: () => number,
): { shapes: PlanShape[]; props: StructureProp[] } {
  const brick = blocks.brick;
  const wood = blocks.wood;
  const stone = blocks.greystone;
  const floor = blocks.greystone;
  const shapes: PlanShape[] = [];
  const props: StructureProp[] = [];

  if (kind === "petrol") {
    const d = 12;
    const z0 = centerZ - Math.floor(d / 2);
    shapes.push(structurePad(side, 0, 15, z0, z0 + d - 1));
    shapes.push(structureHouse(side, 0, z0 + 2, 8, 5, 8, brick, brick, floor));
    // A canopy over the pumps: four posts and a flat roof beyond the store.
    for (const px of [10, 14]) {
      for (const pz of [2, 8]) {
        shapes.push(
          structureBox(
            side,
            px,
            px,
            FLOOR_Y,
            FLOOR_Y + 3,
            z0 + pz,
            z0 + pz,
            stone,
          ),
        );
      }
    }
    shapes.push(
      structureBox(
        side,
        9,
        15,
        FLOOR_Y + 4,
        FLOOR_Y + 4,
        z0 + 1,
        z0 + 9,
        stone,
      ),
    );
    props.push({
      model: "gas-pump",
      x: 11,
      z: z0 + 4,
      height: 4,
      name: "Fuel pump",
      item: "",
    });
    props.push({
      model: "gas-pump",
      x: 13,
      z: z0 + 6,
      height: 4,
      name: "Fuel pump",
      item: "",
    });
    props.push(...structureLoot(z0 + 2, rng));
    return { shapes, props };
  }

  if (kind === "water-tower") {
    const d = 8;
    const z0 = centerZ - Math.floor(d / 2);
    shapes.push(structurePad(side, 0, 7, z0, z0 + d - 1));
    for (const px of [0, 6]) {
      for (const pz of [0, 6]) {
        shapes.push(
          structureBox(
            side,
            px,
            px,
            FLOOR_Y,
            FLOOR_Y + 7,
            z0 + pz,
            z0 + pz,
            stone,
          ),
        );
      }
    }
    shapes.push(
      structureBox(
        side,
        1,
        6,
        FLOOR_Y + 8,
        FLOOR_Y + 11,
        z0 + 1,
        z0 + 6,
        stone,
      ),
    );
    return { shapes, props };
  }

  if (kind === "watchtower") {
    const d = 6;
    const z0 = centerZ - Math.floor(d / 2);
    shapes.push(structurePad(side, 0, 5, z0, z0 + d - 1));
    shapes.push(
      structureBox(side, 1, 4, FLOOR_Y, FLOOR_Y + 13, z0 + 1, z0 + 4, stone),
    );
    shapes.push(
      structureBox(side, 0, 5, FLOOR_Y + 14, FLOOR_Y + 14, z0, z0 + 5, wood),
    );
    props.push(...structureLoot(z0 + 1, rng));
    return { shapes, props };
  }

  // A plain building: a floor, walls, and a roof, sized by kind.
  const size =
    kind === "garage"
      ? { w: 12, d: 12, h: 5, wall: stone, roof: stone }
      : kind === "store"
        ? { w: 12, d: 9, h: 4, wall: wood, roof: brick }
        : kind === "warehouse"
          ? { w: 16, d: 12, h: 6, wall: stone, roof: stone }
          : { w: 8, d: 8, h: 5, wall: brick, roof: wood };
  const z0 = centerZ - Math.floor(size.d / 2);
  shapes.push(structurePad(side, 0, size.w - 1, z0, z0 + size.d - 1));
  shapes.push(
    structureHouse(
      side,
      0,
      z0,
      size.w,
      size.h,
      size.d,
      size.wall,
      size.roof,
      floor,
    ),
  );
  props.push(...structureLoot(z0 + 1, rng));
  return { shapes, props };
}

/** Builds the site `cell`, keyed by its own deterministic id. */
function spawnStructure(cell: number): void {
  const rng = mulberry32(hashInt(STRUCTURE_SEED, cell, 0, 0));
  // Every third site is a petrol station, so fuel is never far out of reach;
  // the rest draw a kind from the seeded stream.
  const kind: StructureKind =
    cell % 3 === 0
      ? "petrol"
      : STRUCTURE_KINDS[Math.floor(rng() * STRUCTURE_KINDS.length)];
  const side = rng() < 0.5 ? -1 : 1;
  const centerZ = cell * STRUCTURE_CELL;
  const { shapes, props } = structurePlan(kind, side, centerZ, rng);
  const id = "structure-" + cell;
  const group = createStructure({ id, shapes });
  const handles: Array<{ remove(): void }> = [];
  for (let i = 0; i < props.length; i++) {
    const prop = props[i];
    handles.push(
      createProp({
        model: prop.model,
        id: id + "-" + i,
        x: structurePropX(prop.x, side),
        z: (prop.z + 0.5) * VOXEL,
        y: (prop.item === "" ? FLOOR_Y : FLOOR_Y + 1) * VOXEL,
        height: prop.height,
        solid: false,
        name: prop.name,
        tags: prop.item === "" ? ["fuel"] : ["loot"],
        attributes: prop.item === "" ? { fuel: 1 } : { item: prop.item },
      }),
    );
  }
  structures.set(cell, { group, props: handles });
}

/** Keeps the sites around the car built, and drops the ones it has left. */
function structuresTick(): void {
  const first = Math.floor(
    (z - STRUCTURE_BEHIND * STRUCTURE_SPACING) / STRUCTURE_SPACING,
  );
  const last = Math.floor(
    (z + STRUCTURE_AHEAD * STRUCTURE_SPACING) / STRUCTURE_SPACING,
  );
  for (let cell = first; cell <= last; cell++) {
    if (!structures.has(cell)) {
      spawnStructure(cell);
    }
  }
  for (const [cell, structure] of structures) {
    if (cell < first || cell > last) {
      for (const prop of structure.props) {
        prop.remove();
      }
      structure.group.remove();
      structures.delete(cell);
    }
  }
}

// ---------------------------------------------------------------------------
// The desert the trip drives across: an endless sand skin over the region's
// terrain, with an endless road-width strip of greystone graded flat through
// it so the car never climbs a hill.
// ---------------------------------------------------------------------------
onPlan(() => {
  const b = blocks;
  return JSON.stringify([
    {
      kind: "surface",
      reachX: "infinite",
      reachZ: "infinite",
      depth: 2,
      id: b.sand,
    },
    {
      kind: "surface",
      min: [-4, 0, 0],
      max: [4, 0, 0],
      reachZ: "infinite",
      level: ROAD_LEVEL,
      depth: 1,
      id: b.greystone,
    },
  ]);
});

onTick((_clockMs, events) => {
  const now = getNow();
  const input = getInput();
  const wasDriving = driving;
  if (!started) {
    started = true;
    x = 0;
    z = 0;
    y = getHeightAt(x, z);
    fuel = FUEL_MAX;
    // The storm is minutes of driving away and the first mutant waits, so a
    // player has time to find the car and learn the controls before either
    // becomes a threat.
    stormZ = STORM_START_Z;
    lastBiteAt = now;
    nextZombieAt = now + ZOMBIE_GRACE_MS;
    car = createProp({
      model: "platform",
      id: CAR,
      x,
      z,
      y,
      height: CAR_HEIGHT,
      solid: true,
      seat: true,
      name: "Car",
    });
    // The dust wall itself: a broad billboard storm the ticks steer behind the
    // car, starting invisible far over the horizon.
    storm = createStorm({
      id: "storm",
      kind: "wall",
      x,
      z: STORM_START_Z - 15,
      y,
      yaw: 0,
      width: STORM_HALF_WIDTH,
      height: 20,
      depth: 30,
      intensity: 0,
    });
    dispatch("item-define", {
      id: FUEL_ITEM,
      name: "Fuel",
      sprite: "",
      stackable: true,
    });
    dispatch("bind", { id: EXIT_BIND, key: "KeyR", label: "Exit car" });
    for (const item of ["chips", "cola", "egg"]) {
      dispatch("item-define", {
        id: item,
        name: item,
        sprite: "",
        stackable: true,
      });
    }
    // The first sites around the car; the rest appear as it drives.
    structuresTick();
    createDecal({
      id: "start",
      kind: "ring",
      x,
      y: y + 0.1,
      z,
      color: [0.9, 0.7, 0.2],
      size: 4,
    });
    showReadouts();
    armTick();
    log("the trip begins");
  }

  let ticked = false;
  for (const event of events) {
    if (event.kind === "entity-used" && event.entityId === CAR && !driving) {
      enterCar();
    } else if (
      event.kind === "input" &&
      event.bindId === EXIT_BIND &&
      event.phase === "down" &&
      driving
    ) {
      exitCar();
    } else if (event.kind === "entity-used" && event.entityId !== undefined) {
      // What the used prop is comes from its own attributes, so a pump and a
      // piece of food are told apart without the script holding a second list.
      const used = getEntity(event.entityId);
      if (used?.attributes.fuel !== undefined) {
        fuel = FUEL_MAX;
        dispatch("toast", { player: event.producer, text: "Tank filled." });
        showReadouts();
      } else if (typeof used?.attributes.item === "string") {
        dispatch("item-give", {
          player: event.producer,
          item: used.attributes.item,
          count: 1,
        });
        dispatch("prop-remove", { id: event.entityId });
        dispatch("toast", {
          player: event.producer,
          text: "Supplies picked up.",
        });
      }
    } else if (event.kind === "player-died") {
      if (driving) {
        exitCar();
      }
      dispatch("player-place", { player: "", x: 0, z: 0 });
    } else if (event.kind === "timer" && event.timerId === "trip-tick") {
      ticked = true;
    }
  }

  // A touch player has no key to press, so the on-screen use button is the way
  // out of the seat. Its held state is read rather than the one-frame edge,
  // which a step between timer ticks would miss, and the rising edge keeps the
  // one press that got them in from also carrying them back out.
  const useHeld = input !== null && input.useHeld;
  if (wasDriving && driving && useHeld && !lastUseHeld) {
    exitCar();
  }
  lastUseHeld = useHeld;

  if (ticked) {
    const dt = TICK_MS / 1000;
    driveTick(dt);
    stormTick(dt, now);
    zombiesTick(dt, now);
    structuresTick();
    showReadouts();
    armTick();
  }
});
