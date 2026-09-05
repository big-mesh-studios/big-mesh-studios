// @vitest-environment node
import { describe, expect, it } from "vitest";
import { heightAt } from "./noise";
import { LAVA_DEPTH } from "./lava-fill";
import { fillStore, VOXEL_AIR, VOXEL_LAVA, VoxelStore } from "./voxel-store";

/**
 * A deep block buried under a real, cave-carving terrain. `center` is offset
 * along X/Z so the lava gate (`columnHasLava`) is not sampled on a noise
 * zero-plane, letting some columns pool with lava.
 */
const buriedConfig = {
  seed: 900,
  frequency: 1,
  amplitude: 40,
  octaves: 3,
  base: 60,
  seaLevel: 30,
};

const buriedBlock = (): VoxelStore => {
  const store = new VoxelStore({
    dims: [16, 128, 16],
    voxels: [8, 64, 8],
    scale: 2,
  });
  fillStore(store, [2000, 0, -400], buriedConfig);
  return store;
};

describe("deep-pool lava in fillStore", () => {
  it("pools lava at the bottoms of some deep dry caves", () => {
    const store = buriedBlock();
    let lava = 0;
    for (let x = 0; x < 8; x++) {
      for (let z = 0; z < 8; z++) {
        const worldX = 2000 + (x + 0.5 - 4) * 2;
        const worldZ = -400 + (z + 0.5 - 4) * 2;
        const height = heightAt(worldX, worldZ, buriedConfig);
        for (let y = 0; y < 64; y++) {
          if (store.get(x, y, z) !== VOXEL_LAVA) {
            continue;
          }
          lava++;
          const worldY = (y + 0.5 - 32) * 2;
          // every pool sits at least LAVA_DEPTH below its column's surface
          expect(worldY).toBeLessThanOrEqual(height - LAVA_DEPTH);
          // a pool floor keeps open air above it (the room over the pool)
          expect(store.get(x, y + 1, z)).toBe(VOXEL_AIR);
        }
      }
    }
    // the seed and offset chosen land some columns in a lava-gated region, so
    // deep pools do appear here
    expect(lava).toBeGreaterThan(0);
  });
});
