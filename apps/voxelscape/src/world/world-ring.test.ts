// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { BlockGrid } from "./block-grid";
import { BLOCK_WORLD, type Dim3 } from "./level-data";
import { DEFAULT_TERRAIN } from "./noise";
import { WorldRing } from "./world-ring";

/**
 * Builds a ring whose fills are recorded rather than performed. `Worker` is
 * undefined under Node, so `FillClient` takes its synchronous fallback, which
 * runs the custom fill store below instead of generating terrain.
 */
const ringWithRecordedFills = (blocksPerSide: number) => {
  const filled: number[] = [];
  const blockGrid = new BlockGrid({ blocksPerSide });
  const ring = new WorldRing({
    blockGrid,
    terrain: DEFAULT_TERRAIN,
    onBlockChanged: (index) => filled.push(index),
    onBlockReposition: () => {},
    customFillStore: () => {},
  });
  return { ring, blockGrid, filled };
};

describe("WorldRing", () => {
  it("fills the block containing the spawn point first", async () => {
    vi.useFakeTimers();
    const { ring, blockGrid, filled } = ringWithRecordedFills(5);
    // A corner of the window rather than its middle, so an ordering that
    // ignored the spawn point entirely would not pass by coincidence.
    const spawn: Dim3 = [BLOCK_WORLD[0] * 2, 0, BLOCK_WORLD[2] * 2];

    ring.fillFrom(spawn[0], spawn[2]);
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    expect(filled).toHaveLength(blockGrid.blocks.length);
    const first = blockGrid.blocks[filled[0]].center;
    expect([first[0], first[2]]).toEqual([spawn[0], spawn[2]]);
  });

  it("fills outward, so each block is no nearer the spawn point than the last", async () => {
    vi.useFakeTimers();
    const { ring, blockGrid, filled } = ringWithRecordedFills(5);

    ring.fillFrom(0, 0);
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    const distances = filled.map((index) => {
      const center = blockGrid.blocks[index].center;
      return center[0] ** 2 + center[2] ** 2;
    });
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it("generates the nearest block before returning, and the rest one per task", () => {
    vi.useFakeTimers();
    const { ring, filled } = ringWithRecordedFills(5);

    // Nothing can be drawn and the player cannot be let in until the block
    // they stand in exists, so that one is not left to a later task.
    const nearest = ring.fillFrom(0, 0);
    expect(filled).toEqual([nearest]);

    // The rest are spread out, so the page can draw between them instead of
    // freezing for as long as the whole window takes.
    vi.advanceTimersToNextTimer();
    expect(filled).toHaveLength(2);
    vi.advanceTimersToNextTimer();
    expect(filled).toHaveLength(3);
    vi.useRealTimers();
  });
});
