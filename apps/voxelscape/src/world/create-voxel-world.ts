import type { Group } from "@random-mesh/rmsl/scene";
import { TriangleRenderer } from "../renderers/triangle-renderer";
import { loadVoxelTiles } from "../renderers/tile-loader";
import type { VoxelTileConfig, VoxelTiles } from "../renderers/atlas";
import { cellsInSphere, ChunkSphere, type LodBands } from "./chunk-sphere";
import { WorldWorkerPool } from "./worker-pool";
import {
  blockWorldVoxelRange,
  EditLayer,
  localToWorldVoxel,
  mergeIntoLayer,
  worldVoxelToLocal,
  type VoxelEdit,
  type WorldVoxel,
} from "./edit-layer";
import { createEditPersistence } from "./edit-persistence";
import {
  BLOCK_WORLD,
  VOXEL_SIZE,
  getGroundHeightBelow,
  getWorldBlockId,
  getWorldHeight,
  isLavaAt,
  isSolidAt,
  isWaterAt,
  type Dim3,
  type WorldBlock,
} from "./level-data";
import { getHeightAt, type TerrainConfig } from "./noise";
import { LightEngine } from "./light-engine";
import type { StructurePlan } from "./structure-fill";
import { VOXEL_AIR, VOXEL_LAVA, VOXEL_WATER, isFluidId } from "./voxel-store";

/** Water absorption used by the water pass and the underwater tint alike. */
const WATER_EXTINCTION = 0.12;

/** How far the window has got towards being generated and on screen. */
export interface InitialDrawProgress {
  /** Blocks generated and, in triangle mode, meshed from that terrain. */
  drawn: number;
  total: number;
  /**
   * Whether the block containing the spawn point is among them: whether there
   * is ground under the player and something for them to look at. The rest of
   * the window is still arriving when this first turns true.
   */
  spawnDrawn: boolean;
}

export interface VoxelWorldConfig {
  /** Radius of the block window in X and Z, in chunks. */
  chunkRadius: number;
  /** Radius of the block window in Y, in chunks; defaults to `chunkRadius`. */
  chunkRadiusY?: number;
  terrain: TerrainConfig;
  /**
   * Extra voxel ids and the spritesheet tiles their faces show, merged over the
   * built-in `VOXEL_TILES` when the tile sheet loads. A place that adds block
   * ids of its own names their tiles here.
   */
  customVoxelTiles?: Record<number, VoxelTiles>;
  /**
   * Structures every block is stamped with, over its generated terrain. A
   * place's script writes its roads and houses into this plan.
   */
  structures?: StructurePlan;
  /** Where the player starts, in world units. The window fills outward from here. */
  spawn: Dim3;
  /**
   * What this world is, for keying its local edit overlay apart from every
   * other world's in the same browser: a place's `at://` address, a demo's
   * synthetic id, or omitted for the default world.
   */
  placeUri?: string;
  /**
   * Called each time one of the window's blocks becomes visible at startup,
   * with the running totals rather than a change to them. Never called before
   * this function returns: the spawn block's terrain is generated during
   * construction, but what draws it waits on the spritesheet.
   */
  onInitialDraw?: (progress: InitialDrawProgress) => void;
  /**
   * Supplies the workers of the single pool the fill and mesh clients share.
   * A caller that hands over one worker (or nothing) gets a single worker (or
   * the main-thread fallback) instead of the automatic `hardwareConcurrency`-1
   * pool.
   */
  createWorker?: () => Worker | undefined;
}

