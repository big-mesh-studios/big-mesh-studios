// @vitest-environment node
import { Vector3D } from "@big-mesh-studios/maths";
import { describe, expect, it } from "vitest";
import {
  HANDLE_FRACTION,
  poseAt,
  PULLED_POSE,
  RECOVER_TIME,
  REST_POSE,
  SWING_TIME,
  SwingTransform,
  swingTransform,
  SWUNG_POSE,
  WINDUP_TIME,
  type SwingState,
} from "./swing";

const closeTo = (a: number, b: number, epsilon = 1e-9): boolean =>
  Math.abs(a - b) < epsilon;

const expectPose = (pose: unknown, expected: unknown): void => {
  const actual = pose as { x: number; y: number; z: number; roll: number };
  const want = expected as { x: number; y: number; z: number; roll: number };
  expect(closeTo(actual.x, want.x)).toBe(true);
  expect(closeTo(actual.y, want.y)).toBe(true);
  expect(closeTo(actual.z, want.z)).toBe(true);
  expect(closeTo(actual.roll, want.roll)).toBe(true);
};

describe("swing poses", () => {
  it("holds the rest pose while idle", () => {
    expectPose(poseAt("idle", 0), REST_POSE);
  });

  it("pulls the sword back as the wind-up runs", () => {
    expectPose(poseAt("windup", 0), REST_POSE);
    const halfway = poseAt("windup", 0.5);
    expectPose(halfway, {
      x: (REST_POSE.x + PULLED_POSE.x) / 2,
      y: (REST_POSE.y + PULLED_POSE.y) / 2,
      z: (REST_POSE.z + PULLED_POSE.z) / 2,
      roll: (REST_POSE.roll + PULLED_POSE.roll) / 2,
    });
    expectPose(poseAt("windup", 1), PULLED_POSE);
    // a hold longer than the wind-up time is capped at fully pulled
    expectPose(poseAt("windup", 2), PULLED_POSE);
  });

  it("swings from where the wind-up was to the swung pose", () => {
    // a full wind-up swings from pulled back
    expectPose(poseAt("swing", 0, 1), PULLED_POSE);
    expectPose(poseAt("swing", 1, 1), SWUNG_POSE);
    // a tap swings from near rest
    expectPose(poseAt("swing", 0, 0), REST_POSE);
    expectPose(poseAt("swing", 1, 0), SWUNG_POSE);
  });

  it("recovers from swung back to rest", () => {
    expectPose(poseAt("recover", 0), SWUNG_POSE);
    expectPose(poseAt("recover", 1), REST_POSE);
    expectPose(poseAt("recover", 1.5), REST_POSE);
  });

  it("names the state timings in seconds", () => {
    expect(WINDUP_TIME).toBeGreaterThan(0);
    expect(SWING_TIME).toBeGreaterThan(0);
    expect(RECOVER_TIME).toBeGreaterThan(0);
  });
});

describe("swing transform", () => {
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

  it("keeps the hilt on the hand path in every state", () => {
    const cases: [SwingState, number, number][] = [
      ["idle", 0, 0],
      ["windup", 0, 0],
      ["windup", 0.5, 0.5],
      ["windup", 1, 1],
      ["swing", 0, 1],
      ["swing", 0.5, 0.6],
      ["swing", 1, 0.2],
      ["recover", 0, 1],
      ["recover", 0.7, 1],
      ["recover", 1, 1],
    ];
    for (const [state, phase, windup] of cases) {
      const transform = swingTransform(state, phase, windup, CARD_SIZE);
      const want = poseAt(state, phase, windup);
      const h = hilt(transform);
      expect(closeTo(h.x, want.x, 1e-6)).toBe(true);
      expect(closeTo(h.y, want.y, 1e-6)).toBe(true);
      expect(closeTo(h.z, want.z, 1e-6)).toBe(true);
    }
  });

  it("holds the sword at a three-quarter view, half front half right", () => {
    const transform = swingTransform("idle", 0, 0, CARD_SIZE);
    const normal = Vector3D.rotateQuaternion(
      { x: 0, y: 0, z: 1 },
      transform.rotation,
    );
    // the front face is canted toward the camera's right, not straight on
    expect(normal.x).toBeGreaterThan(0.4);
    expect(normal.z).toBeGreaterThan(0.6);
  });

  it("swings the blade around the hilt instead of the card's centre", () => {
    const rest = swingTransform("idle", 0, 0, CARD_SIZE);
    const swung = swingTransform("swing", 1, 1, CARD_SIZE);
    // the top-right corner of the card, the blade end opposite the hilt
    const bladeLocal = { x: 0.5 * CARD_SIZE, y: 0.5 * CARD_SIZE, z: 0 };
    const bladeRest = Vector3D.rotateQuaternion(bladeLocal, rest.rotation);
    const bladeSwung = Vector3D.rotateQuaternion(bladeLocal, swung.rotation);
    const travelled = Math.hypot(
      bladeSwung.x - bladeRest.x,
      bladeSwung.y - bladeRest.y,
      bladeSwung.z - bladeRest.z,
    );
    expect(travelled).toBeGreaterThan(CARD_SIZE * 0.5);
  });
});
