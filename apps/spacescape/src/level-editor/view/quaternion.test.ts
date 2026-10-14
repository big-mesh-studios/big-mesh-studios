/**
 * The transform arithmetic a level item is placed and turned by.
 *
 * **`multiply` is here because the rotate tool turns a shape with it, and its order is the
 * whole of what can be wrong.** Composing the other way round still produces a rotation a
 * screen would show — the shape turns — but about an axis that is not the ring under the
 * finger once the shape is already turned, which is the failure that looks like the tool
 * working. The test pins the order against `rotate`, which is what the fold itself uses to
 * place a shape, so the two cannot agree on an order and disagree on a turn.
 */
import { describe, expect, it } from "vitest";
import { rotate } from "@big-mesh-studios/csg";
import type { Vec3 } from "@big-mesh-studios/core";

import { axisAngle, fromEuler, multiply, toEuler } from "./quaternion";
import { isAxial } from "../panels/vocabulary";

const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

/** A vector equal to `expected` to within floating point, which rotation arithmetic never is. */
const pointsAt = (got: Vec3, expected: Vec3): boolean =>
  close(got.x, expected.x) &&
  close(got.y, expected.y) &&
  close(got.z, expected.z);

describe("axisAngle", () => {
  it("turns the first axis onto the second for a right angle about the third", () => {
    const turn = axisAngle(0, 0, 1, Math.PI / 2);
    const turned = rotate({ x: 1, y: 0, z: 0 }, turn);
    expect(close(turned.x, 0)).toBe(true);
    expect(close(turned.y, 1)).toBe(true);
    expect(close(turned.z, 0)).toBe(true);
  });

  it("is the identity for an axis of no length", () => {
    expect(axisAngle(0, 0, 0, Math.PI)).toEqual({ x: 0, y: 0, z: 0, w: 1 });
  });

  it("turns by the angle asked for, whatever the axis's length", () => {
    // **Not a unit-axis contract, unlike `core`'s `rotateAboutAxis`.** The caller is a drag
    // that read its axis off a screen-space hit test, so a wrong-length axis would otherwise
    // be a rotation of the wrong size with no complaint — which reads as the gizmo being
    // imprecise rather than as a caller bug.
    const unit = rotate({ x: 1, y: 0, z: 0 }, axisAngle(0, 0, 2, Math.PI / 2));
    const long = rotate({ x: 1, y: 0, z: 0 }, axisAngle(0, 0, 20, Math.PI / 2));
    expect(long.y).toBeCloseTo(unit.y, 9);
  });
});

describe("multiply", () => {
  it("applies its right-hand rotation first", () => {
    // **The claim the rotate tool rests on.** `multiply(turn, orientation)` is a turn about a
    // world axis applied *after* the shape's own rotation, which is why the ring's axis is
    // the one that comes out under the finger.
    const a = axisAngle(0, 0, 1, Math.PI / 2);
    const b = axisAngle(1, 0, 0, Math.PI / 2);
    const v = { x: 0.3, y: 0.7, z: 0.1 };

    const composed = rotate(v, multiply(a, b));
    const sequential = rotate(rotate(v, b), a);

    expect(close(composed.x, sequential.x)).toBe(true);
    expect(close(composed.y, sequential.y)).toBe(true);
    expect(close(composed.z, sequential.z)).toBe(true);
  });

  it("turns about the world's axis and not the shape's, once the shape is already turned", () => {
    // **The case the order exists for, stated as the thing it prevents.** A panel already
    // lying on its side, dragged round a ring about world up. The ring's axis is a *world*
    // axis, so the shape's own up must go wherever a quarter turn about world up puts world
    // +z — which is world +x. Composed the other way round it does not move at all, which is
    // visibly not a turn about the axis under the finger.
    const laid = axisAngle(1, 0, 0, Math.PI / 2);
    const aboutUp = axisAngle(0, 1, 0, Math.PI / 2);
    const ownUp = { x: 0, y: 1, z: 0 };

    // Where the shape's own up points in the world before the drag: laid on its side, that
    // is world +z. And a quarter turn about world up carries world +z to world +x.
    expect(pointsAt(rotate(ownUp, laid), { x: 0, y: 0, z: 1 })).toBe(true);
    expect(
      pointsAt(rotate(rotate(ownUp, laid), aboutUp), { x: 1, y: 0, z: 0 }),
    ).toBe(true);

    // **The right order gets there.**
    expect(
      pointsAt(rotate(ownUp, multiply(aboutUp, laid)), { x: 1, y: 0, z: 0 }),
    ).toBe(true);
    // **And the wrong one does not**, which is the whole claim. It leaves the axis exactly
    // where it was — the shape spins in its own frame while the ring under the finger goes
    // nowhere.
    expect(
      pointsAt(rotate(ownUp, multiply(laid, aboutUp)), { x: 0, y: 0, z: 1 }),
    ).toBe(true);
  });

  it("is the identity against the identity, which is what makes a drag's start its own base", () => {
    // A rotate drag recomputes from the shape's starting turn every frame rather than
    // accumulating, so composing with the start has to be a no-op for the first frame to
    // read as no movement.
    const start = axisAngle(0.3, 0.7, 0.2, 1.1);
    const back = multiply(start, { x: 0, y: 0, z: 0, w: 1 });
    expect(close(back.x, start.x)).toBe(true);
    expect(close(back.y, start.y)).toBe(true);
    expect(close(back.z, start.z)).toBe(true);
    expect(close(back.w, start.w)).toBe(true);
  });
});

