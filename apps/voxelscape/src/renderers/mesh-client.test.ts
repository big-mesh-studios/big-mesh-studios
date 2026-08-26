// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { MeshClient } from "./mesh-client";
import { buildBlockShell, type WorldBlock } from "../world/level-data";
import type { MeshBuildRequest, MeshBuildResult } from "./mesh";

/**
 * A worker that records what it is sent and hands results back only when told
 * to, so a result can be made to arrive after the block it was built from has
 * already changed.
 */
class FakeMeshWorker {
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  readonly sent: MeshBuildRequest[] = [];
  terminated = false;

  postMessage(request: MeshBuildRequest): void {
    this.sent.push(request);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Delivers a result for the request at `sentIndex`, as the worker would. */
  deliver(sentIndex: number): void {
    const result: MeshBuildResult = {
      id: this.sent[sentIndex].id,
      terrain: { positions: [], normals: [], uvs: [], indices: [] },
      water: { positions: [], normals: [], uvs: [], indices: [] },
    };
    this.onmessage?.({ data: result } as MessageEvent);
  }
}

const setup = (
  blockCount: number,
  options: { worker?: FakeMeshWorker | undefined } = {},
) => {
  const blocks: WorldBlock[] = [];
  for (let i = 0; i < blockCount; i++) {
    blocks.push(buildBlockShell({ center: [i * 192, 0, 0] }));
  }
  const built: number[] = [];
  const worker = "worker" in options ? options.worker : new FakeMeshWorker();
  const client = new MeshClient({
    blocks,
    onMeshBuilt: (index) => built.push(index),
    createWorker: () => worker as unknown as Worker | undefined,
  });
  return { client, built, worker };
};

describe("MeshClient", () => {
  it("hands queued blocks to the worker and reports what comes back", () => {
    const { client, built, worker } = setup(3);
    client.requestBuild(1);
    expect(built).toEqual([]); // queued, not built yet

    client.drain();
    expect(worker?.sent.map((r) => r.id)).toEqual([1]);
    expect(built).toEqual([]); // sent, still not back

    worker?.deliver(0);
    expect(built).toEqual([1]);
  });

  // The reason every block carries a generation counter: a build reads a copy
  // of the block's voxel data, and by the time it finishes that slot may hold
  // different terrain entirely.
  it("drops a result for data that changed after the request went out", () => {
    const { client, built, worker } = setup(3);
    client.requestBuild(1);
    client.drain();

    client.requestBuild(1); // the block's data changed while the build ran
    worker?.deliver(0);

    expect(built).toEqual([]);
  });

  it("drops a result for a slot invalidated after the request went out", () => {
    const { client, built, worker } = setup(3);
    client.requestBuild(1);
    client.drain();

    // The ring moved this slot elsewhere; nothing is queued, but what is in
    // flight was built for terrain that is no longer there.
    client.invalidate(1);
    worker?.deliver(0);

    expect(built).toEqual([]);
  });

  it("marks a slot stale without queueing it", () => {
    const { client, worker } = setup(3);
    client.invalidate(1);
    client.drain();
    expect(worker?.sent).toEqual([]);
  });

  it("hands over no more than the drain's share at a time", () => {
    const { client, worker } = setup(10);
    for (let index = 0; index < 10; index++) {
      client.requestBuild(index);
    }

    client.drain();
    expect(worker?.sent).toHaveLength(6);
    client.drain();
    expect(worker?.sent).toHaveLength(10);
  });

  it("does not send a second build for a block still in flight", () => {
    const { client, worker } = setup(3);
    client.requestBuild(1);
    client.drain();
    client.requestBuild(1);
    client.drain();

    expect(worker?.sent.map((r) => r.id)).toEqual([1]);
  });

  it("builds on the calling thread when there is no worker", () => {
    const { client, built } = setup(3, { worker: undefined });
    client.requestBuild(1);
    expect(built).toEqual([]);

    client.drain();
    expect(built).toEqual([1]);
  });

  it("falls back to the calling thread once the worker errors, keeping what was in flight", () => {
    const { client, built, worker } = setup(3);
    client.requestBuild(1);
    client.drain();
    expect(built).toEqual([]);

    worker?.onerror?.({});
    // The build that was in flight is owed and nothing will deliver it, so it
    // goes back on the queue for this thread to build.
    client.drain();
    expect(built).toEqual([1]);
  });

  it("builds one block before returning, without waiting for a drain", () => {
    const { client, built, worker } = setup(3);
    client.buildNow(2);
    expect(built).toEqual([2]);
    expect(worker?.sent).toEqual([]);
  });

  it("takes a block built directly off the queue", () => {
    const { client, built, worker } = setup(3);
    client.requestBuild(2);
    client.buildNow(2);
    client.drain();

    expect(built).toEqual([2]); // built once, not again by the drain
    expect(worker?.sent).toEqual([]);
  });

  it("queues every block when the tiles change", () => {
    const { client, worker } = setup(4);
    client.setTiles([]);
    client.drain();
    expect(worker?.sent.map((r) => r.id)).toEqual([0, 1, 2, 3]);
  });

  it("terminates the worker when disposed", () => {
    const { client, worker } = setup(2);
    client.dispose();
    expect(worker?.terminated).toBe(true);
  });

  it("warns once when the worker errors", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { worker } = setup(2);
    worker?.onerror?.({});
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
