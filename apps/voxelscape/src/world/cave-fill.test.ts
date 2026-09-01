// @vitest-environment node
import { describe, expect, it } from "vitest";
import { caveFillNoise, isCaveVoxel } from "./cave-fill";
import { fillStore, VOXEL_DIRT, VOXEL_STONE, VoxelStore } from "./voxel-store";

describe("caveFillNoise", () => {
  it("returns a deterministic PerlinNoise3D instance cached per seed", () => {
    const n1 = caveFillNoise(12345);
    const n2 = caveFillNoise(12345);
    expect(n1).toBe(n2);
  });
});

describe("isCaveVoxel", () => {
  it("does not carve caves high above the surface", () => {
    const noise = caveFillNoise(1);
    const result = isCaveVoxel(noise, 100, 500, 100, 100);
    expect(result).toBe(false);
  });
});

describe("cave generation & stone in fillStore", () => {
  it("fills top surface with grass, shallow subsurface with dirt, and deep underground with stone or cave air", () => {
    const store = new VoxelStore({
      dims: [16, 64, 16],
      voxels: [8, 32, 8],
      scale: 2,
    });
    const config = {
      seed: 100,
      frequency: 1,
      amplitude: 0,
      octaves: 1,
      base: 0,
    };
    fillStore(store, [0, 0, 0], config);

    let foundStone = false;
    let foundDirt = false;

    for (let x = 0; x < 8; x++) {
      for (let z = 0; z < 8; z++) {
        for (let y = 13; y <= 15; y++) {
          const id = store.get(x, y, z);
          if (id === VOXEL_DIRT) foundDirt = true;
        }

        for (let y = 0; y < 10; y++) {
          const id = store.get(x, y, z);
          if (id === VOXEL_STONE) foundStone = true;
        }
      }
    }

    expect(foundDirt).toBe(true);
    expect(foundStone).toBe(true);
  });
});
