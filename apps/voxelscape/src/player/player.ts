import { PerspectiveCamera, Vector3 } from "@random-mesh/rmsl/scene";
import type { Dim3 } from "../world/level-data";
import type { InputSnapshot } from "./create-input";

export interface Player {
  /** Cube centre, in world units. */
  position: Vector3;
  /** Heading, in radians; 0 faces +Z. */
  yaw: number;
  pitch: number;
  /** Horizontal velocity, in world units per second, ramped toward the input's target each frame. */
  vx: number;
  vz: number;
  vy: number;
  onGround: boolean;
  /**
   * Whether the player is flying: gravity is off, and forward/back follows
   * the full look direction (so looking up and holding W climbs). Toggled by
   * `/player:fly`.
   */
  flying: boolean;
  /**
   * This player's own copy of the movement settings, so `/player:speed` and
   * `/player:sensitivity` change one player rather than every player on the
   * page.
   */
  config: PlayerConfig;
}

/** The world as the player's physics sees it: three samplers and a boundary. */
export interface PlayerWorld {
  /**
   * The highest solid surface at or below (`x`, `y`, `z`), in world units,
   * or `-Infinity` where that column has none. Sampled at the player's feet,
   * so it never reports a surface more than the voxel they're standing in
   * above them.
   */
  groundHeightAt: (x: number, y: number, z: number) => number;
  /** Whether (`x`, `y`, `z`) is inside water; asked at the player's feet. */
  inWaterAt: (x: number, y: number, z: number) => boolean;
  /** Whether the voxel containing (`x`, `y`, `z`) blocks movement; water doesn't. */
  solidAt: (x: number, y: number, z: number) => boolean;
  /** Half the playable extent, in world units; horizontal movement clamps to it. */
  halfExtent: number;
}

export interface PlayerConfig {
  /** Player cube half-size, in world units (a 2x2x2 cube). */
  halfSize: number;
  /** Movement speed, in units per second. */
  speed: number;
  /** Horizontal acceleration/deceleration, in units per second squared — how fast move speed ramps up to (or down from) `speed`. */
  acceleration: number;
  /** Gravitational acceleration, in units per second squared. */
  gravity: number;
  /** Initial upward velocity on jumping, in units per second (the default is about a 2-unit-high jump). */
  jumpSpeed: number;
  /** Upward velocity while holding jump underwater, in units per second. */
  swimSpeed: number;
  /**
   * Upward velocity while holding jump against a wall, in units per second.
   * Without it a shaft dug straight down is a trap: its walls are vertical,
   * and a step up only ever clears one voxel.
   */
  climbSpeed: number;
  /** Look sensitivity, in radians per pixel of pointer movement. */
  lookSensitivity: number;
  maxPitch: number;
  /** Chase-camera distance behind the cube centre, in world units. */
  followBack: number;
  /** Chase-camera height above the cube centre when not in first person. */
  followUp: number;
  /** Eye height above the player's feet for the first-person camera. */
  eyeHeight: number;
  /**
   * Tallest rise the player is lifted onto while walking, in world units —
   * by default one LOD-0 voxel (`VOXEL_SIZE`). Anything taller is a wall or
   * an overhang's underside rather than a step, and is walked into, not onto.
   */
  stepHeight: number;
  /**
   * Half-width of the box that collides with voxels, in world units. Well
   * under `halfSize`, so the player is narrower than the cube drawn for
   * them: a mined tunnel is one voxel (2 units) wide, and a full-width box
   * would jam in it at the slightest misalignment. The slack also keeps the
   * first-person camera, which sits at the box's centre line, from ever
   * being pushed inside a wall.
   */
  collisionRadius: number;
}

export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  halfSize: 1,
  speed: 22.5,
  acceleration: 150,
  gravity: 45,
  jumpSpeed: 14,
  swimSpeed: 10,
  climbSpeed: 10,
  lookSensitivity: 0.0025,
  maxPitch: 1.35,
  followBack: 9,
  followUp: 2.5,
  eyeHeight: 0.9,
  stepHeight: 2,
  collisionRadius: 0.6,
};

