// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { FillClient } from "./fill-client";
import { WorldWorkerPool } from "./worker-pool";
import { buildBlockShell } from "./level-data";
import { EditLayer } from "./edit-layer";
import { DEFAULT_TERRAIN } from "./noise";
import { VOXEL_GRASS } from "./voxel-store";
import type { VoxelTileConfig } from "../renderers/atlas";
import { emptyMesh } from "../renderers/mesh";
import type { BlockMeshes } from "../renderers/mesh";
import type {
  FillBatchRequest,
  FillBatchResult,
  FillConfig,
} from "./fill-worker";
import type { StructurePlan } from "./structure-fill";

const EMPTY_MESHES: BlockMeshes = {
  terrain: emptyMesh(),
  water: emptyMesh(),
};

/**
 * A worker that records what it is sent (with the per-request generations)
 * and hands results back only when told to, so a fill can be made to finish
 * after the slot it was requested for has been moved on. Speaks the pool's
 * listener interface (`addEventListener`) rather than the `onmessage`/
 * `onerror` properties, because a `WorldWorkerPool` shares its workers between
 * the fill and mesh clients.
 */
class FakeFillWorker {
  readonly sent: FillBatchRequest[] = [];
  readonly messageListeners: Array<(ev: MessageEvent) => void> = [];
  readonly errorListeners: Array<(ev: MessageEvent) => void> = [];
  terminated = false;

  addEventListener(
    type: "message" | "error",
    listener: (ev: MessageEvent) => void,
  ): void {
    if (type === "message") {
      this.messageListeners.push(listener);
    } else {
      this.errorListeners.push(listener);
    }
  }

  removeEventListener(
    type: "message" | "error",
    listener: (ev: MessageEvent) => void,
  ): void {
    const listeners =
      type === "message" ? this.messageListeners : this.errorListeners;
    const index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  }

  postMessage(request: unknown): void {
    if (
      typeof request === "object" &&
      request !== null &&
      (request as { type?: string }).type === "config"
    ) {
      return;
    }
    this.sent.push(request as FillBatchRequest);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Fires the worker's error listeners, as the pool's dropped-worker path does. */
  error(): void {
    for (const listener of this.errorListeners) {
      listener({} as MessageEvent);
    }
  }

  /**
   * Delivers a result carrying back the very arrays the request lent, which is
   * what a real worker does: it fills them in place and transfers them home.
   */
  deliverLent(sentIndex: number): void {
    const request = this.sent[sentIndex];
    const result: FillBatchResult = {
      type: "fill",
      indices: request.indices,
      gens: request.gens,
      lods: request.lods,
      storeData: request.indices.map((_, at) => request.stores![at]),
      mightHaveVoxels: request.indices.map(() => true),
      hasWater: request.indices.map(() => false),
      light: request.indices.map((_, at) => request.lights![at]),
    };
    for (const listener of this.messageListeners) {
      listener({ data: result } as MessageEvent);
    }
  }

  /** Delivers a result for the request at `sentIndex`, as the worker would. */
  deliver(sentIndex: number): void {
    const request = this.sent[sentIndex];
    const result: FillBatchResult = {
      type: "fill",
      indices: request.indices,
      gens: request.gens,
      lods: request.lods,
      storeData: request.indices.map(() => new Uint8Array(0)),
      mightHaveVoxels: request.indices.map(() => true),
      hasWater: request.indices.map(() => false),
      light: request.indices.map(() => new Uint8Array(0)),
    };
    for (const listener of this.messageListeners) {
      listener({ data: result } as MessageEvent);
    }
  }
}

/**
 * A `FakeFillWorker` that also records the fill configurations it is handed,
 * so a test can watch `setStructures` re-post the world's plan to its pool.
 */
class ConfigRecordingWorker extends FakeFillWorker {
  readonly configs: FillConfig[] = [];

