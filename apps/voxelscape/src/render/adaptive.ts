/**
 * Adaptive render-resolution scaler. Pure logic with no DOM, canvas, or
 * `requestAnimationFrame` dependency, so the convergence behaviour can be
 * unit-tested by feeding it synthetic frame times.
 *
 * It decides from whether a frame met its refresh deadline, not from how many
 * milliseconds that frame took. The loop feeding it is driven by
 * `requestAnimationFrame`, so the gap between frames is quantised to the
 * display's refresh interval: at 60 hertz a frame costing 2 milliseconds and
 * one costing 15 both arrive 16.7 milliseconds apart. That gap distinguishes a
 * missed deadline from a met one, but it can never say how much room a met one
 * had to spare, so stepping back up is a probe rather than a calculation —
 * kept only if the frames after it still meet the deadline.
 *
 * Stepping down is checked the same way, against a different failure: frames
 * can miss their deadline for reasons resolution has no bearing on, a mesh
 * rebuild or a browser throttling the loop on battery among them. Once a
 * descent has given up half the scale — a quarter of the pixels — and the
 * frames are no faster for it, the limit is not fill rate, and the scale goes
 * back where it started.
 */
export interface ResolutionConfig {
  /**
   * The frame interval to aim for, in milliseconds. A display refreshing
   * faster than this is left to it: resolution is worth more than a frame
   * rate above 60 per second, and no display refreshes slower.
   */
  targetMs: number;
  /** A frame gap this many times the target interval or longer missed its deadline. */
  missFactor: number;
  /**
   * Frame gaps longer than this, in milliseconds, are discarded rather than
   * judged: they are stalls, not slow frames.
   */
  outlierMs: number;
  /** Net missed deadlines required before stepping down. */
  downFrames: number;
  /** Consecutive met deadlines required before probing upward. */
  upFrames: number;
  /** Scale multiplier applied each time the controller steps down. */
  downStep: number;
  /** Scale multiplier applied each time the controller probes upward. */
  upStep: number;
  /** Lowest scale the controller will adapt to. */
  minScale: number;
  /** Frames to hold still after a change, letting the resize settle. */
  settleFrames: number;
  /** Frames an upward probe must survive before it counts as confirmed. */
  probeFrames: number;
  /** Frames to wait after a refuted upward probe before probing again. */
  probeCooldownFrames: number;
  /** How many times consecutive refuted probes may double the wait. */
  maxProbeBackoff: number;
  /**
   * Fraction of the scale a descent must have given up before it is asked
   * whether it achieved anything.
   */
  futilityScale: number;
  /** Fraction of its previous frame gap a descent has to reach to count as working. */
  improveFactor: number;
  /** Frames to wait after a futile descent before stepping down again. */
  downCooldownFrames: number;
}

export const DEFAULT_RESOLUTION: ResolutionConfig = {
  targetMs: 1000 / 60,
  // Frame gaps are whole multiples of the refresh interval, so the meaningful
  // split sits between one interval and two.
  missFactor: 1.5,
  outlierMs: 1000,
  downFrames: 30,
  upFrames: 120,
  // Steps of ~1.25x instead of 2x: rendering cost scales with scale^2, so a 2x
  // step is a 4x pixel-cost jump that leaps straight across the range of scales
  // a marginal device can hold, and makes the controller oscillate between two
  // scales that are both wrong. Finer steps land on one that works.
  downStep: 0.8,
  upStep: 1.25,
  minScale: 0.25,
  settleFrames: 10,
  probeFrames: 120,
  probeCooldownFrames: 600,
  maxProbeBackoff: 4,
  // Four steps down, which is a sixth of the pixels: enough that fill rate
  // cannot plausibly still be the limit if nothing has improved.
  futilityScale: 0.5,
  improveFactor: 0.9,
  downCooldownFrames: 900,
};

/**
 * `"auto"` adapts to the measured frame gaps; `"fixed"` holds whatever scale
 * was pinned and ignores them.
 */
export type ResolutionMode = "auto" | "fixed";

/** Lowest scale a pin may request, keeping the canvas from collapsing to a few pixels. */
const MIN_FIXED_SCALE = 0.1;

