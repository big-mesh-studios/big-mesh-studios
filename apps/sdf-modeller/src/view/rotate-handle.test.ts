/**
 * The rotate handle's arithmetic, against numbers.
 *
 * **These are the only tests in the application that can catch a rotate tool which turns the
 * part the wrong way about the wrong ring.** Everything else about the tool is a torus
 * appearing and a ghost turning, and both look entirely healthy while the maths underneath
 * them is wrong — which is why the projection, the hit test and the angle are here and not
 * in the widget.
 */
import { describe, expect, it } from "vitest";

import {
  radiansDragged,
  ringUnderPointer,
  type RingOnScreen,
} from "./rotate-handle";
import { GRAB_RADIUS, type Axis, type ScreenPoint } from "./move-handle";

/** A ring lying flat on the canvas, `radius` pixels about `middle`. */
const ringOnScreen = (
  axis: Axis,
  radius: number,
  facing = true,
  middle: ScreenPoint = { x: 100, y: 100 },
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
    // The middle is where the part is, and a ring's whole point is that it is drawn *round*
    // it — so a press in the middle is a press on nothing.
    expect(ringUnderPointer({ x: 100, y: 100 }, [wide])).toBeUndefined();
  });

  it("lets go of one the pointer is well outside", () => {
    expect(ringUnderPointer({ x: 300, y: 100 }, [wide])).toBeUndefined();
  });

  it("grabs a ring just inside the threshold and not just outside it", () => {
    const just = { x: 100 + 60 + GRAB_RADIUS - 1, y: 100 };
    expect(ringUnderPointer(just, [wide])).toBe("y");
    const past = { x: 100 + 60 + GRAB_RADIUS + 1, y: 100 };
    expect(ringUnderPointer(past, [wide])).toBeUndefined();
  });

  it("takes the nearer of two rings, which is the one drawn in front", () => {
    // Picking by axis order instead would reach through the figure for the ring behind.
    expect(ringUnderPointer({ x: 121, y: 100 }, [wide, narrow])).toBe("x");
    expect(ringUnderPointer({ x: 159, y: 100 }, [wide, narrow])).toBe("y");
  });

  it("has no answer with no rings up", () => {
    expect(ringUnderPointer({ x: 160, y: 100 }, [])).toBeUndefined();
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
    // The canvas counts its y downwards, so going from the right of the middle to below it
    // is a quarter turn the way the world counts them.
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
    // **The reason the angle is a bearing and not a distance.** A sweep of the same size is
    // the same turn whether the finger started at the right of the middle or above it.
    const sweep = (from: ScreenPoint): number => {
      const angle = Math.atan2(from.y - 100, from.x - 100) + Math.PI / 4;
      return radiansDragged(
        from,
        { x: 100 + Math.cos(angle) * 60, y: 100 + Math.sin(angle) * 60 },
        ring,
      );
    };

    expect(sweep({ x: 160, y: 100 })).toBeCloseTo(sweep({ x: 100, y: 40 }));
  });
});
