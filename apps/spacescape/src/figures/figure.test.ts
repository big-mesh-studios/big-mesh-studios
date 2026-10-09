import { describe, expect, it } from "vitest";

import {
  figureDistance,
  figureReach,
  nearestFigureDistance,
  toLocal,
  toWorld,
  transformYaw,
  type FigureTransform,
} from "./figure";

const at = (
  x: number,
  y: number,
  z: number,
  yaw = 0,
  scale = 1,
): FigureTransform => ({ at: { x, y, z }, yaw, scale });

/** A two-by-two-by-two box, which is `half` of one rather than its size. */
const HALF = { x: 1, y: 1, z: 1 };

describe("toLocal and toWorld", () => {
  it("are inverses, which is the only claim either of them makes", () => {
    // **Every other property of a placement is a consequence of this one.** A picker that
    // rotates back the wrong way and a collider that rotates the right way both still return
    // plausible numbers, and the only test that catches it is one that puts a point through
    // both and asks whether it came back.
    const t = at(4, 1, -7, 0.7, 2.5);
    const p = { x: 11, y: -3, z: 2 };
    const there = toWorld(t, toLocal(t, p));
    expect(there.x).toBeCloseTo(p.x, 9);
    expect(there.y).toBeCloseTo(p.y, 9);
    expect(there.z).toBeCloseTo(p.z, 9);
  });

  it("leaves an unturned figure alone", () => {
    const t = at(4, 1, -7);
    const v = { x: 0.5, y: 0.5, z: 0.5 };
    expect(toWorld(t, v)).toEqual({ x: 4.5, y: 1.5, z: -6.5 });
    expect(toLocal(t, { x: 4.5, y: 1.5, z: -6.5 })).toEqual(v);
  });

  it("keeps up the vertical when it turns, because a turn about Y cannot do otherwise", () => {
    const t = at(0, 5, 0, Math.PI / 3);
    const back = toLocal(t, toWorld(t, { x: 2, y: 7, z: -1 }));
    expect(back.y).toBeCloseTo(7, 9);
  });
});

describe("figureDistance", () => {
  it("reads a point inside the box as negative and one outside as positive", () => {
    const t = at(0, 0, 0);
    expect(figureDistance(t, HALF, { x: 0, y: 0, z: 0 })).toBeLessThan(0);
    expect(figureDistance(t, HALF, { x: 5, y: 0, z: 0 })).toBeGreaterThan(0);
  });

  it("measures true distance outside the box, so a trace along it converges", () => {
    // **The difference between a distance and a bound matters here.** `GameWorld`'s surface
    // search walks a point by whatever it is handed, so a value that were a bound rather than
    // the distance would step too far and put the player inside geometry.
    const t = at(0, 0, 0);
    expect(figureDistance(t, HALF, { x: 4, y: 0, z: 0 })).toBeCloseTo(3, 9);
    // Off a corner, where the answer is a distance to the corner rather than to a face.
    expect(figureDistance(t, HALF, { x: 3, y: 3, z: 0 })).toBeCloseTo(
      Math.hypot(2, 2),
      9,
    );
    // Inside, where it is the distance to the nearest face.
    expect(figureDistance(t, HALF, { x: 0.5, y: 0, z: 0 })).toBeCloseTo(
      -0.5,
      9,
    );
  });

  it("turns with the figure, so a collision box cannot drift away from its mesh", () => {
    // **The bug this whole file exists to prevent.** A collider that rotated the other way from
    // the mesh still returns plausible numbers everywhere; it is invisible until somebody walks
    // into the corner of a car.
    const flat = at(0, 0, 0);
    const turned = at(0, 0, 0, Math.PI / 2);
    // Three units along x: inside the unturned box, outside the turned one, whose long axis is
    // now z.
    expect(
      figureDistance(flat, { x: 4, y: 1, z: 1 }, { x: 3, y: 0, z: 0 }),
    ).toBeLessThan(0);
    expect(
      figureDistance(turned, { x: 4, y: 1, z: 1 }, { x: 3, y: 0, z: 0 }),
    ).toBeGreaterThan(0);
  });

  it("scales the box with the figure", () => {
    const small = at(0, 0, 0, 0, 1);
    const big = at(0, 0, 0, 0, 3);
    expect(figureDistance(small, HALF, { x: 2, y: 0, z: 0 })).toBeGreaterThan(
      0,
    );
    expect(figureDistance(big, HALF, { x: 2, y: 0, z: 0 })).toBeLessThan(0);
  });
});

