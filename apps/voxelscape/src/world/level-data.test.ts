// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  applyLevelData,
  blocksQuery,
  buildBlock,
  buildBlockData,
  getGroundHeightBelow,
  getWorldHeight,
  isSolidAt,
  isWaterAt,
  type Dim3,
} from "./level-data";
import { VOXEL_DIRT, VOXEL_WATER } from "./voxel-store";

/** A fast, deterministic constant-height terrain for the byte-for-byte tests. */
const flatConfig = {
  seed: 1,
  frequency: 1,
  amplitude: 0,
  octaves: 1,
  base: 20,
  seaLevel: 10,
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
 * per-byte JavaScript iteration; these arrays are about 39KB each.
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
    // Centres centred on the noise surface (y = base), so each block holds a
    // different slice of the height field rather than two identical dirt boxes.
    const a = buildBlockData({ center: [0, 64, 0], terrain: noiseConfig });
    const b = buildBlockData({
      center: [1000, 64, 1000],
      terrain: noiseConfig,
    });
    expect(a.fineData.length).toBe(b.fineData.length);
    expect(buf(a.fineData).equals(buf(b.fineData))).toBe(false);
  });
});

describe("getGroundHeightBelow", () => {
  // A hand-built column at the block's centre column (world xz = 0): solid
  // floor (voxel y 0..28), an air tunnel above it (29..43), solid hill
  // (44..51), then open sky. World Y = center[1] + (vy - vyN/2) * scale for
  // scale = 2 and vyN = 64.
  const tunnelBlock = () =>
    buildBlock({
      center: [0, 0, 0],
      customFillStore: (store) => {
        for (let vy = 0; vy <= 28; vy++) store.set(32, vy, 32, VOXEL_DIRT);
        for (let vy = 44; vy <= 51; vy++) store.set(32, vy, 32, VOXEL_DIRT);
      },
    });

  it("finds the tunnel's own floor when queried from inside the tunnel", () => {
    const block = tunnelBlock();
    // world Y for vy=36, squarely inside the air gap between floor and hill
    const insideTunnelY = (36 - 32) * 2;
    expect(
      getGroundHeightBelow(blocksQuery([block]), 0, insideTunnelY, 0),
    ).toBe((28 + 1 - 32) * 2);
  });

  it("differs from getWorldHeight, which reports the hill's roof instead", () => {
    const block = tunnelBlock();
    const insideTunnelY = (36 - 32) * 2;
    const topSurface = getWorldHeight(blocksQuery([block]), 0, 0);
    const belowPlayer = getGroundHeightBelow(
      blocksQuery([block]),
      0,
      insideTunnelY,
      0,
    );
    expect(topSurface).toBe((51 + 1 - 32) * 2);
    expect(belowPlayer).toBeLessThan(topSurface);
  });

  it("still finds the hilltop when queried from above it, same as getWorldHeight", () => {
    const block = tunnelBlock();
    const aboveHillY = (54 - 32) * 2;
    expect(getGroundHeightBelow(blocksQuery([block]), 0, aboveHillY, 0)).toBe(
      getWorldHeight(blocksQuery([block]), 0, 0),
    );
  });

  it("returns -Infinity when there's nothing solid below the query point", () => {
    // a floating hill with open air (and empty void) beneath it all the way down
    const block = buildBlock({
      center: [0, 0, 0],
      customFillStore: (store) => {
        for (let vy = 44; vy <= 51; vy++) store.set(32, vy, 32, VOXEL_DIRT);
      },
    });
    const belowHillY = (36 - 32) * 2;
    expect(getGroundHeightBelow(blocksQuery([block]), 0, belowHillY, 0)).toBe(
      -Infinity,
    );
  });

  it("reports the floor, not the hill above, from just under the hill", () => {
    const block = tunnelBlock();
    // inside voxel 43: the last of the air gap, directly under the hill's
    // underside. Scanning from the voxel above would find the hill instead
    // and report a surface over the sample's own head.
    const underHillY = (43 - 32) * 2 + 1;
    expect(getGroundHeightBelow(blocksQuery([block]), 0, underHillY, 0)).toBe(
      (28 + 1 - 32) * 2,
    );
  });

  it("reports the top of the voxel a buried sample sits in, one voxel up at most", () => {
    const block = tunnelBlock();
    // inside voxel 10, well down inside the solid floor
    const buriedY = (10 - 32) * 2 + 1;
    expect(getGroundHeightBelow(blocksQuery([block]), 0, buriedY, 0)).toBe(
      (11 - 32) * 2,
    );
  });
});

