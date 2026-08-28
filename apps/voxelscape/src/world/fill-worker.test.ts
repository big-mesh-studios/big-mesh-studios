// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildFillResults,
  fillResultTransfers,
  handleFillMessage,
  type FillBatchRequest,
  type FillBatchResult,
  type FillConfig,
} from "./fill-worker";
import { buildBlockData } from "./level-data";

const collect = async (
  results: AsyncGenerator<FillBatchResult> | undefined,
): Promise<FillBatchResult[]> => {
  const collected: FillBatchResult[] = [];
  for await (const result of results ?? []) {
    collected.push(result);
  }
  return collected;
};

const config: FillConfig = {
  terrain: {
    seed: 1,
    frequency: 1,
    amplitude: 0,
    octaves: 1,
    base: 64,
  },
  surfaceOnly: true,
};

describe("fill worker protocol", () => {
  it("stores the config from a config message", () => {
    const out = handleFillMessage({ type: "config", config }, undefined);
    expect(out.config).toBe(config);
    expect(out.results).toBeUndefined();
  });

  it("ignores a fill request before a config arrives", () => {
    const out = handleFillMessage(
      { type: "fill", indices: [0], centers: [[0, 0, 0]] },
      undefined,
    );
    expect(out.results).toBeUndefined();
  });

  it("ignores a message that is neither config nor fill", () => {
    const out = handleFillMessage(
      { indices: [0], centers: [[0, 0, 0]] } as unknown as FillBatchRequest,
      config,
    );
    expect(out.results).toBeUndefined();
  });

  it("yields one result per block, in the order requested", async () => {
    const req: FillBatchRequest = {
      type: "fill",
      indices: [3, 7],
      centers: [
        [0, 0, 0],
        [192, 0, 0],
      ],
    };
    const results = await collect(handleFillMessage(req, config).results);
    // Each block on its own, so the caller can draw it without waiting for
    // the rest of the request.
    expect(results.map((result) => result.indices)).toEqual([[3], [7]]);
    // per-block data matches the synchronous path
    const sync = buildBlockData({
      center: [0, 0, 0],
      terrain: config.terrain,
      surfaceOnly: true,
    });
    expect(results[0].storeData[0].length).toBe(sync.storeData.length);
    expect(results[0].broadData[0].length).toBe(sync.broadData.length);
    expect(results[0].fineData[0].length).toBe(sync.fineData.length);
  });

  it("produces one transferable buffer per array", async () => {
    const [result] = await collect(
      buildFillResults(
        { type: "fill", indices: [0], centers: [[0, 0, 0]] },
        config,
      ),
    );
    const transfers = fillResultTransfers(result);
    expect(transfers).toHaveLength(3);
    expect(transfers[0]).toBeInstanceOf(ArrayBuffer);
    expect(transfers[1]).toBeInstanceOf(ArrayBuffer);
    expect(transfers[2]).toBeInstanceOf(ArrayBuffer);
  });
});
