// Web worker that generates a block's procedural voxel data (noise fill) and
// its derived GPU level layout (surface sweep) off the main thread. The main
// thread sends a configuration once, then `fill` requests carrying the centres
// of the blocks it wants — the whole window at startup, the changed slots of a
// ring step afterwards. Each block is posted back on its own as it is
// generated, its three arrays (store data, broad grid, fine chunks)
// transferred (moved, not copied) and adopted zero-copy into the block's store
// and level.
import { buildBlockData, type Dim3, type TerrainConfig } from "./level-data";
import type { FillStoreFn } from "./voxel-store";

export interface FillConfig {
  terrain: TerrainConfig;
  customFillStoreUrl?: string;
}

export interface FillBatchRequest {
  type: "fill";
  indices: number[];
  centers: Dim3[];
}

export interface FillBatchResult {
  indices: number[];
  storeData: Uint8Array[];
}

export type FillWorkerMessage =
  { type: "config"; config: FillConfig } | FillBatchRequest;

let cachedCustomFillStore: FillStoreFn | undefined = undefined;

/**
 * Builds one result per block in a fill request, in the order the request
 * lists them. Pure, so it can be unit-tested without a worker context.
 *
 * A block is its own result rather than the whole request being one, so the
 * main thread can draw each block as it lands: generating a block takes long
 * enough that holding a batch of them back until the last one is done is the
 * difference between terrain appearing around the player straight away and
 * appearing all at once, seconds later.
 */
export async function* buildFillResults(
  req: FillBatchRequest,
  cfg: FillConfig,
): AsyncGenerator<FillBatchResult> {
  if (cfg.customFillStoreUrl && !cachedCustomFillStore) {
    try {
      const module = await import(/* @vite-ignore */ cfg.customFillStoreUrl);
      cachedCustomFillStore = module.fillStore || module.default;
    } catch (err) {
      console.error("[fill-worker] failed to import customFillStoreUrl:", err);
    }
  }

  for (let i = 0; i < req.centers.length; i++) {
    const data = buildBlockData({
      center: req.centers[i],
      terrain: cfg.terrain,
      customFillStore: cachedCustomFillStore,
    });
    yield {
      indices: [req.indices[i]],
      storeData: [data.storeData],
    };
  }
}

/** The buffers to move along with a result: everything the result owns. */
export const fillResultTransfers = (
  result: FillBatchResult,
): Transferable[] => {
  const transfer: Transferable[] = [];
  for (let i = 0; i < result.storeData.length; i++) {
    transfer.push(result.storeData[i].buffer);
  }
  return transfer;
};

/**
 * Pure message handler: returns a new configuration for a `config` message, a
 * result per block for a `fill` message, or neither for anything else (an
 * unknown message, or a `fill` message received before a configuration).
 */
export const handleFillMessage = (
  msg: FillWorkerMessage,
  config: FillConfig | undefined,
): {
  results?: AsyncGenerator<FillBatchResult>;
  config?: FillConfig;
} => {
  if (msg.type === "config") {
    cachedCustomFillStore = undefined;
    return { config: msg.config };
  }
  if (msg.type !== "fill" || config === undefined) {
    return {};
  }
  return { results: buildFillResults(msg, config) };
};

/**
 * The TypeScript DOM types define `self` as `Window`, whose `postMessage`
 * needs a target origin; in a dedicated worker the global is a
 * `DedicatedWorkerGlobalScope`. Guarded so importing this module in Node.js
 * (for the protocol tests) doesn't evaluate `self`.
 */
const workerSelf =
  typeof self !== "undefined"
    ? (self as unknown as {
        onmessage: ((ev: MessageEvent) => void) | null;
        postMessage: (
          message: FillBatchResult,
          transfer: Transferable[],
        ) => void;
      })
    : undefined;

let config: FillConfig | undefined;

if (workerSelf !== undefined) {
  workerSelf.onmessage = async (ev) => {
    const out = handleFillMessage(ev.data as FillWorkerMessage, config);
    if (out.config !== undefined) {
      config = out.config;
      return;
    }
    if (out.results !== undefined) {
      for await (const result of out.results) {
        workerSelf.postMessage(result, fillResultTransfers(result));
      }
    }
  };
}
