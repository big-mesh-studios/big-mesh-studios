import { Matrix3x3 } from "../maths";

export const MIN_RADIUS = 2;
export const MAX_RADIUS = 20;
export const RADIANS_PER_PIXEL = 0.005;
export const PITCH_LIMIT = Math.PI / 2 - 0.01;

const TURNTABLE_SECONDS_PER_REVOLUTION = 20;
const TURNTABLE_RADIANS_PER_SECOND = -(2 * Math.PI) / TURNTABLE_SECONDS_PER_REVOLUTION;

/**
 * Orbit yaw/pitch/radius and autorotate spin for the model camera, passed to
 * a renderer's `render` call each frame.
 */
export type OrbitCameraState = {
  yaw: number;
  pitch: number;
  radius: number;
  spin: number;
  timeOffset: number;
  spinOffset: number;
};

export function createOrbitCameraState(): OrbitCameraState {
  return {
    yaw: Math.PI / 4,
    pitch: Math.PI / 6,
    radius: 3,
    spin: 0,
    timeOffset: 0,
    spinOffset: 0,
  };
}

export function orbitBy(camera: OrbitCameraState, deltaX: number, deltaY: number) {
  camera.yaw += deltaX * RADIANS_PER_PIXEL;
  camera.pitch = Math.max(
    -PITCH_LIMIT,
    Math.min(PITCH_LIMIT, camera.pitch + deltaY * RADIANS_PER_PIXEL),
  );
}

export function zoomBy(camera: OrbitCameraState, wheelDeltaSign: number) {
  camera.radius = Math.min(
    MAX_RADIUS,
    Math.max(MIN_RADIUS, camera.radius * Math.pow(1.1, wheelDeltaSign)),
  );
}

export function zoomTo(camera: OrbitCameraState, scale: number) {
  camera.radius = Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, camera.radius * scale));
}

/**
 * Freezes `camera.spin` at its current angle when `rotating` is false, and
 * marks the moment it resumes measuring from when `rotating` is true, so the
 * spin stays continuous across a pause rather than jumping.
 */
export function setAutorotating(camera: OrbitCameraState, rotating: boolean) {
  if (rotating) {
    camera.timeOffset = performance.now();
  } else {
    camera.spinOffset = camera.spin;
  }
}

/**
 * Advances `camera.spin` when `autoRotating` is true, then returns the
 * world-to-model rotation matrix for the camera's current orientation.
 */
export function getWorldToModel(
  camera: OrbitCameraState,
  autoRotating: boolean,
  pitchMatrix: Matrix3x3,
  yawMatrix: Matrix3x3,
  out: Matrix3x3,
): Matrix3x3 {
  Matrix3x3.rotationX(-camera.pitch, pitchMatrix);
  if (autoRotating) {
    camera.spin =
      ((performance.now() - camera.timeOffset) / 1000) * TURNTABLE_RADIANS_PER_SECOND +
      camera.spinOffset;
  }
  Matrix3x3.rotationY(-(camera.yaw + camera.spin), yawMatrix);
  return Matrix3x3.multiply(yawMatrix, pitchMatrix, out);
}
