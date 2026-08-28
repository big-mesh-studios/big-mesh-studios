import {
  applyLevelData,
  syncLevelFromStore,
  type Dim3,
  type WorldBlock,
} from "./level-data";
import type { EditLayer } from "./edit-layer";
import {
  type FillBatchRequest,
  type FillBatchResult,
  type FillConfig,
} from "./fill-worker";
import type { TerrainConfig } from "./noise";
import { fillStore, type FillStoreFn } from "./voxel-store";

export interface FillClientParams {
  terrain: TerrainConfig;
  surfaceOnly: boolean;
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
  private readonly fillInflight = new Map<number, number>();
  private readonly blocks: WorldBlock[];
  private readonly terrain: TerrainConfig;
  private readonly surfaceOnly: boolean;
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
    this.surfaceOnly = params.surfaceOnly;
    this.blocks = params.blocks;
    this.onBlockChanged = params.onBlockChanged;
    this.customFillStore = params.customFillStore;
    this.customFillStoreUrl = params.customFillStoreUrl;
    this.editLayer = params.editLayer;
    this.fillGen = new Array(params.blocks.length).fill(0);

    const count = workerCount();
    for (let i = 0; i < count; i++) {
      try {
        const worker = new Worker(
          new URL("./fill-worker.ts", import.meta.url),
          {
            type: "module",
          },
        );
        const fillConfig: FillConfig = {
          terrain: this.terrain,
          surfaceOnly: this.surfaceOnly,
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
      const gen = this.fillInflight.get(i);
      if (gen === undefined) {
        continue;
      }
      this.fillInflight.delete(i);
      if (gen !== this.fillGen[i]) {
        continue; // the slot was requested again; a newer batch will fill it
      }
      applyLevelData(this.blocks[i], {
        storeData: msg.storeData[j],
        broadData: msg.broadData[j],
        fineData: msg.fineData[j],
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
    for (const i of this.fillInflight.keys()) {
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
   */
  fillNow(index: number): void {
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
    syncLevelFromStore(block.level, block.store, {
      surfaceOnly: this.surfaceOnly,
    });
    this.applyEdits(i);
    this.onBlockChanged(i);
  }

  /**
   * Re-applies the edit overlay to a block's slot and re-derives its GPU
   * level when any edit intersects it, so a refilled slot reflects edits
   * recorded since its last fill.
   */
  private applyEdits(i: number): void {
    const layer = this.editLayer;
    if (layer === undefined) {
      return;
    }
    if (layer.applyToBlock(this.blocks[i]) > 0) {
      syncLevelFromStore(this.blocks[i].level, this.blocks[i].store, {
        surfaceOnly: this.surfaceOnly,
      });
    }
  }

  private sendFillBatch(
    indices: number[],
    centers: Dim3[],
    worker: Worker,
  ): void {
    const req: FillBatchRequest = { type: "fill", indices, centers };
    for (const i of indices) {
      this.fillGen[i]++;
      this.fillInflight.set(i, this.fillGen[i]);
    }
    worker.postMessage(req);
  }

  dispose(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
  }
}
