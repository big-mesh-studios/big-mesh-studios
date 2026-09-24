// The motion a place script gives a prop or NPC: a path walked over the shared
// clock, sampled into a pose rather than stepped by the guest. Determinism is
// the point — two peers with the same spec and the same clock reach the same
// offset — so a platform a player stands on is where its script says it is.
// The guest declares the motion once; the trusted side samples it every frame.

/** How a motion's path is walked and repeated. */
export type MotionLoop = "once" | "loop" | "pingpong";

/** How a motion's progress is paced along its path. */
export type MotionEase = "linear" | "smooth";

/** A turn a moving figure takes about a world-space axis. */
export interface MotionSpin {
  /** The axis the figure turns about; it need not be normalized. */
  axis: [number, number, number];
  /**
   * A whole turn applied over the motion's eased progress, from 0 to `turns`,
   * so a `once` motion comes to rest at exactly that angle. Takes the place of
   * a rate; a door swinging 90 degrees asks for `0.25`.
   */
  turns?: number;
  /** Revolutions per second, or absent when the spin is driven by distance. */
  turnsPerSecond?: number;
  /** Degrees of turn per world unit travelled, or absent when driven by time. */
  degreesPerMeter?: number;
  /**
   * The point the figure turns about, in world units, relative to its own
   * feet-centre origin and before its heading is applied — the hinge edge of a
   * door. Absent turns the figure about its own origin, as before.
   */
  pivot?: [number, number, number];
}

/**
 * A back-and-forth offset a motion adds to its figure along an axis: the
 * machinery a script builds out of the clock — a bobbing platform, a swinging
 * arm, a swaying gate — sampled as a sine rather than stepped.
 */
export interface MotionOscillation {
  /** How far the figure moves from its declared position, in world units. */
  amplitude: number;
  /** How long one full back-and-forth takes, in milliseconds. */
  periodMs: number;
  /** The axis it moves along; defaults to straight up. */
  axis?: [number, number, number];
  /** How long the figure stands still before the oscillation begins. */
  startAfterMs?: number;
}

/** The path, spin, and oscillation a prop or NPC follows, as its script declares it. */
export interface MotionSpec {
  /** Offsets from the figure's declared position, in world units. */
  path: Array<[number, number, number]>;
  loop: MotionLoop;
  /** How long one traversal takes, in milliseconds on the shared clock. */
  durationMs: number;
  /** How long the figure stands still before the path begins. */
  startAfterMs?: number;
  ease?: MotionEase;
  spin?: MotionSpin;
  /** A back-and-forth offset over the shared clock, added to the path. */
  oscillate?: MotionOscillation;
}

/** Where a moving figure is at a moment, as an offset from its declared pose. */
export interface MotionPose {
  dx: number;
  dy: number;
  dz: number;
  /** The vertical-axis part of the spin, in radians, for a solid's collision. */
  yaw: number;
  /** The axis the full visual spin turns about. */
  spinAxis: [number, number, number];
  /** The full visual spin, in radians. */
  spinAngle: number;
  /** The hinge the spin turns about, in world units from the figure's origin, or absent for its own origin. */
  spinPivot?: [number, number, number];
  /** How fast the offset is changing, in world units per second. */
  vx: number;
  vy: number;
  vz: number;
}

const smooth = (u: number): number => u * u * (3 - 2 * u);

/** How far along its path a motion is at `clockMs`, before easing. */
const progressAt = (motion: MotionSpec, clockMs: number): number => {
  const elapsed = clockMs - (motion.startAfterMs ?? 0);
  if (elapsed <= 0 || motion.durationMs <= 0) {
    return 0;
  }
  const raw = elapsed / motion.durationMs;
  if (motion.loop === "once") {
    return Math.min(raw, 1);
  }
  if (motion.loop === "pingpong") {
    const cycle = raw % 2;
    return cycle <= 1 ? cycle : 2 - cycle;
  }
  return raw - Math.floor(raw);
};

/** The eased path position at `clockMs`. */
const easedAt = (motion: MotionSpec, clockMs: number): number => {
  const u = progressAt(motion, clockMs);
  return motion.ease === "smooth" ? smooth(u) : u;
};

