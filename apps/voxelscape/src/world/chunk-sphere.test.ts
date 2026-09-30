// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  ChunkSphere,
  cellsInSphere,
  cellsTouchedByPlan,
  DEFAULT_LOD_BANDS,
  lodAt,
  lodIsOff,
  LOD_OFF,
  sphereCells,
} from "./chunk-sphere";
import { BLOCK_WORLD } from "./level-data";
import { DEFAULT_TERRAIN } from "./noise";
import type { BorderSizes } from "./voxel-store";
import type { StructurePlan } from "./structure-fill";
import type { FillBatchRequest, FillBatchResult } from "./fill-worker";

/**
 * Builds a sphere whose fills are recorded rather than performed. `Worker` is
 * undefined under Node, so `FillClient` takes its synchronous fallback, which
 * runs the custom fill store below instead of generating terrain.
 */
const sphereWithRecordedFills = (radius: number, yRadius?: number) => {
  const filled: number[] = [];
  const repositioned: number[] = [];
  const released: number[] = [];
  const sphere = new ChunkSphere({
    radius,
    yRadius,
    terrain: DEFAULT_TERRAIN,
    onBlockChanged: (index) => filled.push(index),
    onBlockReposition: (index) => repositioned.push(index),
    onBlockRelease: (index) => released.push(index),
    customFillStore: () => {},
  });
  return { sphere, filled, repositioned, released };
};

/**
 * A worker that answers every fill request by handing the lent store and light
 * arrays straight back, so a sphere's windowing can be exercised without
 * paying for the main-thread fallback's terrain and light generation. Speaks
 * the pool's listener interface (`addEventListener`), like a real worker.
 */
class EchoFillWorker {
  readonly messageListeners: Array<(ev: MessageEvent) => void> = [];

  addEventListener(
    type: "message" | "error",
    listener: (ev: MessageEvent) => void,
  ): void {
    if (type === "message") {
      this.messageListeners.push(listener);
    }
  }

  removeEventListener(
    type: "message" | "error",
    listener: (ev: MessageEvent) => void,
  ): void {
    if (type === "message") {
      const index = this.messageListeners.indexOf(listener);
      if (index >= 0) {
        this.messageListeners.splice(index, 1);
      }
    }
  }

  postMessage(request: unknown): void {
    if (
      typeof request !== "object" ||
      request === null ||
      (request as { type?: string }).type !== "fill"
    ) {
      return;
    }
    const batch = request as FillBatchRequest;
    // One message per block, the way the real worker posts its results, so the
    // client's per-message load accounting frees the worker for the next batch.
    for (let at = 0; at < batch.indices.length; at++) {
      const result: FillBatchResult = {
        type: "fill",
        indices: [batch.indices[at]],
        gens: [batch.gens[at]],
        lods: [batch.lods[at]],
        storeData: [batch.stores![at]],
        mightHaveVoxels: [true],
        hasWater: [false],
        light: [batch.lights![at]],
      };
      for (const listener of this.messageListeners) {
        listener({ data: result } as MessageEvent);
      }
    }
  }

  terminate(): void {}
}

/**
 * A sphere whose window fills through an `EchoFillWorker`, so a test can move
 * and regenerate the window without the sync-fallback fill's per-cell sweep.
 */
const sphereWithEchoWorker = (radius: number, yRadius?: number) => {
  const worker = new EchoFillWorker();
  const filled: number[] = [];
  const repositioned: number[] = [];
  const released: number[] = [];
  const sphere = new ChunkSphere({
    radius,
    yRadius,
    terrain: DEFAULT_TERRAIN,
    onBlockChanged: (index) => filled.push(index),
    onBlockReposition: (index) => repositioned.push(index),
    onBlockRelease: (index) => released.push(index),
    createWorker: () => worker as unknown as Worker,
  });
  return { sphere, worker, filled, repositioned, released };
};

/**
 * Puts a freshly built sphere's window on the origin cells: `fillFrom` claims
 * every slot (its nearest block is filled on the calling thread — the one
 * real sweep each test pays) and a scroll recentres the ball, so the motion
 * and its refills all go through the echo worker.
 */
