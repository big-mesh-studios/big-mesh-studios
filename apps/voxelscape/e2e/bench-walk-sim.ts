// Headless benchmark of the walk itself: boots the real chunk window and the
// flow-controller wiring, then walks a player forward at 60 Hz across terrain
// that is already loaded, measuring where main-thread time goes on the frame
// path and on the streaming events a forward walk triggers. There is no GPU
// here, so this cannot time drawing; it times the CPU work that would jank a
// frame before it draws — the per-frame slice, the per-fill wake, and the
// per-release fluid snapshot.
//
// No browser build is needed. Bundle with esbuild and run under Node:
//
//   node_modules/.bin/esbuild --bundle --platform=node --format=cjs \
//     --outfile=/tmp/voxel-walk.cjs e2e/bench-walk-sim.ts
//   node /tmp/voxel-walk.cjs                     # follow the ground, as the game does
//   node /tmp/voxel-walk.cjs --clamp             # hold the window's Y cell fixed
//   node /tmp/voxel-walk.cjs --stir              # pour water at spawn, settle it, walk
//   node /tmp/voxel-walk.cjs --no-flow           # skip the wake and the fluid snapshot
//   node /tmp/voxel-walk.cjs --pre-fix           # snapshot-sweep every block, as before the fix
//
// The numbers are this machine's absolute times; what matters is the split
// between the frame slice and the streaming bursts, which scales with the
// machine as a whole.
import {
  blockWorldVoxelRange,
  EditLayer,
  localToWorldVoxel,
  worldVoxelToLocal,
  type WorldVoxel,
} from "../src/world/edit-layer";
import {
  BLOCK_WORLD,
  VOXEL_SIZE,
  chunkCellOf,
  getWorldHeight,
} from "../src/world/level-data";
import { ChunkSphere } from "../src/world/chunk-sphere";
import { FlowController } from "../src/world/flow-controller";
import { DEFAULT_TERRAIN } from "../src/world/noise";
import { fillBlockLight } from "../src/world/block-light";
import { fillSkyLight } from "../src/world/sky-light";
import {
  VOXEL_AIR,
  VOXEL_WATER,
  fillStore,
  isFluidId,
} from "../src/world/voxel-store";

const DT = 1 / 60;
const WALK_SPEED = 22.5;
const STAND_FRAMES = 300;
const WALK_FRAMES = 1200;
const STIR_SECONDS = 12;

const now = (): number => performance.now();

interface Tally {
  count: number;
  total: number;
  max: number;
}
const newTally = (): Tally => ({ count: 0, total: 0, max: 0 });
const tallyPush = (t: Tally, ms: number): void => {
  t.count++;
  t.total += ms;
  t.max = Math.max(t.max, ms);
};

interface RunStats {
  fillsLanded: number;
  frameSlices: number[];
  release: Tally;
  wake: Tally;
  adoption: Tally;
  releasesTotal: number;
  releasesFlagged: number;
}

const newStats = (): RunStats => ({
  fillsLanded: 0,
  frameSlices: [],
  release: newTally(),
  wake: newTally(),
  adoption: newTally(),
  releasesTotal: 0,
  releasesFlagged: 0,
});

interface World {
  sphere: ChunkSphere;
  blocks: ChunkSphere["blocks"];
  edits: EditLayer;
  flow: FlowController | undefined;
  stats: RunStats;
  groundY(x: number, z: number): number;
  stepTo(x: number, y: number, z: number): void;
}

const percentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) {
    return 0;
  }
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
};

const frameSummary = (label: string, frames: number[]): void => {
  const sorted = [...frames].sort((a, b) => a - b);
  console.log(
    `  ${label}: n=${sorted.length} p50=${percentile(sorted, 0.5).toFixed(3)}ms p95=${percentile(sorted, 0.95).toFixed(3)}ms p99=${percentile(sorted, 0.99).toFixed(3)}ms max=${sorted[sorted.length - 1].toFixed(3)}ms`,
  );
};

