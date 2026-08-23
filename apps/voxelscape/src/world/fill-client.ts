import {
  applyLevelData,
  syncLevelFromStore,
  type Dim3,
  type WorldBlock,
} from "./level-data";
import {
  type FillBatchRequest,
  type FillBatchResult,
  type FillConfig,
} from "./fill-worker";
import type { TerrainConfig } from "./noise";
import { fillStore } from "./voxel-store";

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
}

/**
 * Generates blocks' procedural voxel data and derived GPU level layout off
 * the main thread, falling back to generating them synchronously if the
 * worker is unavailable or errors.
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
  private worker: Worker | undefined;
  private workerAvailable = true;

  constructor(params: FillClientParams) {
    this.terrain = params.terrain;
    this.surfaceOnly = params.surfaceOnly;
    this.blocks = params.blocks;
    this.onBlockChanged = params.onBlockChanged;
    this.fillGen = new Array(params.blocks.length).fill(0);

    try {
      this.worker = new Worker(new URL("./fill-worker.ts", import.meta.url), {
        type: "module",
      });
      const fillConfig: FillConfig = {
        terrain: this.terrain,
        surfaceOnly: this.surfaceOnly,
      };
      this.worker.postMessage({ type: "config", config: fillConfig });
      this.worker.onmessage = (ev) => {
        const msg = ev.data as FillBatchResult;
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
          this.onBlockChanged(i);
        }
      };
      this.worker.onerror = () => {
        this.workerAvailable = false;
        console.warn(
          "[fill] worker errored; falling back to synchronous fills",
        );
        for (const i of this.fillInflight.keys()) {
          this.syncFillBlock(i);
        }
        this.fillInflight.clear();
      };
    } catch {
      this.workerAvailable = false;
    }
  }

  /**
   * Requests voxel data for each of these slots, using the worker if it's
   * available or generating it synchronously otherwise. `centers[k]` is the
   * world-space center at which `indices[k]` should be generated.
   */
  requestFill(indices: number[], centers: Dim3[]): void {
    if (this.worker !== undefined && this.workerAvailable) {
      this.sendFillBatch(indices, centers);
    } else {
      for (const i of indices) {
        this.syncFillBlock(i);
      }
    }
  }

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
    this.worker?.postMessage(req);
  }

  dispose(): void {
    this.worker?.terminate();
  }
}