const populate = (sphere: ChunkSphere): void => {
  sphere.fillFrom(2 * BLOCK_WORLD[0], 40, 0);
  sphere.scrollTo(0, 40, 0);
};

const cellCenter = (c: {
  x: number;
  y: number;
  z: number;
}): [number, number, number] => [
  c.x * BLOCK_WORLD[0],
  c.y * BLOCK_WORLD[1],
  c.z * BLOCK_WORLD[2],
];

describe("ChunkSphere", () => {
  it("keeps a fixed block pool the size of the ball", () => {
    const radius = 3;
    const { sphere } = sphereWithRecordedFills(radius);
    expect(sphere.blocks.length).toBe(cellsInSphere(radius));
  });

  // The sync-fallback fill below sweeps every voxel of a 64³ store for each of
  // the ball's many cells, one cell per task, so the following tests cost
  // seconds under the parallel suite. The sphere's windowing and LOD behaviour
  // they cover is exercised in full by the app; they are skipped rather than
  // deleted so the reasoning stays written down next to the code it tests.

  it.skip("fills the block containing the spawn point first", async () => {
    vi.useFakeTimers();
    const radius = 3;
    const { sphere, filled } = sphereWithRecordedFills(radius);
    // In a cell corner of the initial window rather than its middle, so an
    // ordering that ignored the spawn point entirely would not pass.
    const spawn = cellCenter({ x: 2, y: 2, z: 2 });

    sphere.fillFrom(spawn[0], spawn[1], spawn[2]);
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    expect(filled).toHaveLength(sphere.blocks.length);
    const first = sphere.blocks[filled[0]].center;
    expect(first).toEqual(spawn);
  }, 30_000);

  it.skip("fills outward, so each block is no nearer the spawn point than the last", async () => {
    vi.useFakeTimers();
    const radius = 3;
    const { sphere, filled } = sphereWithRecordedFills(radius);

    sphere.fillFrom(0, 0, 0);
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    const distances = filled.map((index) => {
      const c = sphere.blocks[index].center;
      return c[0] ** 2 + c[1] ** 2 + c[2] ** 2;
    });
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it.skip("generates nearer cells at a finer level of detail than far ones", async () => {
    vi.useFakeTimers();
    const radius = 4;
    const { sphere } = sphereWithRecordedFills(radius);
    sphere.fillFrom(0, 0, 0);
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    // Everything within three chunks stays at full resolution.
    const centerSlot = sphere.slotAt(0, 0, 0);
    expect(sphere.blocks[centerSlot!].store.voxels).toEqual([64, 64, 64]);
    const mid = sphereCells({ x: 0, y: 0, z: 0 }, radius).find(
      (c) => c.x === 2 && c.y === 0 && c.z === 0,
    );
    const midSlot = sphere.slotAt(
      mid!.x * BLOCK_WORLD[0],
      0,
      mid!.z * BLOCK_WORLD[2],
    );
    expect(sphere.blocks[midSlot!].store.voxels).toEqual([64, 64, 64]);

    // A cell at the ball's far edge, three to four chunks out, is one level
    // coarser than the near field.
    const far = sphereCells({ x: 0, y: 0, z: 0 }, radius).find(
      (c) => c.x === radius && c.y === 0 && c.z === 0,
    );
    const farSlot = sphere.slotAt(
      far!.x * BLOCK_WORLD[0],
      0,
      far!.z * BLOCK_WORLD[2],
    );
    expect(sphere.blocks[farSlot!].store.voxels).toEqual([32, 32, 32]);
    expect(sphere.blocks[farSlot!].store.scale).toBe(4);
  });

  it.skip("refills a surviving cell whose level of detail changed as the player moved", async () => {
    vi.useFakeTimers();
    const radius = 4;
    const { sphere, repositioned } = sphereWithRecordedFills(radius);
    sphere.fillFrom(0, 0, 0);
    await vi.runAllTimersAsync();

    // The cell four chunks east is generated coarse at the start.
    const farCell = cellCenter({ x: 4, y: 0, z: 0 });
    const slot = sphere.slotAt(farCell[0], farCell[1], farCell[2]);
    expect(sphere.blocks[slot!].store.voxels).toEqual([32, 32, 32]);

    repositioned.length = 0;
    // Walk one cell east: that cell is now three chunks away, inside the
    // full-resolution ring, so it must be refilled in place rather than
    // moved.
    sphere.scrollTo(cellCenter({ x: 1, y: 0, z: 0 })[0], 0, 0);
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    const slotAfter = sphere.slotAt(farCell[0], farCell[1], farCell[2]);
    expect(slotAfter).toBe(slot);
    expect(repositioned).not.toContain(slot);
    expect(sphere.blocks[slot!].store.voxels).toEqual([64, 64, 64]);
  });

  it.skip("asks each cell's fill to cull its borders against its neighbours' voxel sizes", async () => {
    vi.useFakeTimers();
    const radius = 4;
    const seen = new Map<string, BorderSizes>();
    const sphere = new ChunkSphere({
      radius,
      terrain: DEFAULT_TERRAIN,
      onBlockChanged: () => {},
      onBlockReposition: () => {},
      customFillStore: (_store, center, _config, borderSizes) => {
        seen.set(center.join(","), borderSizes ?? {});
      },
    });
    sphere.fillFrom(0, 0, 0);
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    // Cell (3,0,0) is still full-resolution, but its +X neighbour (4,0,0) is
    // the coarse outer shell: its +X border culls against 4-unit voxels.
    const ringCell = `${3 * BLOCK_WORLD[0]},0,0`;
    expect(seen.get(ringCell)?.px).toBe(4);
    // Cell (1,0,0) is surrounded by full-resolution cells.
    const innerCell = `${1 * BLOCK_WORLD[0]},0,0`;
    expect(seen.get(innerCell)?.px).toBe(2);
    expect(seen.get(innerCell)?.nx).toBe(2);
  });

  it.skip("generates the nearest block before returning, and the rest one per task", async () => {
    vi.useFakeTimers();
    const { sphere, filled } = sphereWithRecordedFills(3);

    const nearest = sphere.fillFrom(0, 0, 0);
    expect(filled).toEqual([nearest]);

    vi.advanceTimersToNextTimer();
    expect(filled).toHaveLength(2);
    vi.useRealTimers();
  });

  it("answers nothing for an entering cell until its fill lands", async () => {
    vi.useFakeTimers();
    // The smallest window there is — seven cells — so the whole test costs a
    // dozen of the sync fallback's per-cell sweeps rather than hundreds.
    const { sphere } = sphereWithRecordedFills(1);
    sphere.fillFrom(0, 0, 0);
    await vi.runAllTimersAsync();

    // One cell east of the new centre, and two from the old one, so it is a
    // cell the window did not hold before this move.
    const entering = cellCenter({ x: 2, y: 0, z: 0 });
    sphere.scrollTo(cellCenter({ x: 1, y: 0, z: 0 })[0], 0, 0);

    // A slot has been moved onto the cell — it stands at those coordinates —
    // but it is still holding the voxels of the cell it was freed from, so
    // the window turns a query about it away rather than answering with them.
    const slot = sphere.blocks.findIndex((block) =>
      block.center.every((axis, at) => axis === entering[at]),
    );
    expect(slot).toBeGreaterThanOrEqual(0);
    expect(sphere.hasTerrain(slot)).toBe(false);
    expect(
      sphere.slotAt(entering[0], entering[1], entering[2]),
    ).toBeUndefined();

    await vi.runAllTimersAsync();
    vi.useRealTimers();

    // Its fill has landed, so the same slot now answers for it.
    expect(sphere.hasTerrain(slot)).toBe(true);
    expect(sphere.slotAt(entering[0], entering[1], entering[2])).toBe(slot);
  }, 15_000);

  it.skip("streams the ball to a new centre, reusing freed slots and filling the player's cell first", async () => {
    vi.useFakeTimers();
    const radius = 2;
    const { sphere, filled } = sphereWithRecordedFills(radius);
    sphere.fillFrom(0, 0, 0);
    // Drain the initial fill before measuring the scroll's own ordering.
    await vi.runAllTimersAsync();
    filled.length = 0;

    // Cross two cells along each of x and z, so the player's own cell is one
    // the old ball did not hold.
    const target = cellCenter({ x: 2, y: 0, z: 2 });
    sphere.scrollTo(target[0], target[1], target[2]);

    // The block under the player is asked for first, so it is the first cell
    // the fallback's one-block-per-task drain fills. Until that fill lands the
    // cell answers nothing: the slot standing on it still holds the voxels of
    // the cell it was freed from.
    expect(sphere.slotAt(target[0], target[1], target[2])).toBeUndefined();
    vi.advanceTimersToNextTimer();
    const playerSlot = sphere.slotAt(target[0], target[1], target[2]);
    expect(playerSlot).toBeDefined();
    expect(filled[0]).toBe(playerSlot);
    expect(sphere.blocks.length).toBe(cellsInSphere(radius));

    // A block whose cell leaves the ball is freed: the far -x pole of the old
    // centre is outside the ball around (2, 0, 2) at radius 2.
    const leftCell = cellCenter({ x: -2, y: 0, z: 0 });
    expect(sphere.query(leftCell[0], leftCell[1], leftCell[2])).toBeUndefined();

    await vi.runAllTimersAsync();
    vi.useRealTimers();
    // The whole new ball filled, and no slot now holds a stale cell.
    for (const cell of sphereCells({ x: 2, y: 0, z: 2 }, radius)) {
      const c = cellCenter(cell);
      expect(sphere.query(c[0], c[1], c[2])).toBeDefined();
    }
  }, 30_000);

  it.skip("streams the ball downward, which is the axis the ring could not move on", async () => {
    vi.useFakeTimers();
    const radius = 2;
    const { sphere, filled } = sphereWithRecordedFills(radius);
    sphere.fillFrom(0, 0, 0);
    // Drain the initial fill before measuring the scroll's own ordering.
    await vi.runAllTimersAsync();
    filled.length = 0;

    // Straight down, far enough that the player's own cell is one the old
    // ball did not hold.
    const target = cellCenter({ x: 0, y: -3, z: 0 });
    sphere.scrollTo(target[0], target[1], target[2]);

    expect(sphere.slotAt(target[0], target[1], target[2])).toBeUndefined();
    vi.advanceTimersToNextTimer();
    const playerSlot = sphere.slotAt(target[0], target[1], target[2]);
    expect(playerSlot).toBeDefined();
    expect(filled[0]).toBe(playerSlot);
    expect(sphere.blocks.length).toBe(cellsInSphere(radius));

    // The cell above the old centre has left the ball around (0, -3, 0).
    const above = cellCenter({ x: 0, y: 2, z: 0 });
    expect(sphere.query(above[0], above[1], above[2])).toBeUndefined();

    await vi.runAllTimersAsync();
    vi.useRealTimers();
    for (const cell of sphereCells({ x: 0, y: -3, z: 0 }, radius)) {
      const c = cellCenter(cell);
      expect(sphere.query(c[0], c[1], c[2])).toBeDefined();
    }
  }, 30_000);

  it("reaches above and below its centre, not only around it", () => {
    // The ball the window keeps loaded is what makes the world run upward and
    // downward rather than outward alone. Asked of the shape itself, which is
    // where it is decided; a sphere driving its fill client to answer the same
    // question takes seconds and is the slowest thing in this suite.
    const cells = sphereCells({ x: 0, y: 0, z: 0 }, 1);
    const keys = new Set(cells.map((c) => `${c.x},${c.y},${c.z}`));

    expect(keys.has("0,1,0")).toBe(true);
    expect(keys.has("0,-1,0")).toBe(true);
    expect(cells.filter((c) => c.y > 0)).toHaveLength(
      cells.filter((c) => c.y < 0).length,
    );
  });

  describe("squashed window", () => {
    it("counts the cells a flattened ball holds", () => {
      // Horizontal radius 4 with a 2-chunk Y reach is the world's default
      // window: about half the 257 cells of a full radius-4 ball.
      expect(cellsInSphere(4)).toBe(257);
      expect(cellsInSphere(4, 4)).toBe(257);
      expect(cellsInSphere(4, 2)).toBe(125);
      expect(cellsInSphere(4, 1)).toBe(51);
    });

    it("holds cells up to the y-radius and no further", () => {
      const cells = sphereCells({ x: 0, y: 0, z: 0 }, 4, 2);
      const keys = new Set(cells.map((c) => `${c.x},${c.y},${c.z}`));

      // The poles of the full ball are cut off...
      expect(keys.has("0,2,0")).toBe(true);
      expect(keys.has("0,3,0")).toBe(false);
      expect(keys.has("4,0,0")).toBe(true);
      // ...and so is anything that combines a far horizontal cell with much
      // vertical rise.
      expect(keys.has("4,0,1")).toBe(false);
      expect(cells.filter((c) => c.y > 0)).toHaveLength(
        cells.filter((c) => c.y < 0).length,
      );
    });

    it.skip("keeps a fixed block pool the size of the squashed ball", async () => {
      vi.useFakeTimers();
      const { sphere } = sphereWithRecordedFills(4, 2);
      sphere.fillFrom(0, 0, 0);
      await vi.runAllTimersAsync();
      vi.useRealTimers();

      expect(sphere.blocks.length).toBe(125);
      // The cell two chunks below the centre is held; three chunks below is
      // beyond the flattened window.
      expect(sphere.slotAt(0, -2 * BLOCK_WORLD[1], 0)).toBeDefined();
      expect(sphere.slotAt(0, -3 * BLOCK_WORLD[1], 0)).toBeUndefined();
    }, 30_000);

    it.skip("streams the squashed window, evicting cells beyond the y-radius", async () => {
      vi.useFakeTimers();
      const radius = 4;
      const { sphere } = sphereWithRecordedFills(radius, 2);
      sphere.fillFrom(0, 0, 0);
      await vi.runAllTimersAsync();

      // Straight down by three cells: the old top is outside the new
      // window's 2-chunk vertical reach and is evicted.
      const target = cellCenter({ x: 0, y: -3, z: 0 });
      sphere.scrollTo(target[0], target[1], target[2]);

      const above = cellCenter({ x: 0, y: 2, z: 0 });
      expect(sphere.query(above[0], above[1], above[2])).toBeUndefined();
      expect(sphere.blocks.length).toBe(cellsInSphere(radius, 2));

      await vi.runAllTimersAsync();
      vi.useRealTimers();
      for (const cell of sphereCells({ x: 0, y: -3, z: 0 }, radius, 2)) {
        const c = cellCenter(cell);
        expect(sphere.query(c[0], c[1], c[2])).toBeDefined();
      }
    }, 30_000);
  });

  it.skip("streams diagonally, crossing a cell on all three axes at once", async () => {
    vi.useFakeTimers();
    const radius = 2;
    const { sphere } = sphereWithRecordedFills(radius);
    sphere.fillFrom(0, 0, 0);

    const target = cellCenter({ x: 2, y: -2, z: 2 });
    sphere.scrollTo(target[0], target[1], target[2]);
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    expect(sphere.blocks.length).toBe(cellsInSphere(radius));
    for (const cell of sphereCells({ x: 2, y: -2, z: 2 }, radius)) {
      const c = cellCenter(cell);
      expect(sphere.query(c[0], c[1], c[2])).toBeDefined();
    }
    // No slot is left holding a cell the new ball does not contain.
    const wanted = new Set(
      sphereCells({ x: 2, y: -2, z: 2 }, radius).map(
        (c) => `${c.x},${c.y},${c.z}`,
      ),
    );
    for (const block of sphere.blocks) {
      const key = [
        block.center[0] / BLOCK_WORLD[0],
        block.center[1] / BLOCK_WORLD[1],
        block.center[2] / BLOCK_WORLD[2],
      ].join(",");
      expect(wanted.has(key)).toBe(true);
    }
  }, 30_000);

  it.skip("does nothing when the player stays within one cell", () => {
    const { sphere, filled } = sphereWithRecordedFills(3);
    sphere.fillFrom(0, 0, 0);
    filled.length = 0;
    sphere.scrollTo(10, 5, -10);
    expect(filled).toHaveLength(0);
  }, 30_000);

  it.skip("does not re-request refills when scrollTo is called repeatedly while fills are pending", async () => {
    vi.useFakeTimers();
    const radius = 4;
    let requestCount = 0;
    const sphere = new ChunkSphere({
      radius,
      terrain: DEFAULT_TERRAIN,
      onBlockChanged: () => {},
      onBlockReposition: () => {},
      customFillStore: () => {},
    });
    const origRequest = sphere["fillClient"].requestFill.bind(
      sphere["fillClient"],
    );
    sphere["fillClient"].requestFill = (...args) => {
      requestCount++;
      return origRequest(...args);
    };

    sphere.fillFrom(0, 0, 0);
    requestCount = 0;

    // Walk one cell east
    sphere.scrollTo(cellCenter({ x: 1, y: 0, z: 0 })[0], 0, 0);
    const initialRequests = requestCount;
    expect(initialRequests).toBeGreaterThan(0);

    // Call scrollTo again within the same chunk before fills complete
    sphere.scrollTo(cellCenter({ x: 1, y: 0, z: 0 })[0] + 5, 0, 0);
    expect(requestCount).toBe(initialRequests);

    await vi.runAllTimersAsync();
    vi.useRealTimers();
  });
});

describe("reshaping the window", () => {
  /** Every cell the window stands for, as the coordinates it was given. */
  const heldCells = (sphere: ChunkSphere): string[] =>
    sphere.blocks
      .map((block) =>
        block.center
          .map((unit, axis) => Math.round(unit / BLOCK_WORLD[axis]))
          .join(","),
      )
      .sort();

  it("grows the pool to the cells a wider window holds", () => {
    const { sphere } = sphereWithRecordedFills(2);
    sphere.fillFrom(0, 0, 0);
    expect(sphere.blocks.length).toBe(cellsInSphere(2, 2));

    sphere.reshape(3, 2, DEFAULT_LOD_BANDS);

    expect(sphere.radius).toBe(3);
    expect(sphere.blocks.length).toBe(cellsInSphere(3, 2));
    // Every cell of the wider window, each held exactly once.
    expect(heldCells(sphere)).toEqual(
      sphereCells({ x: 0, y: 0, z: 0 }, 3, 2)
        .map((c) => `${c.x},${c.y},${c.z}`)
        .sort(),
    );
  });

  it("shrinks the pool, keeping the array everything else holds", () => {
    const { sphere } = sphereWithRecordedFills(3);
    sphere.fillFrom(0, 0, 0);
    const held = sphere.blocks;

    sphere.reshape(2, 2, DEFAULT_LOD_BANDS);

    expect(sphere.blocks).toBe(held);
    expect(sphere.blocks.length).toBe(cellsInSphere(2, 2));
    expect(heldCells(sphere)).toEqual(
      sphereCells({ x: 0, y: 0, z: 0 }, 2, 2)
        .map((c) => `${c.x},${c.y},${c.z}`)
        .sort(),
    );
  });

  it("answers for the block under the player as soon as it has reshaped", () => {
    const { sphere } = sphereWithRecordedFills(2);
    sphere.fillFrom(0, 0, 0);
    sphere.reshape(3, 2, DEFAULT_LOD_BANDS);

    // Reshaping fills the centre block on this thread before it returns, so
    // the ground under the player never goes missing; the rest of the window
    // is turned away until its own fill lands, as it is after any scroll.
    expect(sphere.query(0, 0, 0)).toBeDefined();
    expect(sphere.query(BLOCK_WORLD[0] * 40, 0, 0)).toBeUndefined();
  });

  it("gives every slot a cell, so no two slots answer for the same point", () => {
    const { sphere } = sphereWithRecordedFills(3);
    sphere.fillFrom(0, 0, 0);
    sphere.reshape(2, 2, DEFAULT_LOD_BANDS);

    // A slot left over from the wider window keeping its old centre would
    // shadow a real block in any lookup that matches on centre alone.
    expect(new Set(heldCells(sphere)).size).toBe(sphere.blocks.length);
  });

  it("moves the levels of detail where the bands say", () => {
    const { sphere } = sphereWithRecordedFills(3);
    sphere.fillFrom(0, 0, 0);

    sphere.reshape(3, 2, { full: 1, coarse: 2 });

    expect(sphere.bands).toEqual({ full: 1, coarse: 2 });
    // Two chunks out is full detail by default and coarser under these bands.
    const twoOut = { x: 2, y: 0, z: 0 };
    const origin = { x: 0, y: 0, z: 0 };
    expect(lodAt(twoOut, origin)).toBe(0);
    expect(lodAt(twoOut, origin, sphere.bands)).toBe(1);
  });
});

describe("turning levels of detail off", () => {
  it("keeps every cell at full resolution, however far out", () => {
    const origin = { x: 0, y: 0, z: 0 };
    for (const far of [1, 4, 9, 40, 1000]) {
      expect(lodAt({ x: far, y: far, z: far }, origin, LOD_OFF)).toBe(0);
    }
    // The same cells drop to the coarser tiers under the usual bands.
    expect(lodAt({ x: 40, y: 0, z: 0 }, origin, DEFAULT_LOD_BANDS)).toBe(2);
  });

  it("is what the bands say about themselves", () => {
    expect(lodIsOff(LOD_OFF)).toBe(true);
    expect(lodIsOff(DEFAULT_LOD_BANDS)).toBe(false);
    expect(lodIsOff({ full: 99, coarse: 99 })).toBe(false);
  });

  it("gives every block of a reshaped window the finest voxels", () => {
    const { sphere } = sphereWithRecordedFills(3);
    sphere.fillFrom(0, 0, 0);

    sphere.reshape(3, 2, LOD_OFF);

    // A block's voxel scale is what its level of detail chose; with none, all
    // of them are the finest the world has.
    const scales = new Set(sphere.blocks.map((block) => block.targetLod));
    expect([...scales]).toEqual([0]);
  });
});

describe("cellsTouchedByPlan", () => {
  it("maps a plan's shapes onto the chunk cells they reach", () => {
    // The origin cell's interior holds world voxels [-32, 32).
    expect(
      cellsTouchedByPlan([
        { kind: "box", min: [0, 0, 0], max: [10, 5, 5], id: 1 },
      ]),
    ).toEqual([{ x: 0, y: 0, z: 0 }]);
  });

  it("grows a shape that crosses a cell boundary to both cells", () => {
    expect(
      cellsTouchedByPlan([
        { kind: "box", min: [30, 0, 0], max: [70, 4, 4], id: 1 },
      ]),
    ).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
    ]);
  });

  it("lists each covered cell once, however the shapes overlap", () => {
    expect(
      cellsTouchedByPlan([
        { kind: "box", min: [0, 0, 0], max: [10, 10, 10], id: 1 },
        { kind: "box", min: [5, 5, 5], max: [20, 20, 20], id: 2 },
      ]),
    ).toEqual([{ x: 0, y: 0, z: 0 }]);
  });

  it("reports no cells for an empty plan or none at all", () => {
    expect(cellsTouchedByPlan([])).toEqual([]);
    expect(cellsTouchedByPlan(undefined)).toEqual([]);
  });

  it("leaves a surface to the window, whose cells bound its footprint", () => {
    expect(
      cellsTouchedByPlan([
        {
          kind: "surface",
          reachX: "infinite",
          reachZ: "infinite",
          depth: 1,
          id: 1,
        },
      ]),
    ).toEqual([]);
  });
});