const tallySummary = (label: string, t: Tally): void => {
  if (t.count === 0) {
    console.log(`  ${label}: none`);
    return;
  }
  console.log(
    `  ${label}: n=${t.count} mean=${(t.total / t.count).toFixed(3)}ms max=${t.max.toFixed(3)}ms total=${(t.total / 1000).toFixed(3)}s`,
  );
};

/**
 * The `snapshotSlotFluids` pass from `createVoxelWorld`, verbatim: writes a
 * released slot's flowing/falling fluid into the edit overlay so it survives
 * the slot's regeneration, and reconciles the overlay's fluid edits against
 * what is still there. Only a block whose store carries the flowing flag — one
 * a fluid write or the flow sim ever touched — can hold anything for it, so a
 * pristine block is skipped instead of swept in full. `sweepAll` forces the
 * pre-fix behaviour of sweeping every content block, for A/B measurement.
 */
const snapshotSlotFluids = (
  block: ChunkSphere["blocks"][number],
  edits: EditLayer,
  sweepAll = false,
): void => {
  const store = block.store;
  if (!sweepAll && !store.hasFlowing) {
    return;
  }
  const { min, max } = blockWorldVoxelRange(block.center);
  const at = Date.now();
  const [nx, ny, nz] = store.voxels;
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const id = store.get(x, y, z);
        if (id === VOXEL_WATER || !isFluidId(id)) {
          continue;
        }
        const wv = localToWorldVoxel(store, block.center, [x, y, z]);
        const prev = edits.get(wv);
        if (prev === undefined || prev.id !== id) {
          edits.set(wv, id, at);
        }
      }
    }
  }
  for (const { w, edit } of edits.queryRange(min, max)) {
    if (!isFluidId(edit.id)) {
      continue;
    }
    const local = worldVoxelToLocal(store, block.center, w);
    const current = store.inBounds(local[0], local[1], local[2])
      ? store.get(local[0], local[1], local[2])
      : VOXEL_AIR;
    if (current === edit.id) {
      continue;
    }
    if (current !== VOXEL_AIR && !isFluidId(current)) {
      continue;
    }
    if (isFluidId(current)) {
      edits.set(w, current, at);
    } else {
      edits.set(w, VOXEL_AIR, at);
    }
  }
};

/**
 * Wires a `ChunkSphere` the way `createVoxelWorld` does, minus the renderer:
 * fills land through `onBlockChanged` (which wakes the fluid sim), released
 * slots are fluid-snapshotted through `onBlockRelease`, and repositioned slots
 * have their stale voxels cleared through `onBlockReposition`. `withFlow`
 * drops the wake and the snapshot, standing in for the streaming path before
 * the flowing-fluid commits.
 */
const makeWorld = (
  withFlow: boolean,
  sweepAll: boolean,
  radius: number,
  yRadius: number,
): World => {
  const edits = new EditLayer();
  const stats = newStats();
  let lastGenEnd = 0;
  let flow: FlowController | undefined;
  const sphere = new ChunkSphere({
    radius,
    yRadius,
    terrain: DEFAULT_TERRAIN,
    editLayer: edits,
    // Real terrain fill, wrapped only so generation time can be split from
    // the adoption that follows it inside the same fill task.
    customFillStore: (store, center, terrain, borderSizes) => {
      fillStore(store, center, terrain, borderSizes);
      lastGenEnd = now();
    },
    onBlockReposition: (index) => {
      // Same reset the world performs so a recycled slot never answers for its
      // previous cell's terrain between the reposition and its fill landing.
      const block = sphere.blocks[index];
      block.store.reset();
      block.light.skylight.fill(0);
      block.light.blocklight.fill(0);
    },
    onBlockRelease: (index) => {
      if (!withFlow) {
        return;
      }
      const block = sphere.blocks[index];
      stats.releasesTotal++;
      if (block.store.hasFlowing) {
        stats.releasesFlagged++;
      }
      const t0 = now();
      snapshotSlotFluids(block, edits, sweepAll);
      tallyPush(stats.release, now() - t0);
    },
    onBlockChanged: (index) => {
      stats.fillsLanded++;
      if (!withFlow) {
        return;
      }
      // Generation ended at `lastGenEnd`; everything up to here — edit
      // re-apply, both light fills, the wake — is what a worker-result
      // message pays on the main thread.
      const t0 = now();
      flow?.wakeBlock(index);
      const wakeMs = now() - t0;
      tallyPush(stats.wake, wakeMs);
      tallyPush(stats.adoption, t0 - lastGenEnd);
    },
  });
  const blocks = sphere.blocks;

  if (withFlow) {
    flow = new FlowController({
      blocks,
      resolve: (voxel) =>
        sphere.slotAt(
          (voxel[0] + 0.5) * VOXEL_SIZE,
          (voxel[1] + 0.5) * VOXEL_SIZE,
          (voxel[2] + 0.5) * VOXEL_SIZE,
        ),
      onBlocksEdited: () => {},
    });
  }

  const groundY = (x: number, z: number): number => {
    const y = getWorldHeight(sphere.query, x, z);
    if (Number.isFinite(y)) {
      return y;
    }
    return DEFAULT_TERRAIN.base;
  };

  return {
    sphere,
    blocks,
    edits,
    flow,
    stats,
    groundY,
    stepTo(x, y, z) {
      const t0 = now();
      sphere.scrollTo(x, y, z);
      flow?.tick(DT);
      stats.frameSlices.push(now() - t0);
    },
  };
};

