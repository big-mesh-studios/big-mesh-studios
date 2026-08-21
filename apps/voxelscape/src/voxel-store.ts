// CPU-side source of truth for one block's voxels, independent of the GPU chunk
// textures. The renderer's `Level` is derived from this store by `syncLevel`,
// which sweeps it for surface voxels. Mutating the store is the hook future
// runtime add/remove-voxel editing will build on.
import type { Dim3 } from "./level";
import { heightAt, type TerrainConfig } from "./noise";

export const VOXEL_AIR = 0;
export const VOXEL_GRASS = 1;
export const VOXEL_DIRT = 2;

export class VoxelStore {
  // world-unit extents of the volume
  dims: Dim3;
  // world units per voxel (matches the block's LOD scale)
  scale: number;
  // voxel counts per axis
  voxels: Dim3;
  data: Uint8Array;

  constructor(params: { dims: Dim3; voxels: Dim3; scale: number }) {
    this.dims = params.dims;
    this.voxels = params.voxels;
    this.scale = params.scale;
    this.data = new Uint8Array(
      params.voxels[0] * params.voxels[1] * params.voxels[2],
    );
  }

  index(x: number, y: number, z: number): number {
    return (z * this.voxels[1] + y) * this.voxels[0] + x;
  }

  inBounds(x: number, y: number, z: number): boolean {
    return (
      x >= 0 &&
      y >= 0 &&
      z >= 0 &&
      x < this.voxels[0] &&
      y < this.voxels[1] &&
      z < this.voxels[2]
    );
  }

  get(x: number, y: number, z: number): number {
    return this.inBounds(x, y, z) ? this.data[this.index(x, y, z)] : VOXEL_AIR;
  }

  set(x: number, y: number, z: number, val: number): void {
    if (this.inBounds(x, y, z)) {
      this.data[this.index(x, y, z)] = val;
    }
  }

  reset(): void {
    this.data.fill(VOXEL_AIR);
  }
}

// Fills an existing `store` with solid terrain columns derived from the shared
// noise height field sampled at the block's absolute world xz (so neighbouring
// blocks meet seamlessly). Each column is solid from the block floor up to the
// noise height; the top voxel is grass and everything below is dirt.
export const fillStore = (
  store: VoxelStore,
  center: Dim3,
  config: TerrainConfig,
): void => {
  store.reset();
  const voxelSize = store.scale;
  const [vxN, vyN, vzN] = store.voxels;
  for (let vz = 0; vz < vzN; ++vz) {
    for (let vx = 0; vx < vxN; ++vx) {
      const worldX = center[0] + (vx + 0.5 - vxN / 2) * voxelSize;
      const worldZ = center[2] + (vz + 0.5 - vzN / 2) * voxelSize;
      const height = heightAt(worldX, worldZ, config);
      const top = Math.max(
        0,
        Math.min(vyN - 1, Math.round(vyN / 2 + height / voxelSize)),
      );
      for (let vy = 0; vy <= top; ++vy) {
        store.set(vx, vy, vz, vy === top ? VOXEL_GRASS : VOXEL_DIRT);
      }
    }
  }
};

// Calls `cb(x, y, z, id)` once per surface voxel: a solid voxel with at least
// one of its 6 neighbours empty. Out-of-bounds neighbours count as air, except
// below the block floor (treated as solid) so the world's underside never
// surfaces. Returns the number of surface voxels found.
export const sweepSurface = (
  store: VoxelStore,
  cb: (x: number, y: number, z: number, id: number) => void,
): number => {
  const [nx, ny, nz] = store.voxels;
  const data = store.data;
  const plane = nx * ny;
  let count = 0;
  let idx = 0;
  for (let z = 0; z < nz; ++z) {
    for (let y = 0; y < ny; ++y) {
      for (let x = 0; x < nx; ++x, ++idx) {
        const id = data[idx];
        if (id === VOXEL_AIR) {
          continue;
        }
        const below = y === 0 ? 1 : data[idx - nx];
        if (below === VOXEL_AIR) {
          cb(x, y, z, id);
          count++;
          continue;
        }
        const above = y === ny - 1 ? 0 : data[idx + nx];
        if (above === VOXEL_AIR) {
          cb(x, y, z, id);
          count++;
          continue;
        }
        const left = x === 0 ? 0 : data[idx - 1];
        if (left === VOXEL_AIR) {
          cb(x, y, z, id);
          count++;
          continue;
        }
        const right = x === nx - 1 ? 0 : data[idx + 1];
        if (right === VOXEL_AIR) {
          cb(x, y, z, id);
          count++;
          continue;
        }
        const front = z === 0 ? 0 : data[idx - plane];
        if (front === VOXEL_AIR) {
          cb(x, y, z, id);
          count++;
          continue;
        }
        const back = z === nz - 1 ? 0 : data[idx + plane];
        if (back === VOXEL_AIR) {
          cb(x, y, z, id);
          count++;
        }
      }
    }
  }
  return count;
};
