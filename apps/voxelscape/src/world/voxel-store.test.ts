// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildBlock,
  Level,
  getWorldHeight,
  syncLevelFromStore,
} from "./level-data";
import {
  VOXEL_AIR,
  VOXEL_DIRT,
  VOXEL_GRASS,
  VOXEL_WATER,
  VoxelStore,
  fillStore,
  sweepSurface,
} from "./voxel-store";

const smallStore = (): VoxelStore =>
  new VoxelStore({
    dims: { x: 8, y: 8, z: 8 },
    voxels: { x: 4, y: 4, z: 4 },
    scale: 2,
  });

const surfaced = (store: VoxelStore): Map<string, number> => {
  const m = new Map<string, number>();
  sweepSurface(store, (x, y, z, id) => {
    m.set(`${x},${y},${z}`, id);
  });
  return m;
};

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

  it("reset clears the meshing border too", () => {
    const store = smallStore();
    store.set(1, 1, 1, VOXEL_GRASS);
    store.reset();
    expect(store.atPadded(-1, 1, 1)).toBe(VOXEL_AIR);
    expect(store.atPadded(4, 1, 1)).toBe(VOXEL_AIR);
    expect(store.atPadded(1, 1, -1)).toBe(VOXEL_AIR);
    expect(store.atPadded(1, 1, 4)).toBe(VOXEL_AIR);
  });

  it("sizes data with the meshing border included", () => {
    const store = smallStore();
    expect(store.data.length).toBe(6 * 4 * 6);
  });
});

describe("fillStore", () => {
  it("builds solid columns with grass on top and dirt below", () => {
    const store = smallStore();
    // constant height field (amplitude 0) so every column is identical
    const config = {
      seed: 1,
      frequency: 1,
      amplitude: 0,
      octaves: 1,
      base: 64,
    };
    fillStore(store, [0, 0, 0], config);
    // top = round(4/2 + 64/2) = 36, clamped to the block's max row (3)
    for (let x = 0; x < 4; x++) {
      for (let z = 0; z < 4; z++) {
        expect(store.get(x, 3, z)).toBe(VOXEL_GRASS);
        expect(store.get(x, 2, z)).toBe(VOXEL_DIRT);
        expect(store.get(x, 0, z)).toBe(VOXEL_DIRT);
      }
    }
  });

  it("fills air below sea level with water", () => {
    const store = smallStore();
    // constant terrain height 0 => grass at row 2; sea level 6 world units
    // => water fills from row 3 up (clamped to the block top)
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
    // terrain height 8 => top clamped to row 3, which is at/above sea level
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
        expect(store.get(x, 3, z)).toBe(VOXEL_GRASS);
        expect(store.get(x, 3, z)).not.toBe(VOXEL_WATER);
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
    // a's east border overlaps b's first column; b's west border overlaps a's last
    for (let y = 0; y < 4; y++) {
      for (let z = 0; z < 4; z++) {
        expect(a.atPadded(4, y, z)).toBe(b.get(0, y, z));
        expect(b.atPadded(-1, y, z)).toBe(a.get(3, y, z));
      }
    }
  });
});

describe("sweepSurface", () => {
  it("surfaces an isolated voxel on all six sides", () => {
    const store = smallStore();
    store.set(1, 1, 1, VOXEL_GRASS);
    const m = surfaced(store);
    expect(m.get("1,1,1")).toBe(VOXEL_GRASS);
    expect(m.size).toBe(1);
  });

  it("does not surface the interior of a solid cube", () => {
    const store = smallStore();
    for (let z = 1; z <= 3; z++) {
      for (let y = 1; y <= 3; y++) {
        for (let x = 1; x <= 3; x++) {
          store.set(x, y, z, VOXEL_DIRT);
        }
      }
    }
    const m = surfaced(store);
    expect(m.size).toBe(26); // 3x3x3 cube: only the 26 outer voxels
    expect(m.has("2,2,2")).toBe(false);
  });

  it("does not surface the block floor of a fully solid store", () => {
    const store = smallStore();
    for (let z = 0; z < 4; z++) {
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          store.set(x, y, z, VOXEL_DIRT);
        }
      }
    }
    const m = surfaced(store);
    // the floor is only reachable through the block bottom, which counts as
    // solid, so the bottom layer stays unallocated
    expect(m.has("1,0,1")).toBe(false);
    // the top layer is open air -> surfaced
    expect(m.has("1,3,1")).toBe(true);
  });

  it("surfaces terrain that touches water", () => {
    const store = smallStore();
    store.set(1, 1, 1, VOXEL_DIRT);
    store.set(1, 2, 1, VOXEL_DIRT);
    store.set(1, 3, 1, VOXEL_WATER);
    const m = surfaced(store);
    // the top terrain voxel is exposed by the water above it, so it stays
    // stored for the terrain march to hit through the water pass
    expect(m.has("1,2,1")).toBe(true);
  });
});

