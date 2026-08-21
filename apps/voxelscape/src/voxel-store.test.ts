// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Level, syncLevelFromStore } from "./level";
import {
  VOXEL_AIR,
  VOXEL_DIRT,
  VOXEL_GRASS,
  VoxelStore,
  fillStore,
  sweepSurface,
} from "./voxel-store";

const smallStore = (): VoxelStore =>
  new VoxelStore({ dims: [8, 8, 8], voxels: [4, 4, 4], scale: 2 });

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
});

describe("syncLevelFromStore", () => {
  // Level sized to the 4x4x4 store (voxel size 2, world dims 8x8x8).
  const makeLevel = (): Level =>
    new Level({
      broadDim: [1, 1, 1],
      chunkDim: [4, 4, 4],
      storageDim: [4, 4, 4],
      dimensions: [8, 8, 8],
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
});
