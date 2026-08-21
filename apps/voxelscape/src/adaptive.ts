// Adaptive render-resolution scaler. Pure logic (no DOM/canvas/RAF), so the
// convergence behaviour can be unit-tested by feeding synthetic frame times.
export interface ResConfig {
  // 60fps frame budget in ms
  budgetMs: number;
  // ema above budget * this => consider downscaling
  downFactor: number;
  // ema below budget * this => consider upscaling
  upFactor: number;
  // sustained slow frames before stepping down
  downFrames: number;
  // sustained fast frames before stepping up
  upFrames: number;
  // scale multiplier when stepping down (0.5 == the old halving step)
  downStep: number;
  // scale multiplier when stepping up (2 == the old doubling step)
  upStep: number;
  // lowest render scale
  minScale: number;
  // frames to hold still after a change (let the resize settle)
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

  /** Feed one frame's delta time (ms) and run the adaptation decision. */
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
   * Feed one frame's delta time (ms) without deciding (e.g. debug readback
   * frames stall the GPU, so their timing is not representative).
   */
  frame(dtMs: number): number {
    this.emaMs = this.emaMs * 0.9 + dtMs * 0.1;
    return this._scale;
  }

  /** Hold adaptation for a while (e.g. after an external canvas resize). */
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