export const createPlayer = (
  x: number,
  y: number,
  z: number,
  config: Partial<PlayerConfig> = {},
): Player => ({
  position: new Vector3(x, y, z),
  yaw: 0,
  pitch: 0,
  vx: 0,
  vz: 0,
  vy: 0,
  onGround: false,
  flying: false,
  config: { ...DEFAULT_PLAYER_CONFIG, ...config },
});

/** Steps `current` toward `target` by at most `maxDelta`. */
const moveTowards = (
  current: number,
  target: number,
  maxDelta: number,
): number => {
  const diff = target - current;
  if (Math.abs(diff) <= maxDelta) {
    return target;
  }
  return current + Math.sign(diff) * maxDelta;
};

/**
 * Where the ground is sampled, as unit offsets from the player's centre:
 * the centre itself plus the four sides of the collision box, so what holds
 * them up is read across their whole footprint rather than at one point.
 */
const FOOTPRINT_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Samples the ground surface across a small footprint under the player
 * instead of a single point, and returns whichever candidate is closest to
 * their feet — not simply the highest or the centre one. Candidates more
 * than a step above the feet are discarded as walls.
 *
 * In a passage only one voxel wide the exact centre point can drift onto the
 * wall's column instead of the tunnel's own open one, and taking that reading
 * uncritically would stand the player on whatever surface the wall happens to
 * offer. Preferring the reading closest to where their feet already are
 * favors the tunnel floor they're walking along over a stray wall reading.
 *
 * @param feetY - Height of the player's feet; both the height each column is
 * scanned down from and the reference the closest candidate is measured against.
 * @returns The surface to stand on, or `-Infinity` when no sample offers one.
 */
const sampleGroundHeight = (
  config: PlayerConfig,
  groundHeightAt: (x: number, y: number, z: number) => number,
  x: number,
  feetY: number,
  z: number,
): number => {
  const highestStandable = feetY + config.stepHeight;
  let best = -Infinity;
  let bestDist = Infinity;
  for (const [ox, oz] of FOOTPRINT_OFFSETS) {
    const h = groundHeightAt(
      x + ox * config.collisionRadius,
      feetY,
      z + oz * config.collisionRadius,
    );
    if (!Number.isFinite(h) || h > highestStandable) {
      continue;
    }
    const dist = Math.abs(h - feetY);
    if (dist < bestDist) {
      bestDist = dist;
      best = h;
    }
  }
  return best;
};

/**
 * The highest surface under the footprint at (`x`, `z`) that is still within
 * a step of `feetY` — what the player would be climbing onto here.
 *
 * Deliberately the opposite rule to `sampleGroundHeight`, which prefers the
 * reading closest to the feet: standing, the closest reading is what keeps a
 * sample that has strayed into a wall from lifting the player up it, but a
 * player deciding whether to step has to look at the highest thing under
 * them or they'd never climb off the floor they're already standing on.
 * What makes taking the highest safe here is that the caller re-tests the
 * whole collision box at that height before accepting it.
 *
 * @returns The surface to step onto, or `-Infinity` when there is none.
 */
const highestStandableSurface = (
  config: PlayerConfig,
  groundHeightAt: (x: number, y: number, z: number) => number,
  x: number,
  feetY: number,
  z: number,
): number => {
  const limit = feetY + config.stepHeight;
  let best = -Infinity;
  for (const [ox, oz] of FOOTPRINT_OFFSETS) {
    const h = groundHeightAt(
      x + ox * config.collisionRadius,
      feetY,
      z + oz * config.collisionRadius,
    );
    if (Number.isFinite(h) && h <= limit && h > best) {
      best = h;
    }
  }
  return best;
};

/** Horizontal corners of the player's collision box, as unit offsets. */
const CORNER_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * How many times a blocked move is halved to find where the player touches
 * the wall. Six brings a frame of travel at full speed down to under a
 * hundredth of a unit — far below anything visible.
 */
const CONTACT_REFINEMENTS = 6;

/**
 * Keeps a sample off an exact voxel boundary, in world units: standing on a
 * floor puts the player's feet precisely on one, and a rounding error either
 * way would otherwise read the floor itself as a wall the player is buried in.
 */
const SKIN = 1e-3;

/**
 * Whether the player's collision box, centred at (`x`, `y`, `z`), overlaps
 * any solid voxel.
 *
 * The box is exactly as tall as a voxel and narrower than one, so every
 * voxel it overlaps contains one of its own top or bottom corners — testing
 * the eight corners is enough, with no need to walk the voxels in between.
 */
