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
};

describe("fill worker protocol", () => {
  it("stores the config from a config message", () => {
    const out = handleFillMessage({ type: "config", config }, undefined);
    expect(out.config).toBe(config);
    expect(out.results).toBeUndefined();
  });

  it("ignores a fill request before a config arrives", () => {
    const out = handleFillMessage(
      {
        type: "fill",
        indices: [0],
        centers: [[0, 0, 0]],
        lods: [0],
        gens: [1],
      },
      undefined,
    );
    expect(out.results).toBeUndefined();
  });

  it("ignores a message that is neither config nor fill", () => {
    const out = handleFillMessage(
      {
        indices: [0],
        centers: [[0, 0, 0]],
        lods: [0],
      } as unknown as FillBatchRequest,
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
      lods: [0, 0],
      gens: [11, 22],
    };
    const results = await collect(handleFillMessage(req, config).results);
    // Each block on its own, so the caller can draw it without waiting for
    // the rest of the request.
    expect(results.map((result) => result.indices)).toEqual([[3], [7]]);
    // the request's generations come back on the matching results
    expect(results.map((result) => result.gens)).toEqual([[11], [22]]);
    // per-block data matches the synchronous path
    const sync = buildBlockData({
      center: [0, 0, 0],
      terrain: config.terrain,
    });
    expect(results[0].storeData[0].length).toBe(sync.storeData.length);
  });

  it("generates each block at its requested level of detail", async () => {
    const results = await collect(
      buildFillResults(
        {
          type: "fill",
          indices: [0],
          centers: [[0, 0, 0]],
          lods: [2],
          gens: [1],
        },
        config,
      ),
    );
    expect(results[0].lods).toEqual([2]);
    // A LOD-2 block is a 16³ volume instead of the full 64³, so the store
    // matches the synchronous LOD-2 build rather than the LOD-0 one.
    const lod2 = buildBlockData({
      center: [0, 0, 0],
      lod: 2,
      terrain: config.terrain,
    });
    expect(results[0].storeData[0].length).toBe(lod2.storeData.length);
    const lod0 = buildBlockData({
      center: [0, 0, 0],
      terrain: config.terrain,
    });
    expect(lod2.storeData.length).toBeLessThan(lod0.storeData.length);
  });

  it("generates a block's border against the neighbours' voxel sizes it is sent", async () => {
    const borderSizes = { px: 4, nx: 4 };
    const results = await collect(
      buildFillResults(
        {
          type: "fill",
          indices: [0],
          centers: [[0, 0, 0]],
          lods: [0],
          borderSizes: [borderSizes],
          gens: [1],
        },
        config,
      ),
    );
    const sync = buildBlockData({
      center: [0, 0, 0],
      lod: 0,
      terrain: config.terrain,
      borderSizes,
    });
    expect(results[0].storeData[0].length).toBe(sync.storeData.length);
    expect(results[0].storeData[0]).toEqual(sync.storeData);
  });

  it("produces one transferable buffer per array", async () => {
    const [result] = await collect(
      buildFillResults(
        {
          type: "fill",
          indices: [0],
          centers: [[0, 0, 0]],
          lods: [0],
          gens: [1],
        },
        config,
      ),
    );
    const transfers = fillResultTransfers(result);
    // a store buffer, a sky-light buffer, and a block-light buffer
    expect(transfers).toHaveLength(3);
    for (const t of transfers) {
      expect(t).toBeInstanceOf(ArrayBuffer);
    }
  });
});