export class AdaptiveResolution {
  private readonly config: ResolutionConfig;
  private _scale: number;
  private _mode: ResolutionMode = "auto";

  /** Missed deadlines since the last change, leaking toward zero as deadlines are met. */
  private missedFrames: number = 0;
  /** Consecutive met deadlines since the last change. */
  private metFrames: number = 0;
  private settle: number = 0;
  /**
   * Exponential moving average of the frame gap, in milliseconds. Read only
   * against its own earlier value, to tell whether a descent changed anything;
   * quantisation makes it useless as an absolute measure of render cost.
   */
  private meanGapMs: number;

  /** The scale an upward probe stepped up from, or `null` when none is in flight. */
  private probedFrom: number | null = null;
  /** Frames left in which a missed deadline would refute the probe in flight. */
  private probeWindow: number = 0;
  private probeCooldown: number = 0;
  private probeFailures: number = 0;

  /** The scale the current descent started from, or `null` when not descending. */
  private descentFrom: number | null = null;
  /** The mean frame gap when the current descent started. */
  private descentGapMs: number = 0;
  private downCooldown: number = 0;
  private downFailures: number = 0;

  constructor(
    config: Partial<ResolutionConfig> = {},
    initialScale: number = 1,
  ) {
    this.config = { ...DEFAULT_RESOLUTION, ...config };
    this._scale = initialScale;
    this.meanGapMs = this.config.targetMs;
  }

  get scale(): number {
    return this._scale;
  }

  get mode(): ResolutionMode {
    return this._mode;
  }

  /** The measured frame rate, in frames per second. */
  get framesPerSecond(): number {
    return 1000 / this.meanGapMs;
  }

  /** Resumes adapting, from whatever scale is current. */
  setAuto(): void {
    this._mode = "auto";
    this.missedFrames = 0;
    this.metFrames = 0;
    this.probedFrom = null;
    this.probeWindow = 0;
    this.probeCooldown = 0;
    this.probeFailures = 0;
    this.descentFrom = null;
    this.downCooldown = 0;
    this.downFailures = 0;
    this.hold();
  }

  /** Pins the scale, clamped to between a tenth of the display resolution and all of it. */
  setFixed(scale: number): void {
    this._mode = "fixed";
    this._scale = roundScale(Math.min(1, Math.max(MIN_FIXED_SCALE, scale)));
  }

  describe(): string {
    const percent = Math.round(this._scale * 100);
    const rate = Math.round(this.framesPerSecond);
    if (this._mode === "fixed") {
      return `resolution: ${percent}% of the display resolution, pinned — ${rate} frames per second`;
    }
    if (this.downCooldown > 0) {
      return `resolution: ${percent}% of the display resolution, not stepping down (lowering it did not make frames any faster) — ${rate} frames per second`;
    }
    return `resolution: ${percent}% of the display resolution, adapting — ${rate} frames per second`;
  }

  /** Feed one frame's gap from the previous frame, in milliseconds, and adapt. */
  update(frameMs: number): number {
    return this.observe(frameMs, true);
  }

  /**
   * Feed one frame's gap from the previous frame, in milliseconds, without
   * judging it — debug readback frames, for example, stall the graphics
   * pipeline, so missing a deadline says nothing about the render cost.
   */
  frame(frameMs: number): number {
    return this.observe(frameMs, false);
  }

  /** Hold adaptation for a while — for example, after an external canvas resize. */
  hold(frames: number = this.config.settleFrames): void {
    this.settle = Math.max(this.settle, frames);
  }

  private observe(frameMs: number, judge: boolean): number {
    if (this._mode === "fixed") {
      return this._scale;
    }
    if (!(frameMs > 0) || frameMs > this.config.outlierMs) {
      // A gap this long is a stall — the page was hidden, the window was
      // occluded, the machine slept — not a frame the renderer was too slow to
      // finish. Judging it would read as a run of missed deadlines and step
      // the scale down every time the player comes back.
      this.hold();
      return this._scale;
    }
    this.meanGapMs = this.meanGapMs * 0.9 + frameMs * 0.1;
    if (this.probeCooldown > 0) {
      this.probeCooldown--;
    }
    if (this.downCooldown > 0) {
      this.downCooldown--;
    }
    if (this.probeWindow > 0) {
      this.probeWindow--;
      if (this.probeWindow === 0) {
        // Nothing refuted the step up while it was in flight, so it holds.
        this.probedFrom = null;
        this.probeFailures = 0;
      }
    }
    if (this.settle > 0) {
      this.settle--;
      return this._scale;
    }
    if (judge) {
      this.adapt(frameMs);
    }
    return this._scale;
  }

