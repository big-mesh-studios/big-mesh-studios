// The sword's swing, as a pure pose table. Holding the place button winds the
// sword back while the hold lasts, releasing it swings the sword forward, and
// it then recovers to rest. The card is held at a three-quarter view — rolled
// a quarter turn about the blade's own axis, so it reads as a flat blade in
// three dimensions rather than face-on — and the swing rolls it about the view
// axis around its hilt, so the blade sweeps and the hilt stays in the hand.

/** Where the sword sits in the camera's space: position and roll about the view axis. */
export interface SwingPose {
  x: number;
  y: number;
  z: number;
  /** The card's roll in radians; the sprite already draws the blade diagonally. */
  roll: number;
}

/** The sword at ease, the lower right of the first-person view. */
export const REST_POSE: SwingPose = { x: 0.45, y: -0.35, z: -0.85, roll: 0 };

/** The sword pulled fully back, after the place button has been held long enough. */
export const PULLED_POSE: SwingPose = {
  x: 0.62,
  y: -0.48,
  z: -1.05,
  roll: (35 * Math.PI) / 180,
};

/** The sword at the end of the swing, whipped across and out in front. */
export const SWUNG_POSE: SwingPose = {
  x: 0.38,
  y: -0.18,
  z: -0.68,
  roll: (-50 * Math.PI) / 180,
};

/** How long a hold takes to pull the sword all the way back, in seconds. */
export const WINDUP_TIME = 0.5;
/** How long the released swing takes, in seconds. */
export const SWING_TIME = 0.22;
/** How long the sword takes to settle back to rest, in seconds. */
export const RECOVER_TIME = 0.28;

export type SwingState = "idle" | "windup" | "swing" | "recover";

const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));

const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);

const easeInOut = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

const lerp = (from: SwingPose, to: SwingPose, t: number): SwingPose => ({
  x: from.x + (to.x - from.x) * t,
  y: from.y + (to.y - from.y) * t,
  z: from.z + (to.z - from.z) * t,
  roll: from.roll + (to.roll - from.roll) * t,
});

/**
 * The hand path a swing state draws at a moment of its phase — where the
 * sword's hilt sits, and how far the card is rolled about the view axis.
 *
 * @param phase How far the state has run, 0 to 1: the wind-up's progress, or
 * the swing's or recovery's elapsed time as a fraction of its duration.
 * @param windupProgress How far the wind-up had pulled the sword when the
 * swing started, so a quick tap swings from near rest and a full hold swings
 * from all the way back.
 */
export const poseAt = (
  state: SwingState,
  phase: number,
  windupProgress = 1,
): SwingPose => {
  switch (state) {
    case "idle":
      return REST_POSE;
    case "windup":
      return lerp(REST_POSE, PULLED_POSE, clamp01(phase));
    case "swing":
      return lerp(
        lerp(REST_POSE, PULLED_POSE, clamp01(windupProgress)),
        SWUNG_POSE,
        easeOut(clamp01(phase)),
      );
    case "recover":
      return lerp(SWUNG_POSE, REST_POSE, easeInOut(clamp01(phase)));
  }
};

/** The hilt's offset from the card's centre, as a fraction of its size. */
export const HANDLE_FRACTION = { x: -5.6 / 24, y: -6 / 24, z: 0 };

/** The three-quarter view: roll the card about the blade's own diagonal axis. */
export const BASE_ROTATION_AXIS = {
  x: Math.sqrt(0.5),
  y: Math.sqrt(0.5),
  z: 0,
};
export const BASE_ROTATION_ANGLE = Math.PI / 4;

/** A unit quaternion, x y z w. */
type Quat = [number, number, number, number];

const quatFromAxisAngle = (
  { x, y, z }: { x: number; y: number; z: number },
  angle: number,
): Quat => {
  const half = angle / 2;
  const s = Math.sin(half);
  return [x * s, y * s, z * s, Math.cos(half)];
};

const quatMultiply = (a: Quat, b: Quat): Quat => {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
};

const cross = (
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): { x: number; y: number; z: number } => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

const scale = (
  a: { x: number; y: number; z: number },
  s: number,
): { x: number; y: number; z: number } => ({
  x: a.x * s,
  y: a.y * s,
  z: a.z * s,
});

const add = (
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): { x: number; y: number; z: number } => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});

/** Rotates a vector by a unit quaternion. */
export const quatRotate = (
  q: Quat,
  v: { x: number; y: number; z: number },
): { x: number; y: number; z: number } => {
  const [x, y, z, w] = q;
  const u = { x, y, z };
  const t = scale(cross(u, v), 2);
  return add(add(v, scale(t, w)), cross(u, t));
};

/** Where the mesh sits and how it faces: position plus an orientation quaternion. */
export interface SwingTransform {
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
}

/**
 * The mesh transform that puts the sword's hilt on the hand path and rolls the
 * card about the view axis on top of the three-quarter view, with the hilt as
 * the pivot — the position shifts so the hilt stays put while the blade sweeps.
 *
 * @param cardSize The card's world size, so the hilt's pixel offset becomes a
 * real offset from the card's centre.
 */
export const swingTransform = (
  state: SwingState,
  phase: number,
  windupProgress: number,
  cardSize: number,
): SwingTransform => {
  const pose = poseAt(state, phase, windupProgress);
  const base = quatFromAxisAngle(BASE_ROTATION_AXIS, BASE_ROTATION_ANGLE);
  const swing = quatFromAxisAngle({ x: 0, y: 0, z: 1 }, pose.roll);
  const orientation = quatMultiply(swing, base);
  const handleLocal = {
    x: HANDLE_FRACTION.x * cardSize,
    y: HANDLE_FRACTION.y * cardSize,
    z: 0,
  };
  const hilt = quatRotate(orientation, handleLocal);
  return {
    x: pose.x - hilt.x,
    y: pose.y - hilt.y,
    z: pose.z - hilt.z,
    qx: orientation[0],
    qy: orientation[1],
    qz: orientation[2],
    qw: orientation[3],
  };
};