/** The offset at `u` along a polyline, clamped to its ends. */
const pointAt = (
  path: ReadonlyArray<[number, number, number]>,
  u: number,
): [number, number, number] => {
  if (path.length === 0) {
    return [0, 0, 0];
  }
  if (path.length === 1) {
    return path[0];
  }
  const segments = path.length - 1;
  const scaled = Math.max(0, Math.min(1, u)) * segments;
  const index = Math.min(Math.floor(scaled), segments - 1);
  const t = scaled - index;
  const from = path[index];
  const to = path[index + 1];
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
  ];
};

/** The total length of a polyline, in world units. */
const lengthOf = (path: ReadonlyArray<[number, number, number]>): number => {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    total += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  }
  return total;
};

/** A unit axis, or `null` when the given one has no length. */
const unitAxis = (
  axis: [number, number, number],
): [number, number, number] | null => {
  const length = Math.hypot(axis[0], axis[1], axis[2]);
  if (length === 0) {
    return null;
  }
  return [axis[0] / length, axis[1] / length, axis[2] / length];
};

/**
 * Where a moving figure is at `clockMs`: its offset from the declared position,
 * the vertical-axis part of its spin for collision, and the full spin for the
 * renderer. A figure with no path stands at its declared pose.
 */
export const poseAt = (motion: MotionSpec, clockMs: number): MotionPose => {
  const u = easedAt(motion, clockMs);
  const [px, py, pz] = pointAt(motion.path, u);

  // A central difference over a millisecond, so a constant-speed path reports a
  // velocity and a still one reports zero.
  const before = pointAt(motion.path, easedAt(motion, clockMs - 1));
  const after = pointAt(motion.path, easedAt(motion, clockMs + 1));
  let vx = ((after[0] - before[0]) / 2) * 1_000;
  let vy = ((after[1] - before[1]) / 2) * 1_000;
  let vz = ((after[2] - before[2]) / 2) * 1_000;

  // An oscillation is a sine over the shared clock, so it adds an offset and
  // the offset's own velocity to whatever the path is doing.
  let ox = 0;
  let oy = 0;
  let oz = 0;
  if (motion.oscillate !== undefined) {
    const { amplitude, periodMs } = motion.oscillate;
    const periodSeconds = periodMs / 1_000;
    if (amplitude > 0 && periodSeconds > 0) {
      const elapsed = Math.max(
        0,
        clockMs - (motion.oscillate.startAfterMs ?? 0),
      );
      const omega = (Math.PI * 2) / periodSeconds;
      const phase = (elapsed / 1_000) * omega;
      const offset = Math.sin(phase) * amplitude;
      const speed = Math.cos(phase) * amplitude * omega;
      const axis = motion.oscillate.axis ?? [0, 1, 0];
      const length = Math.hypot(axis[0], axis[1], axis[2]);
      const unit =
        length === 0
          ? ([0, 1, 0] as [number, number, number])
          : ([axis[0] / length, axis[1] / length, axis[2] / length] as [
              number,
              number,
              number,
            ]);
      ox = unit[0] * offset;
      oy = unit[1] * offset;
      oz = unit[2] * offset;
      vx += unit[0] * speed;
      vy += unit[1] * speed;
      vz += unit[2] * speed;
    }
  }
  const dx = px + ox;
  const dy = py + oy;
  const dz = pz + oz;

  const spin = motion.spin;
  let angle = 0;
  let yaw = 0;
  let axis: [number, number, number] = [0, 1, 0];
  if (spin !== undefined) {
    const unit = unitAxis(spin.axis);
    if (unit !== null) {
      axis = unit;
      if (spin.turns !== undefined) {
        angle = spin.turns * Math.PI * 2 * u;
      } else if (spin.turnsPerSecond !== undefined) {
        const elapsed = Math.max(0, clockMs - (motion.startAfterMs ?? 0));
        angle = (elapsed / 1_000) * spin.turnsPerSecond * Math.PI * 2;
      } else if (spin.degreesPerMeter !== undefined) {
        angle =
          lengthOf(motion.path) * u * spin.degreesPerMeter * (Math.PI / 180);
      }
      if (Math.abs(unit[1]) > 0.999) {
        yaw = angle * Math.sign(unit[1]);
      }
    }
  }
  return {
    dx,
    dy,
    dz,
    yaw,
    spinAxis: axis,
    spinAngle: angle,
    ...(spin?.pivot !== undefined ? { spinPivot: spin.pivot } : {}),
    vx,
    vy,
    vz,
  };
};