describe("isSolidAt and isWaterAt", () => {
  // Voxel (32, vy, 32) is the column at world x/z 0..2; world Y for voxel vy
  // spans (vy - 32) * 2 to (vy - 31) * 2.
  const block = () =>
    buildBlock({
      center: [0, 0, 0],
      customFillStore: (store) => {
        for (let vy = 0; vy <= 44; vy++) store.set(32, vy, 32, VOXEL_DIRT);
        store.set(32, 48, 32, VOXEL_WATER);
      },
    });

  it("reads solid inside the floor and air above it", () => {
    const b = block();
    expect(isSolidAt(blocksQuery([b]), 1, (15 - 32) * 2 + 1, 1)).toBe(true);
    expect(isSolidAt(blocksQuery([b]), 1, (46 - 32) * 2 + 1, 1)).toBe(false);
  });

  it("does not count water as solid, so the player can swim through it", () => {
    expect(isSolidAt(blocksQuery([block()]), 1, (48 - 32) * 2 + 1, 1)).toBe(
      false,
    );
  });

  it("reads air outside the loaded blocks rather than walling the player in", () => {
    expect(isSolidAt(blocksQuery([block()]), 10000, 0, 10000)).toBe(false);
    expect(isSolidAt(blocksQuery([]), 0, 0, 0)).toBe(false);
  });

  it("does not call a shaft dug below sea level water", () => {
    // Real terrain with a sea level, mined straight down past it — the case
    // that made the player swim in slow motion down their own dry shaft
    // back when being in water was inferred from the column's surface
    // height rather than read off the voxel. The surface sits above sea at
    // world y 22; digging the column down through sea level leaves the
    // shaft dry and the reported height below the sea.
    const sea = flatConfig.seaLevel;
    const b = buildBlock({ center: [0, 0, 0], terrain: flatConfig });
    const column = 32;
    const query = blocksQuery([b]);
    const surface = getWorldHeight(query, 1, 1);
    expect(surface).toBeGreaterThan(sea);
    for (let vy = 33; vy <= 42; vy++) {
      b.store.set(column, vy, column, 0);
    }
    expect(getWorldHeight(query, 1, 1)).toBeLessThan(sea);
    expect(isWaterAt(query, 1, sea - 2, 1)).toBe(false);
  });

  it("reads the water a lake is actually made of", () => {
    const b = block();
    expect(isWaterAt(blocksQuery([b]), 1, (48 - 32) * 2 + 1, 1)).toBe(true);
    expect(isWaterAt(blocksQuery([b]), 1, (46 - 32) * 2 + 1, 1)).toBe(false);
  });

  it("reads air past the top and bottom of a block instead of smearing its edge voxels", () => {
    const b = block();
    // the floor's own column, but far below and far above the block's extent
    expect(isSolidAt(blocksQuery([b]), 1, -1000, 1)).toBe(false);
    expect(isSolidAt(blocksQuery([b]), 1, 1000, 1)).toBe(false);
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
    expect(block.level.get(1, 31, 1)).toBe(source.level.get(1, 31, 1));
    block.center = source.center;
    expect(getWorldHeight(blocksQuery([block]), 1000, 1000)).toBe(
      getWorldHeight(blocksQuery([source]), 1000, 1000),
    );
  });
});
