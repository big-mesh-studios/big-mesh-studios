import { describe, expect, it } from "vitest";
import {
  radiansDragged,
  ringUnderPointer,
  type RingOnScreen,
} from "./turn-widget";
import type { WidgetAxis } from "./arm-widget";

/** A ring lying flat on the canvas, `radius` pixels about `middle`. */
const ringOnScreen = (
  axis: WidgetAxis,
  radius: number,
  facing = true,
  middle = { x: 100, y: 100 },
): RingOnScreen => ({
  axis,
  middle,
  around: Array.from({ length: 48 }, (_, step) => {
    const angle = (step / 48) * 2 * Math.PI;
    return {
      x: middle.x + Math.cos(angle) * radius,
      y: middle.y + Math.sin(angle) * radius,
    };
  }),
  facing,
});

describe("ringUnderPointer", () => {
  const wide = ringOnScreen("y", 60);
  const narrow = ringOnScreen("x", 20);

  it("takes hold of a ring the pointer is on", () => {
    expect(ringUnderPointer({ x: 160, y: 100 }, [wide])).toBe("y");
  });

  it("lets go of one the pointer is well inside", () => {
    expect(ringUnderPointer({ x: 100, y: 100 }, [wide])).toBe(undefined);
  });

  it("lets go of one the pointer is well outside", () => {
    expect(ringUnderPointer({ x: 300, y: 100 }, [wide])).toBe(undefined);
  });

  it("takes the nearer of two rings, which is the one drawn in front", () => {
    expect(ringUnderPointer({ x: 121, y: 100 }, [wide, narrow])).toBe("x");
    expect(ringUnderPointer({ x: 159, y: 100 }, [wide, narrow])).toBe("y");
  });
});

describe("radiansDragged", () => {
  const ring = ringOnScreen("y", 60);

  it("reads nothing at all from a pointer that has not moved", () => {
    expect(
      radiansDragged({ x: 160, y: 100 }, { x: 160, y: 100 }, ring),
    ).toBeCloseTo(0);
  });

  it("reads a quarter turn from a quarter of the way round", () => {
    // The canvas counts its y downwards, so going from the right of the middle
    // to below it is a quarter turn the way the world counts them.
    expect(
      radiansDragged({ x: 160, y: 100 }, { x: 100, y: 160 }, ring),
    ).toBeCloseTo(-Math.PI / 2);
  });

  it("turns the other way about for a ring seen from behind", () => {
    const behind = ringOnScreen("y", 60, false);

    expect(
      radiansDragged({ x: 160, y: 100 }, { x: 100, y: 160 }, behind),
    ).toBeCloseTo(Math.PI / 2);
  });

  it("reads the same turn wherever on the ring the drag began", () => {
    const quarter = (from: { x: number; y: number }) => {
      const angle = Math.atan2(from.y - 100, from.x - 100) + Math.PI / 2;
      return radiansDragged(
        from,
        { x: 100 + Math.cos(angle) * 60, y: 100 + Math.sin(angle) * 60 },
        ring,
      );
    };

    expect(quarter({ x: 160, y: 100 })).toBeCloseTo(quarter({ x: 100, y: 40 }));
  });
});
