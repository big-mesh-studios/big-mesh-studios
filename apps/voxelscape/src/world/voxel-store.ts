import type { Dim3 } from "./level-data";
import { heightAt, type TerrainConfig } from "./noise";

export const VOXEL_AIR = 0;
export const VOXEL_GRASS = 1;
export const VOXEL_DIRT = 2;
export const VOXEL_WATER = 3;

/**
 * CPU-side source of truth for one block's voxels, independent of the GPU
 * chunk textures. The renderer's `Level` is derived from this store by
 * `syncLevelFromStore`, which sweeps it for surface voxels. Mutating the
 * store is the hook that future runtime voxel add/remove editing builds on.
 */
export class VoxelStore {
  /** World-unit extents of the volume. */
  dims: Dim3;
  /** World units per voxel; matches the block's level-of-detail scale. */
  scale: number;
  /** Voxel counts per axis. */
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

export type FillStoreFn = (
  store: VoxelStore,
  center: Dim3,
  config: TerrainConfig,
) => void;

/**
 * Fills an existing `store` with solid terrain columns derived from the
 * shared noise height field sampled at the block's absolute world xz (so
 * neighbouring blocks meet seamlessly). Each column is solid from the block
 * floor up to the noise height; the top voxel is grass and everything below
 * is dirt. When `config.seaLevel` is set, the air above columns that dip
 * below it is filled with water up to sea level.
 */
export const fillStore = (
  store: VoxelStore,
  center: Dim3,
  config: TerrainConfig,
): void => {
  store.reset();
  const voxelSize = store.scale;
  const [vxN, vyN, vzN] = store.voxels;
  const seaLevelVoxel =
    config.seaLevel === undefined
      ? undefined
      : Math.round(vyN / 2 + config.seaLevel / voxelSize);
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
      if (seaLevelVoxel !== undefined) {
        const waterTop = top + 1;
        const waterBottom = Math.min(seaLevelVoxel, vyN - 1);
        for (let vy = waterTop; vy <= waterBottom; ++vy) {
          store.set(vx, vy, vz, VOXEL_WATER);
        }
      }
    }
  }
};

/**
 * Whether a neighbouring voxel exposes a solid voxel to the surface: it's
 * empty air (so the terrain side is visible) or water (so the ray reaches
 * the lakebed through the water pass and the terrain under the water must be
 * stored).
 */
const exposes = (id: number): boolean => id === VOXEL_AIR || id === VOXEL_WATER;

/**
 * Calls `cb(x, y, z, id)` once per surface voxel: a solid voxel with at
 * least one of its six neighbours empty (or water). Out-of-bounds
 * neighbours count as air, except below the block floor, which is treated
 * as solid so the world's underside never surfaces. Returns the number of
 * surface voxels found.
 */
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
        if (id === VOXEL_AIR || id === VOXEL_WATER) {
          continue;
        }
        const below = y === 0 ? 1 : data[idx - nx];
        if (exposes(below)) {
          cb(x, y, z, id);
          count++;
          continue;
        }
        const above = y === ny - 1 ? 0 : data[idx + nx];
        if (exposes(above)) {
          cb(x, y, z, id);
          count++;
          continue;
        }
        const left = x === 0 ? 0 : data[idx - 1];
        if (exposes(left)) {
          cb(x, y, z, id);
          count++;
          continue;
        }
        const right = x === nx - 1 ? 0 : data[idx + 1];
        if (exposes(right)) {
          cb(x, y, z, id);
          count++;
          continue;
        }
        const front = z === 0 ? 0 : data[idx - plane];
        if (exposes(front)) {
          cb(x, y, z, id);
          count++;
          continue;
        }
        const back = z === nz - 1 ? 0 : data[idx + plane];
        if (exposes(back)) {
          cb(x, y, z, id);
          count++;
        }
      }
    }
  }
  return count;
};

/**
 * Calls `cb(x, y, z, VOXEL_WATER)` once per water surface voxel: a water
 * voxel with at least one empty neighbour among its six neighbours. Only
 * this top layer of the water body is stored, so the water march finds the
 * surface in a single step and the GPU chunks stay thin (the lakebed behind
 * it is the terrain surface). Out-of-bounds neighbours count as air, except
 * below the floor, which is treated as solid. Returns the number of surface
 * voxels found.
 */
export const sweepWaterSurface = (
  store: VoxelStore,
  cb: (x: number, y: number, z: number, id: number) => void,
): number => {
  const [nx, ny, nz] = store.voxels;
  const data = store.data;
  const plane = nx * ny;
  let count = 0;
  const emit = (idx: number): void => {
    const z = Math.floor(idx / plane);
    const y = Math.floor((idx % plane) / nx);
    const x = idx % nx;
    cb(x, y, z, VOXEL_WATER);
    count++;
  };
  for (let z = 0; z < nz; ++z) {
    for (let y = 0; y < ny; ++y) {
      for (let x = 0; x < nx; ++x) {
        const idx = (z * ny + y) * nx + x;
        if (data[idx] !== VOXEL_WATER) {
          continue;
        }
        const above = y === ny - 1 ? 0 : data[idx + nx];
        if (above === VOXEL_AIR) {
          emit(idx);
          continue;
        }
        const below = y === 0 ? 1 : data[idx - nx];
        if (below === VOXEL_AIR) {
          emit(idx);
          continue;
        }
        const left = x === 0 ? 0 : data[idx - 1];
        if (left === VOXEL_AIR) {
          emit(idx);
          continue;
        }
        const right = x === nx - 1 ? 0 : data[idx + 1];
        if (right === VOXEL_AIR) {
          emit(idx);
          continue;
        }
        const front = z === 0 ? 0 : data[idx - plane];
        if (front === VOXEL_AIR) {
          emit(idx);
          continue;
        }
        const back = z === nz - 1 ? 0 : data[idx + plane];
        if (back === VOXEL_AIR) {
          emit(idx);
        }
      }
    }
  }
  return count;
};
