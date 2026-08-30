import {
  applyLevelData,
  blockConfig,
  type Dim3,
  type WorldBlock,
} from "./level-data";
import type { EditLayer } from "./edit-layer";
import { type FillBatchResult, type FillConfig } from "./fill-worker";
import type { TerrainConfig } from "./noise";
import { fillStore, type BorderSizes, type FillStoreFn } from "./voxel-store";

export interface FillClientParams {
  terrain: TerrainConfig;
  /**
   * The blocks a fill result is applied to, indexed the same way as the
   * indices passed to `requestFill`. Shared with the caller, not copied, so
   * a result lands on whatever block currently occupies that slot.
   */
  blocks: WorldBlock[];
  /** Called with a slot's index once its voxel data has been generated and applied. */
  onBlockChanged: (index: number) => void;
  /**
   * The world-coordinate edit overlay. After a block's terrain is generated
   * it is re-applied, so edits survive the sphere re-filling a slot when the
   * player scrolls away and back.
   */
  editLayer?: EditLayer;
  customFillStore?: FillStoreFn;
  customFillStoreUrl?: string;
  /**
   * Supplies the workers that fill blocks. Defaults to a pool of
   * `hardwareConcurrency`-bounded module workers; a caller that hands over
   * one worker (or nothing) gets a single worker (or the main-thread
   * fallback) instead.
   */
  createWorker?: () => Worker | undefined;
}

/** How many fill workers to run: a small pool parallelizes a scroll's entering cap. */
const workerCount = (): number => {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.hardwareConcurrency !== "number"
  ) {
    return 2;
  }
  return Math.max(1, Math.min(4, navigator.hardwareConcurrency));
};

/**
 * Generates blocks' procedural voxel data and derived GPU level layout off
 * the main thread, falling back to generating them synchronously if no worker
 * is available or they all error. A pool of workers shares the load of a
 * scroll's entering shell.
 *
 * Each requested slot is tagged with a generation counter. If a slot is
 * requested again before its previous request's result arrives, the stale
 * result is dropped instead of overwriting the newer request's data.
 */
export class FillClient {
  private readonly fillGen: number[];
  /** The level of detail each slot's most recent fill was requested at. */
  private readonly fillLod: number[];
  /** The neighbour-voxel sizes each slot's most recent fill was requested with. */
  private readonly fillBorder: (BorderSizes | undefined)[];
  /** Slots with an outstanding worker fill request (for error recovery). */
  private readonly fillInflight = new Set<number>();
  private readonly blocks: WorldBlock[];
  private readonly terrain: TerrainConfig;
  private readonly onBlockChanged: (index: number) => void;
  private readonly customFillStore?: FillStoreFn;
  private readonly customFillStoreUrl?: string;
  private readonly editLayer?: EditLayer;
  private readonly workers: Worker[] = [];
  private workerAvailable = true;
  private warnedWorkerError = false;
  /** Slots waiting to be generated on the main thread, one task each. */
  private readonly pendingSyncFills = new Set<number>();
  /** The level of detail each queued synchronous fill will be generated at. */
  private readonly pendingSyncLods = new Map<number, number>();
  /** The neighbour-voxel sizes each queued synchronous fill will be generated with. */
  private readonly pendingSyncBorder = new Map<number, BorderSizes>();
  private syncFillTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(params: FillClientParams) {
    this.terrain = params.terrain;
    this.blocks = params.blocks;
    this.onBlockChanged = params.onBlockChanged;
    this.customFillStore = params.customFillStore;
    this.customFillStoreUrl = params.customFillStoreUrl;
    this.editLayer = params.editLayer;
    this.fillGen = new Array(params.blocks.length).fill(0);
    this.fillLod = new Array(params.blocks.length).fill(0);
    this.fillBorder = new Array(params.blocks.length).fill(undefined);

    const count = params.createWorker === undefined ? workerCount() : 1;
    for (let i = 0; i < count; i++) {
      try {
        const worker =
          params.createWorker === undefined
            ? new Worker(new URL("./fill-worker.ts", import.meta.url), {
                type: "module",
              })
            : params.createWorker();
        if (worker === undefined) {
          this.workerAvailable = false;
          break;
        }
        const fillConfig: FillConfig = {
          terrain: this.terrain,
          customFillStoreUrl: this.customFillStoreUrl,
        };
        worker.postMessage({ type: "config", config: fillConfig });
        worker.onmessage = (ev) => {
          this.onWorkerMessage(ev.data as FillBatchResult);
        };
        worker.onerror = () => {
          this.onWorkerError(worker);
        };
        this.workers.push(worker);
      } catch {
        if (this.workers.length === 0) {
          this.workerAvailable = false;
        }
        break;
      }
    }
  }

  private onWorkerMessage(msg: FillBatchResult): void {
    for (let j = 0; j < msg.indices.length; j++) {
      const i = msg.indices[j];
      // The result carries the generation the request it answers was sent
      // under. If the slot has since been requested again (it moved to a
      // different cell while this fill was running), the counter has moved on
      // and this stale fill must be dropped — applying it would paint the
      // old cell's terrain at the new one.
      if (msg.gens[j] !== this.fillGen[i]) {
        continue;
      }
      this.fillInflight.delete(i);
      applyLevelData(this.blocks[i], {
        storeData: msg.storeData[j],
        mightHaveVoxels: msg.mightHaveVoxels[j],
        lod: msg.lods[j],
      });
      this.applyEdits(i);
      this.onBlockChanged(i);
    }
  }