describe("syncLevelFromStore", () => {
  // Level sized to the 4x4x4 store (voxel size 2, world dims 8x8x8).
  const makeLevel = (): Level =>
    new Level({
      broadDim: { x: 1, y: 1, z: 1 },
      chunkDim: { x: 4, y: 4, z: 4 },
      storageDim: { x: 4, y: 4, z: 4 },
      dimensions: { x: 8, y: 8, z: 8 },
      scale: 2,
    });

  it("surfaceOnly writes only surface voxels into the GPU data", () => {
    const store = smallStore();
    // solid columns from the floor up to y=2 on every (x, z)
    for (let z = 0; z < 4; z++) {
      for (let y = 0; y <= 2; y++) {
        for (let x = 0; x < 4; x++) {
          store.set(x, y, z, VOXEL_DIRT);
        }
      }
    }
    const level = makeLevel();
    syncLevelFromStore(level, store, { surfaceOnly: true });
    // interior voxel (air around it) must not be stored
    expect(level.get(1, 1, 1)).toBe(VOXEL_AIR);
    // the top surface and the exposed outer walls must be stored
    expect(level.get(1, 2, 1)).toBe(VOXEL_DIRT);
    expect(level.get(0, 1, 1)).toBe(VOXEL_DIRT);
    // columns that had zero surface (none here) would leave their broad cell
    // unallocated; all columns have a surface, so all 4x4 are allocated
  });

  it("full-volume sync writes every solid voxel", () => {
    const store = smallStore();
    for (let z = 0; z < 4; z++) {
      for (let y = 0; y <= 2; y++) {
        for (let x = 0; x < 4; x++) {
          store.set(x, y, z, VOXEL_DIRT);
        }
      }
    }
    const level = makeLevel();
    syncLevelFromStore(level, store, { surfaceOnly: false });
    expect(level.get(1, 1, 1)).toBe(VOXEL_DIRT); // interior now stored
    expect(level.get(1, 2, 1)).toBe(VOXEL_DIRT);
  });

  it("surfaceOnly stores the water surface layer and keeps terrain under water", () => {
    const store = smallStore();
    // solid columns to row 1, water at rows 2..3
    for (let z = 0; z < 4; z++) {
      for (let y = 0; y <= 1; y++) {
        for (let x = 0; x < 4; x++) {
          store.set(x, y, z, VOXEL_DIRT);
        }
      }
      for (let y = 2; y <= 3; y++) {
        for (let x = 0; x < 4; x++) {
          store.set(x, y, z, VOXEL_WATER);
        }
      }
    }
    const level = makeLevel();
    syncLevelFromStore(level, store, { surfaceOnly: true });
    // only the top water layer is stored (the surface the water pass shades)
    expect(level.get(1, 3, 1)).toBe(VOXEL_WATER);
    expect(level.get(1, 2, 1)).toBe(VOXEL_AIR); // interior water dropped
    // terrain directly under water is stored so rays reach the lakebed
    expect(level.get(1, 1, 1)).toBe(VOXEL_DIRT);
    // pure terrain interior stays unallocated
    expect(level.get(1, 0, 1)).toBe(VOXEL_AIR);
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
    const level = new Level({
      broadDim: { x: 1, y: 1, z: 1 },
      chunkDim: { x: 4, y: 4, z: 4 },
      storageDim: { x: 4, y: 4, z: 4 },
      dimensions: { x: 8, y: 8, z: 8 },
      scale: 2,
    });
    const blocks = [
      { level, center: [0, 0, 0] as [number, number, number], store },
    ];
    // voxel (1, vy, 1) has world xz = -1; the water row 3 would be world y 4,
    // the lakebed row 2 is world y 2 -> must return the lakebed
    expect(getWorldHeight(blocks, -1, -1)).toBe(2);
  });
});

describe("customFillStore", () => {
  it("uses custom fill function to generate voxel data", () => {
    const customFill = (store: any, _center: any, _config: any) => {
      store.set(0, 0, 0, VOXEL_GRASS);
      store.set(1, 1, 1, VOXEL_DIRT);
    };
    const block = buildBlock({
      center: [0, 0, 0],
      customFillStore: customFill,
    });
    expect(block.store.get(0, 0, 0)).toBe(VOXEL_GRASS);
    expect(block.store.get(1, 1, 1)).toBe(VOXEL_DIRT);
    expect(block.store.get(2, 2, 2)).toBe(VOXEL_AIR);
  });
});
