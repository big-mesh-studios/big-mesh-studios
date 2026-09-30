// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PlayerGait, type GaitTuning } from "./gait";

const GAIT: GaitTuning = { stride: 4, runAt: 10, walkAt: 2 };

/** Steps `gait` forward by `seconds` at `speed`, returning the last pose. */
const held = (
  gait: PlayerGait,
  seconds: number,
  speed: number,
  grounded = true,
) => {
  const steps = Math.round(seconds * 60);
  let pose = gait.update(0, speed, grounded);
  for (let step = 0; step < steps; step += 1) {
    pose = gait.update(1 / 60, speed, grounded);
  }
  return pose;
};

describe("a player's gait", () => {
  it("stands still below walking speed and walks above it", () => {
    const gait = new PlayerGait(GAIT);
    expect(held(gait, 1, 0).role).toBe("idle");
    expect(held(gait, 1, 1.5).role).toBe("idle");
    expect(held(gait, 1, 4).role).toBe("walk");
  });

  it("runs above running speed", () => {
    expect(held(new PlayerGait(GAIT), 1, 14).role).toBe("run");
  });

  it("holds its role through the gap between walking and running", () => {
    // A player sitting on the boundary would otherwise swap clips several times
    // a second, and the flicker is worse than either clip being slightly wrong.
    const walking = new PlayerGait(GAIT);
    held(walking, 0.5, 4);
    expect(walking.update(1 / 60, 5.5, true).role).toBe("walk");
    const running = new PlayerGait(GAIT);
    held(running, 0.5, 14);
    expect(running.update(1 / 60, 5.5, true).role).toBe("run");
  });

  it("walks out of standing still into the gap, rather than standing", () => {
    const gait = new PlayerGait(GAIT);
    held(gait, 0.5, 0);
    expect(gait.update(1 / 60, 5.5, true).role).toBe("walk");
  });

  it("counts the phase in strides, so the ground and the legs agree", () => {
    const gait = new PlayerGait(GAIT);
    // One second at four units per second over a four-unit stride is one cycle.
    expect(held(gait, 1, 4).phase).toBeCloseTo(1, 6);
    // The same ground covered at twice the speed is twice the strides.
    expect(held(new PlayerGait(GAIT), 1, 8).phase).toBeCloseTo(2, 6);
  });

  it("does not count ground it did not cover", () => {
    const gait = new PlayerGait(GAIT);
    expect(held(gait, 1, 0).phase).toBe(0);
  });

  it("stands still in the air, and rests in its clip's first key", () => {
    const gait = new PlayerGait(GAIT);
    const walked = held(gait, 1, 4);
    expect(walked.phase).toBeGreaterThan(1);
    const airborne = gait.update(1 / 60, 4, false);
    expect(airborne).toEqual({ role: "idle", phase: 0 });
  });

  it("starts a clip at its beginning rather than wherever the last one was", () => {
    const gait = new PlayerGait(GAIT);
    const mid = held(gait, 0.7, 4);
    expect(mid.phase).toBeGreaterThan(0);
    // The frame the run begins on already carries that frame's own travel, so
    // what matters is that the walk's phase is not carried into it.
    const running = gait.update(1 / 60, 14, true);
    expect(running.role).toBe("run");
    expect(running.phase).toBeLessThan(0.1);
  });

  it("stands still whatever it is asked, with no tuning", () => {
    const gait = new PlayerGait(undefined);
    expect(held(gait, 1, 20)).toEqual({ role: "idle", phase: 0 });
  });

  it("does not divide by a stride of nothing", () => {
    const gait = new PlayerGait({ ...GAIT, stride: 0 });
    expect(held(gait, 1, 8)).toEqual({ role: "walk", phase: 0 });
  });
});
