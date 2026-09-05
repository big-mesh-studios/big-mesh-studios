// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { buildBlockShell, type WorldBlock } from "./level-data";
import { FlowController } from "./flow-controller";
import { VOXEL_AIR, VOXEL_WATER, VOXEL_WATER_FALLING } from "./voxel-store";
import { SPREAD_SECONDS } from "./fluid";

/**
 * A world voxel keyed as everywhere in the codebase: the world voxel of the
 * block's local row `l` is `l - 32` (the block interior spans -32..31).
 */
const wv = (lx: number, ly: number, lz: number): [number, number, number] => [
  lx - 32,
  ly - 32,
  lz - 32,
];

/**
 * A 64³ empty block whose lower rows 0..10 are solid dirt, so fluid placed at
 * local row 11 rests on the floor and spreads there.
 */
const makeFloor = (): WorldBlock => {
  const block = buildBlockShell({ center: [0, 0, 0] });
  for (let y = 0; y < 11; y++) {
    for (let z = 0; z < 64; z++) {
      for (let x = 0; x < 64; x++) {
        block.store.set(x, y, z, 2);
      }
    }
  }
  return block;
};

/** Places a water source at local row 11 above the floor and wakes it. */
const placeSource = (
  block: WorldBlock,
  flow: FlowController,
  lx: number,
  lz: number,
): [number, number, number] => {
  const w = wv(lx, 11, lz);
  block.store.set(lx, 11, lz, VOXEL_WATER);
  flow.wakeVoxel(w, VOXEL_WATER);
  return w;
};

/** Drives the controller in small steps until it falls quiet. */
const settle = (flow: FlowController, seconds = 60): void => {
  let elapsed = 0;
  while (flow.active && elapsed < seconds) {
    flow.tick(0.05);
    elapsed += 0.05;
  }
  flow.tick(1);
};