/** Pours a water source at a world voxel the way a bucket tool does. */
const pourWater = (world: World, voxel: WorldVoxel): void => {
  const slot = world.sphere.slotAt(
    (voxel[0] + 0.5) * VOXEL_SIZE,
    (voxel[1] + 0.5) * VOXEL_SIZE,
    (voxel[2] + 0.5) * VOXEL_SIZE,
  );
  if (slot === undefined) {
    return;
  }
  const block = world.sphere.blocks[slot];
  const [lx, ly, lz] = worldVoxelToLocal(block.store, block.center, voxel);
  if (!block.store.inBoundsPadded(lx, ly, lz)) {
    return;
  }
  const at = block.store.paddedIndex(lx, ly, lz);
  if (block.store.data[at] !== VOXEL_AIR) {
    return;
  }
  world.edits.set(voxel, VOXEL_WATER, Date.now());
  block.store.data[at] = VOXEL_WATER;
  block.store.hasWater = true;
  block.store.hasFlowing = true;
  fillBlockLight(block.store, block.light);
  fillSkyLight(block.store, block.light, block.center, DEFAULT_TERRAIN);
  world.flow?.wakeVoxel(voxel, VOXEL_WATER);
};

/** A world voxel a couple of cells above the surface at (`wx`, `wz`). */
const aboveSurfaceVoxel = (
  world: World,
  wx: number,
  wz: number,
): WorldVoxel => {
  const top = world.groundY(wx, wz);
  return [
    Math.round(wx / VOXEL_SIZE),
    Math.round(top / VOXEL_SIZE) + 2,
    Math.round(wz / VOXEL_SIZE),
  ];
};

const drainFills = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

/** How the window's scroll Y is chosen during the walk. */
type WalkMode = "follow" | "clamp";

/** The vertical chunk cell the clamped walk keeps its window centred on. */
const CLAMP_Y_CELL = 0;

const resetBursts = (world: World): void => {
  world.stats.release = newTally();
  world.stats.wake = newTally();
  world.stats.adoption = newTally();
  world.stats.releasesTotal = 0;
  world.stats.releasesFlagged = 0;
};

