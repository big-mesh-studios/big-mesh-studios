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
  dispatch,
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
  type PropHandle,
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
/** How close the storm front must be to sting, in world units. */
const STORM_REACH = 6;
const STORM_DAMAGE = 2;
/** Milliseconds between storm bites. */
const STORM_BITE_MS = 700;
/** Where the storm front begins, far enough behind that a stationary player has time to set off. */
const STORM_START_Z = -200;
const ZOMBIE_CAP = 8;
const ZOMBIE_SPEED = 3.2;
const ZOMBIE_DAMAGE = 2;
const ZOMBIE_ATTACK_MS = 1_000;
const ZOMBIE_ATTACK_RANGE = 3;
/** How long after the trip begins the first mutant appears, in milliseconds. */
const ZOMBIE_GRACE_MS = 15_000;
/** How far ahead of the car a mutant materializes, in world units. */
const ZOMBIE_SPAWN_AHEAD = 40;

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
let stormZ = STORM_START_Z;
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
      ? "Dig / W to accelerate · A D or stick to steer · R to get out"
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
  yaw += steer * TURN_RATE * grip * dt;

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

/** Advances the storm and bites the driver if it has caught the car. */
const stormTick = (dt: number, now: number): void => {
  // The front only ever moves forward: a driver who outruns it keeps their
  // lead, and one who stops is eventually overtaken.
  stormZ += STORM_SPEED * dt;
  dispatch("field", {
    id: "storm",
    kind: "push",
    min: [x - 40, y - 8, stormZ - 30],
    max: [x + 40, y + 12, stormZ],
    vz: STORM_SPEED,
  });
  if (z - stormZ < STORM_REACH && now - lastBiteAt >= STORM_BITE_MS) {
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
// The desert the trip drives across: a sand skin over the region's terrain,
// with a road-width strip of greystone laid along it.
// ---------------------------------------------------------------------------
onPlan(() => {
  const b = blocks;
  return JSON.stringify([
    {
      kind: "surface",
      min: [-512, 0, -512],
      max: [512, 0, 512],
      depth: 2,
      id: b.sand,
    },
    {
      kind: "surface",
      min: [-4, 0, -512],
      max: [4, 0, 512],
      depth: 1,
      id: b.greystone,
    },
  ]);
});

onTick((_clockMs, events) => {
  const now = getNow();
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
    dispatch("item-define", {
      id: FUEL_ITEM,
      name: "Fuel",
      sprite: "",
      stackable: true,
    });
    dispatch("bind", { id: EXIT_BIND, key: "KeyR", label: "Exit car" });
    // Gas stations spaced down the road, each one a place to refuel.
    for (let i = 0; i < 6; i++) {
      const stationZ = 60 + i * 70;
      const stationX = 10;
      createProp({
        model: "lemonade-stand",
        id: "station-" + i,
        x: stationX,
        z: stationZ,
        y: getHeightAt(stationX, stationZ),
        height: 3,
        solid: true,
        name: "Gas station",
      });
    }
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
    } else if (
      event.kind === "entity-used" &&
      event.entityId !== undefined &&
      event.entityId.startsWith("station-")
    ) {
      fuel = FUEL_MAX;
      dispatch("toast", { player: event.producer, text: "Tank filled." });
      showReadouts();
    } else if (event.kind === "player-died") {
      if (driving) {
        exitCar();
      }
      dispatch("player-place", { player: "", x: 0, z: 0 });
    } else if (event.kind === "timer" && event.timerId === "trip-tick") {
      ticked = true;
    }
  }

  if (ticked) {
    const dt = TICK_MS / 1000;
    driveTick(dt);
    stormTick(dt, now);
    zombiesTick(dt, now);
    showReadouts();
    armTick();
  }
});
