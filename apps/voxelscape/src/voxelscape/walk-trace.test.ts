// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  describeSetup,
  WalkTraceRecorder,
  type WalkTraceSource,
} from "./walk-trace";
import type { PerfDrain, PerfProbeApi } from "../render/perf-probe";

const EMPTY_DRAIN: PerfDrain = {
  rows: [],
  rowStride: 0,
  fieldNames: [],
  phaseNames: [],
  counterNames: [],
  counters: [],
  framesSeen: 0,
  wrapped: false,
  durationMs: 0,
};

/** A probe that records what it was asked to do rather than timing anything. */
const fakeProbe = () => {
  const arm = vi.fn();
  const disarm = vi.fn();
  const drain = vi.fn(() => EMPTY_DRAIN);
  return {
    probe: { arm, disarm, drain } as unknown as PerfProbeApi,
    arm,
    disarm,
    drain,
  };
};

const source = (): WalkTraceSource => ({
  setup: () => ({ chunkRadius: 4 }),
  pose: () => ({ position: [1, 2, 3], facing: [0, 0, -1] }),
});

describe("recording a walk", () => {
  it("records nothing until it is started", async () => {
    const { probe, arm } = fakeProbe();
    const trace = new WalkTraceRecorder(probe, source(), 0);
    expect(trace.recording).toBe(false);
    trace.mark("something is wrong");
    expect(trace.marked).toBe(0);
    expect(await trace.stop()).toBeUndefined();
    expect(arm).not.toHaveBeenCalled();
  });

  it("keeps what was marked, in the words it was marked with", async () => {
    const { probe } = fakeProbe();
    const trace = new WalkTraceRecorder(probe, source(), 0);
    trace.start("looking for the shoreline flicker");
    trace.mark("water flickers here");
    trace.mark("and again, worse");

    const written = await trace.stop();
    expect(written?.name).toBe("looking for the shoreline flicker");
    expect(written?.marks.map((mark) => mark.note)).toEqual([
      "water flickers here",
      "and again, worse",
    ]);
    expect(written?.marks[0].pose.position).toEqual([1, 2, 3]);
  });

  it("holds what the world was set to when the walk began", async () => {
    const { probe } = fakeProbe();
    const reads = vi.fn(() => ({ chunkRadius: 4 }));
    const trace = new WalkTraceRecorder(
      probe,
      {
        setup: reads,
        pose: () => ({ position: [0, 0, 0], facing: [0, 0, -1] }),
      },
      0,
    );
    trace.start("a walk");
    trace.mark("here");

    // Read once, at the start: a trace says what was set when the walk began,
    // not what somebody changed it to along the way.
    expect(reads).toHaveBeenCalledTimes(1);
    expect((await trace.stop())?.setup).toEqual({ chunkRadius: 4 });
  });

  it("arms the ring on starting and lets it go on stopping", async () => {
    const { probe, arm, disarm, drain } = fakeProbe();
    const trace = new WalkTraceRecorder(probe, source(), 0);
    trace.start("a walk");
    expect(arm).toHaveBeenCalledTimes(1);
    expect(disarm).not.toHaveBeenCalled();

    await trace.stop();
    expect(drain).toHaveBeenCalledTimes(1);
    // The ring is several megabytes; a finished trace does not keep holding it.
    expect(disarm).toHaveBeenCalledTimes(1);
  });

  it("gives the drawing to the mark that is waiting for it, once", async () => {
    const { probe } = fakeProbe();
    const trace = new WalkTraceRecorder(probe, source(), 0);
    const canvas = {
      toDataURL: vi.fn(() => "data:image/png;base64,AAAA"),
    } as unknown as HTMLCanvasElement;

    trace.start("a walk");
    trace.mark("here");
    trace.takePicture(canvas);
    // A second frame with nothing waiting must not take another picture.
    trace.takePicture(canvas);

    expect(canvas.toDataURL).toHaveBeenCalledTimes(1);
    expect((await trace.stop())?.marks[0].picture).toBe(
      "data:image/png;base64,AAAA",
    );
  });

  it("leaves a mark without a picture rather than failing on a canvas it cannot read", async () => {
    const { probe } = fakeProbe();
    const trace = new WalkTraceRecorder(probe, source(), 0);
    const canvas = {
      toDataURL: () => {
        throw new Error("tainted");
      },
    } as unknown as HTMLCanvasElement;

    trace.start("a walk");
    trace.mark("here");
    expect(() => trace.takePicture(canvas)).not.toThrow();
    expect((await trace.stop())?.marks[0].picture).toBeUndefined();
  });

  it("starts again from nothing, keeping no marks from the walk before", async () => {
    const { probe } = fakeProbe();
    const trace = new WalkTraceRecorder(probe, source(), 0);
    trace.start("first");
    trace.mark("old");
    await trace.stop();

    trace.start("second");
    expect(trace.marked).toBe(0);
    expect((await trace.stop())?.marks).toEqual([]);
  });
});