describe("FlowController", () => {
  it("spreads a resting source one level per cell out to level 7", () => {
    const block = makeFloor();
    const flow = new FlowController({
      blocks: [block],
      onBlocksEdited: vi.fn(),
    });
    placeSource(block, flow, 32, 32);
    settle(flow);

    // The centre is the source; each of the four axes steps down a level per
    // cell, and nothing rests further than seven cells away.
    expect(block.store.get(32, 11, 32)).toBe(VOXEL_WATER);
    for (let d = 1; d <= 7; d++) {
      expect(block.store.get(32 + d, 11, 32)).toBe(9 + d - 1);
    }
    expect(block.store.get(32 + 8, 11, 32)).toBe(VOXEL_AIR);
  });

  it("drains a puddle back to nothing once its source is scooped", () => {
    const block = makeFloor();
    const flow = new FlowController({
      blocks: [block],
      onBlocksEdited: vi.fn(),
    });
    placeSource(block, flow, 32, 32);
    settle(flow);
    expect(block.store.get(32, 11, 32)).toBe(VOXEL_WATER);

    // Scoop the source: an edit to air wakes the fluid around it.
    const w = wv(32, 11, 32);
    block.store.set(32, 11, 32, VOXEL_AIR);
    flow.wakeVoxel(w, VOXEL_AIR);
    settle(flow);

    for (let d = -7; d <= 7; d++) {
      expect(block.store.get(32 + d, 11, 32)).toBe(VOXEL_AIR);
    }
  });

  it("lets two sources facing each other form a source in the gap between them", () => {
    const block = makeFloor();
    const flow = new FlowController({
      blocks: [block],
      onBlocksEdited: vi.fn(),
    });
    placeSource(block, flow, 31, 32);
    placeSource(block, flow, 33, 32);
    settle(flow);

    // The middle cell is flanked by two sources, so it becomes a source.
    expect(block.store.get(32, 11, 32)).toBe(VOXEL_WATER);
  });

  it("falls to the ground and pools instead of hanging in mid-air", () => {
    const block = makeFloor();
    const flow = new FlowController({
      blocks: [block],
      onBlocksEdited: vi.fn(),
    });
    const source = wv(32, 40, 32);
    block.store.set(32, 40, 32, VOXEL_WATER);
    flow.wakeVoxel(source, VOXEL_WATER);
    settle(flow);

    // Nothing is left hanging at the pour height...
    expect(block.store.get(32, 40, 32)).toBe(VOXEL_AIR);
    // ...and the water rests on the floor (row 11) and spreads a ring or two.
    expect(block.store.get(32, 11, 32)).not.toBe(VOXEL_AIR);
    expect(block.store.get(33, 11, 32)).not.toBe(VOXEL_AIR);
  });

  it("paces spreads by the kind's interval", () => {
    const block = makeFloor();
    const flow = new FlowController({
      blocks: [block],
      onBlocksEdited: vi.fn(),
    });
    placeSource(block, flow, 32, 32);
    // Not a full interval yet: nothing may have spread.
    flow.tick(SPREAD_SECONDS.water * 0.5);
    expect(block.store.get(33, 11, 32)).toBe(VOXEL_AIR);
    // After a full interval the first ring has landed.
    flow.tick(SPREAD_SECONDS.water * 0.6);
    expect(block.store.get(33, 11, 32)).not.toBe(VOXEL_AIR);
  });

  it("goes fully quiet once the water has settled", () => {
    const block = makeFloor();
    const flow = new FlowController({
      blocks: [block],
      onBlocksEdited: vi.fn(),
    });
    placeSource(block, flow, 32, 32);
    settle(flow);
    expect(flow.pendingCount).toBe(0);
    expect(flow.active).toBe(false);
    // Idle water must not reschedule itself: more time changes nothing.
    flow.tick(2);
    expect(flow.pendingCount).toBe(0);
  });

  it("waking a block whose water is fully sealed schedules nothing", () => {
    // A single water voxel buried inside solid rock: nothing it can do, so a
    // freshly loaded block of it costs no scheduled work at all.
    const block = buildBlockShell({ center: [0, 0, 0] });
    for (let y = 10; y <= 12; y++) {
      for (let z = 31; z <= 33; z++) {
        for (let x = 31; x <= 33; x++) {
          block.store.set(x, y, z, 2);
        }
      }
    }
    block.store.set(32, 11, 32, VOXEL_WATER);
    const flow = new FlowController({
      blocks: [block],
      onBlocksEdited: vi.fn(),
    });
    flow.wakeBlock(0);
    expect(flow.pendingCount).toBe(0);
  });

  it("leaves a freshly generated ocean asleep rather than scanning it", () => {
    // Fill-produced water is settled by construction: rows 11..20 are ocean
    // source cells (hasWater, not hasFlowing), open air above them. wakeBlock
    // must not sweep the volume, so nothing gets scheduled — and without the
    // gate this surface would have been woken.
    const block = buildBlockShell({ center: [0, 0, 0] });
    for (let y = 11; y <= 20; y++) {
      for (let z = 0; z < 64; z++) {
        for (let x = 0; x < 64; x++) {
          block.store.set(x, y, z, VOXEL_WATER);
        }
      }
    }
    // Reset the dynamic-fluid flag the way terrain fill leaves it: written by
    // fill, so it answers for a generated ocean.
    block.store.hasFlowing = false;
    const flow = new FlowController({
      blocks: [block],
      onBlocksEdited: vi.fn(),
    });
    flow.wakeBlock(0);
    flow.tick(5);
    expect(flow.pendingCount).toBe(0);
    expect(block.store.hasFlowing).toBe(false);
  });

  it("raises the dynamic-fluid flag when flow or an edit writes it", () => {
    const block = makeFloor();
    const flow = new FlowController({
      blocks: [block],
      onBlocksEdited: vi.fn(),
    });
    placeSource(block, flow, 32, 32);
    // The source itself was written by the edit, so it is already flagged.
    expect(block.store.hasFlowing).toBe(true);
  });

  it("suspends a pour whose below lies outside the loaded window", () => {
    // Water poured at the very bottom row of the only loaded block: the cell
    // below it is not loaded, so it must not read as air, fall into the void
    // and drain itself — it stays put until a block loads underneath it.
    const block = buildBlockShell({ center: [0, 0, 0] });
    block.store.set(32, 0, 32, VOXEL_WATER);
    const flow = new FlowController({
      blocks: [block],
      onBlocksEdited: vi.fn(),
    });
    flow.wakeVoxel([0, -32, 0], VOXEL_WATER);
    flow.tick(5);
    expect(block.store.get(32, 0, 32)).toBe(VOXEL_WATER);
    expect(flow.pendingCount).toBe(0);
  });

  it("does not mint new water when a fall lands on its own pool", () => {
    // One source makes a bounded 7-cell pool on the floor. Water that then
    // falls onto that pool (a waterfall feeding it) must add volume, not
    // production: no new spreading centres above the pool, and no growth
    // beyond the pool's original footprint.
    const block = makeFloor();
    const flow = new FlowController({
      blocks: [block],
      onBlocksEdited: vi.fn(),
    });
    placeSource(block, flow, 32, 32);
    settle(flow);
    // The pool's outer edge: nothing beyond seven cells of the source.
    expect(block.store.get(40, 11, 32)).toBe(VOXEL_AIR);

    // Feed the pool from above with a short falling column.
    for (let row = 12; row <= 16; row++) {
      block.store.set(32, row, 32, VOXEL_WATER_FALLING);
      flow.wakeVoxel(wv(32, row, 32), VOXEL_WATER_FALLING);
    }
    settle(flow);

    // Nothing spread sideways above the pool, and the pool stayed in bounds.
    for (let row = 12; row <= 16; row++) {
      expect(block.store.get(31, row, 32)).toBe(VOXEL_AIR);
      expect(block.store.get(33, row, 32)).toBe(VOXEL_AIR);
    }
    expect(block.store.get(40, 11, 32)).toBe(VOXEL_AIR);
    expect(flow.pendingCount).toBe(0);
  });
});
