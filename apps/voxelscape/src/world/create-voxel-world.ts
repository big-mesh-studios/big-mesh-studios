import { Scene } from "@random-mesh/rmsl/scene";
import { RendererSwitch } from "../renderers/renderer-switch";
import { loadVoxelTiles } from "../renderers/tile-loader";
import { BlockGrid } from "./block-grid";
import {
  blockWorldVoxelRange,
  EditLayer,
  mergeIntoLayer,
  type VoxelEdit,
  type WorldVoxel,
} from "./edit-layer";
import { createEditPersistence } from "./edit-persistence";
import {
  BLOCK_WORLD,
  getGroundHeightBelow,
  getWorldHeight,
  isSolidAt,
  isWaterAt,
  syncLevelFromStore,
  type WorldBlock,
} from "./level-data";
import { type TerrainConfig } from "./noise";
import { WorldRing } from "./world-ring";

/** Padding added to each mesh's box so adjacent meshes share a thin overlap shell. */
const PAD = 2.0;
/** Water absorption used by the raymarch water pass and, at the same value, the triangle renderer's underwater tint. */
const WATER_EXTINCTION = 0.12;

export interface VoxelWorldConfig {
  /** The renderers' meshes are added to this scene at construction. */
  scene: Scene;
  /** Width of the streamed block window, in blocks per side. */
  blocksPerSide: number;
  terrain: TerrainConfig;
  /** When true, only surface voxels are written into each block's GPU chunks instead of the full solid volume. */
  surfaceOnly: boolean;
  debugPerf: boolean;
}

export interface VoxelWorld {
  /**
   * The streamed block window. A block's position in this array is the index
   * every callback in here identifies it by, so nothing outside needs to know
   * how the ring maps blocks onto grid coordinates.
   */
  blocks: WorldBlock[];
  /** Both rendering strategies and the switch between them (`/renderer ray|tri`). */
  renderers: RendererSwitch;
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
  solidAt(x: number, y: number, z: number): boolean;
  /** Keeps the block window centred on (`x`, `z`), streaming new blocks in off the main thread. */
  scrollTo(x: number, z: number): void;
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
  applyEdits(
    entries: Array<{ w: WorldVoxel; edit: VoxelEdit }>,
  ): number;
  /** Writes the edit overlay to IndexedDB, batched. */
  scheduleSave(): void;
  /**
   * Adds the renderers' translucent water passes to the scene. Both passes
   * (and the triangle renderer's underwater tint) blend over the opaque
   * scene, and scene-graph order is draw order, so call this once every
   * opaque object is in the scene.
   */
  addTranslucentPasses(): void;
  dispose(): void;
}

/**
 * The voxel terrain: a window of blocks that streams as the player moves, the
 * overlay of their edits, and the two renderers that draw it.
 */
export const createVoxelWorld = (config: VoxelWorldConfig): VoxelWorld => {
  const { scene, blocksPerSide, terrain, surfaceOnly, debugPerf } = config;

  const ringRadius = (blocksPerSide / 2) * BLOCK_WORLD[0];
  /**
   * Distance at which fog becomes fully opaque and rays stop marching. Set
   * to the ring edge's closest possible approach to the player — half a block
   * short of the ring's half-width — the distance when the player hugs the far
   * edge of their center block, so fog always hides the ring boundary before
   * it can become visible.
   */
  const fogDistance = (blocksPerSide / 2 - 0.5) * BLOCK_WORLD[0];

  const blockGrid = new BlockGrid({ blocksPerSide, terrain, surfaceOnly });
  const renderers = new RendererSwitch({
    scene,
    blocks: blockGrid.blocks,
    padding: PAD,
    blockWorld: BLOCK_WORLD,
    fogDistance,
    fogStart: 0.4 * fogDistance,
    debugPerf,
    waterExtinction: WATER_EXTINCTION,
    seaLevel: terrain.seaLevel,
  });
  const editLayer = new EditLayer();
  const editPersistence = createEditPersistence(editLayer);
  const worldRing = new WorldRing({
    blockGrid,
    terrain,
    surfaceOnly,
    onBlockChanged: (i) => renderers.onBlockChanged(i),
    onBlockReposition: (i, center) => renderers.repositionBlock(i, center),
    editLayer,
  });

  const reapplyEdits = () => {
    const affected: number[] = [];
    for (let i = 0; i < blockGrid.blocks.length; i++) {
      const block = blockGrid.blocks[i];
      if (editLayer.applyToBlock(block) > 0) {
        syncLevelFromStore(block.level, block.store, { surfaceOnly });
        affected.push(i);
      }
    }
    for (const i of affected) {
      renderers.onBlockChanged(i);
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
        syncLevelFromStore(block.level, block.store, { surfaceOnly });
        affected.push(i);
      }
    }
    for (const i of affected) {
      renderers.onBlockChanged(i);
    }
    editPersistence.scheduleSave();
    return changed;
  };

  // Tell every block material which tile each voxel face uses once the
  // spritesheet loads. Fire-and-forget: voxels stay flat blue until it lands.
  loadVoxelTiles(renderers);
  // Re-apply any previously persisted edits to the freshly built initial
  // blocks, once the overlay has loaded.
  void editPersistence.load().then(reapplyEdits);

  return {
    blocks: blockGrid.blocks,
    renderers,
    editLayer,
    ringRadius,
    reapplyEdits,
    applyEdits,

    heightAt(x, z) {
      return getWorldHeight(blockGrid.blocks, x, z);
    },
    groundHeightAt(x, y, z) {
      return getGroundHeightBelow(blockGrid.blocks, x, y, z);
    },
    inWaterAt(x, y, z) {
      return isWaterAt(blockGrid.blocks, x, y, z);
    },
    solidAt(x, y, z) {
      return isSolidAt(blockGrid.blocks, x, y, z);
    },
    scrollTo(x, z) {
      worldRing.scrollToPlayer(x, z);
    },
    scheduleSave() {
      editPersistence.scheduleSave();
    },
    addTranslucentPasses() {
      renderers.addTranslucentPassesToScene(scene);
    },
    dispose() {
      // stop the fill worker so it doesn't keep running after unmount
      worldRing.dispose();
      // terminate the mesh worker and release the renderers' GPU resources
      renderers.dispose();
      // store the edit overlay before the render loop stops
      void editPersistence.saveNow();
    },
  };
};