  private onWorkerError(failed: Worker): void {
    const stillAlive = this.workers.filter((w) => w !== failed);
    this.workers.length = 0;
    this.workers.push(...stillAlive);
    if (this.workers.length === 0) {
      this.workerAvailable = false;
    }
    if (!this.warnedWorkerError) {
      this.warnedWorkerError = true;
      console.warn(
        "[fill] worker errored; falling back to the remaining workers or synchronous fills",
      );
    }
    for (const i of this.fillInflight) {
      this.syncFillBlock(i, this.fillLod[i], this.fillBorder[i]);
    }
    this.fillInflight.clear();
  }

  /**
   * Generates one slot's voxel data on the calling thread, before returning.
   * For the block that has to exist before anything can be shown: starting a
   * worker and loading its modules costs several times what generating a
   * single block costs, so a block waiting on that start arrives far later
   * than one simply built here.
   *
   * The generation is bumped so any fill still in flight for the slot (from
   * before it moved) is dropped when it lands, instead of painting the old
   * cell's terrain over this fresh synchronous one.
   */
  fillNow(index: number, lod = 0, borderSizes?: BorderSizes): void {
    this.fillGen[index]++;
    this.fillInflight.delete(index);
    this.fillLod[index] = lod;
    this.fillBorder[index] = borderSizes;
    this.syncFillBlock(index, lod, borderSizes);
  }

  /**
   * Requests voxel data for each of these slots, using the worker if it's
   * available or generating it synchronously otherwise. `centers[k]` is the
   * world-space center and `lods[k]` the level of detail at which
   * `indices[k]` should be generated, and `borderSizes[k]` the neighbour
   * voxel sizes its border should cull its seam faces against.
   */
  requestFill(
    indices: number[],
    centers: Dim3[],
    lods: number[],
    borderSizes?: BorderSizes[],
  ): void {
    if (this.workers.length > 0 && this.workerAvailable) {
      // Split the batch across the pool, round-robin, so a scroll's entering
      // shell generates on several threads at once.
      const batches: Array<{
        indices: number[];
        centers: Dim3[];
        lods: number[];
        borderSizes: BorderSizes[];
      }> = this.workers.map(() => ({
        indices: [],
        centers: [],
        lods: [],
        borderSizes: [],
      }));
      for (let k = 0; k < indices.length; k++) {
        batches[k % batches.length].indices.push(indices[k]);
        batches[k % batches.length].centers.push(centers[k]);
        batches[k % batches.length].lods.push(lods[k]);
        batches[k % batches.length].borderSizes.push(borderSizes?.[k] ?? {});
      }
      for (let w = 0; w < this.workers.length; w++) {
        const batch = batches[w];
        if (batch.indices.length > 0) {
          this.sendFillBatch(
            batch.indices,
            batch.centers,
            batch.lods,
            batch.borderSizes,
            this.workers[w],
          );
        }
      }
      return;
    }
    // One block per task rather than one loop over all of them: generating a
    // block takes long enough that a whole window's worth in a single task
    // freezes the page for seconds, with nothing drawn and no loading state
    // shown until the last one is done.
    for (let k = 0; k < indices.length; k++) {
      this.pendingSyncFills.add(indices[k]);
      this.pendingSyncLods.set(indices[k], lods[k]);
      const border = borderSizes?.[k];
      if (border !== undefined) {
        this.pendingSyncBorder.set(indices[k], border);
      }
    }
    this.drainSyncFills();
  }

  private drainSyncFills(): void {
    if (this.syncFillTimer !== undefined) {
      return;
    }
    const next = this.pendingSyncFills.values().next();
    if (next.done === true) {
      return;
    }
    const index = next.value;
    this.pendingSyncFills.delete(index);
    const lod = this.pendingSyncLods.get(index) ?? 0;
    this.pendingSyncLods.delete(index);
    const borderSizes = this.pendingSyncBorder.get(index);
    this.pendingSyncBorder.delete(index);
    this.syncFillTimer = setTimeout(() => {
      this.syncFillTimer = undefined;
      this.syncFillBlock(index, lod, borderSizes);
      this.drainSyncFills();
    }, 0);
  }

  private syncFillBlock(i: number, lod = 0, borderSizes?: BorderSizes): void {
    const block = this.blocks[i];
    // The store's resolution is the fill's: a slot filled at a different
    // level of detail than it was built at has to read its voxels at that
    // LOD's scale before the fill writes into it.
    const { dimensions, voxels, voxelSize } = blockConfig(lod);
    block.store.dims = dimensions;
    block.store.voxels = voxels;
    block.store.scale = voxelSize;
    const fill = this.customFillStore ?? fillStore;
    fill(block.store, block.center, this.terrain, borderSizes);
    this.applyEdits(i);
    this.onBlockChanged(i);
  }

  /**
   * Re-applies the edit overlay to a block's slot, so a refilled slot
   * reflects edits recorded since its last fill.
   */
  private applyEdits(i: number): void {
    const layer = this.editLayer;
    if (layer === undefined) {
      return;
    }
    layer.applyToBlock(this.blocks[i]);
  }

  private sendFillBatch(
    indices: number[],
    centers: Dim3[],
    lods: number[],
    borderSizes: BorderSizes[],
    worker: Worker,
  ): void {
    const gens: number[] = [];
    for (let k = 0; k < indices.length; k++) {
      const i = indices[k];
      this.fillGen[i]++;
      gens.push(this.fillGen[i]);
      this.fillLod[i] = lods[k];
      this.fillBorder[i] = borderSizes[k];
      this.fillInflight.add(i);
    }
    worker.postMessage({
      type: "fill",
      indices,
      centers,
      lods,
      borderSizes,
      gens,
    });
  }

  dispose(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
  }
}
