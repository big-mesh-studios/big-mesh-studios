import { describe, expect, it } from "vitest";
import { GestureTracker } from "./gestures";

describe("gesture tracker", () => {
  it("turns a single pointer's travel into an orbit", () => {
    const tracker = new GestureTracker();
    tracker.down({ id: 1, x: 0, y: 0 });
    expect(tracker.move({ id: 1, x: 12, y: -4 })).toEqual({
      orbit: { dx: 12, dy: -4 },
    });
  });

  it("reads two pointers as a pan and a pinch", () => {
    const tracker = new GestureTracker();
    tracker.down({ id: 1, x: 0, y: 0 });
    tracker.down({ id: 2, x: 10, y: 0 });

    // One finger moves from ten to twenty away: the centre slides five right
    // and the fingers end twice as far apart.
    const gesture = tracker.move({ id: 2, x: 20, y: 0 })!;
    expect(gesture.pan!.dx).toBeCloseTo(5, 6);
    expect(gesture.pan!.dy).toBeCloseTo(0, 6);
    expect(gesture.zoom).toBeCloseTo(2, 6);
  });

  it("stops reading a camera gesture once one pointer lifts", () => {
    const tracker = new GestureTracker();
    tracker.down({ id: 1, x: 0, y: 0 });
    tracker.down({ id: 2, x: 10, y: 0 });
    expect(tracker.twoFinger).toBe(true);

    tracker.up(2);
    expect(tracker.twoFinger).toBe(false);
    expect(tracker.pointers).toBe(1);
    expect(tracker.move({ id: 1, x: 5, y: 5 })).toEqual({
      orbit: { dx: 5, dy: 5 },
    });
  });

  it("hands back the one pointer left after a pinch", () => {
    const tracker = new GestureTracker();
    tracker.down({ id: 1, x: 3, y: 4 });
    tracker.down({ id: 2, x: 9, y: 4 });
    tracker.up(2);
    expect(tracker.remaining()).toEqual({ id: 1, x: 3, y: 4 });
    tracker.up(1);
    expect(tracker.remaining()).toBeUndefined();
  });

  it("forgets everything when cleared", () => {
    const tracker = new GestureTracker();
    tracker.down({ id: 1, x: 0, y: 0 });
    tracker.clear();
    expect(tracker.pointers).toBe(0);
    expect(tracker.twoFinger).toBe(false);
  });
});