export interface VoxelWorld {
  /**
   * The streamed block window. A block's position in this array is the index
   * every callback in here identifies it by, so nothing outside needs to know
   * how the ring maps blocks onto grid coordinates.
   */
  blocks: WorldBlock[];
  /** What draws the blocks: their visible faces, meshed into triangles. */
  renderer: TriangleRenderer;
  /** The blocks drawn as solid terrain, for the scene to place in its draw order. */
  terrain: Group;
  /** The water surfaces over those blocks, likewise. */
  water: Group;
  /** The wash over the whole view when the camera is under the sea, likewise. */
  underwaterTint: Group;
  /**
   * Every player break/place, keyed by absolute voxel, so builds survive ring
   * refills. Persisted to IndexedDB here; synced to atproto by its own
   * controller, which re-applies through `reapplyEdits`.
   */
  editLayer: EditLayer;
  /** The farthest the ring's outer edge can be from the player, in world units. */
  readonly ringRadius: number;
  /** Chunk radius of the block window in X and Z, and in Y. */
  readonly chunkRadius: number;
  readonly chunkRadiusY: number;
  /** How far each level of detail reaches, in chunks. */
  readonly lodBands: LodBands;
  /**
   * Rebuilds the window at a different size, or at different level-of-detail
   * distances, around the cell the player stands in. Every block is filled
   * again, so the terrain comes back over the next second or so.
   */
  reshape(params: {
    chunkRadius?: number;
    chunkRadiusY?: number;
    lodBands?: LodBands;
  }): void;
  /**
   * Stops stamping the plan the world was built with and starts stamping
   * `structures` instead, regenerating the cells either plan reaches so the
   * change is visible without a reload. Returns whether the plan actually
   * changed: a caller recompiling an identical plan gets `false` and nothing
   * is rebuilt.
   */
  setStructures(structures: StructurePlan | undefined): boolean;
  /**
   * The world's worker threads, shared by the fill and mesh clients, so the
   * console can report and resize them.
   */
  workerPool: WorldWorkerPool;
  /** Highest solid surface in the column at (`x`, `z`), for spawning and for weather. */
  getHeightAt(x: number, z: number): number;
  /** Highest solid surface at or below (`x`, `y`, `z`), or `-Infinity` where the column has none. */
  getGroundHeightAt(x: number, y: number, z: number): number;
  getInWaterAt(x: number, y: number, z: number): boolean;
  /** Whether the voxel at a world point is lava; the contact-hazard query. */
  getLavaAt(x: number, y: number, z: number): boolean;
  getSolidAt(x: number, y: number, z: number): boolean;
  /** The voxel id at a world point, or 0 for air and for outside the loaded blocks. */
  getBlockAt(x: number, y: number, z: number): number;
  /** Keeps the block window centred on (`x`, `y`, `z`), streaming new blocks in off the main thread. */
  scrollTo(x: number, y: number, z: number): void;
  /**
   * Whether the cell containing a world point holds generated terrain for its
   * current cell — false in the gap between a scroll repositioning a slot and
   * its fill landing, which is when physics must hold the player in place.
   */
  cellReady(x: number, y: number, z: number): boolean;
  /**
   * Re-derives the GPU level of every block the edit overlay intersects and
   * queues the renderers' updates. For changes made to the overlay directly
   * rather than through an edit — a remote merge, or the persisted edits
   * loaded at startup.
   */
  reapplyEdits(): void;
  /**
   * Merges `entries` into the edit overlay (last-write-wins by `updatedAt`),
   * re-applies any change to the containing blocks' stores and GPU levels,
   * notifies the renderers, and schedules an IndexedDB save. The single
   * entry-point for remote edits — the WebRTC optimistic path and the atproto
   * merge both funnel through here. Returns the number of voxels that changed.
   */
  applyEdits(entries: Array<{ w: WorldVoxel; edit: VoxelEdit }>): number;
  /**
   * Registers a callback fired whenever a block's fill lands (its voxels are
   * freshly generated and its edits re-applied). The fluid simulation wakes
   * the cells a new block may set moving through this.
   */
  onBlockFilled(cb: (index: number) => void): void;
  /**
   * Keeps the light of runtime voxel changes and freshly landed seams in step
   * with their stores, budgeted so an edit or a burst of streaming washes over
   * a few frames instead of stalling one. The frame loop flushes it every
   * frame; the editing and flow controllers seed it as they write voxels.
   */
  readonly light: LightEngine;
  /**
   * The slot whose block's interior holds a world voxel, resolved in O(1) via
   * the window's cell map — the lookup the fluid simulation reads and writes
   * through.
   */
  blockIndexAtVoxel(w: WorldVoxel): number | undefined;
  /** Writes the edit overlay to IndexedDB, batched. */
  scheduleSave(): void;
  /**
   * Bytes the window's blocks hold in main memory: each block's voxels and the
   * two light volumes shadowing them. Fixed by the window's size and the level
   * of detail each block is at, so it moves only when a block is refilled at a
   * different resolution.
   */
  readonly voxelBytes: number;
  /** Slots waiting for terrain data, on a worker batch or on the main thread. */
  readonly fillPendingCount: number;
  /** Slots a worker is generating terrain data for right now. */
  readonly fillInFlightCount: number;
  dispose(): void;
}