const boxHitsSolid = (
  config: PlayerConfig,
  solidAt: (x: number, y: number, z: number) => boolean,
  x: number,
  y: number,
  z: number,
): boolean => {
  const low = y - config.halfSize + SKIN;
  const high = y + config.halfSize - SKIN;
  for (const [ox, oz] of CORNER_OFFSETS) {
    const cx = x + ox * config.collisionRadius;
    const cz = z + oz * config.collisionRadius;
    if (solidAt(cx, low, cz) || solidAt(cx, high, cz)) {
      return true;
    }
  }
  return false;
};

/**
 * Moves the player along one horizontal axis, stopping dead at walls.
 *
 * A blocked move gets one more chance as a step up: the ground scan can't
 * see past the voxel the feet are in, so a knee-high step and a cliff face
 * both report a surface within a step of the feet, and only re-testing the
 * whole box at the raised height tells them apart — the cliff still has
 * material where the player's body would go, a step doesn't.
 *
 * @returns Whether a wall stopped the player, who is now up against it.
 */
const moveHorizontally = (
  player: Player,
  world: PlayerWorld,
  axis: "x" | "z",
  delta: number,
): boolean => {
  if (delta === 0) {
    return false;
  }
  const config = player.config;
  const from = player.position[axis];
  player.position[axis] = Math.max(
    -world.halfExtent,
    Math.min(world.halfExtent, from + delta),
  );
  const { x, y, z } = player.position;
  if (!boxHitsSolid(config, world.solidAt, x, y, z)) {
    return false;
  }
  const surface = highestStandableSurface(
    config,
    world.groundHeightAt,
    x,
    y - config.halfSize,
    z,
  );
  const stepped = surface + config.halfSize;
  if (
    Number.isFinite(surface) &&
    stepped > y &&
    !boxHitsSolid(config, world.solidAt, x, stepped, z)
  ) {
    player.position.y = stepped;
    return false;
  }
  // Neither passable nor climbable, so give back the move — but not all of
  // it, or the player would come to rest up to a frame's travel short of the
  // wall, further out the faster they were going. Halving in on the last
  // position known to be clear puts them against it instead.
  let clear = from;
  let blocked = player.position[axis];
  for (let i = 0; i < CONTACT_REFINEMENTS; i++) {
    const mid = (clear + blocked) / 2;
    player.position[axis] = mid;
    if (
      boxHitsSolid(
        config,
        world.solidAt,
        player.position.x,
        y,
        player.position.z,
      )
    ) {
      blocked = mid;
    } else {
      clear = mid;
    }
  }
  player.position[axis] = clear;
  return true;
};

/**
 * Moves the player one axis, stopping flush against solid voxels, without
 * the grounded step-up behaviour of `moveHorizontally`. Used for all three
 * axes while flying, where a surface two units up is a wall to be flown
 * around, not a ledge to climb.
 */
const moveAxis = (
  player: Player,
  world: PlayerWorld,
  axis: "x" | "y" | "z",
  delta: number,
): boolean => {
  if (delta === 0) {
    return false;
  }
  const config = player.config;
  const from = player.position[axis];
  player.position[axis] = Math.max(
    -world.halfExtent,
    Math.min(world.halfExtent, from + delta),
  );
  if (
    !boxHitsSolid(
      config,
      world.solidAt,
      player.position.x,
      player.position.y,
      player.position.z,
    )
  ) {
    return false;
  }
  // Half the move back toward the last clear position, so the player rests
  // against the voxel rather than a frame's travel short of it.
  let clear = from;
  let blocked = player.position[axis];
  for (let i = 0; i < CONTACT_REFINEMENTS; i++) {
    const mid = (clear + blocked) / 2;
    player.position[axis] = mid;
    if (
      boxHitsSolid(
        config,
        world.solidAt,
        player.position.x,
        player.position.y,
        player.position.z,
      )
    ) {
      blocked = mid;
    } else {
      clear = mid;
    }
  }
  player.position[axis] = clear;
  return true;
};

/**
 * The flight integrator: gravity is off, and forward/back follows the full
 * look direction (`lookDirection`), so holding W while looking up climbs and
 * looking down dives; strafing stays horizontal. Each axis is clamped
 * separately against solid voxels, and the player never snaps to the ground.
 */
