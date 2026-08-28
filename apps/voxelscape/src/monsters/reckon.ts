// Dead reckoning for rendered monsters: the position a monster is drawn at is
// extrapolated from its last known pose by its velocity, so a remote zombie
// keeps walking between broadcasts instead of stuttering from sample to
// sample. The math is pure and injected with a clock, so the renderer's
// behaviour is unit-testable without any scene objects. A sample the
// simulation refreshed within the last few milliseconds is taken as exact; an
// older one is extrapolated, eased toward on small errors, and snapped to on
// large ones (a teleport or an ownership change must not glide across the map).
import type { MonsterPose, MonsterSnapshot } from "./monster";

export interface Position3 {
  x: number;
  y: number;
  z: number;
}

/** A sample fresher than this (ms) is the simulation's own, drawn exactly. */
export const FRESH_MS = 50;
/** How fast the rendered position catches up to a moving extrapolation target. */
export const BLEND_RATE = 12;
/** A correction larger than this (world units) is snapped to, not eased toward. */
export const SNAP_THRESHOLD = 3;
/** Oldest sample age that still extrapolates; beyond it the monster holds still. */
export const MAX_EXTRAPOLATION_SECONDS = 1;

/** The position a pose extrapolates to `age` seconds after it was true. */
export const extrapolate = (pose: MonsterPose, age: number): Position3 => ({
  x: pose.x + pose.vx * age,
  y: pose.y,
  z: pose.z + pose.vz * age,
});

/** Horizontal (xz) distance between two positions. */
export const horizontalDistance = (a: Position3, b: Position3): number =>
  Math.hypot(a.x - b.x, a.z - b.z);

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** The point `alpha` of the way from `current` toward `target`. */
export const blend = (
  current: Position3,
  target: Position3,
  alpha: number,
): Position3 => ({
  x: lerp(current.x, target.x, alpha),
  y: lerp(current.y, target.y, alpha),
  z: lerp(current.z, target.z, alpha),
});

export interface RenderStep {
  snapshot: MonsterSnapshot;
  /** The position the monster was drawn at last frame. */
  current: Position3;
  /** Milliseconds since epoch. */
  now: number;
  /** Seconds since the last frame. */
  dt: number;
  freshMs?: number;
  blendRate?: number;
  snapThreshold?: number;
}

export interface RenderResult {
  position: Position3;
  /** True when the error was large enough to snap to the sample's extrapolation. */
  snapped: boolean;
}

/**
 * The position to draw the monster at this frame. A fresh sample (the local
 * simulation stepped it this frame) is drawn exactly; otherwise the pose is
 * extrapolated by its velocity, the rendered position eases toward that target
 * on small errors, and snaps to it when the correction is large enough that
 * easing would glide visibly.
 */
export const nextRenderedPosition = (step: RenderStep): RenderResult => {
  const { snapshot, current, now, dt } = step;
  const freshMs = step.freshMs ?? FRESH_MS;
  const blendRate = step.blendRate ?? BLEND_RATE;
  const snapThreshold = step.snapThreshold ?? SNAP_THRESHOLD;

  const age = (now - snapshot.updatedAt) / 1000;
  if (age * 1000 <= freshMs) {
    return {
      position: { x: snapshot.pose.x, y: snapshot.pose.y, z: snapshot.pose.z },
      snapped: false,
    };
  }

  const target = extrapolate(
    snapshot.pose,
    Math.min(age, MAX_EXTRAPOLATION_SECONDS),
  );
  if (horizontalDistance(current, target) > snapThreshold) {
    return { position: target, snapped: true };
  }
  const alpha = 1 - Math.exp(-blendRate * dt);
  return { position: blend(current, target, alpha), snapped: false };
};