describe("fromEuler / toEuler", () => {
  it("round-trips three angles through a quaternion", () => {
    const quaternion = fromEuler(0.3, 0.2, 0.1);
    const angles = toEuler(quaternion);
    expect(angles.yaw).toBeCloseTo((0.3 * 180) / Math.PI, 6);
    expect(angles.pitch).toBeCloseTo((0.2 * 180) / Math.PI, 6);
    expect(angles.roll).toBeCloseTo((0.1 * 180) / Math.PI, 6);
  });

  it("reads the identity as no turn at all, rather than as a quarter turn", () => {
    // The identity is the answer for every shape a level has never rotated, and it is the
    // value the rotation fields will be showing for all of them. If it read as anything but
    // zero, every un-turned shape in a level would open its inspector mid-turn.
    expect(toEuler({ x: 0, y: 0, z: 0, w: 1 })).toEqual({
      yaw: 0,
      pitch: 0,
      roll: 0,
    });
  });

  it("never answers NaN, because a NaN in a field blanks the field", () => {
    // `asin` of a hair outside [-1, 1] is `NaN`, and floating point will put it there for a
    // turn near straight up. There is no test input that makes it happen — the guard is what
    // makes it unreachable — so this asserts the guard is load-bearing by sweeping the whole
    // sphere rather than by trying one bad number.
    for (let yawStep = -4; yawStep <= 4; yawStep++) {
      for (let pitchStep = -8; pitchStep <= 8; pitchStep++) {
        for (let rollStep = -4; rollStep <= 4; rollStep++) {
          const angles = toEuler(
            fromEuler(
              (yawStep * Math.PI) / 4,
              (pitchStep * Math.PI) / 16,
              (rollStep * Math.PI) / 4,
            ),
          );
          for (const value of [angles.yaw, angles.pitch, angles.roll]) {
            expect(Number.isFinite(value)).toBe(true);
          }
        }
      }
    }
  });
});

describe("isAxial", () => {
  it("says no only for a sphere, which is the same object from every direction", () => {
    // One exclusion, not three. `isAxial` asks about a *kind*, so it has to hold for every
    // instance of that kind — and only a sphere is symmetric for all of them.
    expect(isAxial("Sphere")).toBe(false);
  });

  it("says yes for an ellipsoid and a rounded box, which look like the wrong answer", () => {
    // **The two that are easy to get wrong**, and the reason this is one line rather than a
    // short list. An ellipsoid with three different radii turns visibly; it is only
    // symmetric when somebody has made it so. A rounded box of 40 × 6 × 20 lying on its side
    // is plainly a different shape from the one standing up — rounding the corners is not
    // making it symmetric.
    expect(isAxial("Ellipsoid")).toBe(true);
    expect(isAxial("RoundBox")).toBe(true);
  });

  it("says yes for every other primitive", () => {
    expect(isAxial("Box")).toBe(true);
    expect(isAxial("Capsule")).toBe(true);
    expect(isAxial("Cylinder")).toBe(true);
    expect(isAxial("Cone")).toBe(true);
    expect(isAxial("Torus")).toBe(true);
    expect(isAxial("HexPrism")).toBe(true);
  });
});
