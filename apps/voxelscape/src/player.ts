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
 * Horizontal offsets from the player's centre, sampled around a small
 * inset "core" footprint rather than the full collision cube — the same
 * spirit as Minecraft's slightly-shrunk collision box, so a tap on a corner
 * of solid ground next door doesn't affect the sample.
 */
const FOOTPRINT_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Samples the ground surface across a small footprint around the player
 * instead of a single point, and returns whichever candidate is closest to
 * the player's current height — not simply the highest or the centre one.
 *
 * There's no horizontal wall collision in this game at all (a player can
 * already walk through walls), so the only defense against a tunnel's own
 * wall or ceiling is this: in a passage only one voxel wide, the exact
 * centre point can drift onto the wall/ceiling's column instead of the
 * tunnel's own open one, and picking up that reading uncritically would
 * catapult the player onto a completely different, often much higher,
 * surface the instant one sample point clips a wall. Preferring the
 * reading closest to where the player already stands favors the tunnel
 * floor they're walking along over a stray wall/ceiling reading, without
 * needing true per-axis box collision.
 */
const sampleGroundHeight = (
  groundHeightAt: (x: number, y: number, z: number) => number,
  x: number,
  y: number,
  z: number,
  footprintRadius: number,
): number => {
  let best = -Infinity;
  let bestDist = Infinity;
  for (const [ox, oz] of FOOTPRINT_OFFSETS) {
    const h = groundHeightAt(
      x + ox * footprintRadius,
      y,
      z + oz * footprintRadius,
    );
    if (!Number.isFinite(h)) {
      continue;
    }
    const dist = Math.abs(h - y);
    if (dist < bestDist) {
      bestDist = dist;
      best = h;
    }
  }
  return best;
};

export const updatePlayer = (
  player: Player,
  dt: number,
  input: InputSnapshot,
  groundHeightAt: (x: number, y: number, z: number) => number,
  waterSurfaceAt: (x: number, z: number) => number,
  halfExtent: number,
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
  const waterY = waterSurfaceAt(player.position.x, player.position.z);
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

  // integrate
  player.position.x = Math.max(
    -halfExtent,
    Math.min(halfExtent, player.position.x + dx),
  );
  player.position.z = Math.max(
    -halfExtent,
    Math.min(halfExtent, player.position.z + dz),
  );
  player.position.y += player.vy * dt;

  // snap to the terrain surface
  const ground = sampleGroundHeight(
    groundHeightAt,
    player.position.x,
    player.position.y,
    player.position.z,
    PLAYER_CFG.halfSize * 0.4,
  );
  const minY =
    (Number.isFinite(ground) ? ground : player.position.y) +
    PLAYER_CFG.halfSize;
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
