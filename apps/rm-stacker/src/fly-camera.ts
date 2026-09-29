// The camera a model is edited from the inside of: it flies through the figure
// rather than turning about it, and passes through its voxels on the way.
//
// The drawn world is not the model's. The preview draws a figure at whatever
// size fills the view, so a world unit is a fraction of a voxel whose size
// changes with the zoom. Every speed here is given in voxels a second and
// converted on the way in, which is what makes the camera cover the same ground
// per second at every size the figure is drawn at.
import { Vector3D, type Dimensions3D } from "@big-mesh-studios/maths";

/**
 * How long a frame the camera will move for, in seconds. A frame that took
 * longer than this — a tab that was in the background, a stall long enough to
 * drop one — moves the camera as though it had taken no longer than this, so a
 * frame that arrives late does not carry the camera across the figure.
 */
const LONGEST_FRAME_SECONDS = 0.05;

/** How fast a camera crosses a model at full speed, in voxels a second. */
const SPEED_IN_VOXELS = 16;

/** How quickly it reaches that speed, in voxels a second squared. */
const ACCELERATION_IN_VOXELS = 64;

/** How far the view turns for a pixel of pointer movement, in radians. */
const RADIANS_PER_PIXEL = 0.003;

/**
 * How far above or below the horizon the view can be turned, in radians. Just
 * short of straight up or down, where the heading of the view stops saying
 * which way the camera is facing.
 */
const PITCH_LIMIT = Math.PI / 2 - 0.01;

/**
 * How far off a figure a camera is held, in multiples of the figure's own
 * longest side: far enough outside to see all of it and turn about it, and near
 * enough that a camera flown off in one direction can still be brought back
 * along that one.
 */
const EXTENT_IN_FIGURES = 4;

/**
 * How a camera moves and how fast the view turns.
 */
export interface FlyCameraConfig {
  /** How fast the camera travels at full speed, in world units a second. */
  speed: number;
  /** How quickly it reaches that speed, in world units a second squared. */
  acceleration: number;
  /** How far the view turns for a pixel of pointer movement, in radians. */
  lookSensitivity: number;
  /** How far above or below the horizon the view can be turned, in radians. */
  maxPitch: number;
}

/**
 * A camera standing in the drawn world, free of the figure it is looking at.
 */
export interface FlyCamera {
  /** Where the camera stands. */
  position: Vector3D;
  /** The heading, in radians. Zero looks along positive z. */
  yaw: number;
  /** How far up or down the view is turned, in radians. */
  pitch: number;
  /** How fast the camera is travelling along each axis, in world units a second. */
  velocity: Vector3D;
  /** How far from the figure's own origin the camera may go along each axis. */
  extent: number;
  config: FlyCameraConfig;
}

/**
 * What one frame of input asks a camera to do.
 */
export interface FlyInput {
  /** Strafe, from -1 to 1, positive towards the view's right. */
  moveX: number;
  /** Forward and back, from -1 to 1, positive to go forward. */
  moveY: number;
  /** How far the pointer has moved since the last frame, in pixels. */
  lookDx: number;
  /** How far the pointer has moved since the last frame, downwards, in pixels. */
  lookDy: number;
}

/**
 * Where a camera entering flight stands, and the settings it flies with.
 */
