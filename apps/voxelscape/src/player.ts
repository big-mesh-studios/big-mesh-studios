import { PerspectiveCamera, Vector3 } from "@random-mesh/rmsl/scene";
import type { InputSnapshot } from "./input";

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
  /** The water surface above (`x`, `z`), or `-Infinity` where there is no water. */
  waterSurfaceAt: (x: number, z: number) => number;
  /** Whether the voxel containing (`x`, `y`, `z`) blocks movement; water doesn't. */
  solidAt: (x: number, y: number, z: number) => boolean;
  /** Half the playable extent, in world units; horizontal movement clamps to it. */
  halfExtent: number;
}

export const PLAYER_CFG = {
  /** Player cube half-size, in world units (a 2x2x2 cube). */
  halfSize: 1,
  /** Movement speed, in units per second. */
  speed: 22.5,
  /** Horizontal acceleration/deceleration, in units per second squared — how fast move speed ramps up to (or down from) `speed`. */
  acceleration: 150,
  /** Gravitational acceleration, in units per second squared. */
  gravity: 45,
  /** Initial upward velocity on jumping, in units per second (about a 2-unit-high jump). */
  jumpSpeed: 14,
  /** Upward velocity while holding jump underwater, in units per second. */
  swimSpeed: 10,
  /** Look sensitivity, in radians per pixel of pointer movement. */
  lookSensitivity: 0.0025,
  maxPitch: 1.35,
  /** Chase-camera distance behind the cube centre, in world units. */
  followBack: 9,
  /** Chase-camera height above the cube centre when not in first person. */
  followUp: 2.5,
  /** Eye height above the player's feet for the first-person camera. */
  eyeHeight: 0.9,
  /**
   * Tallest rise the player is lifted onto while walking, in world units —
   * one LOD-0 voxel (`VOXEL_SIZE`). Anything taller is a wall or an
   * overhang's underside rather than a step, and is walked into, not onto.
   */
  stepHeight: 2,
  /**
   * Half-width of the box that collides with voxels, in world units. Well
   * under `halfSize`, so the player is narrower than the cube drawn for
   * them: a mined tunnel is one voxel (2 units) wide, and a full-width box
   * would jam in it at the slightest misalignment. The slack also keeps the
   * first-person camera, which sits at the box's centre line, from ever
   * being pushed inside a wall.
   */
  collisionRadius: 0.6,
};

