// @vitest-environment node
import { describe, expect, it } from "vitest";
import { AdaptiveResolution, DEFAULT_RES, type ResConfig } from "./adaptive";

/**
 * Drives the scaler with a device model where frame time scales with the
 * rendered pixel count (render cost ~ scale^2) plus nothing else, exactly like
 * the raymarcher: `dt = costAtOne * scale^2`. `costAtOne` is the frame time in
 * ms at full resolution.
 */
const simulate = (
  costAtOne: number,
  opts: {
    cfg?: Partial<ResConfig>;
    startScale?: number;
    frames?: number;
  } = {},
) => {
  const cfg = { ...DEFAULT_RES, ...opts.cfg };
  const ar = new AdaptiveResolution(cfg, opts.startScale ?? 1);
  const frames = opts.frames ?? 6000;
  const changes: number[] = [];
  let scale = ar.scale;
  for (let i = 0; i < frames; i++) {
    const dt = costAtOne * scale * scale;
    const next = ar.update(dt);
    if (next !== scale) {
      changes.push(i);
      scale = next;
    }
  }
  return { changes, scale: ar.scale, ar };
};

describe("AdaptiveResolution", () => {
  // Regression: with 2x steps (downStep 0.5 / upStep 2) a marginal device whose
  // full-res frame is ~20-40ms oscillates forever: 1x is too slow (downscale),
  // 0.5x is too fast (upscale). This was reported as the app "failing" on fast
  // devices that sit in that marginal band.
  it("converges to a stable scale instead of oscillating on a marginal device", () => {
    const { changes } = simulate(30);
    expect(changes.length).toBeGreaterThan(0); // it did adapt at least once
    const lateChanges = changes.filter((frame) => frame > 1000); // warmup
    expect(lateChanges).toEqual([]);
  });

  it("steps down repeatedly on a slow device until it finds a stable scale", () => {
    const { changes, scale } = simulate(60);
    expect(changes.length).toBeGreaterThan(1);
    expect(scale).toBeLessThan(0.8);
  });

  it("recovers back up to full resolution once headroom exists", () => {
    const { changes, scale } = simulate(8, { startScale: 0.25 });
    expect(scale).toBe(1);
    expect(changes.length).toBeGreaterThan(1);
  });

  it("stays at full resolution when it comfortably fits the budget", () => {
    const { changes, scale } = simulate(8);
    expect(scale).toBe(1);
    expect(changes).toEqual([]);
  });

  it("clamps the scale to [minScale, 1]", () => {
    // ridiculously slow device: must bottom out at minScale and stay there
    const slow = simulate(1000, { frames: 20000 });
    expect(slow.scale).toBe(DEFAULT_RES.minScale);
    const lateSlow = slow.changes.filter((frame) => frame > 10000);
    expect(lateSlow).toEqual([]);

    // ridiculously fast device: never drops below full resolution
    const fast = simulate(0.1, { startScale: 1 });
    expect(fast.changes).toEqual([]);
  });
});
