// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { Bitmap, Vector3D } from "@big-mesh-studios/maths";
import {
  sideKinds,
  type Motion,
  type Part,
  type PartKeys,
  type Sides,
} from "@big-mesh-studios/stacker/renderer";
import {
  gaitPose,
  VoxelFigures,
  type FigureGaitMotions,
} from "./voxel-figures";

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
    expect(gaitPose([once], NAMES, "run", 2)?.frame).toBe(66);
  });
});

/** The model name the placement suite hands its figures. */
const MODEL = "npc-sable.zip";

/** One side of the fixture figure: a single cell, drawn in palette entry zero. */
const solidSide = (): Bitmap => {
  const side = Bitmap.create(1, 1);
  Bitmap.set(side, 0, 0, 0);
  return side;
};

/** The smallest figure a renderer will draw: one solid voxel, in one part. */
const FIXTURE: Part = {
  name: "body",
  sides: Object.fromEntries(
    sideKinds.map((kind) => [kind, solidSide()]),
  ) as Sides,
  sections: [],
  root: Vector3D.create(),
  pivot: Vector3D.create(),
  turn: Vector3D.create(),
  scale: 1,
  parent: null,
};

/**
 * Draws one figure at each of `positions` in turn, a frame apart, and returns
 * the x it was drawn at after each. `eased` is left off the figure entirely
 * when undefined, so the same run can ask for a figure that eases and one that
 * reports itself exact.
 *
 * The clock is driven a frame at a time rather than left to the machine,
 * since how far a report has aged is most of what easing is for.
 */
const drawAt = (
  eased: boolean | undefined,
  positions: readonly (readonly [number, number])[],
): number[] => {
  let at = 0;
  const figures = new VoxelFigures({
    getFigures: () => [
      {
        id: "npc-0-0-0",
        x: positions[at][0],
        y: 0,
        z: positions[at][1],
        ...(eased === undefined ? {} : { eased }),
      },
    ],
    modelFor: () => MODEL,
  });
  figures.setFigure(MODEL, {
    parts: [FIXTURE],
    palette: [{ r: 255, g: 0, b: 0, a: 255 }],
    migrated: false,
    motions: [],
  });
  const drawn: number[] = [];
  vi.useFakeTimers();
  try {
    for (at = 0; at < positions.length; at++) {
      vi.advanceTimersByTime(16);
      figures.tick(1 / 60);
      drawn.push(figures.group.children[0].position.x);
    }
  } finally {
    vi.useRealTimers();
  }
  return drawn;
};

/** A run of `count` frames each a quarter-unit further along, then still. */
const walkThenHold = (count: number): (readonly [number, number])[] => {
  const walk = Array.from(
    { length: count },
    (_, at) => [at * 0.25, 0] as const,
  );
  const standing = walk[walk.length - 1];
  return [...walk, ...Array.from({ length: count }, () => standing)];
};

describe("a figure's drawn position", () => {
  it("eases a figure whose position is a report toward it", () => {
    const walk = walkThenHold(60);
    const drawn = drawAt(undefined, walk);
    // Nothing to bridge on the first frame, so it lands where it was put...
    expect(drawn[0]).toBe(0);
    // ...and every frame after it trails the position it was handed, because
    // that is the whole of what easing is for.
    expect(drawn[30]).toBeLessThan(walk[30][0]);
    expect(drawn[59]).toBeLessThan(walk[59][0]);
  });

  it("keeps coasting an eased figure on after the reports stop", () => {
    const walk = walkThenHold(60);
    const drawn = drawAt(undefined, walk);
    // The figure stood still a second ago, so its last two positions read as a
    // walk still under way — and there is no report left to say otherwise.
    expect(drawn[drawn.length - 1]).toBeGreaterThan(walk[59][0] + 1);
  });

  it("draws a figure reporting itself exact on the position it is given", () => {
    const walk = walkThenHold(60);
    const drawn = drawAt(false, walk);
    // Every frame on the number it was handed, quarter by quarter. An eased
    // figure is already behind on the second and a unit out by the last, and a
    // jump past the snap threshold would only hide that, so the steps here are
    // all the size a walk takes.
    expect(drawn).toEqual(walk.map(([x]) => x));
  });

  it("leaves a figure reporting itself exact where it stopped", () => {
    const walk = walkThenHold(60);
    const drawn = drawAt(false, walk);
    // A second of frames standing on one position, which for an eased figure is
    // a second of coasting: its last two reports read as a walk still under way
    // and no report has come along to say otherwise.
    expect(drawn.slice(60)).toEqual(new Array(60).fill(walk[59][0]));
  });
});
