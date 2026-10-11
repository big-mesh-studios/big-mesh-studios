/**
 * The worker's half of the unwrap: what it says back for each thing that can happen.
 *
 * **The WebAssembly is stubbed here, unlike in `./unwrap.test.ts`.** That is the point of the
 * split between the two files: one asks the library what it really does, and the other asks the
 * plumbing what it really reports — and the plumbing's answers are worth having on their own,
 * because a worker that hangs is worse than one that is wrong. Every path through `runUnwrap`
 * settles a promise.
 */
import { describe, expect, it } from "vitest";

import { centredBox } from "../print/fixtures";
import type { UnwrapMesh, XAtlas, XAtlasModule } from "./unwrap";
import { runUnwrap, type UnwrapReply } from "./unwrap-worker";

/** A mesh, however small. The stub atlas does not care what is in it. */
const mesh = (): UnwrapMesh => {
  const box = centredBox(2);
  return {
    positions: box.positions,
    indices: box.indices,
    vertexCount: box.vertexCount,
  };
};

const empty = (): UnwrapMesh => ({
  positions: new Float32Array(0),
  indices: new Uint32Array(0),
  vertexCount: 0,
});

/**
 * An atlas that answers with one chart and no real arithmetic.
 *
 * **`destroy` is recorded rather than ignored**, because the adapter's contract is that every
 * atlas it creates is destroyed on every path out, and a stub that cannot see that would let the
 * contract rot untested.
 */
const stubModule = (
  answers: {
    addMesh?: number;
    width?: number;
    height?: number;
    chartCount?: number;
    util?: number;
  } = {},
): { module: XAtlasModule; destroyed: () => number } => {
  let destroyed = 0;
  const atlas: XAtlas = {
    addMesh: () => answers.addMesh ?? 0,
    generate: () => {},
    // **Two triangles over six output vertices**, which is what an unwelded mesh looks like:
    // the same input vertex appearing twice is not a mistake in the stub, it is the shape of
    // the thing. The second triangle shares no vertex with the first.
    getMesh: () => ({
      vertexCount: 6,
      indexCount: 6,
      vertices: [
        { atlasIndex: 0, chartIndex: 0, uv: [50, 50], xref: 0 },
        { atlasIndex: 0, chartIndex: 0, uv: [100, 50], xref: 1 },
        { atlasIndex: 0, chartIndex: 0, uv: [100, 100], xref: 2 },
        { atlasIndex: 0, chartIndex: 0, uv: [110, 50], xref: 1 },
        { atlasIndex: 0, chartIndex: 0, uv: [160, 50], xref: 3 },
        { atlasIndex: 0, chartIndex: 0, uv: [160, 100], xref: 2 },
      ],
      indices: Uint32Array.from([0, 1, 2, 3, 4, 5]),
      charts: [{ faceCount: 12 }],
    }),
    getUtilization: () => answers.util ?? 0.5,
    destroy: () => {
      destroyed++;
    },
    width: answers.width ?? 200,
    height: answers.height ?? 100,
    chartCount: answers.chartCount ?? 1,
    texelsPerUnit: 10,
  };
  return {
    module: { createAtlas: () => atlas, addMeshErrorString: () => "refused" },
    destroyed: () => destroyed,
  };
};

/** Runs one request and collects every reply. */
const collect = async (
  request: UnwrapMesh,
  module: XAtlasModule,
): Promise<UnwrapReply[]> => {
  const replies: UnwrapReply[] = [];
  await runUnwrap(
    request,
    (reply) => replies.push(reply),
    async () => module,
  );
  return replies;
};

describe("runUnwrap", () => {
  it("answers with an atlas and a coordinate a vertex", async () => {
    const stub = stubModule();

    const replies = await collect(mesh(), stub.module);

    const last = replies.at(-1);
    expect(last?.kind).toBe("atlas");
    // **Half the atlas, because the stub puts a vertex at (100, 100) in a 200×100 one.** This is
    // the normalisation the adapter exists to do, and the assertion is on the division.
    expect(last?.kind === "atlas" && last.result.uvs[4]).toBeCloseTo(0.5);
    expect(last?.kind === "atlas" && last.result.uvs[5]).toBeCloseTo(1);
  });

  it("says how far it has got, before it finishes", async () => {
    const replies = await collect(mesh(), stubModule().module);

    // **Progress is reported once, and it is reported at all.** A rebake takes seconds, and a
    // status line that shows nothing until the end is the difference between waiting and
    // wondering.
    expect(replies[0]?.kind).toBe("progress");
  });

  it("says empty rather than an atlas of nothing", async () => {
    const replies = await collect(empty(), stubModule().module);

    // **Its own kind rather than a failure or a zero-sized atlas**, so the caller can tell "there
    // is no model to unwrap" from "the unwrap went wrong".
    expect(replies.at(-1)?.kind).toBe("empty");
  });

  it("destroys the atlas however it turned out", async () => {
    const stub = stubModule();

    await collect(mesh(), stub.module);

    expect(stub.destroyed()).toBe(1);
  });

  it("destroys the atlas when the library refused the mesh", async () => {
    const stub = stubModule({ addMesh: 2 });

    const replies = await collect(mesh(), stub.module);

    expect(replies.at(-1)).toEqual({
      kind: "failed",
      reason: "xatlas refused the mesh: refused",
    });
    expect(stub.destroyed()).toBe(1);
  });

  it("turns a loader that throws into a message rather than an error event", async () => {
    const replies: UnwrapReply[] = [];

    // **A throw that escaped would leave the caller's promise unsettled forever**, and the one
    // thing worth having — why it failed — would be the thing lost. Same reasoning as the print
    // protocol this is modelled on.
    await runUnwrap(
      mesh(),
      (reply) => replies.push(reply),
      () => Promise.reject(new Error("no WebAssembly here")),
    );

    expect(replies.at(-1)).toEqual({
      kind: "failed",
      reason: "no WebAssembly here",
    });
  });

  it("turns something that is not an error into a message too", async () => {
    const replies: UnwrapReply[] = [];

    await runUnwrap(
      mesh(),
      (reply) => replies.push(reply),
      () => Promise.reject("a string"),
    );

    expect(replies.at(-1)).toEqual({ kind: "failed", reason: "a string" });
  });
});
