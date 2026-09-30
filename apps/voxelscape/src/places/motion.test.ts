// @vitest-environment node
import { describe, expect, it } from "vitest";
import { poseAt, type MotionSpec } from "./motion";

const LINEAR: MotionSpec = {
  path: [
    [0, 0, 0],
    [10, 0, 0],
  ],
  loop: "once",
  durationMs: 1_000,
};

describe("motion pose", () => {
  it("walks a path from its start to its end over the duration", () => {
    expect(poseAt(LINEAR, 0).dx).toBe(0);
    expect(poseAt(LINEAR, 500).dx).toBeCloseTo(5);
    expect(poseAt(LINEAR, 1_000).dx).toBeCloseTo(10);
    expect(poseAt(LINEAR, 5_000).dx).toBeCloseTo(10);
  });

  it("reports the offset's velocity for carrying", () => {
    expect(poseAt(LINEAR, 500).vx).toBeCloseTo(10);
    expect(poseAt(LINEAR, 500).vy).toBe(0);
  });

  it("loops, wrapping back to the start", () => {
    const motion: MotionSpec = { ...LINEAR, loop: "loop" };
    expect(poseAt(motion, 1_500).dx).toBeCloseTo(5);
    expect(poseAt(motion, 2_000).dx).toBeCloseTo(0);
  });

  it("pingpongs, turning back at each end", () => {
    const motion: MotionSpec = { ...LINEAR, loop: "pingpong" };
    expect(poseAt(motion, 1_500).dx).toBeCloseTo(5);
    expect(poseAt(motion, 2_000).dx).toBeCloseTo(0);
    expect(poseAt(motion, 2_500).dx).toBeCloseTo(5);
  });

  it("stands still until `startAfterMs`", () => {
    const motion: MotionSpec = { ...LINEAR, startAfterMs: 500 };
    expect(poseAt(motion, 0).dx).toBe(0);
    expect(poseAt(motion, 500).dx).toBe(0);
    expect(poseAt(motion, 1_000).dx).toBeCloseTo(5);
  });

  it("eases with a smoothstep when asked", () => {
    const motion: MotionSpec = { ...LINEAR, ease: "smooth" };
    expect(poseAt(motion, 250).dx).toBeCloseTo(10 * 0.15625);
  });

  it("bobs a still figure up and down over the clock", () => {
    const motion: MotionSpec = {
      path: [[0, 0, 0]],
      loop: "loop",
      durationMs: 1_000,
      oscillate: { amplitude: 2, periodMs: 1_000 },
    };
    // One period is a second; a quarter of it is the peak.
    expect(poseAt(motion, 0).dy).toBeCloseTo(0);
    expect(poseAt(motion, 250).dy).toBeCloseTo(2);
    expect(poseAt(motion, 500).dy).toBeCloseTo(0);
    expect(poseAt(motion, 750).dy).toBeCloseTo(-2);
    // Its velocity is the offset's own, for carrying a rider: A·ω at the
    // start of the cycle.
    expect(poseAt(motion, 0).vy).toBeCloseTo(2 * (Math.PI * 2));
  });

  it("oscillates along a given axis from a standing start", () => {
    const motion: MotionSpec = {
      path: [[0, 0, 0]],
      loop: "loop",
      durationMs: 1_000,
      oscillate: {
        amplitude: 3,
        periodMs: 1_000,
        axis: [1, 0, 0],
        startAfterMs: 500,
      },
    };
    expect(poseAt(motion, 500).dx).toBe(0);
    expect(poseAt(motion, 750).dx).toBeCloseTo(3);
    expect(poseAt(motion, 750).dy).toBe(0);
  });

  it("spins a vertical turntable into its collision yaw", () => {
    const motion: MotionSpec = {
      path: [[0, 0, 0]],
      loop: "loop",
      durationMs: 1_000,
      spin: { axis: [0, 1, 0], turnsPerSecond: 0.25 },
    };
    const pose = poseAt(motion, 1_000);
    expect(pose.yaw).toBeCloseTo(Math.PI / 2);
    expect(pose.spinAngle).toBeCloseTo(Math.PI / 2);
  });

  it("swings a hinge a bounded turn and comes to rest", () => {
    const motion: MotionSpec = {
      path: [[0, 0, 0]],
      loop: "once",
      durationMs: 1_000,
      spin: { axis: [0, 1, 0], turns: 0.25, pivot: [-1, 0, 0] },
    };
    expect(poseAt(motion, 500).spinAngle).toBeCloseTo(Math.PI / 4);
    expect(poseAt(motion, 1_000).spinAngle).toBeCloseTo(Math.PI / 2);
    // A once motion holds its final angle rather than winding on.
    expect(poseAt(motion, 9_000).spinAngle).toBeCloseTo(Math.PI / 2);
    expect(poseAt(motion, 500).spinPivot).toEqual([-1, 0, 0]);
  });

  it("swings a bounded turn back and forth when pingponging", () => {
    const motion: MotionSpec = {
      path: [[0, 0, 0]],
      loop: "pingpong",
      durationMs: 1_000,
      spin: { axis: [0, 1, 0], turns: 0.25 },
    };
    expect(poseAt(motion, 1_500).spinAngle).toBeCloseTo(Math.PI / 4);
    expect(poseAt(motion, 2_000).spinAngle).toBeCloseTo(0);
    expect(poseAt(motion, 2_500).spinAngle).toBeCloseTo(Math.PI / 4);
  });

  it("rolls by distance about an off-vertical axis", () => {
    const motion: MotionSpec = {
      path: [
        [0, 0, 0],
        [10, 0, 0],
      ],
      loop: "once",
      durationMs: 1_000,
      spin: { axis: [1, 0, 0], degreesPerMeter: 36 },
    };
    const pose = poseAt(motion, 1_000);
    expect(pose.spinAngle).toBeCloseTo(Math.PI * 2);
    expect(pose.yaw).toBe(0);
  });
});
