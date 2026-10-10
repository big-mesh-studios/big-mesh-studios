import { describe, expect, it, vi } from "vitest";

import { placedPart } from "../model/part";
import { DEFAULT_PRINT_VOXEL_SIZE, MAX_PRINT_VOXEL_SIZE } from "./print-budget";
import { meshForPrintOffThread } from "./print-mesh-client";
import { runPrintMesh, type PrintMeshReply } from "./print-worker";

/** A capsule standing on the origin, which is the smallest thing that reads as a figure. */
const body = () =>
  placedPart(
    "body",
    { type: "Capsule", len: 2, radius: 0.7 },
    { x: 0, y: 1, z: 0 },
  );

describe("runPrintMesh", () => {
  it("answers with a mesh, having said how far it got on the way", () => {
    // **The two halves of the contract, in the order they arrive.** The progress messages come
    // first and the mesh last, and a client that treats the last message as the answer is
    // relying on exactly this.
    const replies: PrintMeshReply[] = [];
    runPrintMesh(
      { parts: [body()], voxelSize: DEFAULT_PRINT_VOXEL_SIZE },
      (reply) => replies.push(reply),
    );

    expect(replies.at(-1)).toMatchObject({ kind: "mesh" });
    expect(
      replies.filter((reply) => reply.kind === "progress").length,
    ).toBeGreaterThan(1);
  });

  it("counts progress to exactly one, so the bar can finish rather than stall", () => {
    // **The promise `MeshProgress` makes** — `done` reaches `total`, exactly once — is what the
    // worker relies on to send a final fraction. A bar that stops at 99% and waits is worse
    // than no bar.
    const fractions: number[] = [];
    runPrintMesh(
      { parts: [body()], voxelSize: DEFAULT_PRINT_VOXEL_SIZE },
      (reply) => {
        if (reply.kind === "progress") fractions.push(reply.fraction);
      },
    );

    expect(fractions.at(-1)).toBe(1);
    expect(fractions.every((at) => at >= 0 && at <= 1)).toBe(true);
    expect(
      fractions.every((at, i) => i === 0 || at >= (fractions[i - 1] as number)),
    ).toBe(true);
  });

  it("answers with a mesh for a model with nothing in it, rather than throwing", () => {
    // **`undefined` is an answer here**, not a fault: `printProblem` turns it into "this model
    // has nothing in it to print", and a thrown error would become a different sentence about
    // the same situation.
    const replies: PrintMeshReply[] = [];
    runPrintMesh({ parts: [], voxelSize: DEFAULT_PRINT_VOXEL_SIZE }, (reply) =>
      replies.push(reply),
    );

    expect(replies.at(-1)).toEqual({ kind: "mesh", result: undefined });
  });

  it("turns a thrown error into a message rather than letting it reach onerror", () => {
    // **An uncaught throw in a worker surfaces as `onerror` with a file and a line** and no
    // message a person can act on. The reply carries the message and the client rethrows it
    // with its own stack, which is the difference between "the export failed" and a stack trace
    // pointing into a bundle.
    //
    // **A part whose primitive this build has no table entry for**, which is a real fault: a
    // model file written by a version with a primitive this one does not have reaches the
    // print path as a `Part` whose shape resolves to nothing. Every voxel size is safe —
    // `samplesFor` clamps `NaN`, `0`, a negative and an absurdly small one to something it can
    // mesh — so this is what the `catch` is actually for.
    const replies: PrintMeshReply[] = [];
    runPrintMesh(
      {
        parts: [
          placedPart(
            "odd",
            { type: "Nonesuch" } as unknown as Parameters<typeof placedPart>[1],
            { x: 0, y: 1, z: 0 },
          ),
        ],
        voxelSize: DEFAULT_PRINT_VOXEL_SIZE,
      },
      (reply) => replies.push(reply),
    );

    expect(replies.at(-1)).toMatchObject({ kind: "failed" });
    expect((replies.at(-1) as { reason: string }).reason).not.toBe("");
  });
});

describe("meshForPrintOffThread", () => {
  it("answers with the same mesh where there is no worker", async () => {
    // **The fallback is the normal path in a test and the degraded one in an old browser**, and
    // a function that warned would be a function everybody learned to ignore. `Worker` does not
    // exist under this suite's node environment, so this is the fallback and not a mock of it.
    expect(typeof Worker).toBe("undefined");

    const fractions: number[] = [];
    const mesh = await meshForPrintOffThread(
      [body()],
      DEFAULT_PRINT_VOXEL_SIZE,
      (fraction) => fractions.push(fraction),
    );

    expect(mesh?.triangles).toBeGreaterThan(0);
    expect(mesh?.report.watertight).toBe(true);
    // **Progress still arrives**, because the fallback adapts the mesher's work count rather
    // than dropping the callback — the bar is the only thing showing that anything is happening.
    expect(fractions.at(-1)).toBe(1);
  });

  it("answers with nothing for a model with nothing in it", async () => {
    await expect(
      meshForPrintOffThread([], DEFAULT_PRINT_VOXEL_SIZE),
    ).resolves.toBeUndefined();
  });
});

