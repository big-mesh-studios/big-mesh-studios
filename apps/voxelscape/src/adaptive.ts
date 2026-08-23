/**
 * Adaptive render-resolution scaler. Pure logic with no DOM, canvas, or
 * `requestAnimationFrame` dependency, so the convergence behaviour can be
 * unit-tested by feeding it synthetic frame times.
 */
export interface ResConfig {
  /** Frame time budget for 60fps, in milliseconds. */
  budgetMs: number;
  /** Downscale once the exponential moving average exceeds budget times this factor. */
  downFactor: number;
  /** Upscale once the exponential moving average falls below budget times this factor. */
  upFactor: number;
  /** Number of sustained slow frames required before stepping down. */
  downFrames: number;
  /** Number of sustained fast frames required before stepping up. */
  upFrames: number;
  /** Scale multiplier applied each time the controller steps down. */
  downStep: number;
  /** Scale multiplier applied each time the controller steps up. */
  upStep: number;
  /** Lowest allowed render scale. */
  minScale: number;
  /** Frames to hold still after a change, letting the resize settle. */
  settleFrames: number;
}

export const DEFAULT_RES: ResConfig = {
  budgetMs: 16.7,
  downFactor: 1.25,
  upFactor: 0.6,
  downFrames: 30,
  upFrames: 60,
  // Steps of ~1.25x instead of 2x: rendering cost scales with scale^2, so a 2x
  // step is a 4x pixel-cost jump that leaps straight across the neutral band
  // and makes the controller oscillate (1x -> 0.5x -> 1x -> ...) on marginal
  // devices. Finer steps converge to a stable scale inside the band.
  downStep: 0.8,
  upStep: 1.25,
  minScale: 0.25,
  settleFrames: 10,
};

export class AdaptiveResolution {
  private readonly cfg: ResConfig;
  private _scale: number;
  private emaMs: number;
  private slowFrames: number = 0;
  private fastFrames: number = 0;
  private settle: number = 0;

  constructor(cfg: Partial<ResConfig> = {}, initialScale: number = 1) {
    this.cfg = { ...DEFAULT_RES, ...cfg };
    this._scale = initialScale;
    this.emaMs = this.cfg.budgetMs;
  }

  get scale(): number {
    return this._scale;
  }

  /** Feed one frame's delta time, in milliseconds, and run the adaptation decision. */
  update(dtMs: number): number {
    this.emaMs = this.emaMs * 0.9 + dtMs * 0.1;
    if (this.settle > 0) {
      this.settle--;
      return this._scale;
    }
    this.adapt();
    return this._scale;
  }

  /**
   * Feed one frame's delta time, in milliseconds, without deciding — debug
   * readback frames, for example, stall the GPU, so their timing isn't
   * representative.
   */
  frame(dtMs: number): number {
    this.emaMs = this.emaMs * 0.9 + dtMs * 0.1;
    return this._scale;
  }

  /** Hold adaptation for a while — for example, after an external canvas resize. */
  hold(frames: number = this.cfg.settleFrames): void {
    this.settle = Math.max(this.settle, frames);
  }

  private adapt(): void {
    const {
      budgetMs,
      downFactor,
      upFactor,
      downFrames,
      upFrames,
      downStep,
      upStep,
      minScale,
    } = this.cfg;
    const downMs = budgetMs * downFactor;
    const upMs = budgetMs * upFactor;
    if (this.emaMs > downMs && this._scale > minScale) {
      this.slowFrames++;
      this.fastFrames = 0;
      if (this.slowFrames >= downFrames) {
        this.setScale(Math.max(minScale, this._scale * downStep));
      }
    } else if (this.emaMs < upMs && this._scale < 1) {
      this.fastFrames++;
      this.slowFrames = 0;
      if (this.fastFrames >= upFrames) {
        this.setScale(Math.min(1, this._scale * upStep));
      }
    } else {
      this.slowFrames = 0;
      this.fastFrames = 0;
    }
  }

  private setScale(s: number): void {
    this.slowFrames = 0;
    this.fastFrames = 0;
    if (s === this._scale) {
      return;
    }
    this._scale = s;
    this.settle = this.cfg.settleFrames;
  }
}
