// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  applyLevelData,
  buildBlock,
  buildBlockData,
  getWorldHeight,
  type Dim3,
} from "./level-data";

/** A fast, deterministic constant-height terrain for the byte-for-byte tests. */
const flatConfig = {
  seed: 1,
  frequency: 1,
  amplitude: 0,
  octaves: 1,
  base: 64,
  seaLevel: 6,
};

/** Real noise terrain so different centres produce different data. */
const noiseConfig = {
  seed: 54321,
  frequency: 0.008,
  amplitude: 80,
  octaves: 4,
  base: 64,
};

/**
 * A zero-copy `Buffer` view so comparisons use native memcmp instead of
 * per-byte JavaScript iteration; these arrays are about 1.2MB each.
 */
const buf = (u: Uint8Array): Buffer =>
  Buffer.from(u.buffer, u.byteOffset, u.length);

describe("buildBlockData", () => {
  it("matches the synchronous buildBlock path byte-for-byte", () => {
    const center: Dim3 = [0, 0, 0];
    const sync = buildBlock({ center, terrain: flatConfig, surfaceOnly: true });
    const data = buildBlockData({
      center,
      terrain: flatConfig,
      surfaceOnly: true,
    });
    expect(buf(data.storeData).equals(buf(sync.store.data))).toBe(true);
    expect(buf(data.broadData).equals(buf(sync.level.broadData))).toBe(true);
    expect(buf(data.fineData).equals(buf(sync.level.data))).toBe(true);
  });

  it("generates different data for a different centre", () => {
    const a = buildBlockData({ center: [0, 0, 0], terrain: noiseConfig });
    const b = buildBlockData({ center: [1000, 0, 1000], terrain: noiseConfig });
    expect(a.fineData.length).toBe(b.fineData.length);
    expect(buf(a.fineData).equals(buf(b.fineData))).toBe(false);
  });
});

describe("applyLevelData", () => {
  it("adopts worker arrays zero-copy into a block", () => {
    const block = buildBlock({ center: [0, 0, 0], terrain: flatConfig });
    const source = buildBlock({
      center: [1000, 0, 1000],
      terrain: flatConfig,
    });
    const data = buildBlockData({
      center: [1000, 0, 1000],
      terrain: flatConfig,
    });
    const originalStore = block.store.data;
    const originalBroad = block.level.broadData;

    applyLevelData(block, data);

    // Reference checks are done as booleans first: vitest's `toBe` on large
    // Uint8Arrays is pathologically slow, while booleans are instant.
    const adoptedStore = block.store.data === data.storeData;
    const adoptedBroad = block.level.broadData === data.broadData;
    const adoptedFine = block.level.data === data.fineData;
    const textureBroad = block.level.broadTexture.image === data.broadData;
    const textureFine = block.level.texture.image === data.fineData;
    const needsBroad = block.level.broadTexture.needsUpdate === true;
    const needsFine = block.level.texture.needsUpdate === true;
    const releasedStore = block.store.data !== originalStore;
    const releasedBroad = block.level.broadData !== originalBroad;
    expect(adoptedStore).toBe(true);
    expect(adoptedBroad).toBe(true);
    expect(adoptedFine).toBe(true);
    expect(textureBroad).toBe(true);
    expect(textureFine).toBe(true);
    expect(needsBroad).toBe(true);
    expect(needsFine).toBe(true);
    expect(releasedStore).toBe(true);
    expect(releasedBroad).toBe(true);

    // the level now reads like the source block's, and the height sampler too
    expect(block.level.get(1, 90, 1)).toBe(source.level.get(1, 90, 1));
    block.center = source.center;
    expect(getWorldHeight([block], 1000, 1000)).toBe(
      getWorldHeight([source], 1000, 1000),
    );
  });
});