/**
 * A `Worker` that records what it was sent and lets a test answer.
 *
 * **A stand-in for the platform rather than a mock of this code**, so what is under test is
 * `meshForPrintOffThread`'s side of the conversation: which messages it listens for, in what
 * order it settles, and that it lets the thread go. The real worker's half is
 * `runPrintMesh`, tested above.
 */
class FakeWorker {
  static last: FakeWorker | undefined;
  onmessage: ((event: MessageEvent<PrintMeshReply>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;
  readonly sent: unknown[] = [];

  constructor() {
    FakeWorker.last = this;
  }

  postMessage(message: unknown): void {
    this.sent.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Delivers a reply as the platform would, as a `MessageEvent` and not a bare object. */
  reply(reply: PrintMeshReply): void {
    this.onmessage?.({ data: reply } as MessageEvent<PrintMeshReply>);
  }

  /** Delivers the worker's own load or runtime failure. */
  fail(message: string): void {
    this.onerror?.({ message } as ErrorEvent);
  }
}

describe("meshForPrintOffThread, over a worker", () => {
  const withWorker = async (run: () => Promise<void>): Promise<FakeWorker> => {
    FakeWorker.last = undefined;
    vi.stubGlobal("Worker", FakeWorker);
    try {
      await run();
    } finally {
      vi.unstubAllGlobals();
    }
    const worker = FakeWorker.last;
    if (worker === undefined) throw new Error("no worker was constructed");
    return worker;
  };

  it("sends the model and the resolution, and nothing else", async () => {
    // **The whole request.** A `Part` is plain data and survives `structuredClone`, which is
    // what lets the model be meshed as it was at the moment the button was pressed rather than
    // as it is when the work finishes — a person who keeps editing during a ten-second export
    // gets the file they asked for.
    let worker!: FakeWorker;
    await withWorker(async () => {
      const waiting = meshForPrintOffThread([body()], MAX_PRINT_VOXEL_SIZE);
      worker = FakeWorker.last!;
      worker.reply({ kind: "mesh", result: undefined });
      await waiting;
    });

    expect(worker.sent).toEqual([
      { parts: [body()], voxelSize: MAX_PRINT_VOXEL_SIZE },
    ]);
  });

  it("passes progress through and settles on the mesh", async () => {
    let worker!: FakeWorker;
    const fractions: number[] = [];
    await withWorker(async () => {
      const waiting = meshForPrintOffThread(
        [body()],
        DEFAULT_PRINT_VOXEL_SIZE,
        (at) => fractions.push(at),
      );
      worker = FakeWorker.last!;
      worker.reply({ kind: "progress", fraction: 0.25 });
      worker.reply({ kind: "progress", fraction: 1 });
      worker.reply({ kind: "mesh", result: undefined });
      await waiting;
    });

    expect(fractions).toEqual([0.25, 1]);
  });

  it("lets the thread go once it has the mesh", async () => {
    // **On every path, not only the happy one.** A worker left running after a refused export —
    // a lidless shell, or a model with no surface in it — is a thread doing nothing for the
    // rest of the session, and both of those reach here as an ordinary reply.
    let worker!: FakeWorker;
    await withWorker(async () => {
      const waiting = meshForPrintOffThread([body()], DEFAULT_PRINT_VOXEL_SIZE);
      worker = FakeWorker.last!;
      worker.reply({ kind: "mesh", result: undefined });
      await waiting;
    });

    expect(worker.terminated).toBe(true);
  });

  it("rethrows a failure with the worker's own words", async () => {
    // **`new Error(reply.reason)` rather than a generic sentence**, because the one thing that
    // goes wrong in a print this expensive is worth saying, and the worker is the only place
    // that knows what.
    await withWorker(async () => {
      const waiting = meshForPrintOffThread([body()], DEFAULT_PRINT_VOXEL_SIZE);
      const worker = FakeWorker.last!;
      worker.reply({ kind: "failed", reason: "out of memory" });

      await expect(waiting).rejects.toThrow("out of memory");
      expect(worker.terminated, "a failed export still frees its thread").toBe(
        true,
      );
    });
  });

  it("rejects when the worker itself fails rather than waiting for ever", async () => {
    // **A worker that cannot load its own module never sends a message**, so without `onerror`
    // the promise waits for the rest of the session with a bar frozen across the popover.
    await withWorker(async () => {
      const waiting = meshForPrintOffThread([body()], DEFAULT_PRINT_VOXEL_SIZE);
      FakeWorker.last!.fail("Failed to fetch dynamically imported module");

      await expect(waiting).rejects.toThrow(/dynamically imported module/);
    });
  });
});