export interface FlyCameraOptions {
  /** The heading the figure has been turned to, in radians. */
  heading: number;
  /** How far up or down the figure has been turned, in radians. */
  pitch: number;
  /** How far off the figure's origin the camera that turned it stood. */
  distance: number;
  /** How much of the drawn world one voxel takes up. */
  voxelSize: number;
  /** The box the camera is held inside. */
  extent: number;
  config?: Partial<FlyCameraConfig>;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * A camera set to enter flight from a figure that a turntable has been turning.
 *
 * The camera stands where the camera that turned the figure stood, measured from
 * the figure's own origin rather than from the screen, and looks back at that
 * origin — so the figure it sees is the one that was on screen a moment ago.
 */
export const createFlyCamera = ({
  heading,
  pitch,
  distance,
  voxelSize,
  extent,
  config,
}: FlyCameraOptions): FlyCamera => {
  const flat = Math.cos(pitch);

  return {
    position: Vector3D.create(
      -distance * Math.sin(heading) * flat,
      distance * Math.sin(pitch),
      distance * Math.cos(heading) * flat,
    ),
    // The camera is looking back along the line it came out on, which is the
    // opposite way round from the heading, and as far the other way up or down
    // as the figure was tilted.
    yaw: Math.PI - heading,
    pitch: -pitch,
    velocity: Vector3D.create(),
    extent,
    config: {
      speed: config?.speed ?? SPEED_IN_VOXELS * voxelSize,
      acceleration: config?.acceleration ?? ACCELERATION_IN_VOXELS * voxelSize,
      lookSensitivity: config?.lookSensitivity ?? RADIANS_PER_PIXEL,
      maxPitch: config?.maxPitch ?? PITCH_LIMIT,
    },
  };
};

/**
 * The heading, tilt and distance a turntable would have to stand at for its
 * camera to be looking at the figure from where `camera` now stands.
 *
 * @returns `pitch` and `radius` are the two the preview measures a framing
 * against, so a figure is drawn the same size by either camera.
 */
export const orbitFromFlyCamera = (
  camera: FlyCamera,
): { yaw: number; pitch: number; radius: number } => {
  const { x, y, z } = camera.position;
  const radius = Math.hypot(x, y, z);

  return {
    yaw: Math.atan2(-x, z),
    pitch: Math.asin(clamp(radius === 0 ? 0 : y / radius, -1, 1)),
    radius,
  };
};

/**
 * How much of the crosshair's reach a camera entering flight keeps between
 * itself and the figure's own surface, as a fraction of that reach. The rest is
 * the room to fly in with, and flying into the figure is a normal place to work
 * rather than a dead one, because the reach is wide enough to cross the figure
 * and reach the far side of whatever the camera has let itself into.
 */
const ENTRY_SPARE = 0.5;

/**
 * How far a camera in flight reaches, in voxels of the figure.
 *
 * Measured from the figure rather than fixed, because a figure somebody has
 * drawn is far larger than any fixed number of voxels while a camera standing
 * off to see the whole of it stands further off still. A reach of a few voxels
 * then reaches the near corner of a large figure and nothing else — a crosshair
 * reporting nothing while it points straight at the model, and working only where
 * the figure happens to be nearest to being looked at square on.
 *
 * Twice the figure's own reach is what it takes to cross it from where a camera
 * opens, which leaves every part of a figure reachable however big it is drawn.
 *
 * @param reach How far the figure reaches from the point it is framed on, in voxels.
 */
export const flightReach = (reach: number): number => 2 * reach;

/**
 * How far off a figure a camera entering flight stands, in world units.
 *
 * A turntable is stood off far enough to see the whole of a figure, and a figure
 * is usually deeper than a crosshair reaches — so a camera that took the
 * turntable's distance would open looking at a figure it could not reach, and the
 * first press of the first flight would find nothing. It opens within reach of
 * the figure's own surface instead, unless the view was already close enough to
 * be working at.
 *
 * @param reach How far the figure reaches from the point it is framed on, in voxels.
 * @param standOff How far off the figure the turntable had its camera, in world units.
 * @param voxelSize How much of the drawn world one voxel takes up.
 */
export const flightEntry = (
  reach: number,
  standOff: number,
  voxelSize: number,
): number =>
  Math.min(standOff, (reach + flightReach(reach) * ENTRY_SPARE) * voxelSize);

/**
 * The box a camera entering flight is held inside.
 *
 * @param size The box the figure fills, in voxels.
 * @param voxelSize How much of the drawn world one voxel takes up.
 */
export const flightExtent = (size: Dimensions3D, voxelSize: number): number =>
  EXTENT_IN_FIGURES * voxelSize * Math.max(size.width, size.height, size.depth);

/**
 * Where the camera looks, as a unit vector.
 */
export const lookDirection = (camera: FlyCamera): Vector3D => {
  const flat = Math.cos(camera.pitch);

  return Vector3D.create(
    flat * Math.sin(camera.yaw),
    Math.sin(camera.pitch),
    flat * Math.cos(camera.yaw),
  );
};

/** Steps `value` toward `target` by at most `maxDelta`. */
const moveTowards = (
  value: number,
  target: number,
  maxDelta: number,
): number =>
  Math.abs(target - value) <= maxDelta
    ? target
    : value + Math.sign(target - value) * maxDelta;

/**
 * Turns the view by however far the pointer has moved and carries the camera
 * one frame of the frame's movement.
 *
 * Forward and back follow the whole look direction, so holding forward while
 * looking up climbs and while looking down dives, and strafing stays level.
 * Both are ramped toward the speed asked for rather than reaching it at once.
 * Nothing is in the way, so the position is held only inside the camera's own
 * extent.
 *
 * @param camera The camera to move, in place.
 * @param input What the frame's input asks for.
 * @param dt How long the frame was, in seconds.
 */
export const stepFlyCamera = (
  camera: FlyCamera,
  input: FlyInput,
  dt: number,
): void => {
  const { config } = camera;
  const frame = Math.min(dt, LONGEST_FRAME_SECONDS);

  camera.yaw -= input.lookDx * config.lookSensitivity;
  camera.pitch = clamp(
    camera.pitch - input.lookDy * config.lookSensitivity,
    -config.maxPitch,
    config.maxPitch,
  );

  const look = lookDirection(camera);
  const { speed, acceleration } = config;
  // Screen-right, which is forward turned a quarter anticlockwise about the up
  // axis and so does not tilt when the view does.
  const rightX = -Math.cos(camera.yaw);
  const rightZ = Math.sin(camera.yaw);
  let alongX = 0;
  let alongY = 0;
  let alongZ = 0;

  if (input.moveX !== 0 || input.moveY !== 0) {
    const asked = Math.hypot(input.moveX, input.moveY);
    const strafe = input.moveX / asked;
    const forward = input.moveY / asked;

    alongX = (look.x * forward + rightX * strafe) * speed;
    alongY = look.y * forward * speed;
    alongZ = (look.z * forward + rightZ * strafe) * speed;
  }

  const ramp = acceleration * frame;
  const { velocity, position, extent } = camera;

  velocity.x = moveTowards(velocity.x, alongX, ramp);
  velocity.y = moveTowards(velocity.y, alongY, ramp);
  velocity.z = moveTowards(velocity.z, alongZ, ramp);

  position.x = clamp(position.x + velocity.x * frame, -extent, extent);
  position.y = clamp(position.y + velocity.y * frame, -extent, extent);
  position.z = clamp(position.z + velocity.z * frame, -extent, extent);
};