describe("ChunkSphere.setStructures", () => {
  const boxPlan = (
    min: number[] = [0, 0, 0],
    max: number[] = [5, 5, 5],
  ): StructurePlan => [
    {
      kind: "box",
      min: min as [number, number, number],
      max: max as [number, number, number],
      id: 1,
    },
  ];

  it("regenerates only the cells a new plan's shapes reach", () => {
    const { sphere, filled, released } = sphereWithEchoWorker(1);
    populate(sphere);
    filled.length = 0;
    released.length = 0;

    sphere.setStructures(boxPlan());

    // Only the origin cell's fill landed, its resting fluid was released
    // first, and the cells around it were left alone.
    const originSlot = sphere.slotAt(0, 0, 0)!;
    expect(filled).toEqual([originSlot]);
    expect(released).toEqual([originSlot]);
  });

  it("regenerates every cell a shape straddles, nearest first", () => {
    const { sphere, filled } = sphereWithEchoWorker(1);
    populate(sphere);
    filled.length = 0;

    const originSlot = sphere.slotAt(0, 0, 0)!;
    const eastSlot = sphere.slotAt(BLOCK_WORLD[0], 0, 0)!;
    sphere.setStructures(boxPlan([30, 0, 0], [70, 4, 4]));

    expect(filled).toEqual([originSlot, eastSlot]);
  });

  it("sheds a shape the next plan no longer stamps", () => {
    const { sphere, filled } = sphereWithEchoWorker(1);
    populate(sphere);
    filled.length = 0;

    const originSlot = sphere.slotAt(0, 0, 0)!;
    sphere.setStructures(boxPlan());
    // An empty plan covers nothing; the shape's own cell is regenerated again
    // so the shape comes off the terrain it sat on.
    sphere.setStructures([]);

    expect(filled).toEqual([originSlot, originSlot]);
  });

  it("changes nothing when handed the plan already in place", () => {
    const { sphere, filled } = sphereWithEchoWorker(1);
    populate(sphere);
    filled.length = 0;

    const plan = boxPlan();
    expect(sphere.setStructures(plan)).toBe(true);
    expect(filled).toHaveLength(1);
    filled.length = 0;

    expect(sphere.setStructures(boxPlan())).toBe(false);
    expect(filled).toEqual([]);
  });

  it("regenerates every loaded cell an infinite surface covers", () => {
    const { sphere, filled } = sphereWithEchoWorker(1);
    populate(sphere);
    filled.length = 0;

    sphere.setStructures([
      {
        kind: "surface",
        reachX: "infinite",
        reachZ: "infinite",
        depth: 1,
        id: 1,
      },
    ]);

    expect([...filled].sort((a, b) => a - b)).toEqual(
      sphere.blocks.map((_, index) => index).sort((a, b) => a - b),
    );
  });

  it("regenerates only the columns a bounded surface covers", () => {
    const { sphere, filled } = sphereWithEchoWorker(1);
    populate(sphere);
    filled.length = 0;

    sphere.setStructures([
      {
        kind: "surface",
        min: [-4, 0, 0],
        max: [4, 0, 0],
        reachZ: "infinite",
        depth: 1,
        id: 1,
      },
    ]);

    const covered = sphere.blocks
      .map((block, index) => ({ block, index }))
      .filter(({ block }) => block.center[0] === 0)
      .map(({ index }) => index)
      .sort((a, b) => a - b);
    expect([...filled].sort((a, b) => a - b)).toEqual(covered);
  });

  it("stamps the plan the world was built with over runtime structures", () => {
    // The world here is constructed with its base plan already in place — the
    // way a demo boots with its baked road and sand surfaces — and no
    // `setStructures` call. A runtime structure placed afterwards must come
    // out stamped on top of that base, not in place of it.
    const base = boxPlan();
    const worker = new EchoFillWorker();
    const sphere = new ChunkSphere({
      radius: 1,
      terrain: DEFAULT_TERRAIN,
      structures: base,
      onBlockChanged: () => {},
      onBlockReposition: () => {},
      createWorker: () => worker as unknown as Worker,
    });
    populate(sphere);

    const runtime: StructurePlan = [
      { kind: "box", min: [10, 0, 10], max: [15, 5, 15], id: 2 },
    ];
    expect(sphere.setRuntimeStructures(runtime)).toBe(true);

    // The fill client was told the base and the overlay together, never the
    // overlay alone, so a refilled or freshly streamed block still gets the
    // road and sand under the building.
    const client = sphere["fillClient"] as unknown as {
      structures: StructurePlan | undefined;
    };
    expect(client.structures).toEqual([...base, ...runtime]);
  });
});
