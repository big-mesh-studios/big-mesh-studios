/**
 * The transform arithmetic a part is placed by.
 *
 * **`multiply` is here because the rotate tool turns a part with it, and its order is the
 * whole of what can be wrong.** Composing the other way round still produces a rotation a
 * screen would show — the part turns — but about an axis that is not the ring under the
 * finger once the part is already turned, which is the failure that looks like the tool
 * working. The test pins the order against `rotate`, which the field itself uses.
 */
import { describe, expect, it } from "vitest";
import { rotate } from "@big-mesh-studios/csg";

import { axisAngle, fromEuler, isAxial, multiply, toEuler } from "./part";

const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

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
});

describe("multiply", () => {
  it("applies its right-hand rotation first", () => {
    // **The claim the rotate tool rests on.** `multiply(turn, orientation)` is a turn about a
    // world axis applied *after* the part's own rotation, which is why the ring's axis is
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
});

describe("fromEuler / toEuler", () => {
  it("round-trips three angles through a quaternion", () => {
    const quaternion = fromEuler(0.3, 0.2, 0.1);
    const angles = toEuler(quaternion);
    expect(angles.yaw).toBeCloseTo((0.3 * 180) / Math.PI, 6);
    expect(angles.pitch).toBeCloseTo((0.2 * 180) / Math.PI, 6);
    expect(angles.roll).toBeCloseTo((0.1 * 180) / Math.PI, 6);
  });
});

describe("isAxial", () => {
  it("says no for the shapes a turn leaves unchanged", () => {
    expect(isAxial("Sphere")).toBe(false);
    expect(isAxial("Ellipsoid")).toBe(false);
    expect(isAxial("RoundBox")).toBe(false);
  });

  it("says yes for the shapes a turn is visible on", () => {
    expect(isAxial("Capsule")).toBe(true);
    expect(isAxial("Torus")).toBe(true);
    expect(isAxial("Box")).toBe(true);
  });
});