const runScenario = async (
  mode: WalkMode,
  withFlow: boolean,
  sweepAll: boolean,
  stir: boolean,
): Promise<void> => {
  console.log(
    `\n== walk mode: ${mode}${withFlow ? " (flow + snapshots)" : " (no flow wake/snapshot)"}${sweepAll ? ", snapshot sweeps every block (pre-fix)" : ""}${stir ? ", stirred" : ""} ==`,
  );
  const world = makeWorld(withFlow, sweepAll, 4, 2);
  const sphere = world.sphere;

  const spawnX = 0;
  const spawnZ = 0;
  const bootT = now();
  sphere.fillFrom(spawnX, 0, spawnZ);
  console.log(`  first block sync fill: ${(now() - bootT).toFixed(0)}ms`);
  // The initial window fills through the synchronous fallback, one block per
  // macrotask — how a scroll's worker results would land one per message.
  while (world.stats.fillsLanded < sphere.blocks.length) {
    await drainFills();
  }
  console.log(
    `  window filled (${sphere.blocks.length} blocks) in ${((now() - bootT) / 1000).toFixed(1)}s`,
  );

  // Stand the player on the surface at the origin and settle the sim.
  let playerX = spawnX;
  let playerZ = spawnZ;
  let playerY = world.groundY(playerX, playerZ) + 1;
  world.stepTo(playerX, playerY, playerZ);

  if (stir) {
    // Pour water so falling/flowing cells exist near the route, then let the
    // sim run until the flow is still again before measuring anything.
    const p1 = aboveSurfaceVoxel(world, spawnX + 20, spawnZ);
    pourWater(world, p1);
    pourWater(world, [p1[0] + 1, p1[1] + 2, p1[2]]);
    pourWater(world, [p1[0], p1[1], p1[2] + 2]);
    for (let s = 0; s < STIR_SECONDS * 60; s++) {
      world.stepTo(playerX, playerY, playerZ);
      await drainFills();
    }
  }

  world.stats.frameSlices.length = 0;
  for (let s = 0; s < STAND_FRAMES; s++) {
    world.stepTo(playerX, playerY, playerZ);
    await drainFills();
  }
  frameSummary("standing frames", world.stats.frameSlices.splice(0));
  resetBursts(world);

  // Walk forward: each chunk-boundary crossing releases a cap of slots behind
  // the player and streams their replacements in ahead. The follow mode
  // re-centres the window on the player's feet as the game does, so terrain
  // whose surface straddles a chunk boundary flips the window between cells;
  // the clamp mode holds the window's vertical centre fixed, isolating the
  // pure forward streaming.
  const clampedScrollY = CLAMP_Y_CELL * BLOCK_WORLD[1];
  let recenters = 0;
  let yFlips = 0;
  let lastCell = chunkCellOf(playerX, playerY, playerZ);
  for (let s = 0; s < WALK_FRAMES; s++) {
    playerX += WALK_SPEED * DT;
    playerY = world.groundY(playerX, playerZ) + 1;
    const scrollY = mode === "clamp" ? clampedScrollY : playerY;
    world.stepTo(playerX, scrollY, playerZ);
    const cell = chunkCellOf(playerX, scrollY, playerZ);
    if (
      cell[0] !== lastCell[0] ||
      cell[1] !== lastCell[1] ||
      cell[2] !== lastCell[2]
    ) {
      recenters++;
    }
    if (cell[1] !== lastCell[1]) {
      yFlips++;
    }
    lastCell = cell;
    await drainFills();
  }
  // Let the last scroll's fills land so no wake or adoption is left out.
  for (let i = 0; i < 120; i++) {
    await drainFills();
  }
  const chunks = playerX / BLOCK_WORLD[0];
  frameSummary(
    `walk frames (${(WALK_FRAMES * DT).toFixed(0)}s, ${chunks.toFixed(2)} chunks, ${recenters} recentres, ${yFlips} y-flips)`,
    world.stats.frameSlices.splice(0),
  );
  console.log("  streaming bursts while walking:");
  tallySummary("  per-release fluid snapshot", world.stats.release);
  tallySummary("  per-fill wake", world.stats.wake);
  tallySummary("  per-fill adoption (lights + reapply)", world.stats.adoption);
  const skipped = world.stats.releasesTotal - world.stats.releasesFlagged;
  console.log(
    `  released blocks carrying hasFlowing: ${world.stats.releasesFlagged} of ${world.stats.releasesTotal}${sweepAll ? "" : ` (${skipped} swept as empty by the flag)`}`,
  );
};

const main = async (): Promise<void> => {
  const noFlow = process.argv.includes("--no-flow");
  const stir = process.argv.includes("--stir");
  const clamps = process.argv.includes("--clamp");
  const preFix = process.argv.includes("--pre-fix");
  await runScenario(clamps ? "clamp" : "follow", !noFlow, preFix, stir);
};

main().catch((e) => {
  console.error("bench failed:", e);
  process.exit(1);
});
