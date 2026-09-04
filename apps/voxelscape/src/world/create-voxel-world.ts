import type { Group } from "@random-mesh/rmsl/scene";
import { TriangleRenderer } from "../renderers/triangle-renderer";
import { loadVoxelTiles } from "../renderers/tile-loader";
import { ChunkSphere } from "./chunk-sphere";
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
  getWorldHeight,
  isLavaAt,
  isSolidAt,
  isWaterAt,
  type Dim3,
  type WorldBlock,
} from "./level-data";
import { heightAt as terrainHeightAt, type TerrainConfig } from "./noise";
import {
  VOXEL_AIR,
  VOXEL_LAVA,
  VOXEL_WATER,
  isFluidId,
} from "./voxel-store";

/** Padding added to each mesh's box so adjacent meshes share a thin overlap shell. */
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
  /** When true, only surface voxels are written into each block's GPU chunks instead of the full solid volume. */
  /** Where the player starts, in world units. The window fills outward from here. */
  spawn: Dim3;
  /**
   * Called each time one of the window's blocks becomes visible at startup,
   * with the running totals rather than a change to them. Never called before
   * this function returns: the spawn block's terrain is generated during
   * construction, but what draws it waits on the spritesheet.
   */
  onInitialDraw?: (progress: InitialDrawProgress) => void;
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
  ringRadius: number;
  /** Highest solid surface in the column at (`x`, `z`), for spawning and for weather. */
  heightAt(x: number, z: number): number;
  /** Highest solid surface at or below (`x`, `y`, `z`), or `-Infinity` where the column has none. */
  groundHeightAt(x: number, y: number, z: number): number;
  inWaterAt(x: number, y: number, z: number): boolean;
  /** Whether the voxel at a world point is lava; the contact-hazard query. */
  lavaAt(x: number, y: number, z: number): boolean;
  solidAt(x: number, y: number, z: number): boolean;
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
   * The slot whose block's interior holds a world voxel, resolved in O(1) via
   * the window's cell map — the lookup the fluid simulation reads and writes
   * through.
   */
  blockIndexAtVoxel(w: WorldVoxel): number | undefined;
  /** Writes the edit overlay to IndexedDB, batched. */
  scheduleSave(): void;
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
  spawn,
  onInitialDraw,
}: VoxelWorldConfig): VoxelWorld => {
  const ringRadius = chunkRadius * BLOCK_WORLD[0];
  /**
   * Distance at which fog becomes fully opaque and rays stop marching. Set
   * to the window edge's closest possible approach to the player — half a
   * chunk short of the ball's radius — the distance when the player hugs the
   * far edge of their center chunk, so fog always hides the boundary before
   * it can become visible.
   */

  const editLayer = new EditLayer();
  const editPersistence = createEditPersistence(editLayer);
  /** Callbacks run whenever a block's fill lands; the flow sim wakes through these. */
  const filledListeners: Array<(index: number) => void> = [];

  let releaseHandler: ((index: number) => void) | undefined;
  const sphere = new ChunkSphere({
    radius: chunkRadius,
    yRadius: chunkRadiusY,
    terrain,
    onBlockChanged: (i) => {
      // Recorded before the renderer is told, because a block only counts as
      // drawn once its geometry is built and `onBlockMeshed` fires from
      // inside this call.
      filled.add(i);
      ready.add(i);
      renderer.onBlockChanged(i);
      for (const cb of filledListeners) {
        cb(i);
      }
    },
    onBlockReposition: (i, center) => {
      // The slot now points at a different, as-yet-unfilled cell, so it no
      // longer answers for the terrain it last held. Clear its voxels now,
      // not when the new fill lands: between the reposition and that fill the
      // slot still reads as its previous cell, so a recycled block (one whose
      // old cell held a lava cave, say) would otherwise answer for the new
      // coordinates with the old cell's terrain until the worker returns.
      sphere.blocks[i].store.reset();
      sphere.blocks[i].light.skylight.fill(0);
      sphere.blocks[i].light.blocklight.fill(0);
      ready.delete(i);
      renderer.repositionBlock(i, center);
    },
    onBlockRelease: (i) => releaseHandler?.(i),
    editLayer,
  });
  const blockGrid = { blocks: sphere.blocks };

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
    if (!store.hasWater && !store.mightHaveVoxels) {
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
  /** Slots holding generated terrain for the cell they currently answer for. */
  const ready = new Set<number>();
  /** The slot the player spawns in, or -1 until the initial fill has been asked for. */
  let spawnIndex = -1;
  const renderer = new TriangleRenderer({
    blocks: blockGrid.blocks,
    waterExtinction: WATER_EXTINCTION,
    seaLevel: terrain.seaLevel,
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

  const reapplyEdits = () => {
    const affected: number[] = [];
    for (let i = 0; i < blockGrid.blocks.length; i++) {
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
  void loadVoxelTiles(renderer).then(() => renderer.meshNow(spawnIndex));
  // Re-apply any previously persisted edits to the freshly built initial
  // blocks, once the overlay has loaded.
  void editPersistence.load().then(reapplyEdits);

  return {
    blocks: blockGrid.blocks,
    renderer,
    terrain: renderer.terrain,
    water: renderer.water,
    underwaterTint: renderer.underwaterTint,
    editLayer,
    ringRadius,
    reapplyEdits,
    applyEdits,

    heightAt(x, z) {
      const height = getWorldHeight(sphere.query, x, z, terrain);
      // A column of air answers the same way whether its block holds no
      // terrain yet or genuinely has nothing above the void. Falling back to
      // the height field the terrain is generated from covers the first case,
      // which is every column until that block's fill lands, and agrees with
      // the voxels once it does.
      return height === -Infinity ? terrainHeightAt(x, z, terrain) : height;
    },
    groundHeightAt(x, y, z) {
      return getGroundHeightBelow(sphere.query, x, y, z);
    },
    inWaterAt(x, y, z) {
      return isWaterAt(sphere.query, x, y, z);
    },
    lavaAt(x, y, z) {
      return isLavaAt(sphere.query, x, y, z);
    },
    solidAt(x, y, z) {
      return isSolidAt(sphere.query, x, y, z);
    },
    scrollTo(x, y, z) {
      sphere.scrollTo(x, y, z);
    },
    cellReady(x, y, z) {
      const slot = sphere.slotAt(x, y, z);
      return slot !== undefined && ready.has(slot);
    },
    scheduleSave() {
      editPersistence.scheduleSave();
    },
    onBlockFilled(cb) {
      filledListeners.push(cb);
    },
    blockIndexAtVoxel(w) {
      return sphere.slotAt(
        (w[0] + 0.5) * VOXEL_SIZE,
        (w[1] + 0.5) * VOXEL_SIZE,
        (w[2] + 0.5) * VOXEL_SIZE,
      );
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
