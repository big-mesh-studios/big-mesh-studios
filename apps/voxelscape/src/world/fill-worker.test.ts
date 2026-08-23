// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildFillResult,
  fillResultTransfers,
  handleFillMessage,
  type FillBatchRequest,
  type FillConfig,
} from "./fill-worker";
import { buildBlockData } from "./level-data";

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
  it("stores the config from a config message", async () => {
    const out = await handleFillMessage({ type: "config", config }, undefined);
    expect(out.config).toBe(config);
    expect(out.result).toBeUndefined();
  });

  it("ignores a fill request before a config arrives", async () => {
    const out = await handleFillMessage(
      { type: "fill", indices: [0], centers: [[0, 0, 0]] },
      undefined,
    );
    expect(out.result).toBeUndefined();
  });

  it("ignores a message that is neither config nor fill", async () => {
    const out = await handleFillMessage(
      { indices: [0], centers: [[0, 0, 0]] } as unknown as FillBatchRequest,
      config,
    );
    expect(out.result).toBeUndefined();
  });

  it("builds a batch result after config, matching the sync build", async () => {
    const req: FillBatchRequest = {
      type: "fill",
      indices: [3, 7],
      centers: [
        [0, 0, 0],
        [192, 0, 0],
      ],
    };
    const out = await handleFillMessage(req, config);
    expect(out.result).toBeDefined();
    const result = out.result!;
    expect(result.indices).toEqual([3, 7]);
    expect(result.storeData.length).toBe(2);
    expect(result.broadData.length).toBe(2);
    expect(result.fineData.length).toBe(2);
    // per-block data matches the synchronous path
    const sync = buildBlockData({
      center: [0, 0, 0],
      terrain: config.terrain,
      surfaceOnly: true,
    });
    expect(result.storeData[0].length).toBe(sync.storeData.length);
    expect(result.broadData[0].length).toBe(sync.broadData.length);
    expect(result.fineData[0].length).toBe(sync.fineData.length);
  });

  it("produces one transferable buffer per array", async () => {
    const result = await buildFillResult(
      { type: "fill", indices: [0], centers: [[0, 0, 0]] },
      config,
    );
    const transfers = fillResultTransfers(result);
    expect(transfers).toHaveLength(3);
    expect(transfers[0]).toBeInstanceOf(ArrayBuffer);
    expect(transfers[1]).toBeInstanceOf(ArrayBuffer);
    expect(transfers[2]).toBeInstanceOf(ArrayBuffer);
  });
});