  postMessage(request: unknown): void {
    if (
      typeof request === "object" &&
      request !== null &&
      (request as { type?: string }).type === "config"
    ) {
      this.configs.push((request as { config: FillConfig }).config);
    }
    super.postMessage(request);
  }
}

describe("FillClient lending", () => {
  const clientFor = (
    blocks: ReturnType<typeof buildBlockShell>[],
    worker: FakeFillWorker,
  ): FillClient =>
    new FillClient({
      terrain: DEFAULT_TERRAIN,
      blocks,
      onBlockChanged: () => {},
      createWorker: () => worker as unknown as Worker | undefined,
    });

  it("lends a fill three arrays of a slot's size to write into", () => {
    const blocks = [buildBlockShell({ center: [0, 0, 0] })];
    const worker = new FakeFillWorker();
    clientFor(blocks, worker).requestFill([0], [[0, 0, 0]], [0]);

    const length = blocks[0].store.data.length;
    const [request] = worker.sent;
    expect(request.stores?.[0]).toHaveLength(length);
    expect(request.lights?.[0]).toHaveLength(length);
  });

  it("lends the arrays a slot let go of, so a filled window allocates no more", () => {
    const blocks = [buildBlockShell({ center: [0, 0, 0] })];
    const worker = new FakeFillWorker();
    const client = clientFor(blocks, worker);

    // The slot's own arrays before anything is filled, which is what it should
    // hand over once it has adopted the fill's.
    const held = blocks[0].store.data;
    client.requestFill([0], [[0, 0, 0]], [0]);
    const firstLend = worker.sent[0].stores![0];
    expect(firstLend).not.toBe(held);

    worker.deliverLent(0);
    // The slot is holding what the fill filled, and what it held is free.
    expect(blocks[0].store.data).toBe(firstLend);

    client.requestFill([0], [[0, 0, 0]], [0]);
    expect(worker.sent[1].stores![0]).toBe(held);
  });

  it("takes back the lend of a fill nobody wants any more", () => {
    // A slot re-requested while its fill is running refuses the answer when it
    // lands. The arrays that answer carries were lent to it, so refusing it has
    // to keep them: dropping them would leave the window a set short every time
    // a scroll outran a fill.
    const blocks = [buildBlockShell({ center: [0, 0, 0] })];
    const worker = new FakeFillWorker();
    const client = clientFor(blocks, worker);

    client.requestFill([0], [[0, 0, 0]], [0]);
    const staleLend = worker.sent[0].stores![0];
    blocks[0].center = [128, 0, 0];
    client.requestFill([0], [[128, 0, 0]], [0]);

    // The stale answer lands and is refused, which frees the worker for the
    // re-request — and that re-request is lent the refused answer's arrays.
    worker.deliverLent(0);
    expect(worker.sent).toHaveLength(2);
    expect(worker.sent[1].stores![0]).toBe(staleLend);
  });
});

describe("FillClient", () => {
  it("drops a stale fill for a re-requested slot and re-sends the current one", () => {
    const blocks = [buildBlockShell({ center: [0, 0, 0] })];
    const worker = new FakeFillWorker();
    const changed = vi.fn();
    const client = new FillClient({
      terrain: DEFAULT_TERRAIN,
      blocks,
      onBlockChanged: changed,
      createWorker: () => worker as unknown as Worker | undefined,
    });

    // First a fill for the slot at cell A, then — before it lands — the same
    // slot is re-requested at cell B (the sphere moved it on). The re-request
    // bumps the slot's generation but is not sent: the worker is running a
    // batch for the slot, and a batch is only queued when the worker is free.
    client.requestFill([0], [[0, 0, 0]], [0]);
    blocks[0].center = [128, 0, 0];
    client.requestFill([0], [[128, 0, 0]], [0]);

    expect(worker.sent).toHaveLength(1);
    expect(worker.sent[0].gens).toEqual([1]);

    // The stale fill for cell A lands and is refused (the generation has moved
    // on), which frees the worker to take the pending re-request.
    worker.deliver(0);
    expect(changed).not.toHaveBeenCalled();
    expect(worker.sent).toHaveLength(2);
    expect(worker.sent[1].gens).toEqual([2]);

    // The current fill lands and is applied.
    worker.deliver(1);
    expect(changed).toHaveBeenCalledWith(0);
  });

  it("applies a fill whose result is still current", () => {
    const blocks = [buildBlockShell({ center: [0, 0, 0] })];
    const worker = new FakeFillWorker();
    const changed = vi.fn();
    const client = new FillClient({
      terrain: DEFAULT_TERRAIN,
      blocks,
      onBlockChanged: changed,
      createWorker: () => worker as unknown as Worker | undefined,
    });

    client.requestFill([0], [[0, 0, 0]], [0]);
    worker.deliver(0);
    expect(changed).toHaveBeenCalledWith(0);
  });

  it("sends each slot's requested level of detail to the worker", () => {
    const blocks = [buildBlockShell({ center: [0, 0, 0] })];
    const worker = new FakeFillWorker();
    const client = new FillClient({
      terrain: DEFAULT_TERRAIN,
      blocks,
      onBlockChanged: () => {},
      createWorker: () => worker as unknown as Worker | undefined,
    });

    client.requestFill([0], [[0, 0, 0]], [2]);
    expect(worker.sent[0].lods).toEqual([2]);
  });

  it("sends a newer nearest request before an older far one", () => {
    const blocks = [
      buildBlockShell({ center: [0, 0, 0] }),
      buildBlockShell({ center: [1000, 0, 0] }),
    ];
    const worker = new FakeFillWorker();
    const changed = vi.fn();
    const client = new FillClient({
      terrain: DEFAULT_TERRAIN,
      blocks,
      onBlockChanged: changed,
      createWorker: () => worker as unknown as Worker | undefined,
    });

    // The far slot is requested first and sent while the worker is free.
    client.requestFill([1], [[1000, 0, 0]], [0], undefined, [0, 0, 0]);
    expect(worker.sent).toHaveLength(1);
    expect(worker.sent[0].indices).toEqual([1]);

    // The nearer slot is requested while the worker runs the far fill; it
    // queues rather than sending, then takes the worker's next batch.
    client.requestFill([0], [[0, 0, 0]], [0], undefined, [0, 0, 0]);
    expect(worker.sent).toHaveLength(1);

    worker.deliver(0);
    expect(worker.sent).toHaveLength(2);
    expect(worker.sent[1].indices).toEqual([0]);
    worker.deliver(1);
    expect(changed).toHaveBeenCalledWith(1);
    expect(changed).toHaveBeenCalledWith(0);
  });

  it("sizes the slot's store to the level of detail it fills at", () => {
    const blocks = [buildBlockShell({ center: [0, 0, 0] })];
    const client = new FillClient({
      terrain: DEFAULT_TERRAIN,
      blocks,
      onBlockChanged: () => {},
    });

    client.fillNow(0, 2);
    expect(blocks[0].store.voxels).toEqual([16, 16, 16]);
    expect(blocks[0].store.scale).toBe(8);
  });

  it("drops an in-flight fill for a slot synchronously refilled before it lands", () => {
    const blocks = [buildBlockShell({ center: [0, 0, 0] })];
    const worker = new FakeFillWorker();
    const changed = vi.fn();
    const client = new FillClient({
      terrain: DEFAULT_TERRAIN,
      blocks,
      onBlockChanged: changed,
      createWorker: () => worker as unknown as Worker | undefined,
    });

    client.requestFill([0], [[0, 0, 0]], [0]);
    // The player stepped into this cell, so it is filled on the calling
    // thread — that must invalidate the request already in flight.
    client.fillNow(0);
    expect(changed).toHaveBeenCalledTimes(1); // the synchronous fill

    worker.deliver(0);
    expect(changed).toHaveBeenCalledTimes(1); // the stale fill was dropped
  });

  it("terminates the workers when disposed", () => {
    const worker = new FakeFillWorker();
    const client = new FillClient({
      terrain: DEFAULT_TERRAIN,
      blocks: [buildBlockShell({ center: [0, 0, 0] })],
      onBlockChanged: () => {},
      createWorker: () => worker as unknown as Worker | undefined,
    });
    client.dispose();
    expect(worker.terminated).toBe(true);
  });

  it("ignores a mesh result posted on the same shared pool", () => {
    const worker = new FakeFillWorker();
    const pool = new WorldWorkerPool({
      createWorker: () => worker as unknown as Worker,
      count: 1,
    });
    const changed = vi.fn();
    const client = new FillClient({
      terrain: DEFAULT_TERRAIN,
      blocks: [buildBlockShell({ center: [0, 0, 0] })],
      onBlockChanged: changed,
      pool,
    });

    client.requestFill([0], [[0, 0, 0]], [0]);
    // The shared pool's worker answers the mesh client too; a mesh result must
    // not be mistaken for the fill the fill client is waiting on.
    for (const listener of worker.messageListeners) {
      listener({
        data: {
          type: "mesh",
          id: 0,
          terrain: {
            positions: [],
            normals: [],
            uvs: [],
            brightness: [],
            indices: [],
          },
          water: {
            positions: [],
            normals: [],
            uvs: [],
            brightness: [],
            indices: [],
          },
          data: new Uint8Array(0),
          light: new Uint8Array(0),
        },
      } as MessageEvent);
    }
    expect(changed).not.toHaveBeenCalled();

    worker.deliver(0);
    expect(changed).toHaveBeenCalledWith(0);
  });

  it("sends a combined fillMesh request carrying the tile rects when a tileRects source is supplied", () => {
    const blocks = [buildBlockShell({ center: [0, 0, 0] })];
    const worker = new FakeFillWorker();
    const rects: VoxelTileConfig[] = [{ id: 1, top: 0, side: 1, bottom: 2 }];
    const client = new FillClient({
      terrain: DEFAULT_TERRAIN,
      blocks,
      onBlockChanged: () => {},
      tileRects: () => rects,
      createWorker: () => worker as unknown as Worker | undefined,
    });

    client.requestFill([0], [[0, 0, 0]], [0]);

    expect(worker.sent[0]).toMatchObject({
      type: "fillMesh",
      indices: [0],
      gens: [1],
      tileRects: rects,
    });
    // The mesh client still queues normal rebuilds, so nothing here sends
    // anything at the end of a fill.
    expect(worker.sent).toHaveLength(1);
  });

  it("sends plain fill requests when no tileRects source is supplied", () => {
    const blocks = [buildBlockShell({ center: [0, 0, 0] })];
    const worker = new FakeFillWorker();
    const client = new FillClient({
      terrain: DEFAULT_TERRAIN,
      blocks,
      onBlockChanged: () => {},
      createWorker: () => worker as unknown as Worker | undefined,
    });

    client.requestFill([0], [[0, 0, 0]], [0]);

    expect(worker.sent[0].type).toBe("fill");
  });

  it("adopts the meshes a combined result carries", () => {
    const blocks = [buildBlockShell({ center: [0, 0, 0] })];
    const worker = new FakeFillWorker();
    const changed = vi.fn();
    const rects: VoxelTileConfig[] = [];
    const client = new FillClient({
      terrain: DEFAULT_TERRAIN,
      blocks,
      onBlockChanged: changed,
      tileRects: () => rects,
      createWorker: () => worker as unknown as Worker | undefined,
    });

    client.requestFill([0], [[0, 0, 0]], [0]);
    for (const listener of worker.messageListeners) {
      listener({
        data: {
          type: "fillMesh",
          index: 0,
          gen: worker.sent[0].gens[0],
          lod: 0,
          storeData: new Uint8Array(0),
          mightHaveVoxels: false,
          hasWater: false,
          light: new Uint8Array(0),
          terrain: EMPTY_MESHES.terrain,
          water: EMPTY_MESHES.water,
        },
      } as MessageEvent);
    }
    // The block's geometry arrived with its voxels, so the caller gets the
    // meshes and never queues a separate rebuild.
    expect(changed).toHaveBeenCalledWith(0, EMPTY_MESHES);
  });

  it("drops the combined meshes when the atlas changed after the request was sent", () => {
    const blocks = [buildBlockShell({ center: [0, 0, 0] })];
    const worker = new FakeFillWorker();
    const changed = vi.fn();
    // Two atlases: the early one the initial fill is sent against, and the one
    // the spritesheet finishes loading into a moment later.
    const earlyRects: VoxelTileConfig[] = [];
    const loadedRects: VoxelTileConfig[] = [
      { id: 1, top: 0, side: 1, bottom: 2 },
    ];
    let currentRects: VoxelTileConfig[] = earlyRects;
    const client = new FillClient({
      terrain: DEFAULT_TERRAIN,
      blocks,
      onBlockChanged: changed,
      tileRects: () => currentRects,
      createWorker: () => worker as unknown as Worker | undefined,
    });

    client.requestFill([0], [[0, 0, 0]], [0]);
    // The atlas landed while the job was in the worker: the meshes it returns
    // were baked with the earlier, empty tile list, so their texture
    // coordinates are wrong for what the renderer draws now.
    currentRects = loadedRects;
    for (const listener of worker.messageListeners) {
      listener({
        data: {
          type: "fillMesh",
          index: 0,
          gen: worker.sent[0].gens[0],
          lod: 0,
          storeData: new Uint8Array(0),
          mightHaveVoxels: false,
          hasWater: false,
          light: new Uint8Array(0),
          terrain: EMPTY_MESHES.terrain,
          water: EMPTY_MESHES.water,
        },
      } as MessageEvent);
    }
    // The stale meshes are not adopted; the block is only reported as changed,
    // which queues a rebuild against the tiles the renderer holds now.
    expect(changed).toHaveBeenCalledWith(0);
    expect(changed).not.toHaveBeenCalledWith(0, EMPTY_MESHES);
  });

  it("drops the worker's meshes when the edit overlay changed the block", () => {
    const blocks = [buildBlockShell({ center: [0, 0, 0] })];
    const worker = new FakeFillWorker();
    const changed = vi.fn();
    const rects: VoxelTileConfig[] = [];
    const editLayer = new EditLayer();
    editLayer.set([0, 0, 0], VOXEL_GRASS, 1);
    const client = new FillClient({
      terrain: DEFAULT_TERRAIN,
      blocks,
      onBlockChanged: changed,
      editLayer,
      tileRects: () => rects,
      createWorker: () => worker as unknown as Worker | undefined,
    });

    client.requestFill([0], [[0, 0, 0]], [0]);
    for (const listener of worker.messageListeners) {
      listener({
        data: {
          type: "fillMesh",
          index: 0,
          gen: worker.sent[0].gens[0],
          lod: 0,
          storeData: new Uint8Array(0),
          mightHaveVoxels: false,
          hasWater: false,
          light: new Uint8Array(0),
          terrain: EMPTY_MESHES.terrain,
          water: EMPTY_MESHES.water,
        },
      } as MessageEvent);
    }
    // The worker never saw the edit, so its mesh is stale: the caller is told
    // only that the block changed, and a normal rebuild is what re-draws it.
    expect(changed).toHaveBeenCalledWith(0);
    expect(changed).not.toHaveBeenCalledWith(0, EMPTY_MESHES);
  });
});

describe("FillClient.setStructures", () => {
  it("re-posts the fill configuration when the structures are updated", () => {
    const worker = new ConfigRecordingWorker();
    const pool = new WorldWorkerPool({
      createWorker: () => worker as unknown as Worker,
      count: 1,
    });
    const client = new FillClient({
      terrain: DEFAULT_TERRAIN,
      blocks: [buildBlockShell({ center: [0, 0, 0] })],
      onBlockChanged: () => {},
      pool,
    });
    // The client handed the pool its configuration once at startup.
    expect(worker.configs).toHaveLength(1);

    const plan: StructurePlan = [
      { kind: "box", min: [0, 0, 0], max: [3, 3, 3], id: 1 },
    ];
    client.setStructures(plan);

    expect(worker.configs).toHaveLength(2);
    expect(worker.configs[1].structures).toEqual(plan);
    client.dispose();
  });
});
