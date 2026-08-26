// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  AdaptiveResolution,
  DEFAULT_RESOLUTION,
  type ResolutionConfig,
} from "./adaptive";

const REFRESH_60_HERTZ = 1000 / 60;
const REFRESH_120_HERTZ = 1000 / 120;

/**
 * The gap a frame costing `costMs` reports on a display refreshing every
 * `refreshMs`. `requestAnimationFrame` delivers frames on refresh boundaries,
 * so a frame that overruns one boundary waits for the next: the gap is always
 * a whole number of refresh intervals, and a frame with room to spare is
 * indistinguishable from one that only just fit.
 */
const vsyncGap = (costMs: number, refreshMs: number): number =>
  Math.max(1, Math.ceil(costMs / refreshMs)) * refreshMs;

/**
 * Drives the scaler with a device whose render cost scales with the rendered
 * pixel count (cost ~ scale^2) exactly like the raymarcher, drawn on a display
 * of a given refresh rate. `costAtOne` is the cost, in milliseconds, of a
 * full-resolution frame.
 */
const simulate = (
  costAtOne: number,
  options: {
    config?: Partial<ResolutionConfig>;
    startScale?: number;
    frames?: number;
    refreshMs?: number;
  } = {},
) => {
  const refreshMs = options.refreshMs ?? REFRESH_60_HERTZ;
  const controller = new AdaptiveResolution(
    options.config,
    options.startScale ?? 1,
  );
  const frames = options.frames ?? 6000;
  const changes: Array<{ frame: number; scale: number }> = [];
  let scale = controller.scale;
  for (let index = 0; index < frames; index++) {
    const next = controller.update(
      vsyncGap(costAtOne * scale * scale, refreshMs),
    );
    if (next !== scale) {
      changes.push({ frame: index, scale: next });
      scale = next;
    }
  }
  return { changes, scale: controller.scale, controller };
};

/** The gaps, in frames, between each time the scale was stepped up from the one before. */
const intervalsBetweenProbes = (
  changes: Array<{ frame: number; scale: number }>,
): number[] => {
  const probes: number[] = [];
  let previous = 1;
  for (const { frame, scale } of changes) {
    if (scale > previous) {
      probes.push(frame);
    }
    previous = scale;
  }
  return probes.slice(1).map((frame, index) => frame - probes[index]);
};

