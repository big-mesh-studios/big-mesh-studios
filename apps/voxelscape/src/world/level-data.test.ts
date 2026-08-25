// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  applyLevelData,
  buildBlock,
  buildBlockData,
  getGroundHeightBelow,
  getWorldHeight,
  type Dim3,
} from "./level-data";
import { VOXEL_DIRT } from "./voxel-store";

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

describe("getGroundHeightBelow", () => {
  // A hand-built column at the block's centre (world x=0, z=0): solid floor
  // (voxel y 0..40), an air tunnel above it (41..70), solid hill (71..90),
  // then open sky. World Y = center[1] + (vy - vyN/2) * scale, scale = 2.
  const tunnelBlock = () =>
    buildBlock({
      center: [0, 0, 0],
      customFillStore: (store) => {
        for (let vy = 0; vy <= 40; vy++) store.set(48, vy, 48, VOXEL_DIRT);
        for (let vy = 71; vy <= 90; vy++) store.set(48, vy, 48, VOXEL_DIRT);
      },
    });

  it("finds the tunnel's own floor when queried from inside the tunnel", () => {
    const block = tunnelBlock();
    // world Y for vy=55, squarely inside the air gap between floor and hill
    const insideTunnelY = (55 - 64) * 2;
    expect(getGroundHeightBelow([block], 0, insideTunnelY, 0)).toBe(
      (40 + 1 - 64) * 2,
    );
  });

  it("differs from getWorldHeight, which reports the hill's roof instead", () => {
    const block = tunnelBlock();
    const insideTunnelY = (55 - 64) * 2;
    const topSurface = getWorldHeight([block], 0, 0);
    const belowPlayer = getGroundHeightBelow([block], 0, insideTunnelY, 0);
    expect(topSurface).toBe((90 + 1 - 64) * 2);
    expect(belowPlayer).toBeLessThan(topSurface);
  });

  it("still finds the hilltop when queried from above it, same as getWorldHeight", () => {
    const block = tunnelBlock();
    const aboveHillY = (95 - 64) * 2;
    expect(getGroundHeightBelow([block], 0, aboveHillY, 0)).toBe(
      getWorldHeight([block], 0, 0),
    );
  });

  it("returns -Infinity when there's nothing solid below the query point", () => {
    // a floating hill with open air (and empty void) beneath it all the way down
    const block = buildBlock({
      center: [0, 0, 0],
      customFillStore: (store) => {
        for (let vy = 71; vy <= 90; vy++) store.set(48, vy, 48, VOXEL_DIRT);
      },
    });
    const belowHillY = (50 - 64) * 2;
    expect(getGroundHeightBelow([block], 0, belowHillY, 0)).toBe(-Infinity);
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