export const createPlayer = (x: number, y: number, z: number): Player => ({
  position: new Vector3(x, y, z),
  yaw: 0,
  pitch: 0,
  vx: 0,
  vz: 0,
  vy: 0,
  onGround: false,
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
  groundHeightAt: (x: number, y: number, z: number) => number,
  x: number,
  feetY: number,
  z: number,
): number => {
  const highestStandable = feetY + PLAYER_CFG.stepHeight;
  let best = -Infinity;
  let bestDist = Infinity;
  for (const [ox, oz] of FOOTPRINT_OFFSETS) {
    const h = groundHeightAt(
      x + ox * PLAYER_CFG.collisionRadius,
      feetY,
      z + oz * PLAYER_CFG.collisionRadius,
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
  groundHeightAt: (x: number, y: number, z: number) => number,
  x: number,
  feetY: number,
  z: number,
): number => {
  const limit = feetY + PLAYER_CFG.stepHeight;
  let best = -Infinity;
  for (const [ox, oz] of FOOTPRINT_OFFSETS) {
    const h = groundHeightAt(
      x + ox * PLAYER_CFG.collisionRadius,
      feetY,
      z + oz * PLAYER_CFG.collisionRadius,
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
  solidAt: (x: number, y: number, z: number) => boolean,
  x: number,
  y: number,
  z: number,
): boolean => {
  const low = y - PLAYER_CFG.halfSize + SKIN;
  const high = y + PLAYER_CFG.halfSize - SKIN;
  for (const [ox, oz] of CORNER_OFFSETS) {
    const cx = x + ox * PLAYER_CFG.collisionRadius;
    const cz = z + oz * PLAYER_CFG.collisionRadius;
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
 */
const moveHorizontally = (
  player: Player,
  world: PlayerWorld,
  axis: "x" | "z",
  delta: number,
): void => {
  if (delta === 0) {
    return;
  }
  const from = player.position[axis];
  player.position[axis] = Math.max(
    -world.halfExtent,
    Math.min(world.halfExtent, from + delta),
  );
  const { x, y, z } = player.position;
  if (!boxHitsSolid(world.solidAt, x, y, z)) {
    return;
  }
  const surface = highestStandableSurface(
    world.groundHeightAt,
    x,
    y - PLAYER_CFG.halfSize,
    z,
  );
  const stepped = surface + PLAYER_CFG.halfSize;
  if (
    Number.isFinite(surface) &&
    stepped > y &&
    !boxHitsSolid(world.solidAt, x, stepped, z)
  ) {
    player.position.y = stepped;
    return;
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
    if (boxHitsSolid(world.solidAt, player.position.x, y, player.position.z)) {
      blocked = mid;
    } else {
      clear = mid;
    }
  }
  player.position[axis] = clear;
};

export const updatePlayer = (
  player: Player,
  dt: number,
  input: InputSnapshot,
  world: PlayerWorld,
): void => {
  // drag-to-look
  player.yaw -= input.lookDx * PLAYER_CFG.lookSensitivity;
  player.pitch = Math.max(
    -PLAYER_CFG.maxPitch,
    Math.min(
      PLAYER_CFG.maxPitch,
      player.pitch - input.lookDy * PLAYER_CFG.lookSensitivity,
    ),
  );

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
    targetVx = (forwardX * ny + rightX * nx) * PLAYER_CFG.speed;
    targetVz = (forwardZ * ny + rightZ * nx) * PLAYER_CFG.speed;
  }
  const maxDelta = PLAYER_CFG.acceleration * dt;
  player.vx = moveTowards(player.vx, targetVx, maxDelta);
  player.vz = moveTowards(player.vz, targetVz, maxDelta);
  const dx = player.vx * dt;
  const dz = player.vz * dt;

  // gravity + jump; underwater the gravity is weak and holding jump swims up
  const waterY = world.waterSurfaceAt(player.position.x, player.position.z);
  const inWater = waterY > player.position.y - PLAYER_CFG.halfSize;
  if (inWater) {
    player.vy -= PLAYER_CFG.gravity * 0.15 * dt;
    if (input.jumpHeld) {
      player.vy = PLAYER_CFG.swimSpeed;
    } else {
      // gentle drag so an idle player sinks slowly instead of dropping like a
      // stone; holding jump (swim) overrides it
      player.vy *= Math.max(0, 1 - 3 * dt);
    }
  } else {
    player.vy -= PLAYER_CFG.gravity * dt;
  }
  if (!inWater && player.onGround && input.jump) {
    player.vy = PLAYER_CFG.jumpSpeed;
  }

  // one axis at a time, so a wall that stops one of them still lets the
  // player slide along it with the other
  moveHorizontally(player, world, "x", dx);
  moveHorizontally(player, world, "z", dz);

  // The height the ground is judged from is the one the player enters this
  // frame's fall at (after any step up), not where the fall ends: scanning
  // down from there catches every surface crossed on the way, so a fast fall
  // lands on the floor it passed through instead of the next one below it.
  const feetBefore = player.position.y - PLAYER_CFG.halfSize;
  const risenY = player.position.y + player.vy * dt;
  if (
    player.vy > 0 &&
    boxHitsSolid(world.solidAt, player.position.x, risenY, player.position.z)
  ) {
    // head against a ceiling — drop the climb rather than pushing into it
    player.vy = 0;
  } else {
    player.position.y = risenY;
  }

  // snap to the terrain surface
  const ground = sampleGroundHeight(
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
    player.position.y = feetBefore + PLAYER_CFG.halfSize;
    player.vy = 0;
    player.onGround = true;
    return;
  }
  const minY = ground + PLAYER_CFG.halfSize;
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
  if (firstPerson) {
    camera.position.set(
      player.position.x,
      player.position.y + PLAYER_CFG.eyeHeight,
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
    player.position.x - sinYaw * PLAYER_CFG.followBack,
    player.position.y + PLAYER_CFG.followUp,
    player.position.z - cosYaw * PLAYER_CFG.followBack,
  );
  // pitch lifts/lowers the look point a little so vertical drag still tilts
  const ty = player.position.y + Math.sin(player.pitch) * 3.0;
  camera.lookAt(player.position.x, ty, player.position.z);
};
