import {
  applyLevelData,
  BLOCK_WORLD,
  buildBlock,
  resetLevel,
  syncLevelFromStore,
  type Dim3,
  type WorldBlock,
} from "./level-data";
import {
  type FillBatchRequest,
  type FillBatchResult,
  type FillConfig,
} from "./fill-worker";
import type { BlockGridLookup } from "../renderers/mesh";
import type { TerrainConfig } from "./noise";
import { fillStore, type VoxelStore } from "./voxel-store";

export interface WorldRingParams {
  blocksPerSide: number;
  terrain: TerrainConfig;
  surfaceOnly: boolean;
  /**
   * Called whenever a slot's voxel data is ready to be reflected on screen —
   * during the initial fill, or when a ring-scroll refill lands.
   */
  onBlockChanged: (index: number) => void;
  /**
   * Called when the ring steps and a slot now represents a different world
   * position, before its new data has arrived.
   */
  onBlockReposition: (index: number, center: Dim3) => void;
}

/**
 * A `blocksPerSide x blocksPerSide` window of `WorldBlock`s kept centred on the
 * player. The initial ring is built synchronously in the constructor; every
 * scroll after that refills the newly revealed slots off the main thread via a
 * fill worker, falling back to a synchronous fill if the worker is unavailable
 * or errors. This class knows nothing about rendering — block changes and
 * repositions are reported through injected callbacks, not a direct reference
 * to a renderer.
 */
export class WorldRing {
  readonly blocks: WorldBlock[] = [];
  /**
   * Per-slot integer grid coordinate of the world block currently displayed.
   * Kept private: nothing outside this class needs raw grid coordinates, only
   * "the block at these coordinates" (`lookupBlock`), "this slot's own
   * coordinates" (`gridCoordAt`, needed by the triangle renderer to resolve
   * its neighbours), or "all current blocks" (`blocks`).
   */
  private readonly worldGrid: { x: number; z: number }[] = [];
  private readonly terrain: TerrainConfig;
  private readonly surfaceOnly: boolean;
  private readonly onBlockChanged: (index: number) => void;
  private readonly onBlockReposition: (index: number, center: Dim3) => void;

  // --- fill worker ----------------------------------------------------------
  // Procedural voxel data (noise fill) + the derived GPU level layout (surface
  // sweep) are generated off the main thread: `stepRing` sends a batch of the
  // changed blocks' centres and the worker posts each block's store data, broad
  // grid and fine chunks back transferred (moved, not copied). The response
  // adopts them zero-copy into the store + level textures. Per-slot `fillGen`
  // drops a stale response if the slot scrolls again before it lands.
  private readonly fillGen: number[] = [];
  private readonly fillInflight = new Map<number, number>();
  private fillWorker: Worker | undefined;
  private fillAvailable = true;

  // Keeps the ring window centred on the player's block.
  private centerBlockX = 0;
  private centerBlockZ = 0;