describe("AdaptiveResolution", () => {
  it("steps down until frames land inside one refresh interval", () => {
    // 30 milliseconds at full resolution spans two refresh intervals at 60
    // hertz; 0.64 scale costs 12.3 milliseconds and fits inside one.
    const { scale } = simulate(30);
    expect(scale).toBe(0.64);
  });

  it("steps down repeatedly on a slow device until it finds a scale that fits", () => {
    const { changes, scale } = simulate(60);
    expect(changes.length).toBeGreaterThan(1);
    expect(scale).toBeLessThan(0.8);
  });

  it("recovers back up to full resolution once headroom exists", () => {
    const { scale } = simulate(8, { startScale: 0.25 });
    expect(scale).toBe(1);
  });

  // The regression this whole design exists for: a scaler judging frames
  // against a fixed millisecond budget can never step back up on a 60 hertz
  // display, because `requestAnimationFrame` never reports a gap below the
  // refresh interval no matter how cheap the frame is. Every frame here costs
  // 2 milliseconds and every reported gap is 16.7.
  it("recovers on a 60 hertz display, where every reported gap is one refresh interval", () => {
    const { controller } = simulate(2, { startScale: 0.25 });
    expect(controller.scale).toBe(1);
    expect(controller.framesPerSecond).toBeCloseTo(60, 0);
  });

  it("stays at full resolution when frames comfortably fit the refresh interval", () => {
    const { changes, scale } = simulate(8);
    expect(changes).toEqual([]);
    expect(scale).toBe(1);
  });

  it("clamps the scale to [minScale, 1]", () => {
    const slow = simulate(400, { frames: 20000 });
    expect(slow.scale).toBe(DEFAULT_RESOLUTION.minScale);
    expect(slow.changes.filter(({ frame }) => frame > 10000)).toEqual([]);

    const fast = simulate(0.1, { startScale: 1 });
    expect(fast.changes).toEqual([]);
  });

  it("does not chase a refresh rate above 60 per second on a faster display", () => {
    // 12 milliseconds a frame overruns a 120 hertz interval but fits well
    // inside 60 per second, which is as fast as the scaler tries to run.
    const { changes, scale } = simulate(12, { refreshMs: REFRESH_120_HERTZ });
    expect(changes).toEqual([]);
    expect(scale).toBe(1);
  });

  it("keeps a stall from stepping the scale down", () => {
    // A page hidden for five seconds reports the whole absence as one frame's
    // gap on the way back. Ten of those must leave the scale untouched.
    const controller = new AdaptiveResolution();
    for (let round = 0; round < 10; round++) {
      for (let frame = 0; frame < 200; frame++) {
        controller.update(REFRESH_60_HERTZ);
      }
      controller.update(5000);
    }
    expect(controller.scale).toBe(1);
  });

  it("backs off after repeated refuted probes instead of pulsing between two scales", () => {
    // A device that holds 0.64 but not 0.8 can only find out by trying 0.8 and
    // failing, so the pulse can't be eliminated — only spaced further apart
    // each time, until it is rare enough not to be a distraction.
    const intervals = intervalsBetweenProbes(
      simulate(30, { frames: 20000 }).changes,
    );
    expect(intervals.length).toBeGreaterThanOrEqual(3);
    for (let index = 1; index < intervals.length; index++) {
      expect(intervals[index]).toBeGreaterThan(intervals[index - 1]);
    }
  });

  it("gives the resolution back when lowering it makes no difference", () => {
    // A browser throttling the loop to 30 frames a second on battery looks
    // exactly like a renderer missing every deadline, until the scale drops
    // and the frames come no faster.
    const controller = new AdaptiveResolution();
    let lowest = 1;
    let previous = 1;
    const descents: number[] = [];
    for (let frame = 0; frame < 20000; frame++) {
      const scale = controller.update(REFRESH_60_HERTZ * 2);
      if (scale < previous && previous === 1) {
        descents.push(frame);
      }
      previous = scale;
      lowest = Math.min(lowest, scale);
    }
    expect(lowest).toBeLessThan(1); // it did try lowering the resolution
    expect(controller.scale).toBe(1); // and put it back when that changed nothing
    expect(controller.describe()).toContain("not stepping down");
    // and each futile descent buys a longer wait before the next one
    const secondHalf = descents.filter((frame) => frame >= 10000).length;
    expect(secondHalf).toBeLessThan(descents.length - secondHalf);
  });

  it("keeps stepping down while lowering the resolution is still helping", () => {
    // The same total drop as the futile case, but here the frames get faster
    // for it, so the descent is allowed to continue past the point where it is
    // asked to justify itself.
    const { scale } = simulate(400, { frames: 20000 });
    expect(scale).toBeLessThan(DEFAULT_RESOLUTION.futilityScale);
  });

  it("ignores frame times while the scale is pinned", () => {
    const controller = new AdaptiveResolution();
    controller.setFixed(0.5);
    for (let frame = 0; frame < 2000; frame++) {
      controller.update(vsyncGap(200, REFRESH_60_HERTZ));
    }
    expect(controller.scale).toBe(0.5);
    expect(controller.mode).toBe("fixed");
    expect(controller.describe()).toContain("pinned");
  });

  it("resumes adapting from the pinned scale", () => {
    const controller = new AdaptiveResolution();
    controller.setFixed(0.5);
    controller.setAuto();
    expect(controller.mode).toBe("auto");
    let scale = controller.scale;
    for (let frame = 0; frame < 6000; frame++) {
      scale = controller.update(vsyncGap(2 * scale * scale, REFRESH_60_HERTZ));
    }
    expect(scale).toBe(1);
  });

  it("tolerates isolated hitches without stepping down", () => {
    // One dropped frame in every ten is a hitch, not the sustained overload a
    // step down is for.
    const controller = new AdaptiveResolution();
    for (let frame = 0; frame < 6000; frame++) {
      controller.update(
        frame % 10 === 0 ? REFRESH_60_HERTZ * 2 : REFRESH_60_HERTZ,
      );
    }
    expect(controller.scale).toBe(1);
  });
});
