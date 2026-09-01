// @vitest-environment node
import { describe, expect, it } from "vitest";
import { blocksQuery, getWorldHeight } from "./level-data";
import { DEFAULT_TERRAIN } from "./noise";
import {
  VOXEL_AIR,
  VOXEL_CLOUD,
  VOXEL_DIRT,
  VOXEL_GRASS,
  VOXEL_STONE,
  VOXEL_WATER,
  VoxelStore,
  fillStore,
} from "./voxel-store";

/**
 * A 4x4x4-voxel store, so every interior index stays small. Voxel size 2, so
 * the volume spans 8 world units. Padding is one voxel on all six faces.
 */
const smallStore = (): VoxelStore =>
  new VoxelStore({ dims: [8, 8, 8], voxels: [4, 4, 4], scale: 2 });

describe("VoxelStore", () => {
  it("stores and reads voxel ids", () => {
    const store = smallStore();
    expect(store.get(0, 0, 0)).toBe(VOXEL_AIR);
    store.set(1, 2, 3, VOXEL_GRASS);
    expect(store.get(1, 2, 3)).toBe(VOXEL_GRASS);
    expect(store.get(2, 2, 3)).toBe(VOXEL_AIR);
  });

  it("ignores out-of-bounds writes", () => {
    const store = smallStore();
    store.set(-1, 0, 0, VOXEL_GRASS);
    store.set(4, 0, 0, VOXEL_GRASS);
    store.set(0, 0, 4, VOXEL_GRASS);
    expect(store.get(-1, 0, 0)).toBe(VOXEL_AIR);
    expect(store.get(4, 0, 0)).toBe(VOXEL_AIR);
  });

  it("reset clears every voxel", () => {
    const store = smallStore();
    store.set(1, 1, 1, VOXEL_GRASS);
    store.reset();
    for (let z = 0; z < 4; z++) {
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          expect(store.get(x, y, z)).toBe(VOXEL_AIR);
        }
      }
    }
  });

  it("reset clears the meshing border on all six faces", () => {
    const store = smallStore();
    store.set(1, 1, 1, VOXEL_GRASS);
    store.reset();
    expect(store.atPadded(-1, 1, 1)).toBe(VOXEL_AIR);
    expect(store.atPadded(4, 1, 1)).toBe(VOXEL_AIR);
    expect(store.atPadded(1, -1, 1)).toBe(VOXEL_AIR);
    expect(store.atPadded(1, 4, 1)).toBe(VOXEL_AIR);
    expect(store.atPadded(1, 1, -1)).toBe(VOXEL_AIR);
    expect(store.atPadded(1, 1, 4)).toBe(VOXEL_AIR);
  });

  it("sizes data with the meshing border included on every axis", () => {
    const store = smallStore();
    expect(store.data.length).toBe(6 * 6 * 6);
  });
});

describe("fillStore", () => {
  it("builds solid columns with grass on top and dirt below", () => {
    const store = smallStore();
    // constant height field at 0 (amplitude 0) so every column is identical;
    // the surface row is round(0/2 + 2) = 2 within this 4-row block
    const config = {
      seed: 1,
      frequency: 1,
      amplitude: 0,
      octaves: 1,
      base: 0,
    };
    fillStore(store, [0, 0, 0], config);
    for (let x = 0; x < 4; x++) {
      for (let z = 0; z < 4; z++) {
        expect(store.get(x, 2, z)).toBe(VOXEL_GRASS);
        expect(store.get(x, 1, z)).toBe(VOXEL_DIRT);
        expect(store.get(x, 0, z)).toBe(VOXEL_DIRT);
      }
    }
  });

  it("fills air below sea level with water", () => {
    const store = smallStore();
    // terrain height 0 => grass at row 2; sea level 6 world units => water
    // fills rows 3..5, so the block's top row becomes water
    const config = {
      seed: 1,
      frequency: 1,
      amplitude: 0,
      octaves: 1,
      base: 0,
      seaLevel: 6,
    };
    fillStore(store, [0, 0, 0], config);
    for (let x = 0; x < 4; x++) {
      for (let z = 0; z < 4; z++) {
        expect(store.get(x, 2, z)).toBe(VOXEL_GRASS);
        expect(store.get(x, 3, z)).toBe(VOXEL_WATER);
      }
    }
  });

  it("leaves columns above sea level dry", () => {
    const store = smallStore();
    // terrain height 8 => surface far above this 4-row block, so every row
    // is dirt; sea level 6 sits below it, so nothing floods
    const config = {
      seed: 1,
      frequency: 1,
      amplitude: 0,
      octaves: 1,
      base: 8,
      seaLevel: 6,
    };
    fillStore(store, [0, 0, 0], config);
    for (let x = 0; x < 4; x++) {
      for (let z = 0; z < 4; z++) {
        expect(store.get(x, 3, z)).toBe(VOXEL_DIRT);
        expect(store.get(x, 3, z)).not.toBe(VOXEL_WATER);
      }
    }
  });

  it("fills a slice of a column whose surface lies outside the block", () => {
    const store = smallStore();
    // surface at world height 12 => row round(6 + 2) = 8, above this block;
    // the block is entirely subterranean dirt (plus its solid border rows)
    const config = {
      seed: 1,
      frequency: 1,
      amplitude: 0,
      octaves: 1,
      base: 12,
      seaLevel: 20,
    };
    fillStore(store, [0, 0, 0], config);
    for (let x = 0; x < 4; x++) {
      for (let z = 0; z < 4; z++) {
        for (let y = 0; y < 4; y++) {
          expect(store.get(x, y, z)).toBe(VOXEL_STONE);
        }
      }
    }
    // and a wholly flooded pair of rows on a block whose surface is below it
    const submerged = smallStore();
    const low = {
      seed: 1,
      frequency: 1,
      amplitude: 0,
      octaves: 1,
      base: -10,
      seaLevel: 4,
    };
    fillStore(submerged, [0, 0, 0], low);
    // surface row round(-5 + 2) = -3, below the block: it is water to the top
    for (let x = 0; x < 4; x++) {
      for (let z = 0; z < 4; z++) {
        expect(submerged.get(x, 3, z)).toBe(VOXEL_WATER);
      }
    }
  });

  it("fills the meshing border to match a neighbouring block", () => {
    const a = smallStore();
    const b = smallStore();
    // rolling terrain so adjacent columns genuinely differ
    const rolling = {
      seed: 11,
      frequency: 0.1,
      amplitude: 40,
      octaves: 2,
      base: 20,
      seaLevel: 30,
    };
    fillStore(a, [0, 0, 0], rolling);
    fillStore(b, [8, 0, 0], rolling);
    // a's east border overlaps b's west column; b's west border overlaps a's
    for (let y = 0; y < 4; y++) {
      for (let z = 0; z < 4; z++) {
        expect(a.atPadded(4, y, z)).toBe(b.get(0, y, z));
        expect(b.atPadded(-1, y, z)).toBe(a.get(3, y, z));
      }
    }
  });

  it("fills the vertical border to match a vertically stacked neighbour", () => {
    const a = smallStore();
    const b = smallStore();
    const rolling = {
      seed: 11,
      frequency: 0.1,
      amplitude: 40,
      octaves: 2,
      base: 20,
      seaLevel: 30,
    };
    // b sits directly above a: centres differ in world Y by the block's height
    fillStore(a, [0, 0, 0], rolling);
    fillStore(b, [0, 8, 0], rolling);
    for (let x = 0; x < 4; x++) {
      for (let z = 0; z < 4; z++) {
        expect(a.atPadded(x, 4, z)).toBe(b.get(x, 0, z));
        expect(b.atPadded(x, -1, z)).toBe(a.get(x, 3, z));
      }
    }
  });
});

