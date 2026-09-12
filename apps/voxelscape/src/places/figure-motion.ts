// Smooths a scripted figure's horizontal position between the irregular
// updates a script step or a network broadcast delivers. A figure's reported
// (x, z) only changes on whichever tick actually moved it — for a remote peer
// that can be many render frames apart, and a script may throttle how often
// it even reports a position at all — so drawing it exactly where it was last
// told to stand would make it step rather than walk. Tracking the last two
// distinct positions a figure was given lets a horizontal velocity be
// inferred and used to extrapolate between reports; a correction too large to
// be that figure's own motion (a teleport, an ownership handoff) is snapped
// to outright rather than glided across.

export interface Position2 {
  x: number;
  z: number;
}

/** One raw (x, z) a figure was placed at, and the wall-clock moment it was read. */
interface Sample extends Position2 {
  at: number;
}

/** How long a correction keeps extrapolating before the figure holds still at the extrapolated point. */
const MAX_EXTRAPOLATION_SECONDS = 1;
/** How fast the drawn position eases toward the extrapolated target. */
const BLEND_RATE = 12;
/** A correction larger than this, in world units, is snapped to rather than eased toward. */
const SNAP_THRESHOLD = 3;
/**
 * The fastest horizontal speed extrapolation will ever assume a figure is
 * moving at, in world units per second — above any scripted figure's real
 * top speed, so a one-off jump between two reports cannot be read as a
 * sustained velocity and carry the figure on past where it actually landed.
 */
const MAX_INFERRED_SPEED = 8;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const clampSpeed = (v: number): number =>
  Math.max(-MAX_INFERRED_SPEED, Math.min(MAX_INFERRED_SPEED, v));

/**
 * The drawn position of one figure: the last two positions it was actually
 * given and the point it is currently rendered at, which eases toward each
 * new report rather than jumping to it.
 */
export class FigureMotionTrack {
  private current: Sample;
  private previous: Sample | null = null;
  private rendered: Position2;

  constructor(initial: Position2, at: number) {
    this.current = { ...initial, at };
    this.rendered = { ...initial };
  }

  /**
   * Advances the drawn position by `dt` seconds toward wherever `raw` — this
   * figure's latest reported position — extrapolates or eases to. `raw` is
   * recorded as a new report first when it differs from the last one seen.
   */
  next(raw: Position2, at: number, dt: number): Position2 {
    if (raw.x !== this.current.x || raw.z !== this.current.z) {
      this.previous = this.current;
      this.current = { ...raw, at };
    }
    const target = this.extrapolate(at);
    const correction = Math.hypot(
      target.x - this.rendered.x,
      target.z - this.rendered.z,
    );
    this.rendered =
      correction > SNAP_THRESHOLD
        ? target
        : {
            x: lerp(this.rendered.x, target.x, 1 - Math.exp(-BLEND_RATE * dt)),
            z: lerp(this.rendered.z, target.z, 1 - Math.exp(-BLEND_RATE * dt)),
          };
    return this.rendered;
  }

  private extrapolate(at: number): Position2 {
    if (this.previous === null) {
      return this.current;
    }
    const elapsed = (this.current.at - this.previous.at) / 1000;
    if (elapsed <= 0) {
      return this.current;
    }
    const vx = clampSpeed((this.current.x - this.previous.x) / elapsed);
    const vz = clampSpeed((this.current.z - this.previous.z) / elapsed);
    const age = Math.min(
      (at - this.current.at) / 1000,
      MAX_EXTRAPOLATION_SECONDS,
    );
    return { x: this.current.x + vx * age, z: this.current.z + vz * age };
  }
}
