import { heightAt, PerlinNoise2D, type TerrainConfig } from "./noise";
import type { VoxelStore } from "./voxel-store";
import type { Dim3 } from "./level-data";

const TREE_SEED_MIX = 0x7bee7;

const CELL_SIZE = 24;

const DENSITY_THRESHOLD = 0.1;

const LEAF_RADIUS = 2;

const SEA_LEVEL_MARGIN = 4;

const treeNoiseCache = new Map<number, PerlinNoise2D>();

const treeFillNoise = (seed: number): PerlinNoise2D => {
  let noise = treeNoiseCache.get(seed);
  if (noise === undefined) {
    noise = new PerlinNoise2D(seed ^ TREE_SEED_MIX);
    treeNoiseCache.set(seed, noise);
  }
  return noise;
};

const hashCell = (cx: number, cz: number): number => {
  let h = cx * 374761393 + cz * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h & 0x7fffffff) / 0x7fffffff;
};

const cellTrunkOffset = (
  cx: number,
  cz: number,
): { dx: number; dz: number } => ({
  dx: (hashCell(cx, cz) - 0.5) * CELL_SIZE * 0.6,
  dz: (hashCell(cz, cx) - 0.5) * CELL_SIZE * 0.6,
});

export const placeTrees = (
  store: VoxelStore,
  center: Dim3,
  config: TerrainConfig,
  voxelLog: number,
  voxelLeaves: number,
): void => {
  const noise = treeFillNoise(config.seed);
  const scale = store.scale;
  const [vxN, vyN, vzN] = store.voxels;
  const p = store.padding;
  const halfY = vyN / 2;
  const halfX = vxN / 2;
  const halfZ = vzN / 2;
  const seaLevel = config.seaLevel;

  const minWorldX = center[0] + (-p - vxN / 2) * scale;
  const maxWorldX = center[0] + (vxN + p - vxN / 2) * scale;
  const minWorldZ = center[2] + (-p - vzN / 2) * scale;
  const maxWorldZ = center[2] + (vzN + p - vzN / 2) * scale;

  const maxExtent = CELL_SIZE / 2 + LEAF_RADIUS * scale + CELL_SIZE * 0.3;
  const cellMinX = Math.floor((minWorldX - maxExtent) / CELL_SIZE);
  const cellMaxX = Math.floor((maxWorldX + maxExtent) / CELL_SIZE);
  const cellMinZ = Math.floor((minWorldZ - maxExtent) / CELL_SIZE);
  const cellMaxZ = Math.floor((maxWorldZ + maxExtent) / CELL_SIZE);

  for (let cz = cellMinZ; cz <= cellMaxZ; cz++) {
    for (let cx = cellMinX; cx <= cellMaxX; cx++) {
      const density = noise.noise(cx + 0.5, cz + 0.5);
      if (density < DENSITY_THRESHOLD) continue;

      const cellCenterX = (cx + 0.5) * CELL_SIZE;
      const cellCenterZ = (cz + 0.5) * CELL_SIZE;
      const { dx, dz } = cellTrunkOffset(cx, cz);
      const trunkWorldX = cellCenterX + dx;
      const trunkWorldZ = cellCenterZ + dz;

      const surfaceY = heightAt(trunkWorldX, trunkWorldZ, config);

      if (seaLevel !== undefined && surfaceY < seaLevel + SEA_LEVEL_MARGIN) {
        continue;
      }

      // The grass surface row, resolved exactly as `fillStore.rowOfY` does, so
      // the trunk base sits flush on the ground instead of a voxel up or down
      // from the (rounded) surface. X/Z use the same half-voxel centre mapping.
      const baseVy = Math.round((surfaceY - center[1]) / scale + halfY);
      const trunkVx = Math.round((trunkWorldX - center[0]) / scale + halfX);
      const trunkVz = Math.round((trunkWorldZ - center[2]) / scale + halfZ);

      // Trunk length varies 2..3 voxels. The base is the grass row itself, so
      // the trunk stands flush on the ground with the crown above it.
      const trunkHeight = 2 + (hashCell(cx + 3, cz - 2) >= 0.5 ? 1 : 0);
      const trunkBaseVy = baseVy;
      const trunkTopVy = trunkBaseVy + trunkHeight - 1;

      const inBlock = (vx: number, vy: number, vz: number): boolean =>
        vx >= -p &&
        vx < vxN + p &&
        vy >= -p &&
        vy < vyN + p &&
        vz >= -p &&
        vz < vzN + p;

      // A half-sphere crown sits flat on the trunk's top layer: `ly` only goes
      // up from the canopy base, so the trunk below stays exposed. The bottom
      // layer is a 3x3 pad (no corners), progressively rounding as it rises.
      for (let ly = 0; ly <= LEAF_RADIUS; ly++) {
        for (let lz = -LEAF_RADIUS; lz <= LEAF_RADIUS; lz++) {
          for (let lx = -LEAF_RADIUS; lx <= LEAF_RADIUS; lx++) {
            if (lx * lx + ly * ly + lz * lz > LEAF_RADIUS * LEAF_RADIUS) {
              continue;
            }
            const vy = trunkTopVy + ly;
            const vx = trunkVx + lx;
            const vz = trunkVz + lz;
            if (inBlock(vx, vy, vz)) {
              store.set(vx, vy, vz, voxelLeaves);
            }
          }
        }
      }

      for (let i = 0; i < trunkHeight; i++) {
        const vy = trunkBaseVy + i;
        if (inBlock(trunkVx, vy, trunkVz)) {
          store.set(trunkVx, vy, trunkVz, voxelLog);
        }
      }
      // Cap the trunk with a log so the crown doesn't swallow the top of the
      // trunk's column entirely.
      if (inBlock(trunkVx, trunkTopVy, trunkVz)) {
        store.set(trunkVx, trunkTopVy, trunkVz, voxelLog);
      }
    }
  }
};
