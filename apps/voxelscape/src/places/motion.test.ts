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
