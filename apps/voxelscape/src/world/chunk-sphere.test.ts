// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { ChunkSphere, cellsInSphere, sphereCells } from "./chunk-sphere";
import { BLOCK_WORLD } from "./level-data";
import { DEFAULT_TERRAIN } from "./noise";

/**
 * Builds a sphere whose fills are recorded rather than performed. `Worker` is
 * undefined under Node, so `FillClient` takes its synchronous fallback, which
 * runs the custom fill store below instead of generating terrain.
 */
const sphereWithRecordedFills = (radius: number) => {
  const filled: number[] = [];
  const repositioned: number[] = [];
  const sphere = new ChunkSphere({
    radius,
    terrain: DEFAULT_TERRAIN,
    onBlockChanged: (index) => filled.push(index),
    onBlockReposition: (index) => repositioned.push(index),
    customFillStore: () => {},
  });
  return { sphere, filled, repositioned };
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

  // The sync fallback fills each block by sweeping its whole 64³ store, so a
  // full-ball test needs a generous timeout under parallel-suite load.
  it("fills the block containing the spawn point first", async () => {
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

  it("fills outward, so each block is no nearer the spawn point than the last", async () => {
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

  it("generates the nearest block before returning, and the rest one per task", async () => {
    vi.useFakeTimers();
    const { sphere, filled } = sphereWithRecordedFills(3);

    const nearest = sphere.fillFrom(0, 0, 0);
    expect(filled).toEqual([nearest]);

    vi.advanceTimersToNextTimer();
    expect(filled).toHaveLength(2);
    vi.useRealTimers();
  });

  it("streams the ball to a new centre, reusing freed slots and filling the player's cell first", async () => {
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
    // the fallback's one-block-per-task drain fills.
    const playerSlot = sphere.slotAt(target[0], target[1], target[2]);
    expect(playerSlot).toBeDefined();
    vi.advanceTimersToNextTimer();
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

  it("streams the ball downward, which is the axis the ring could not move on", async () => {
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

    const playerSlot = sphere.slotAt(target[0], target[1], target[2]);
    expect(playerSlot).toBeDefined();
    vi.advanceTimersToNextTimer();
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

  it("streams diagonally, crossing a cell on all three axes at once", async () => {
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

  it("does nothing when the player stays within one cell", () => {
    const { sphere, filled } = sphereWithRecordedFills(3);
    sphere.fillFrom(0, 0, 0);
    filled.length = 0;
    sphere.scrollTo(10, 5, -10);
    expect(filled).toHaveLength(0);
  }, 30_000);
});
