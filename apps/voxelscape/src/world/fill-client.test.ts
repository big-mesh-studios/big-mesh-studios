// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { FillClient } from "./fill-client";
import { buildBlockShell } from "./level-data";
import { DEFAULT_TERRAIN } from "./noise";
import type { FillBatchRequest, FillBatchResult } from "./fill-worker";

/**
 * A worker that records what it is sent (with the per-request generations)
 * and hands results back only when told to, so a fill can be made to finish
 * after the slot it was requested for has been moved on.
 */
class FakeFillWorker {
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  readonly sent: FillBatchRequest[] = [];
  terminated = false;

  postMessage(request: unknown): void {
    if (
      typeof request === "object" &&
      request !== null &&
      (request as { type?: string }).type === "config"
    ) {
      return;
    }
    this.sent.push(request as FillBatchRequest);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Delivers a result for the request at `sentIndex`, as the worker would. */
  deliver(sentIndex: number): void {
    const request = this.sent[sentIndex];
    const result: FillBatchResult = {
      indices: request.indices,
      gens: request.gens,
      storeData: request.indices.map(() => new Uint8Array(0)),
    };
    this.onmessage?.({ data: result } as MessageEvent);
  }
}

describe("FillClient", () => {
  it("drops a fill result for a slot requested again before the fill landed", () => {
    const blocks = [buildBlockShell({ center: [0, 0, 0] })];
    const worker = new FakeFillWorker();
    const changed = vi.fn();
    const client = new FillClient({
      terrain: DEFAULT_TERRAIN,
      blocks,
      onBlockChanged: changed,
      createWorker: () => worker as unknown as Worker | undefined,
    });

    // First a fill for the slot at cell A, then — before it returns — the
    // same slot is re-requested at cell B (the sphere moved it on).
    client.requestFill([0], [[0, 0, 0]]);
    blocks[0].center = [128, 0, 0];
    client.requestFill([0], [[128, 0, 0]]);

    expect(worker.sent).toHaveLength(2);
    expect(worker.sent[0].gens).toEqual([1]);
    expect(worker.sent[1].gens).toEqual([2]);

    // The stale fill for cell A must not be applied to the slot now at B.
    worker.deliver(0);
    expect(changed).not.toHaveBeenCalled();

    // The current fill lands and is applied.
    worker.deliver(1);
    expect(changed).toHaveBeenCalledWith(0);
  });

  it("applies a fill whose result is still current", () => {
    const blocks = [buildBlockShell({ center: [0, 0, 0] })];
    const worker = new FakeFillWorker();
    const changed = vi.fn();
    const client = new FillClient({
      terrain: DEFAULT_TERRAIN,
      blocks,
      onBlockChanged: changed,
      createWorker: () => worker as unknown as Worker | undefined,
    });

    client.requestFill([0], [[0, 0, 0]]);
    worker.deliver(0);
    expect(changed).toHaveBeenCalledWith(0);
  });

  it("drops an in-flight fill for a slot synchronously refilled before it lands", () => {
    const blocks = [buildBlockShell({ center: [0, 0, 0] })];
    const worker = new FakeFillWorker();
    const changed = vi.fn();
    const client = new FillClient({
      terrain: DEFAULT_TERRAIN,
      blocks,
      onBlockChanged: changed,
      createWorker: () => worker as unknown as Worker | undefined,
    });

    client.requestFill([0], [[0, 0, 0]]);
    // The player stepped into this cell, so it is filled on the calling
    // thread — that must invalidate the request already in flight.
    client.fillNow(0);
    expect(changed).toHaveBeenCalledTimes(1); // the synchronous fill

    worker.deliver(0);
    expect(changed).toHaveBeenCalledTimes(1); // the stale fill was dropped
  });

  it("terminates the workers when disposed", () => {
    const worker = new FakeFillWorker();
    const client = new FillClient({
      terrain: DEFAULT_TERRAIN,
      blocks: [buildBlockShell({ center: [0, 0, 0] })],
      onBlockChanged: () => {},
      createWorker: () => worker as unknown as Worker | undefined,
    });
    client.dispose();
    expect(worker.terminated).toBe(true);
  });
});
