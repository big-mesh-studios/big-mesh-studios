import { Accessor, createEffect } from "solid-js";
import { Matrix3x3 } from "./maths";

export const MIN_RADIUS = 2;
export const MAX_RADIUS = 20;
export const RADIANS_PER_PIXEL = 0.005;
export const PITCH_LIMIT = Math.PI / 2 - 0.01;

const TURNTABLE_SECONDS_PER_REVOLUTION = 20;
const TURNTABLE_RADIANS_PER_SECOND = -(2 * Math.PI) / TURNTABLE_SECONDS_PER_REVOLUTION;

// The orbit yaw/pitch/radius and autorotate spin are shared across renderers,
// not owned by either, so switching which one is mounted carries the current
// framing forward instead of snapping back to the initial view.
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

// Keeps the autorotate spin continuous across play/pause: pausing freezes it
// at its current angle, resuming measures onward from the moment it resumes
// rather than from when autorotate first turned on.
export function trackAutorotate(camera: OrbitCameraState, autorotate: Accessor<boolean>) {
  createEffect(autorotate, rotating => {
    if (rotating) {
      camera.timeOffset = performance.now();
    } else {
      camera.spinOffset = camera.spin;
    }
  });
}

// Advances `camera.spin` (when autorotate is on) and returns the model's
// world-to-model rotation matrix for this frame.
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
