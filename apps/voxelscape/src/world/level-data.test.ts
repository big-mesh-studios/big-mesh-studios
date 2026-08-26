// @vitest-environment node
import type { Vector3D } from "../utils/maths";
import { describe, expect, it } from "vitest";
import {
  applyLevelData,
  buildBlock,
  buildBlockData,
  getGroundHeightBelow,
  getWorldHeight,
  isSolidAt,
  isWaterAt,
} from "./level-data";
import { VOXEL_DIRT, VOXEL_WATER } from "./voxel-store";

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
    const center: Vector3D = { x: 0, y: 0, z: 0 };
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
    const a = buildBlockData({
      center: { x: 0, y: 0, z: 0 },
      terrain: noiseConfig,
    });
    const b = buildBlockData({
      center: { x: 1000, y: 0, z: 1000 },
      terrain: noiseConfig,
    });
    expect(a.fineData.length).toBe(b.fineData.length);
    expect(buf(a.fineData).equals(buf(b.fineData))).toBe(false);
  });
});

describe("getGroundHeightBelow", () => {
  // A hand-built column at the block's centre (world x=0, z=0): solid floor
  // (voxel y 0..40), an air tunnel above it (41..70), solid hill (71..90),
  // then open sky. World Y = center.y + (vy - vyN/2) * scale, scale = 2.
  const tunnelBlock = () =>
    buildBlock({
      center: { x: 0, y: 0, z: 0 },
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
      center: { x: 0, y: 0, z: 0 },
      customFillStore: (store) => {
        for (let vy = 71; vy <= 90; vy++) store.set(48, vy, 48, VOXEL_DIRT);
      },
    });
    const belowHillY = (50 - 64) * 2;
    expect(getGroundHeightBelow([block], 0, belowHillY, 0)).toBe(-Infinity);
  });

  it("reports the floor, not the hill above, from just under the hill", () => {
    const block = tunnelBlock();
    // inside voxel 70: the last of the air gap, directly under the hill's
    // underside. Scanning from the voxel above would find the hill instead
    // and report a surface over the sample's own head.
    const underHillY = (70 - 64) * 2 + 1;
    expect(getGroundHeightBelow([block], 0, underHillY, 0)).toBe(
      (40 + 1 - 64) * 2,
    );
  });

  it("reports the top of the voxel a buried sample sits in, one voxel up at most", () => {
    const block = tunnelBlock();
    // inside voxel 20, well down inside the solid floor
    const buriedY = (20 - 64) * 2 + 1;
    expect(getGroundHeightBelow([block], 0, buriedY, 0)).toBe((21 - 64) * 2);
  });
});

describe("isSolidAt and isWaterAt", () => {
  // Voxel (48, vy, 48) is the column at world x/z 0..2; world Y for voxel vy
  // spans (vy - 64) * 2 to (vy - 63) * 2.
  const block = () =>
    buildBlock({
      center: { x: 0, y: 0, z: 0 },
      customFillStore: (store) => {
        for (let vy = 0; vy <= 40; vy++) store.set(48, vy, 48, VOXEL_DIRT);
        store.set(48, 50, 48, VOXEL_WATER);
      },
    });

  it("reads solid inside the floor and air above it", () => {
    const b = block();
    expect(isSolidAt([b], 1, (20 - 64) * 2 + 1, 1)).toBe(true);
    expect(isSolidAt([b], 1, (45 - 64) * 2 + 1, 1)).toBe(false);
  });

  it("does not count water as solid, so the player can swim through it", () => {
    expect(isSolidAt([block()], 1, (50 - 64) * 2 + 1, 1)).toBe(false);
  });

  it("reads air outside the loaded blocks rather than walling the player in", () => {
    expect(isSolidAt([block()], 10000, 0, 10000)).toBe(false);
    expect(isSolidAt([], 0, 0, 0)).toBe(false);
  });

  it("does not call a shaft dug below sea level water", () => {
    // Real terrain with a sea level, mined straight down past it — the case
    // that made the player swim in slow motion down their own dry shaft
    // back when being in water was inferred from the column's surface
    // height rather than read off the voxel.
    const sea = flatConfig.seaLevel;
    const b = buildBlock({ center: { x: 0, y: 0, z: 0 }, terrain: flatConfig });
    const { y: vyN } = b.store.voxels;
    const column = 48;
    const surface = getWorldHeight([b], 1, 1);
    expect(surface).toBeGreaterThan(sea);
    for (let worldY = surface; worldY > sea - 6; worldY -= 2) {
      b.store.set(column, Math.floor(worldY / 2 + vyN / 2), column, 0);
    }
    expect(getWorldHeight([b], 1, 1)).toBeLessThan(sea);
    expect(isWaterAt([b], 1, sea - 2, 1)).toBe(false);
  });

  it("reads the water a lake is actually made of", () => {
    const b = block();
    expect(isWaterAt([b], 1, (50 - 64) * 2 + 1, 1)).toBe(true);
    expect(isWaterAt([b], 1, (45 - 64) * 2 + 1, 1)).toBe(false);
  });

  it("reads air past the top and bottom of a block instead of smearing its edge voxels", () => {
    const b = block();
    // the floor's own column, but far below and far above the block's extent
    expect(isSolidAt([b], 1, -1000, 1)).toBe(false);
    expect(isSolidAt([b], 1, 1000, 1)).toBe(false);
  });
});

describe("applyLevelData", () => {
  it("adopts worker arrays zero-copy into a block", () => {
    const block = buildBlock({
      center: { x: 0, y: 0, z: 0 },
      terrain: flatConfig,
    });
    const source = buildBlock({
      center: { x: 1000, y: 0, z: 1000 },
      terrain: flatConfig,
    });
    const data = buildBlockData({
      center: { x: 1000, y: 0, z: 1000 },
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
