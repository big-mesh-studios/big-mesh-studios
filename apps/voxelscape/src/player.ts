import { PerspectiveCamera, Vector3 } from "@random-mesh/rmsl/scene";
import type { InputSnapshot } from "./input";

export interface Player {
  /** Cube centre, in world units. */
  position: Vector3;
  /** Heading, in radians; 0 faces +Z. */
  yaw: number;
  pitch: number;
  vy: number;
  onGround: boolean;
}

export const PLAYER_CFG = {
  /** Player cube half-size, in world units (a 2x2x2 cube). */
  halfSize: 1,
  /** Movement speed, in units per second. */
  speed: 45,
  /** Gravitational acceleration, in units per second squared. */
  gravity: 45,
  /** Initial upward velocity on jumping, in units per second (about a 2-unit-high jump). */
  jumpSpeed: 14,
  /** Upward velocity while holding jump underwater, in units per second. */
  swimSpeed: 10,
  /** Look sensitivity, in radians per pixel of pointer movement. */
  lookSensitivity: 0.005,
  maxPitch: 1.35,
  /** Chase-camera distance behind the cube centre, in world units. */
  followBack: 9,
  /** Chase-camera height above the cube centre, in world units. */
  followUp: 2.5,
};

export const createPlayer = (x: number, y: number, z: number): Player => ({
  position: new Vector3(x, y, z),
  yaw: 0,
  pitch: 0,
  vy: 0,
  onGround: false,
});

export const updatePlayer = (
  player: Player,
  dt: number,
  input: InputSnapshot,
  groundHeightAt: (x: number, z: number) => number,
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

  let dx = 0;
  let dz = 0;
  const mx = input.moveX;
  const my = input.moveY;
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    const nx = mx / len;
    const ny = my / len;
    const speed = PLAYER_CFG.speed * dt;
    dx = (forwardX * ny + rightX * nx) * speed;
    dz = (forwardZ * ny + rightZ * nx) * speed;
  }

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
  const ground = groundHeightAt(player.position.x, player.position.z);
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

/** Chase camera hovering just behind and above the player cube, looking at it. */
export const placeCamera = (
  camera: PerspectiveCamera,
  player: Player,
): void => {
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
