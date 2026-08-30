// @vitest-environment node
import { Vector3D } from "@big-mesh-studios/maths";
import { describe, expect, it } from "vitest";
import {
  easeInOut,
  easeOut,
  handTransform,
  HANDLE_FRACTION,
  lerpPose,
  type SwingPose,
  type SwingTransform,
} from "./swing";

const closeTo = (a: number, b: number, epsilon = 1e-9): boolean =>
  Math.abs(a - b) < epsilon;

const A: SwingPose = { x: 0.4, y: -0.3, z: -0.8, roll: 0 };
const B: SwingPose = { x: 0.6, y: -0.5, z: -1, roll: Math.PI / 4 };

describe("pose interpolation", () => {
  it("returns the ends at zero and one", () => {
    expect(lerpPose(A, B, 0)).toEqual(A);
    expect(lerpPose(A, B, 1)).toEqual(B);
  });

  it("clamps past either end rather than overshooting", () => {
    expect(lerpPose(A, B, -1)).toEqual(A);
    expect(lerpPose(A, B, 2)).toEqual(B);
  });

  it("moves every component halfway at a half", () => {
    const half = lerpPose(A, B, 0.5);
    expect(closeTo(half.x, (A.x + B.x) / 2)).toBe(true);
    expect(closeTo(half.y, (A.y + B.y) / 2)).toBe(true);
    expect(closeTo(half.z, (A.z + B.z) / 2)).toBe(true);
    expect(closeTo(half.roll, (A.roll + B.roll) / 2)).toBe(true);
  });

  it("eases out fast and in-out symmetrically", () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(0.5)).toBeGreaterThan(0.5);
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(closeTo(easeInOut(0.5), 0.5)).toBe(true);
  });
});

describe("hand transform", () => {
  const CARD_SIZE = 0.455;

  const hilt = (transform: SwingTransform): Vector3D => {
    const handleLocal = {
      x: HANDLE_FRACTION.x * CARD_SIZE,
      y: HANDLE_FRACTION.y * CARD_SIZE,
      z: 0,
    };
    const offset = Vector3D.rotateQuaternion(handleLocal, transform.rotation);
    return Vector3D.add(transform.position, offset);
  };

  it("keeps the hilt on the hand path at any roll", () => {
    for (const roll of [0, 0.3, -0.6, Math.PI / 3]) {
      const want: SwingPose = { x: 0.45, y: -0.35, z: -0.85, roll };
      const h = hilt(handTransform(want, CARD_SIZE));
      expect(closeTo(h.x, want.x, 1e-6)).toBe(true);
      expect(closeTo(h.y, want.y, 1e-6)).toBe(true);
      expect(closeTo(h.z, want.z, 1e-6)).toBe(true);
    }
  });

  it("holds the card at a three-quarter view, half front half right", () => {
    const transform = handTransform(A, CARD_SIZE);
    const normal = Vector3D.rotateQuaternion(
      { x: 0, y: 0, z: 1 },
      transform.rotation,
    );
    // the front face is canted toward the camera's right, not straight on
    expect(normal.x).toBeGreaterThan(0.4);
    expect(normal.z).toBeGreaterThan(0.6);
  });

  it("rolls the card around the hilt instead of the card's centre", () => {
    const rest = handTransform(A, CARD_SIZE);
    const rolled = handTransform({ ...A, roll: -1 }, CARD_SIZE);
    // the top-right corner of the card, the blade end opposite the hilt
    const bladeLocal = { x: 0.5 * CARD_SIZE, y: 0.5 * CARD_SIZE, z: 0 };
    const bladeRest = Vector3D.rotateQuaternion(bladeLocal, rest.rotation);
    const bladeRolled = Vector3D.rotateQuaternion(bladeLocal, rolled.rotation);
    const travelled = Math.hypot(
      bladeRolled.x - bladeRest.x,
      bladeRolled.y - bladeRest.y,
      bladeRolled.z - bladeRest.z,
    );
    expect(travelled).toBeGreaterThan(CARD_SIZE * 0.5);
  });
});
