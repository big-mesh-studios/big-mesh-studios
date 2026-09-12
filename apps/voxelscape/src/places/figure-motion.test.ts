// @vitest-environment node
import { describe, expect, it } from "vitest";
import { FigureMotionTrack } from "./figure-motion";

describe("FigureMotionTrack", () => {
  it("draws a figure that never moves exactly where it stands", () => {
    const track = new FigureMotionTrack({ x: 5, z: -3 }, 0);
    const first = track.next({ x: 5, z: -3 }, 16, 0.016);
    expect(first).toEqual({ x: 5, z: -3 });
    const later = track.next({ x: 5, z: -3 }, 500, 0.016);
    expect(later).toEqual({ x: 5, z: -3 });
  });

  it("extrapolates between two reports rather than holding still until the next one", () => {
    const track = new FigureMotionTrack({ x: 0, z: 0 }, 0);
    // A report 100ms later, 0.24 units on — 2.4 units/second, a walking pace.
    track.next({ x: 0.24, z: 0 }, 100, 0.1);
    // Halfway to the next report, with no new report yet: the extrapolated
    // target has advanced past the last report, not frozen on it.
    const mid = track.next({ x: 0.24, z: 0 }, 150, 0.05);
    expect(mid.x).toBeGreaterThan(0.24);
  });

  it("eases toward a small correction rather than snapping to it", () => {
    const track = new FigureMotionTrack({ x: 0, z: 0 }, 0);
    const result = track.next({ x: 1, z: 0 }, 16, 0.016);
    expect(result.x).toBeGreaterThan(0);
    expect(result.x).toBeLessThan(1);
  });

  it("snaps instantly to a correction too large to be ordinary motion", () => {
    const track = new FigureMotionTrack({ x: 0, z: 0 }, 0);
    const result = track.next({ x: 50, z: 0 }, 16, 0.016);
    expect(result).toEqual({ x: 50, z: 0 });
  });

  it("caps how far a single stale jump keeps extrapolating", () => {
    const track = new FigureMotionTrack({ x: 0, z: 0 }, 0);
    // A one-off large jump, 16ms after construction — immediately snapped to.
    track.next({ x: 50, z: 0 }, 16, 0.016);
    // No further report arrives; extrapolation still assumes the (clamped)
    // inferred speed from that one jump, but only for up to a second of it.
    const afterOneSecond = track.next({ x: 50, z: 0 }, 1_016, 0.016);
    expect(afterOneSecond.x).toBeGreaterThan(50);
    const afterTwoSeconds = track.next({ x: 50, z: 0 }, 2_016, 0.016);
    expect(afterTwoSeconds.x).toBeCloseTo(afterOneSecond.x, 5);
  });
});