  constructor(params: WorldRingParams) {
    this.terrain = params.terrain;
    this.surfaceOnly = params.surfaceOnly;
    this.onBlockChanged = params.onBlockChanged;
    this.onBlockReposition = params.onBlockReposition;

    const n = params.blocksPerSide;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const grid = {
          x: i - (n - 1) / 2,
          z: j - (n - 1) / 2,
        };
        const center: Dim3 = [
          grid.x * BLOCK_WORLD[0],
          0,
          grid.z * BLOCK_WORLD[2],
        ];
        const block: WorldBlock = buildBlock({
          center,
          terrain: this.terrain,
          surfaceOnly: this.surfaceOnly,
        });
        this.blocks.push(block);
        this.worldGrid.push(grid);
        this.fillGen.push(0);
      }
    }

    try {
      this.fillWorker = new Worker(
        new URL("./fill-worker.ts", import.meta.url),
        {
          type: "module",
        },
      );
      const fillConfig: FillConfig = {
        terrain: this.terrain,
        surfaceOnly: this.surfaceOnly,
      };
      this.fillWorker.postMessage({ type: "config", config: fillConfig });
      this.fillWorker.onmessage = (ev) => {
        const msg = ev.data as FillBatchResult;
        for (let j = 0; j < msg.indices.length; j++) {
          const i = msg.indices[j];
          const gen = this.fillInflight.get(i);
          if (gen === undefined) {
            continue;
          }
          this.fillInflight.delete(i);
          if (gen !== this.fillGen[i]) {
            continue; // the slot scrolled again; a newer batch will fill it
          }
          applyLevelData(this.blocks[i], {
            storeData: msg.storeData[j],
            broadData: msg.broadData[j],
            fineData: msg.fineData[j],
          });
          this.onBlockChanged(i);
        }
      };
      this.fillWorker.onerror = () => {
        // fall back to filling synchronously; don't leave anything stranded
        this.fillAvailable = false;
        console.warn(
          "[fill] worker errored; falling back to synchronous fills",
        );
        for (const i of this.fillInflight.keys()) {
          this.syncFillBlock(i);
        }
        this.fillInflight.clear();
      };
    } catch {
      this.fillAvailable = false;
    }
  }

  /**
   * The grid coordinate of the block currently at this slot. Needed by the
   * triangle renderer to resolve its neighbours via `lookupBlock`.
   */
  gridCoordAt(index: number): { x: number; z: number } {
    const g = this.worldGrid[index];
    return { x: g.x, z: g.z };
  }

  lookupBlock: BlockGridLookup = (gx, gz) => {
    for (let i = 0; i < this.worldGrid.length; i++) {
      if (this.worldGrid[i].x === gx && this.worldGrid[i].z === gz) {
        return this.blocks[i].store;
      }
    }
    return undefined;
  };

  private syncFillBlock(i: number): void {
    fillStore(this.blocks[i].store, this.blocks[i].center, this.terrain);
    syncLevelFromStore(this.blocks[i].level, this.blocks[i].store, {
      surfaceOnly: this.surfaceOnly,
    });
    this.onBlockChanged(i);
  }

  private sendFillBatch(indices: number[], centers: Dim3[]): void {
    const req: FillBatchRequest = { type: "fill", indices, centers };
    for (const i of indices) {
      this.fillGen[i]++;
      this.fillInflight.set(i, this.fillGen[i]);
    }
    this.fillWorker?.postMessage(req);
  }

  /**
   * Moves the ring window one block step in the given direction: the whole
   * trailing column or row teleports to the leading edge and each is refilled
   * at its new center. Stepping only one block would let the window drift
   * off-centre when walking along a single axis.
   */
  private stepRing(dx: number, dz: number): void {
    const changed = new Set<number>();
    if (dx !== 0) {
      let min = Infinity;
      let max = -Infinity;
      for (const g of this.worldGrid) {
        if (g.x < min) {
          min = g.x;
        }
        if (g.x > max) {
          max = g.x;
        }
      }
      const from = dx > 0 ? min : max;
      const to = dx > 0 ? max + 1 : min - 1;
      for (let i = 0; i < this.worldGrid.length; i++) {
        if (this.worldGrid[i].x === from) {
          this.worldGrid[i].x = to;
          changed.add(i);
        }
      }
    }
    if (dz !== 0) {
      let min = Infinity;
      let max = -Infinity;
      for (const g of this.worldGrid) {
        if (g.z < min) {
          min = g.z;
        }
        if (g.z > max) {
          max = g.z;
        }
      }
      const from = dz > 0 ? min : max;
      const to = dz > 0 ? max + 1 : min - 1;
      for (let i = 0; i < this.worldGrid.length; i++) {
        if (this.worldGrid[i].z === from) {
          this.worldGrid[i].z = to;
          changed.add(i);
        }
      }
    }
    const changedIndices: number[] = [];
    const changedCenters: Dim3[] = [];
    for (const i of changed) {
      const center: Dim3 = [
        this.worldGrid[i].x * BLOCK_WORLD[0],
        0,
        this.worldGrid[i].z * BLOCK_WORLD[2],
      ];
      this.blocks[i].center = center;
      // reposition both renderers' meshes for this slot; the triangle
      // renderer also clears its geometry there to avoid flashing the old
      // block's surface at the new location
      this.onBlockReposition(i, center);
      // clear the raymarch level so no stale terrain renders at the new spot
      // while the fill worker regenerates it (the block is at the fogged ring
      // edge, so the brief empty window is hidden)
      resetLevel(this.blocks[i].level);
      this.blocks[i].level.broadTexture.needsUpdate = true;
      this.blocks[i].level.texture.needsUpdate = true;
      changedIndices.push(i);
      changedCenters.push(center);
    }
    if (this.fillWorker !== undefined && this.fillAvailable) {
      this.sendFillBatch(changedIndices, changedCenters);
    } else {
      // synchronous fallback: fill + sweep the changed blocks here
      for (const i of changedIndices) {
        this.syncFillBlock(i);
      }
    }
  }

  scrollToPlayer(playerX: number, playerZ: number): void {
    const blockX = Math.floor(playerX / BLOCK_WORLD[0]);
    const blockZ = Math.floor(playerZ / BLOCK_WORLD[2]);
    while (this.centerBlockX !== blockX) {
      this.stepRing(Math.sign(blockX - this.centerBlockX), 0);
      this.centerBlockX += Math.sign(blockX - this.centerBlockX);
    }
    while (this.centerBlockZ !== blockZ) {
      this.stepRing(0, Math.sign(blockZ - this.centerBlockZ));
      this.centerBlockZ += Math.sign(blockZ - this.centerBlockZ);
    }
  }

  dispose(): void {
    this.fillWorker?.terminate();
  }
}
