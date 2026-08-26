// Web worker that generates a block's procedural voxel data (noise fill) and
// its derived GPU level layout (surface sweep) off the main thread. The main
// thread sends a configuration once, then batch `fill` requests with the
// centres of a ring step's changed blocks; each block's three arrays (store
// data, broad grid, fine chunks) are posted back transferred (moved, not
// copied) and adopted zero-copy into the block's store and level.
import type { Vector3D } from "../utils/maths";
import { buildBlockData, type TerrainConfig } from "./level-data";
import type { FillStoreFn } from "./voxel-store";

export interface FillConfig {
  terrain: TerrainConfig;
  surfaceOnly: boolean;
  customFillStoreUrl?: string;
}

export interface FillBatchRequest {
  type: "fill";
  indices: number[];
  centers: Vector3D[];
}

export interface FillBatchResult {
  indices: number[];
  storeData: Uint8Array[];
  broadData: Uint8Array[];
  fineData: Uint8Array[];
}

export type FillWorkerMessage =
  { type: "config"; config: FillConfig } | FillBatchRequest;

let cachedCustomFillStore: FillStoreFn | undefined = undefined;

/**
 * Builds the batch result for a fill request. Pure, so it can be
 * unit-tested without a worker context.
 */
export const buildFillResult = async (
  req: FillBatchRequest,
  cfg: FillConfig,
): Promise<FillBatchResult> => {
  const storeData: Uint8Array[] = [];
  const broadData: Uint8Array[] = [];
  const fineData: Uint8Array[] = [];

  if (cfg.customFillStoreUrl && !cachedCustomFillStore) {
    try {
      const module = await import(/* @vite-ignore */ cfg.customFillStoreUrl);
      cachedCustomFillStore = module.fillStore || module.default;
    } catch (err) {
      console.error("[fill-worker] failed to import customFillStoreUrl:", err);
    }
  }

  for (const center of req.centers) {
    const data = buildBlockData({
      center,
      terrain: cfg.terrain,
      surfaceOnly: cfg.surfaceOnly,
      customFillStore: cachedCustomFillStore,
    });
    storeData.push(data.storeData);
    broadData.push(data.broadData);
    fineData.push(data.fineData);
  }
  return { indices: req.indices, storeData, broadData, fineData };
};

/** The buffers to move along with a result: everything the result owns. */
export const fillResultTransfers = (
  result: FillBatchResult,
): Transferable[] => {
  const transfer: Transferable[] = [];
  for (let i = 0; i < result.storeData.length; i++) {
    transfer.push(
      result.storeData[i].buffer,
      result.broadData[i].buffer,
      result.fineData[i].buffer,
    );
  }
  return transfer;
};

/**
 * Pure message handler: returns a new configuration for a `config` message,
 * a result for a `fill` message, or nothing for anything else (an unknown
 * message, or a `fill` message received before a configuration).
 */
export const handleFillMessage = async (
  msg: FillWorkerMessage,
  config: FillConfig | undefined,
): Promise<{ result?: FillBatchResult; config?: FillConfig }> => {
  if (msg.type === "config") {
    cachedCustomFillStore = undefined;
    return { config: msg.config };
  }
  if (msg.type !== "fill" || config === undefined) {
    return {};
  }
  return { result: await buildFillResult(msg, config) };
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
    const out = await handleFillMessage(ev.data as FillWorkerMessage, config);
    if (out.config !== undefined) {
      config = out.config;
      return;
    }
    if (out.result !== undefined) {
      workerSelf.postMessage(out.result, fillResultTransfers(out.result));
    }
  };
}