const updateFlying = (
  player: Player,
  input: InputSnapshot,
  world: PlayerWorld,
  dt: number,
): void => {
  const config = player.config;
  const [dirX, dirY, dirZ] = lookDirection(player);
  const rightX = -Math.cos(player.yaw);
  const rightZ = Math.sin(player.yaw);
  let targetVx = 0;
  let targetVy = 0;
  let targetVz = 0;
  if (input.moveX !== 0 || input.moveY !== 0) {
    const len = Math.hypot(input.moveX, input.moveY);
    const nx = input.moveX / len;
    const ny = input.moveY / len;
    targetVx = (dirX * ny + rightX * nx) * config.speed;
    targetVy = dirY * ny * config.speed;
    targetVz = (dirZ * ny + rightZ * nx) * config.speed;
  }
  const maxDelta = config.acceleration * dt;
  player.vx = moveTowards(player.vx, targetVx, maxDelta);
  player.vy = moveTowards(player.vy, targetVy, maxDelta);
  player.vz = moveTowards(player.vz, targetVz, maxDelta);

  // one axis at a time, so a wall that stops one still lets the player slide
  // along it with the others
  moveAxis(player, world, "x", player.vx * dt);
  moveAxis(player, world, "y", player.vy * dt);
  moveAxis(player, world, "z", player.vz * dt);
  player.onGround = false;
};

export const updatePlayer = (
  player: Player,
  dt: number,
  input: InputSnapshot,
  world: PlayerWorld,
): void => {
  const config = player.config;
  // drag-to-look
  player.yaw -= input.lookDx * config.lookSensitivity;
  player.pitch = Math.max(
    -config.maxPitch,
    Math.min(
      config.maxPitch,
      player.pitch - input.lookDy * config.lookSensitivity,
    ),
  );

  if (player.flying) {
    updateFlying(player, input, world, dt);
    return;
  }

  // movement relative to the heading
  const sinYaw = Math.sin(player.yaw);
  const cosYaw = Math.cos(player.yaw);
  const forwardX = sinYaw;
  const forwardZ = cosYaw;
  // screen-right = cross(forward, up)
  const rightX = -cosYaw;
  const rightZ = sinYaw;

  // ramp horizontal velocity toward the input's target speed each frame,
  // rather than snapping to it, so starting and stopping isn't instantaneous
  const mx = input.moveX;
  const my = input.moveY;
  let targetVx = 0;
  let targetVz = 0;
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    const nx = mx / len;
    const ny = my / len;
    targetVx = (forwardX * ny + rightX * nx) * config.speed;
    targetVz = (forwardZ * ny + rightZ * nx) * config.speed;
  }
  const maxDelta = config.acceleration * dt;
  player.vx = moveTowards(player.vx, targetVx, maxDelta);
  player.vz = moveTowards(player.vz, targetVz, maxDelta);
  const dx = player.vx * dt;
  const dz = player.vz * dt;

  // gravity + jump; underwater the gravity is weak and holding jump swims up
  const inWater = world.inWaterAt(
    player.position.x,
    player.position.y - config.halfSize + SKIN,
    player.position.z,
  );
  if (inWater) {
    player.vy -= config.gravity * 0.15 * dt;
    if (input.jumpHeld) {
      player.vy = config.swimSpeed;
    } else {
      // gentle drag so an idle player sinks slowly instead of dropping like a
      // stone; holding jump (swim) overrides it
      player.vy *= Math.max(0, 1 - 3 * dt);
    }
  } else {
    player.vy -= config.gravity * dt;
  }
  if (!inWater && player.onGround && input.jump) {
    player.vy = config.jumpSpeed;
  }

  // one axis at a time, so a wall that stops one of them still lets the
  // player slide along it with the other
  const blockedX = moveHorizontally(player, world, "x", dx);
  const blockedZ = moveHorizontally(player, world, "z", dz);
  const stoppedByWall = blockedX || blockedZ;

  // Holding jump while walking into a wall climbs it, which is how a player
  // gets back out of a shaft they dug straight down. Never lower than the
  // velocity already there, so climbing away from a jump doesn't cut it
  // short. Underwater, swimming already covers this.
  if (stoppedByWall && input.jumpHeld && !inWater) {
    player.vy = Math.max(player.vy, config.climbSpeed);
  }

  // The height the ground is judged from is the one the player enters this
  // frame's fall at (after any step up), not where the fall ends: scanning
  // down from there catches every surface crossed on the way, so a fast fall
  // lands on the floor it passed through instead of the next one below it.
  const feetBefore = player.position.y - config.halfSize;
  const risenY = player.position.y + player.vy * dt;
  if (
    player.vy > 0 &&
    boxHitsSolid(
      config,
      world.solidAt,
      player.position.x,
      risenY,
      player.position.z,
    )
  ) {
    // head against a ceiling — drop the climb rather than pushing into it
    player.vy = 0;
  } else {
    player.position.y = risenY;
  }

  // snap to the terrain surface
  const ground = sampleGroundHeight(
    config,
    world.groundHeightAt,
    player.position.x,
    feetBefore,
    player.position.z,
  );
  if (!Number.isFinite(ground)) {
    // No surface anywhere under the footprint: the player is over a hole
    // clear through the world, or over blocks that haven't streamed in yet.
    // Rather than drop them out of the world, hold the height they came in
    // at; they resume falling as soon as there's ground to fall toward.
    player.position.y = feetBefore + config.halfSize;
    player.vy = 0;
    player.onGround = true;
    return;
  }
  const minY = ground + config.halfSize;
  if (player.position.y <= minY) {
    player.position.y = minY;
    if (player.vy < 0) {
      player.vy = 0;
    }
    player.onGround = true;
  } else {
    player.onGround = false;
  }
};

