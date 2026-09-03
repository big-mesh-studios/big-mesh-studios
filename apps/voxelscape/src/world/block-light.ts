// Block light propagation for one block: the diamond of light an emissive
// voxel (lava, and later torches and glowstone) sheds onto its neighbours.
// Seeded at each emitter's own level and spread through the open air, so the
// light pool widens and flattens with distance from the source and stops at
// solid voxels. Runs per block against its own `VoxelStore`, border included.
import { EMISSIVE_LEVEL, type LightStore } from "./light-store";
import { propagateLight, type LightCursor } from "./sky-light";
import { VOXEL_AIR, type VoxelStore } from "./voxel-store";

/**
 * Recomputes a block's entire block-light channel from scratch: clears it,
 * seeds every emissive voxel in the store (border included) at its listed
 * level, and spreads. This is the steady-state build, run when a block's
 * voxels first land and again after an edit changes what emits.
 */
export const fillBlockLight = (
  store: VoxelStore,
  light: LightStore,
): LightStore => {
  light.blocklight.fill(0);
  const [nx, ny, nz] = store.voxels;
  const p = store.padding;
  const seeds: LightCursor[] = [];
  for (let vz = -p; vz < nz + p; vz++) {
    for (let vy = -p; vy < ny + p; vy++) {
      for (let vx = -p; vx < nx + p; vx++) {
        const id = store.atPadded(vx, vy, vz);
        if (id === VOXEL_AIR) {
          continue;
        }
        const level = EMISSIVE_LEVEL[id];
        if (level === undefined) {
          continue;
        }
        seeds.push({ x: vx, y: vy, z: vz, level, fullSky: false });
      }
    }
  }
  propagateLight(store, light, seeds, "blocklight", false);
  return light;
};
