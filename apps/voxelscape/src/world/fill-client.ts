import { applyLevelData, type Dim3, type WorldBlock } from "./level-data";
import type { EditLayer } from "./edit-layer";
import { type FillBatchResult, type FillConfig } from "./fill-worker";
import type { TerrainConfig } from "./noise";
import { fillStore, type FillStoreFn } from "./voxel-store";

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
  private syncFillTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(params: FillClientParams) {
    this.terrain = params.terrain;
    this.blocks = params.blocks;
    this.onBlockChanged = params.onBlockChanged;
    this.customFillStore = params.customFillStore;
    this.customFillStoreUrl = params.customFillStoreUrl;
    this.editLayer = params.editLayer;
    this.fillGen = new Array(params.blocks.length).fill(0);

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
      this.syncFillBlock(i);
    }
    this.fillInflight.clear();
  }

  /**
   * Requests voxel data for each of these slots, using the worker if it's
   * available or generating it synchronously otherwise. `centers[k]` is the
   * world-space center at which `indices[k]` should be generated.
   */
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
  fillNow(index: number): void {
    this.fillGen[index]++;
    this.fillInflight.delete(index);
    this.syncFillBlock(index);
  }

  requestFill(indices: number[], centers: Dim3[]): void {
    if (this.workers.length > 0 && this.workerAvailable) {
      // Split the batch across the pool, round-robin, so a scroll's entering
      // shell generates on several threads at once.
      const batches: Array<{ indices: number[]; centers: Dim3[] }> =
        this.workers.map(() => ({ indices: [], centers: [] }));
      for (let k = 0; k < indices.length; k++) {
        batches[k % batches.length].indices.push(indices[k]);
        batches[k % batches.length].centers.push(centers[k]);
      }
      for (let w = 0; w < this.workers.length; w++) {
        const batch = batches[w];
        if (batch.indices.length > 0) {
          this.sendFillBatch(batch.indices, batch.centers, this.workers[w]);
        }
      }
      return;
    }
    // One block per task rather than one loop over all of them: generating a
    // block takes long enough that a whole window's worth in a single task
    // freezes the page for seconds, with nothing drawn and no loading state
    // shown until the last one is done.
    for (const i of indices) {
      this.pendingSyncFills.add(i);
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
    this.pendingSyncFills.delete(next.value);
    this.syncFillTimer = setTimeout(() => {
      this.syncFillTimer = undefined;
      this.syncFillBlock(next.value);
      this.drainSyncFills();
    }, 0);
  }

  private syncFillBlock(i: number): void {
    const block = this.blocks[i];
    const fill = this.customFillStore ?? fillStore;
    fill(block.store, block.center, this.terrain);
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
    worker: Worker,
  ): void {
    const gens: number[] = [];
    for (const i of indices) {
      this.fillGen[i]++;
      gens.push(this.fillGen[i]);
      this.fillInflight.add(i);
    }
    worker.postMessage({ type: "fill", indices, centers, gens });
  }

  dispose(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
  }
}
