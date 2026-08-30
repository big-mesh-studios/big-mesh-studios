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
import { VOXEL_AIR, VOXEL_CLOUD, VOXEL_DIRT, VOXEL_WATER } from "./voxel-store";

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
    const sync = buildBlock({ center, terrain: flatConfig });
    const data = buildBlockData({
      center,
      terrain: flatConfig,
    });
    expect(buf(data.storeData).equals(buf(sync.store.data))).toBe(true);
  });

  it("generates different data for a different centre", () => {
    // Centres centred on the noise surface (y = base), so each block holds a
    // different slice of the height field rather than two identical dirt boxes.
    const a = buildBlockData({ center: [0, 64, 0], terrain: noiseConfig });
    const b = buildBlockData({
      center: [1000, 64, 1000],
      terrain: noiseConfig,
    });
    expect(a.storeData.length).toBe(b.storeData.length);
    expect(buf(a.storeData).equals(buf(b.storeData))).toBe(false);
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

describe("still-cloud blocks", () => {
  // A column with terrain below (voxel y 0..20) and a cloud slab above
  // (voxel y 40..44), with open air between them, at the block's centre column
  // (world xz = 0). World Y of voxel vy spans [(vy - 32) * 2, (vy - 31) * 2).
  const cloudBlock = () =>
    buildBlock({
      center: [0, 0, 0],
      customFillStore: (store) => {
        for (let vy = 0; vy <= 20; vy++) store.set(32, vy, 32, VOXEL_DIRT);
        for (let vy = 40; vy <= 44; vy++) store.set(32, vy, 32, VOXEL_CLOUD);
      },
    });

  it("ignores the cloud when sampling the ground height, so spawn and monsters stay on terrain", () => {
    // the dirt top (voxel 20) is the ground; the cloud above it must not win
    expect(getWorldHeight(blocksQuery([cloudBlock()]), 0, 0)).toBe(
      (20 + 1 - 32) * 2,
    );
  });

  it("reports the cloud top when the player stands on it", () => {
    // query from inside the air above the cloud slab
    const aboveCloudY = (45 - 32) * 2;
    expect(
      getGroundHeightBelow(blocksQuery([cloudBlock()]), 0, aboveCloudY, 0),
    ).toBe((44 + 1 - 32) * 2);
  });

  it("treats a cloud voxel as solid, so the player stands on it", () => {
    const b = cloudBlock();
    // inside the cloud slab
    expect(isSolidAt(blocksQuery([b]), 1, (42 - 32) * 2 + 1, 1)).toBe(true);
    // the air above the slab
    expect(isSolidAt(blocksQuery([b]), 1, (47 - 32) * 2 + 1, 1)).toBe(false);
  });
});

describe("applyLevelData", () => {
  it("adopts worker arrays zero-copy into a block", () => {
    const block = buildBlock({ center: [0, 0, 0], terrain: flatConfig });
    const data = buildBlockData({
      center: [1000, 0, 1000],
      terrain: flatConfig,
    });
    const originalStore = block.store.data;

    applyLevelData(block, data);

    // Reference checks are done as booleans first: vitest's `toBe` on large
    // Uint8Arrays is pathologically slow, while booleans are instant.
    const adoptedStore = block.store.data === data.storeData;
    const releasedStore = block.store.data !== originalStore;
    expect(adoptedStore).toBe(true);
    expect(releasedStore).toBe(true);
  });
});

describe("mixed-level-of-detail seams", () => {
  /** A coarse +X neighbour of the fine block: cell (1,0,0) at LOD 1. */
  const coarseNeighbour = () =>
    buildBlock({ center: [128, 0, 0], lod: 1, terrain: noiseConfig });

  /** A fine block whose +X border culls against a coarse neighbour. */
  const fineWithCoarseNeighbour = () =>
    buildBlock({
      center: [0, 0, 0],
      lod: 0,
      terrain: noiseConfig,
      borderSizes: { px: 4 },
    });

  it("culls a fine block's +X face only against coarse voxels that are solid", () => {
    const coarse = coarseNeighbour();
    const fine = fineWithCoarseNeighbour();
    for (let vy = 0; vy < 64; vy++) {
      for (let vz = 0; vz < 64; vz++) {
        const fineBorder = fine.store.atPadded(64, vy, vz);
        // The coarse voxel (size 4) containing the fine border cell's world
        // centre, in the coarse block's own grid.
        const worldY = (vy + 0.5 - 32) * 2;
        const worldZ = (vz + 0.5 - 32) * 2;
        const ccy = Math.floor(worldY / 4) * 4 + 2;
        const ccz = Math.floor(worldZ / 4) * 4 + 2;
        const coarseVoxel = coarse.store.get(
          0,
          Math.round(ccy / 4 + 15.5),
          Math.round(ccz / 4 + 15.5),
        );
        // The fine border is solid only where the whole coarse voxel is
        // solid, so a culled face is always hidden inside the neighbour.
        if (fineBorder !== VOXEL_AIR && fineBorder !== VOXEL_WATER) {
          expect(coarseVoxel).not.toBe(VOXEL_AIR);
          expect(coarseVoxel).not.toBe(VOXEL_WATER);
        }
        // And where the neighbour is air, the fine face is always drawn.
        if (coarseVoxel === VOXEL_AIR) {
          expect(fineBorder).toBe(VOXEL_AIR);
        }
      }
    }
  });

  it("culls a coarse block's +X face only where the fine neighbour is solid", () => {
    const coarse = buildBlock({
      center: [0, 0, 0],
      lod: 1,
      terrain: noiseConfig,
      borderSizes: { px: 2 },
    });
    const fine = buildBlock({
      center: [128, 0, 0],
      lod: 0,
      terrain: noiseConfig,
    });
    for (let cy = 0; cy < 32; cy++) {
      for (let cz = 0; cz < 32; cz++) {
        const coarseBorder = coarse.store.atPadded(32, cy, cz);
        // The fine cells (size 2) inside the coarse border voxel, in the fine
        // neighbour's grid: two columns across the shared plane and two rows
        // per axis.
        const worldY = (cy + 0.5 - 16) * 4;
        const worldZ = (cz + 0.5 - 16) * 4;
        const fineY = Math.round((worldY - 1) / 2 + 31.5);
        const fineZ = Math.round((worldZ - 1) / 2 + 31.5);
        const fineCells: number[] = [];
        for (const fx of [0, 1]) {
          for (const fy of [fineY, fineY + 1]) {
            for (const fz of [fineZ, fineZ + 1]) {
              fineCells.push(fine.store.get(fx, fy, fz));
            }
          }
        }
        const solid = (id: number): boolean =>
          id !== VOXEL_AIR && id !== VOXEL_WATER;
        if (solid(coarseBorder) && !fineCells.every(solid)) {
          console.log("DBG seam", {
            cy,
            cz,
            coarseBorder,
            worldY,
            fineY,
            fineZ,
            fineCells,
          });
        }
        if (solid(coarseBorder)) {
          expect(fineCells.every(solid)).toBe(true);
        }
        if (fineCells.some((id) => id === VOXEL_AIR)) {
          expect(coarseBorder).toBe(VOXEL_AIR);
        }
      }
    }
  });
});