describe("fillStore clouds", () => {
  /** A 32³ store, wide enough that a bank of the clumpy cloud field lands in it. */
  const cloudStore = (center: [number, number, number]): VoxelStore => {
    const store = new VoxelStore({
      dims: [64, 64, 64],
      voxels: [32, 32, 32],
      scale: 2,
    });
    fillStore(store, center, DEFAULT_TERRAIN);
    return store;
  };

  const countOf = (store: VoxelStore, id: number): number => {
    let n = 0;
    for (let i = 0; i < store.data.length; i++) {
      if (store.data[i] === id) n++;
    }
    return n;
  };

  it("scatters still clouds in the band of a block at the cloud altitude", () => {
    // (128, 220) sits inside a cloud bank of the default seed's field
    const store = cloudStore([128, 220, 0]);
    expect(countOf(store, VOXEL_CLOUD)).toBeGreaterThan(0);
    expect(store.mightHaveVoxels).toBe(true);
    // the band is far above the highest terrain, so every filled voxel is cloud
    expect(countOf(store, VOXEL_GRASS)).toBe(0);
    expect(countOf(store, VOXEL_DIRT)).toBe(0);
    expect(countOf(store, VOXEL_WATER)).toBe(0);
  });

  it("keeps every cloud voxel inside the cloud band", () => {
    const store = cloudStore([128, 220, 0]);
    for (let z = 0; z < 32; z++) {
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
          if (store.get(x, y, z) !== VOXEL_CLOUD) {
            continue;
          }
          const worldY = 220 + (y + 0.5 - 16) * 2;
          expect(worldY).toBeGreaterThanOrEqual(156);
          expect(worldY).toBeLessThanOrEqual(284);
        }
      }
    }
  });

  it("fills no cloud for a block whose rows miss the band", () => {
    // well below the band (underground) and well above it (open sky)
    expect(countOf(cloudStore([0, 0, 0]), VOXEL_CLOUD)).toBe(0);
    expect(countOf(cloudStore([0, 400, 0]), VOXEL_CLOUD)).toBe(0);
  });

  it("is deterministic for a given terrain seed", () => {
    const a = cloudStore([128, 220, 0]);
    const b = cloudStore([128, 220, 0]);
    expect([...a.data]).toEqual([...b.data]);
  });

  it("writes the cloud border rows to match a neighbouring block", () => {
    const a = cloudStore([128, 220, 0]);
    const b = cloudStore([128 + 64, 220, 0]);
    for (let y = 0; y < 32; y++) {
      for (let z = 0; z < 32; z++) {
        expect(a.atPadded(32, y, z)).toBe(b.get(0, y, z));
        expect(b.atPadded(-1, y, z)).toBe(a.get(31, y, z));
      }
    }
  });
});

describe("getWorldHeight", () => {
  it("skips water and returns the lakebed", () => {
    const store = smallStore();
    for (let z = 0; z < 4; z++) {
      for (let y = 0; y <= 2; y++) {
        for (let x = 0; x < 4; x++) {
          store.set(x, y, z, VOXEL_DIRT);
        }
      }
      for (let x = 0; x < 4; x++) {
        store.set(x, 3, z, VOXEL_WATER);
      }
    }
    const blocks = [{ center: [0, 0, 0] as [number, number, number], store }];
    // voxel (1, vy, 1) has world xz = -1; the water row 3 would be world y 4,
    // the lakebed row 2 is world y 2 -> must return the lakebed
    expect(getWorldHeight(blocksQuery(blocks), -1, -1)).toBe(2);
  });
});
