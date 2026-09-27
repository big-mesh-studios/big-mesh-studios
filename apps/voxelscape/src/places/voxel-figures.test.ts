// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Vector3D } from "@big-mesh-studios/maths";
import type { Motion, PartKeys } from "@big-mesh-studios/stacker/renderer";
import { gaitPose, type FigureGaitMotions } from "./voxel-figures";

const NAMES: FigureGaitMotions = { idle: "idle", walk: "walk", run: "run" };

/** A motion `last` frames long, keyed on one part, standing still. */
const motion = (
  name: string,
  framesPerSecond: number,
  last: number,
): Motion => {
  const keys: PartKeys["keys"] = Array.from({ length: last + 1 }, (_, at) => ({
    at,
    ease: "linear" as const,
    root: Vector3D.create(0, at, 0),
    turn: Vector3D.create(),
    scale: 1,
  }));
  return {
    name,
    framesPerSecond,
    loop: true,
    parts: [{ part: "body", keys }],
  };
};

const IDLE = motion("idle", 30, 32);
const WALK = motion("walk", 30, 32);
const RUN = motion("run", 24, 24);

describe("a figure's gait against a model's own motions", () => {
  it("plays the motion named for the role", () => {
    expect(gaitPose([IDLE, WALK, RUN], NAMES, "walk", 0)?.motion).toBe(WALK);
    expect(gaitPose([IDLE, WALK, RUN], NAMES, "run", 0)?.motion).toBe(RUN);
    expect(gaitPose([IDLE, WALK, RUN], NAMES, "idle", 0)?.motion).toBe(IDLE);
  });

  it("counts a stride as one whole cycle of the motion's own run", () => {
    // A walk keyed 33 frames and a run keyed 25 are both one cycle long, so
    // half a stride lands on a different frame of each.
    expect(gaitPose([WALK], NAMES, "walk", 0.5)?.frame).toBe(16.5);
    expect(gaitPose([RUN], NAMES, "run", 0.5)?.frame).toBe(12.5);
  });

  it("lands a whole stride back on the motion's first key", () => {
    // The clip's own run is what a stride is, not the second: a 33-frame clip
    // at 30 a second is 1.1 seconds long, and counting in seconds would leave
    // the last stride hanging past the loop.
    expect(gaitPose([WALK], NAMES, "walk", 1)?.frame).toBe(0);
    expect(gaitPose([RUN], NAMES, "run", 1)?.frame).toBe(0);
    expect(gaitPose([WALK], NAMES, "walk", 2.25)?.frame).toBe(8.25);
  });

  it("walks a model that has no run, whatever speed asked for one", () => {
    const found = gaitPose([IDLE, WALK], NAMES, "run", 0);
    expect(found?.motion).toBe(WALK);
  });

  it("stands a model that has no idle still, rather than marching on the spot", () => {
    expect(gaitPose([WALK, RUN], NAMES, "idle", 0)).toBeUndefined();
  });

  it("stands still for a model that carries none of the roles", () => {
    const wave = motion("wave", 12, 10);
    expect(gaitPose([wave], NAMES, "walk", 0)).toBeUndefined();
  });

  it("runs a motion that does not loop off its end rather than wrapping", () => {
    const once = { ...WALK, loop: false };
    expect(gaitPose([once], NAMES, "walk", 2)?.frame).toBe(66);
  });
});