/**
 * The voxel terrain: a window of blocks that streams as the player moves, the
 * overlay of their edits, and the renderer that draws it.
 */
export const createVoxelWorld = ({
  chunkRadius,
  chunkRadiusY = chunkRadius,
  terrain,
  customVoxelTiles,
  structures,
  spawn,
  placeUri,
  onInitialDraw,
  createWorker,
}: VoxelWorldConfig): VoxelWorld => {
  /**
   * The farthest the ring's outer edge can be from the player. Read from the
   * sphere rather than held, so it follows a window that has been reshaped.
   */
  const ringRadiusOf = (): number => sphere.radius * BLOCK_WORLD[0];
  /**
   * Distance at which fog becomes fully opaque and rays stop marching. Set
   * to the window edge's closest possible approach to the player — half a
   * chunk short of the ball's radius — the distance when the player hugs the
   * far edge of their center chunk, so fog always hides the boundary before
   * it can become visible.
   */

  const editLayer = new EditLayer();
  const editPersistence = createEditPersistence(editLayer, placeUri ?? null);
  /** Callbacks run whenever a block's fill lands; the flow sim wakes through these. */
  const filledListeners: Array<(index: number) => void> = [];
  /**
   * The single worker pool the fill and mesh clients share, so a scroll's
   * entering shell fills and meshes on the same threads without ever running
   * two pools' worth.
   */
  const workerPool = new WorldWorkerPool(
    createWorker === undefined ? {} : { createWorker, count: 1 },
  );

  /**
   * The world's incremental light engine, held back from its construction so
   * the streaming callbacks below can queue seam work on it; fills land only
   * after this function returns, so nothing observes the gap.
   */
  let light: LightEngine | undefined;
  let releaseHandler: ((index: number) => void) | undefined;
  /**
   * Resolves a world voxel to the slot whose cell holds it, through the
   * window's O(1) cell map. The fluid sim and the light engine both read cell
   * addresses through it.
   */
  const blockIndexAtVoxel = (w: WorldVoxel): number | undefined =>
    sphere.slotAt(
      (w[0] + 0.5) * VOXEL_SIZE,
      (w[1] + 0.5) * VOXEL_SIZE,
      (w[2] + 0.5) * VOXEL_SIZE,
    );
  const sphere: ChunkSphere = new ChunkSphere({
    radius: chunkRadius,
    yRadius: chunkRadiusY,
    terrain,
    structures,
    onBlockChanged: (i, meshes) => {
      // A block lights itself from its own store alone, so its seam pairs only
      // agree with a neighbour's copies if the neighbour's light already
      // reached them; the seam work is queued before the mesh is adopted so
      // the light it bakes already holds the raise.
      light?.enqueueFaces(i);
      // Recorded before the renderer is told, because a block only counts as
      // drawn once its geometry is built and `onBlockMeshed` fires from
      // inside this call.
      filled.add(i);
      renderer.onBlockChanged(i, meshes);
      for (const cb of filledListeners) {
        cb(i);
      }
    },
    onBlockReposition: (i, center) => {
      renderer.repositionBlock(i, center);
    },
    onBlockRelease: (i) => releaseHandler?.(i),
    editLayer,
    // Read lazily so the getter returns the rects the atlas settled on by the
    // time a batch is sent, even though the renderer is built just below.
    tileRects: (): VoxelTileConfig[] => renderer.tileRects,
    pool: workerPool,
  });
  const blockGrid: { blocks: WorldBlock[] } = { blocks: sphere.blocks };

  /**
   * Snapshots a released slot's moving fluid into the edit overlay so it
   * survives the slot's data being regenerated. Only flow that was never a
   * plain source is recorded — the ocean and placed sources keep their own
   * persistence paths — and a cell whose fluid has drained is written as air,
   * so a pool that dried does not come back when the block is filled again.
   */
  const snapshotSlotFluids = (slot: number): void => {
    const block = sphere.blocks[slot];
    const store = block.store;
    // Only a block whose store carries the flowing flag — one a fluid write or
    // the flow sim ever touched — can hold the falling/flowing cells this pass
    // keeps. Generated terrain and plain oceans never set it, so a pristine
    // block is skipped instead of swept in full.
    if (!store.hasFlowing) {
      return;
    }
    const { min, max } = blockWorldVoxelRange(block.center);
    const now = Date.now();
    let changed = false;
    const [nx, ny, nz] = store.voxels;
    for (let z = 0; z < nz; z++) {
      for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++) {
          const id = store.get(x, y, z);
          // Plain sources persist as their own edits (a placed bucket) or not
          // at all (the generated ocean); only flowing/falling cells are this
          // pass's to keep.
          if (id === VOXEL_WATER || id === VOXEL_LAVA || !isFluidId(id)) {
            continue;
          }
          const w = localToWorldVoxel(store, block.center, [x, y, z]);
          const prev = editLayer.get(w);
          if (prev === undefined || prev.id !== id) {
            editLayer.set(w, id, now);
            changed = true;
          }
        }
      }
    }
    for (const { w, edit } of editLayer.queryRange(min, max)) {
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
        continue; // a solid replaced it and carries its own edit
      }
      if (isFluidId(current)) {
        editLayer.set(w, current, now);
      } else {
        editLayer.set(w, VOXEL_AIR, now);
      }
      changed = true;
    }
    if (changed) {
      editPersistence.scheduleSave();
    }
  };
  releaseHandler = snapshotSlotFluids;
  /** Slots whose terrain has been generated. Fills up once, during the initial fill. */
  const filled = new Set<number>();
  /** Slots that have been both generated and drawn at least once. */
  const drawn = new Set<number>();
  /** The slot the player spawns in, or -1 until the initial fill has been asked for. */
  let spawnIndex = -1;
  const renderer: TriangleRenderer = new TriangleRenderer({
    blocks: blockGrid.blocks,
    waterExtinction: WATER_EXTINCTION,
    seaLevel: terrain.seaLevel,
    pool: workerPool,
    onBlockMeshed: (i) => {
      // The spritesheet landing invalidates every slot's mesh at once, so
      // slots still waiting for their terrain are drawn too, as the nothing
      // they currently hold. Only a draw of a slot that already has terrain
      // says anything about there being something to see.
      if (!filled.has(i) || drawn.has(i)) {
        return;
      }
      drawn.add(i);
      onInitialDraw?.({
        drawn: drawn.size,
        total: blockGrid.blocks.length,
        spawnDrawn: drawn.has(spawnIndex),
      });
    },
  });

  const lightEngine = new LightEngine({
    blocks: blockGrid.blocks,
    resolve: blockIndexAtVoxel,
    isFilled: (i) => sphere.hasTerrain(i),
    onChanged: (indices) => renderer.onBlocksChanged(indices),
  });
  light = lightEngine;

  const reapplyEdits = () => {
    const affected: number[] = [];
    for (let i = 0; i < blockGrid.blocks.length; i++) {
      // A slot being streamed still holds the cell it left behind, so writing
      // the overlay into it would put this cell's edits on that cell's
      // terrain. Its own fill applies the overlay when it lands.
      if (!sphere.hasTerrain(i)) {
        continue;
      }
      const block = blockGrid.blocks[i];
      if (editLayer.applyToBlock(block) > 0) {
        affected.push(i);
      }
    }
    for (const i of affected) {
      renderer.onBlockChanged(i);
    }
  };

  /**
   * Applies a batch of entries to the overlay and to the blocks they land in.
   * Only the blocks whose range intersects an entry are touched (unlike
   * `reapplyEdits`, which sweeps the whole ring), so a burst of remote edits
   * stays cheap.
   */
  const applyEdits = (
    entries: Array<{ w: WorldVoxel; edit: VoxelEdit }>,
  ): number => {
    if (entries.length === 0) {
      return 0;
    }
    const changed = mergeIntoLayer(editLayer, entries);
    if (changed === 0) {
      return 0;
    }
    const candidates = new Set<number>();
    for (const { w } of entries) {
      for (let i = 0; i < blockGrid.blocks.length; i++) {
        const { min, max } = blockWorldVoxelRange(blockGrid.blocks[i].center);
        if (
          w[0] >= min[0] &&
          w[0] <= max[0] &&
          w[1] >= min[1] &&
          w[1] <= max[1] &&
          w[2] >= min[2] &&
          w[2] <= max[2]
        ) {
          candidates.add(i);
        }
      }
    }
    const affected: number[] = [];
    for (const i of candidates) {
      const block = blockGrid.blocks[i];
      if (editLayer.applyToBlock(block) > 0) {
        affected.push(i);
      }
    }
    for (const i of affected) {
      renderer.onBlockChanged(i);
    }
    editPersistence.scheduleSave();
    return changed;
  };

  // The spawn block's terrain is generated before this returns; the rest of
  // the window follows off the main thread, so the page paints and the
  // loading state runs while it arrives.
  spawnIndex = sphere.fillFrom(spawn[0], spawn[1], spawn[2]);

  // Tell every block material which tile each voxel face uses once the
  // spritesheet loads, then draw the spawn block. A mesh bakes each face's
  // atlas rectangle into its vertices, so one built before the spritesheet has
  // been read is textured from an empty list of tiles and comes out scrambled
  // — and this is the block the player is shown first. The spritesheet is one
  // local asset, and waiting for it costs a fraction of what the block itself
  // cost. If it never arrives, the block is drawn flat blue instead.
  void loadVoxelTiles(renderer, { customVoxelTiles }).then(() =>
    renderer.meshNow(spawnIndex),
  );
  // Re-apply any previously persisted edits to the freshly built initial
  // blocks, once the overlay has loaded.
  void editPersistence.load().then(reapplyEdits);

  return {
    blocks: blockGrid.blocks,
    renderer,
    light: lightEngine,
    get voxelBytes() {
      let bytes = 0;
      for (const block of blockGrid.blocks) {
        bytes += block.store.data.byteLength + block.light.data.byteLength;
      }
      return bytes;
    },
    get fillPendingCount() {
      return sphere.fillPendingCount;
    },
    get fillInFlightCount() {
      return sphere.fillInFlightCount;
    },
    terrain: renderer.terrain,
    water: renderer.water,
    underwaterTint: renderer.underwaterTint,
    editLayer,
    get ringRadius() {
      return ringRadiusOf();
    },
    get chunkRadius() {
      return sphere.radius;
    },
    get chunkRadiusY() {
      return sphere.yRadius;
    },
    get lodBands() {
      return sphere.bands;
    },
    reshape({ chunkRadius: radius, chunkRadiusY: radiusY, lodBands: bands }) {
      const wantedRadius = radius ?? sphere.radius;
      const wantedRadiusY = radiusY ?? sphere.yRadius;
      // The renderer is resized first, for both directions. Growing: reshaping
      // fills the block under the player on this thread and meshes it before
      // returning, so a slot the renderer had no room for would land looking
      // stale and never draw. Shrinking: a slot it still holds is still a
      // member of a superchunk, which then waits for a block that is gone.
      renderer.resizeTo(cellsInSphere(wantedRadius, wantedRadiusY));
      sphere.reshape(wantedRadius, wantedRadiusY, bands ?? sphere.bands);
    },
    setStructures(structures) {
      return sphere.setStructures(structures);
    },
    workerPool,
    reapplyEdits,
    applyEdits,

    getHeightAt(x, z) {
      const height = getWorldHeight(sphere.query, x, z, terrain);
      // A column of air answers the same way whether its block holds no
      // terrain yet or genuinely has nothing above the void. Falling back to
      // the height field the terrain is generated from covers the first case,
      // which is every column until that block's fill lands, and agrees with
      // the voxels once it does.
      return height === -Infinity ? getHeightAt(x, z, terrain) : height;
    },
    getGroundHeightAt(x, y, z) {
      return getGroundHeightBelow(sphere.query, x, y, z);
    },
    getInWaterAt(x, y, z) {
      return isWaterAt(sphere.query, x, y, z);
    },
    getLavaAt(x, y, z) {
      return isLavaAt(sphere.query, x, y, z);
    },
    getSolidAt(x, y, z) {
      return isSolidAt(sphere.query, x, y, z);
    },
    getBlockAt(x, y, z) {
      return getWorldBlockId(sphere.query, x, y, z);
    },
    scrollTo(x, y, z) {
      sphere.scrollTo(x, y, z);
    },
    cellReady(x, y, z) {
      return sphere.slotAt(x, y, z) !== undefined;
    },
    scheduleSave() {
      editPersistence.scheduleSave();
    },
    onBlockFilled(cb) {
      filledListeners.push(cb);
    },
    blockIndexAtVoxel(w) {
      return blockIndexAtVoxel(w);
    },
    dispose() {
      // stop the fill worker so it doesn't keep running after unmount
      sphere.dispose();
      // terminate the mesh worker and release the renderer's GPU resources
      renderer.dispose();
      // store the edit overlay before the render loop stops
      void editPersistence.saveNow();
    },
  };
};