describe("figureReach", () => {
  it("is the half-diagonal, because that is what a rejection test needs", () => {
    // **The largest half-extent would not do**: a point beyond it along one axis can still be
    // inside the box, so the reject would throw away real candidates and a trace would stall.
    const t = at(0, 0, 0);
    const reach = figureReach(t, { x: 4, y: 1, z: 1 });
    expect(reach).toBeCloseTo(Math.hypot(4, 1, 1), 9);
    expect(reach).toBeGreaterThan(4);
  });
});

describe("nearestFigureDistance", () => {
  it("answers the nearest of several figures, which is what a union of solids is", () => {
    const figures = [
      { transform: at(0, 0, 0), half: HALF },
      { transform: at(10, 0, 0), half: HALF },
    ];
    const nearest = nearestFigureDistance(figures);
    // Genuinely inside the second box rather than on its face, so the answer is a sign and not
    // a zero that could have come from anywhere.
    expect(nearest({ x: 9.5, y: 0, z: 0 })).toBeLessThan(0);
    // Between them, where both are outside their reach spheres and both answers are the bound.
    const reach = Math.hypot(1, 1, 1);
    expect(nearest({ x: 5, y: 0, z: 0 })).toBeCloseTo(5 - reach, 9);
  });

  it("answers undefined only when there are no figures at all", () => {
    // **`GameWorld.getMediumAt` sets the precedent**: a world with no figures and a world with
    // figures that are all a long way away are different claims, and the caller that pays to ask
    // should be the one that knows it is worth asking. A figure being *far* is a large number,
    // not nothing — see the next test.
    expect(nearestFigureDistance([])({ x: 0, y: 0, z: 0 })).toBeUndefined();
  });

  it("bounds a far figure rather than dropping it, because a march needs a number", () => {
    // **This is the case that a cheap reject gets wrong.** `getGroundDistanceAt` walks a point
    // outward by whatever it is handed; handed nothing for a figure it steps by everything and
    // arrives inside the far side of a car. A figure beyond its own reach sphere is at least
    // `distance - reach` away, and that lower bound is what keeps the walk converging.
    const figures = [{ transform: at(1000, 0, 0), half: HALF }];
    const nearest = nearestFigureDistance(figures);

    // Exactly the bound: a point 1000 away from a box whose reach is the half-diagonal.
    expect(nearest({ x: 0, y: 0, z: 0 })).toBeCloseTo(
      1000 - Math.hypot(1, 1, 1),
      9,
    );
    // And it is a lower bound rather than an over-estimate, which is what "conservative" has to
    // mean here: it must never be *bigger* than the truth or the march would stop short.
    expect(nearest({ x: 0, y: 0, z: 0 })).toBeLessThan(1000);
    // Close enough to be worth computing exactly, and then it is the exact answer: half a
    // unit outside a box that ends at 999.
    expect(nearest({ x: 998.5, y: 0, z: 0 })).toBeCloseTo(0.5, 9);
  });
});

describe("transformYaw", () => {
  it("is the identity at no turn and a half turn at ninety degrees", () => {
    const none = transformYaw(0);
    expect(none.x).toBeCloseTo(0, 9);
    expect(none.y).toBeCloseTo(0, 9);
    expect(none.w).toBeCloseTo(1, 9);

    const quarter = transformYaw(Math.PI / 2);
    expect(quarter.y).toBeCloseTo(Math.SQRT1_2, 9);
    expect(quarter.w).toBeCloseTo(Math.SQRT1_2, 9);
  });
});