  private adapt(frameMs: number): void {
    if (frameMs > this.config.targetMs * this.config.missFactor) {
      this.metFrames = 0;
      this.missedFrames++;
      if (this.missedFrames >= this.config.downFrames) {
        this.stepDown();
      }
      return;
    }
    this.metFrames++;
    // A met deadline pays back one missed one rather than clearing the count:
    // an isolated hitch — a texture upload, a garbage collection — is not the
    // sustained overload a step down is for, so only a run of frames that
    // misses more often than it hits reaches the threshold.
    if (this.missedFrames > 0) {
      this.missedFrames--;
    }
    if (this.metFrames >= this.config.upFrames) {
      this.stepUp();
    }
  }

  private stepDown(): void {
    this.missedFrames = 0;
    if (this.probedFrom !== null) {
      // The frames since the last probe have not held the deadline, so the
      // probe is refuted: fall back to the scale it came from, and wait longer
      // before trying that scale again each time it fails, so a device that
      // cannot hold it stops pulsing between the two.
      const target = this.probedFrom;
      this.probedFrom = null;
      this.probeWindow = 0;
      this.probeFailures = Math.min(
        this.probeFailures + 1,
        this.config.maxProbeBackoff,
      );
      this.probeCooldown =
        this.config.probeCooldownFrames * 2 ** this.probeFailures;
      this.setScale(target);
      return;
    }
    if (this.downCooldown > 0) {
      return;
    }
    if (
      this.descentFrom !== null &&
      this._scale <= this.descentFrom * this.config.futilityScale
    ) {
      if (this.meanGapMs > this.descentGapMs * this.config.improveFactor) {
        // A quarter of the pixels are being drawn and the frames are no
        // faster, so whatever they are waiting on isn't fill rate. Give the
        // resolution back and stop trying for a while.
        const target = this.descentFrom;
        this.descentFrom = null;
        this.downFailures = Math.min(
          this.downFailures + 1,
          this.config.maxProbeBackoff,
        );
        this.downCooldown =
          this.config.downCooldownFrames * 2 ** this.downFailures;
        this.setScale(target);
        return;
      }
      // It is working, so measure the next stretch of the descent from here.
      this.descentFrom = this._scale;
      this.descentGapMs = this.meanGapMs;
      this.downFailures = 0;
    }
    if (this.descentFrom === null) {
      this.descentFrom = this._scale;
      this.descentGapMs = this.meanGapMs;
    }
    this.setScale(
      Math.max(this.config.minScale, this._scale * this.config.downStep),
    );
  }

  private stepUp(): void {
    this.metFrames = 0;
    // Deadlines are being met, so whatever descent led here is over: the gap
    // it was measured against no longer describes anything, and a descent
    // that was futile under the old conditions deserves another try under
    // these ones.
    this.descentFrom = null;
    this.downCooldown = 0;
    this.downFailures = 0;
    if (
      this._scale >= 1 ||
      this.probeCooldown > 0 ||
      this.probedFrom !== null
    ) {
      return;
    }
    this.probedFrom = this._scale;
    this.probeWindow = this.config.probeFrames;
    this.setScale(Math.min(1, this._scale * this.config.upStep));
  }

  private setScale(scale: number): void {
    this.missedFrames = 0;
    this.metFrames = 0;
    const rounded = roundScale(scale);
    if (rounded === this._scale) {
      return;
    }
    this._scale = rounded;
    this.settle = this.config.settleFrames;
  }
}

/**
 * Rounds a scale to three decimal places, so that stepping down and back up
 * lands on the value it started from and the debug readout stays legible.
 */
const roundScale = (scale: number): number => Math.round(scale * 1000) / 1000;
