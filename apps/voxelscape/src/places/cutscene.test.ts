// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  cutsceneDuration,
  cutscenePoseAt,
  type CameraStart,
  type CutsceneState,
} from "./cutscene";

const FROM: CameraStart = {
  x: 0,
  y: 0,
  z: 0,
  lookX: 0,
  lookY: 0,
  lookZ: 1,
};

const TWO_SHOTS: CutsceneState = {
  startMs: 1_000,
  shots: [
    { at: [10, 0, 0], durationMs: 1_000, holdMs: 500 },
    { at: [20, 0, 0], look: [20, 0, 5], durationMs: 1_000 },
  ],
};

describe("cutscene poses", () => {
  it("measures a sequence as its moves and holds together", () => {
    expect(cutsceneDuration(TWO_SHOTS)).toBe(2_500);
  });

  it("moves out of the starting pose and holds on arrival", () => {
    expect(cutscenePoseAt(TWO_SHOTS, 1_000, FROM).x).toBe(0);
    expect(cutscenePoseAt(TWO_SHOTS, 1_500, FROM).x).toBeCloseTo(5);
    expect(cutscenePoseAt(TWO_SHOTS, 2_000, FROM).x).toBeCloseTo(10);
    expect(cutscenePoseAt(TWO_SHOTS, 2_300, FROM).x).toBeCloseTo(10);
  });

  it("moves out of where the shot before it ended", () => {
    const mid = cutscenePoseAt(TWO_SHOTS, 3_000, FROM);
    expect(mid.x).toBeCloseTo(15);
    expect(mid.lookZ).toBeCloseTo(3);
  });

  it("reports the last pose once its time is up", () => {
    const end = cutscenePoseAt(TWO_SHOTS, 9_999, FROM);
    expect(end.done).toBe(true);
    expect(end.x).toBeCloseTo(20);
    expect(end.lookZ).toBeCloseTo(5);
  });

  it("eases a move with a smoothstep when asked", () => {
    const state: CutsceneState = {
      startMs: 0,
      shots: [{ at: [10, 0, 0], durationMs: 1_000, ease: "smooth" }],
    };
    expect(cutscenePoseAt(state, 250, FROM).x).toBeCloseTo(10 * 0.15625);
  });

  it("snaps a shot that asks for no move time", () => {
    const state: CutsceneState = {
      startMs: 0,
      shots: [
        { at: [5, 5, 5], durationMs: 0 },
        { at: [8, 5, 5], durationMs: 1_000 },
      ],
    };
    expect(cutscenePoseAt(state, 0, FROM).x).toBe(5);
    expect(cutscenePoseAt(state, 500, FROM).x).toBeCloseTo(6.5);
  });
});