describe("logging what the world noticed on its own", () => {
  it("records nothing until it is started", async () => {
    const { probe } = fakeProbe();
    const trace = new WalkTraceRecorder(probe, source(), 0);
    trace.event("damage", { cause: "lava", amount: 1, hp: 5 });
    expect(await trace.stop()).toBeUndefined();
  });

  it("says what dealt a hit and what was left after it", async () => {
    const { probe } = fakeProbe();
    const trace = new WalkTraceRecorder(probe, source(), 0);
    trace.start("standing where it hurts");
    trace.event("damage", { cause: "lava", amount: 1, hp: 5 });
    trace.event("damage", { cause: "lava", amount: 1, hp: 4 });

    const written = await trace.stop();
    expect(written?.events).toEqual([
      expect.objectContaining({
        kind: "damage",
        cause: "lava",
        amount: 1,
        hp: 5,
      }),
      expect.objectContaining({
        kind: "damage",
        cause: "lava",
        amount: 1,
        hp: 4,
      }),
    ]);
    expect(written?.events[0].pose.position).toEqual([1, 2, 3]);
  });

  it("waits for a picture of a death, but not of the damage on the way to it", async () => {
    const { probe } = fakeProbe();
    const trace = new WalkTraceRecorder(probe, source(), 0);
    const canvas = {
      toDataURL: vi.fn(() => "data:image/png;base64,DEAD"),
    } as unknown as HTMLCanvasElement;

    trace.start("a walk");
    trace.event("damage", { cause: "lava", amount: 1, hp: 1 });
    trace.event("death", { cause: "lava", amount: 1, hp: 0 });
    trace.takePicture(canvas);

    const written = await trace.stop();
    expect(written?.events[0].picture).toBeUndefined();
    expect(written?.events[1].picture).toBe("data:image/png;base64,DEAD");
  });

  it("starts again from nothing, keeping no events from the walk before", async () => {
    const { probe } = fakeProbe();
    const trace = new WalkTraceRecorder(probe, source(), 0);
    trace.start("first");
    trace.event("death", { cause: "lava" });
    await trace.stop();

    trace.start("second");
    expect((await trace.stop())?.events).toEqual([]);
  });
});

describe("saying what a trace started with", () => {
  it("hands the setup back, so what is said is what is stored", async () => {
    const { probe } = fakeProbe();
    const trace = new WalkTraceRecorder(probe, source(), 0);
    const said = trace.start("a walk");
    expect(said).toEqual((await trace.stop())?.setup);
  });

  it("names every setting it was given, however deeply nested", async () => {
    const text = describeSetup({
      cores: 8,
      window: { chunkRadius: 4, lodBands: { full: 3, coarse: 4 } },
      spawn: [0, 40, 0],
    });
    expect(text).toContain("cores: 8");
    expect(text).toContain("chunkRadius 4");
    // Nested two deep, and still said rather than printed as [object Object].
    expect(text).toContain("full 3");
    expect(text).toContain("spawn: 0, 40, 0");
    expect(text).not.toContain("[object");
  });

  it("says a setting is unset rather than leaving a gap", async () => {
    expect(describeSetup({ viewport: undefined })).toBe("viewport: unset");
  });

  it("leaves nothing out, so nothing is recorded quietly", async () => {
    const setup = { a: 1, b: 2, c: 3, d: 4 };
    const text = describeSetup(setup);
    for (const name of Object.keys(setup)) {
      expect(text).toContain(`${name}:`);
    }
    expect(text.split("\n")).toHaveLength(Object.keys(setup).length);
  });
});

describe("what JSON can carry", () => {
  it("keeps an infinity readable, so off is not mistaken for unsaid", async () => {
    const { probe } = fakeProbe();
    const trace = new WalkTraceRecorder(
      probe,
      {
        setup: () => ({
          window: { lodBands: { full: Infinity, coarse: Infinity } },
        }),
        pose: () => ({ position: [0, 0, 0], facing: [0, 0, -1] }),
      },
      0,
    );
    trace.start("a walk");
    const written = await trace.stop();
    const carried = JSON.parse(JSON.stringify(written)) as {
      setup: { window: { lodBands: { full: unknown } } };
    };
    // Left a number, JSON.stringify writes this as null and a reader cannot
    // tell a window with its levels of detail off from one that never said.
    expect(carried.setup.window.lodBands.full).toBe("Infinity");
  });
});

describe("writing down one moment", () => {
  it("carries the world, the pose and the words, without a walk", async () => {
    const { probe, arm } = fakeProbe();
    const trace = new WalkTraceRecorder(probe, source(), 0);

    const snap = await trace.snap("clouds have green in their texture");

    expect(snap.name).toBe("clouds have green in their texture");
    expect(snap.seconds).toBe(0);
    expect(snap.setup).toEqual({ chunkRadius: 4 });
    expect(snap.marks).toHaveLength(1);
    expect(snap.marks[0].note).toBe("clouds have green in their texture");
    expect(snap.marks[0].pose.position).toEqual([1, 2, 3]);
    // Nothing is armed: a moment has no walk behind it to record.
    expect(arm).not.toHaveBeenCalled();
  });

  it("takes its picture from the next frame drawn", async () => {
    const { probe } = fakeProbe();
    const trace = new WalkTraceRecorder(probe, source(), 100);
    const canvas = {
      toDataURL: () => "data:image/png;base64,SNAP",
    } as unknown as HTMLCanvasElement;

    const snapping = trace.snap("here");
    trace.takePicture(canvas);
    const snap = await snapping;

    expect(snap.marks[0].picture).toBe("data:image/png;base64,SNAP");
  });

  it("leaves a walk being recorded alongside it undisturbed", async () => {
    const { probe, disarm } = fakeProbe();
    const trace = new WalkTraceRecorder(probe, source(), 0);
    trace.start("the walk");
    trace.mark("along the way");

    await trace.snap("and this, separately");

    expect(trace.recording).toBe(true);
    expect(trace.marked).toBe(1);
    expect(disarm).not.toHaveBeenCalled();
    expect((await trace.stop())?.marks).toHaveLength(1);
  });
});