/** The look direction of the player's view from yaw/pitch, as a unit vector. */
export const lookDirection = (player: Player): [number, number, number] => {
  const cp = Math.cos(player.pitch);
  return [
    cp * Math.sin(player.yaw),
    Math.sin(player.pitch),
    cp * Math.cos(player.yaw),
  ];
};

/**
 * Places the camera. In first person (the default) it sits at the player's
 * eye looking along the player's yaw/pitch, so the crosshair lines up with
 * where the player aims (and where voxel editing picks). In third person it
 * hovers behind and above the cube, looking at it.
 */
export const placeCamera = (
  camera: PerspectiveCamera,
  player: Player,
  firstPerson: boolean = true,
): void => {
  const config = player.config;
  if (firstPerson) {
    camera.position.set(
      player.position.x,
      player.position.y + config.eyeHeight,
      player.position.z,
    );
    const [dx, dy, dz] = lookDirection(player);
    camera.lookAt(
      camera.position.x + dx,
      camera.position.y + dy,
      camera.position.z + dz,
    );
    return;
  }
  const sinYaw = Math.sin(player.yaw);
  const cosYaw = Math.cos(player.yaw);
  camera.position.set(
    player.position.x - sinYaw * config.followBack,
    player.position.y + config.followUp,
    player.position.z - cosYaw * config.followBack,
  );
  // pitch lifts/lowers the look point a little so vertical drag still tilts
  const ty = player.position.y + Math.sin(player.pitch) * 3.0;
  camera.lookAt(player.position.x, ty, player.position.z);
};

/**
 * The pose the death fall puts the camera in at `progress` — 0 standing, 1
 * fallen flat. The eye sweeps down a backward arc about the planted feet to
 * the ground while the view tips up to the sky, the same fall a zombie corpse
 * plays. Returns the eye's position and the pitch the camera should look
 * along; the heading does not change.
 */
export const deathCameraPose = (
  progress: number,
  player: Player,
): { position: Dim3; pitch: number } => {
  const p = Math.max(0, Math.min(1, progress));
  const fall = (-Math.PI / 2) * p;
  const sinFall = Math.sin(fall);
  const cosFall = Math.cos(fall);
  const sinYaw = Math.sin(player.yaw);
  const cosYaw = Math.cos(player.yaw);
  const eye = player.config.eyeHeight;
  const feetY = player.position.y - player.config.halfSize;
  return {
    position: [
      player.position.x + eye * sinFall * sinYaw,
      feetY + eye * cosFall,
      player.position.z + eye * sinFall * cosYaw,
    ],
    pitch: player.pitch + (Math.PI / 2) * p,
  };
};
