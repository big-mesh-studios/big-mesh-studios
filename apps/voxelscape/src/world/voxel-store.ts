import type { Dim3 } from "./level-data";
import {
  CLOUD_FILL_DEFAULTS,
  cloudColumnCoverage,
  cloudFillNoise,
  cloudVoxelAt,
} from "./cloud-fill";
import { heightAt, type TerrainConfig } from "./noise";

export const VOXEL_AIR = 0;
export const VOXEL_GRASS = 1;
export const VOXEL_DIRT = 2;
export const VOXEL_WATER = 3;
export const VOXEL_CLOUD = 5;

/**
 * How many rows of extra voxels each block stores beyond its interior volume,
 * on all six faces. The border is generated from the same world-coordinate
 * terrain function as the interior, so a block's meshes can resolve its seam
 * faces against exactly the voxels its neighbouring blocks will contain —
 * chunks stack vertically, so this includes the top and bottom faces, not just
 * the horizontal ones — without reading the neighbours' (possibly stale)
 * stores. Border voxels overlap the neighbouring blocks' volumes and are
 * consumed by meshing only.
 */
export const VOXEL_PADDING = 1;

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
  /** Voxel counts per axis of the interior volume, excluding the border. */
  voxels: Dim3;
  /**
   * `VOXEL_PADDING` rows of meshing-only border voxels on each face;
   * `data` is laid out with that border included, so its length is
   * `(voxels[0] + 2*padding) * (voxels[1] + 2*padding) * (voxels[2] + 2*padding)`.
   */
  readonly padding: number = VOXEL_PADDING;
  data: Uint8Array;
  /**
   * Whether this block might hold anything but air, and so might be worth
   * meshing. Kept as a flag rather than answered by reading the voxels,
   * because a block of nothing but sky has no voxel to stop the reading early
   * and there are hundreds of thousands of them to get through.
   *
   * Wrong only ever in the safe direction: something that is really empty may
   * say it is not, which costs a mesh build that comes back with no faces in
   * it. Nothing that holds a voxel ever says it is empty, so a write of
   * anything but air raises this wherever the voxels are written.
   */
  mightHaveVoxels = false;

  constructor(params: { dims: Dim3; voxels: Dim3; scale: number }) {
    this.dims = params.dims;
    this.voxels = params.voxels;
    this.scale = params.scale;
    const p = this.padding;
    this.data = new Uint8Array(
      (params.voxels[0] + 2 * p) *
        (params.voxels[1] + 2 * p) *
        (params.voxels[2] + 2 * p),
    );
  }

  /** Index of an interior voxel (including the border offset). */
  index(x: number, y: number, z: number): number {
    const [nx, ny] = this.voxels;
    const p = this.padding;
    return ((z + p) * (ny + 2 * p) + (y + p)) * (nx + 2 * p) + (x + p);
  }

  /**
   * Index of a voxel addressed in signed coordinates: `x`/`y`/`z` may be
   * `-1`..`nx`/`ny`/`nz` to read the meshing border on any face.
   */
  paddedIndex(x: number, y: number, z: number): number {
    const [nx, ny] = this.voxels;
    const p = this.padding;
    return ((z + p) * (ny + 2 * p) + (y + p)) * (nx + 2 * p) + (x + p);
  }

  /**
   * Reads a voxel at signed coordinates, including the meshing border on any
   * of the six faces (`x`/`y`/`z` from `-1` to `nx`/`ny`/`nz`).
   */
  atPadded(x: number, y: number, z: number): number {
    return this.data[this.paddedIndex(x, y, z)];
  }

  /**
   * Whether this store holds the voxel at these coordinates at all, its
   * meshing border included. A voxel on a neighbouring block's boundary is
   * held here too, as the border this block culls its seam faces against, so
   * a change to it has to be written here as well.
   */
  inBoundsPadded(x: number, y: number, z: number): boolean {
    const p = this.padding;
    return (
      x >= -p &&
      y >= -p &&
      z >= -p &&
      x < this.voxels[0] + p &&
      y < this.voxels[1] + p &&
      z < this.voxels[2] + p
    );
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
      if (val !== VOXEL_AIR) {
        this.mightHaveVoxels = true;
      }
    }
  }

  reset(): void {
    this.data.fill(VOXEL_AIR);
    this.mightHaveVoxels = false;
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
 * neighbouring blocks meet seamlessly). Each column is solid from below up
 * to the noise height; the top voxel is grass and everything below is dirt.
 * When `config.seaLevel` is set, the air above columns that dip below it is
 * filled with water up to sea level. The open air of the cloud-field band
 * (`cloud-fill.ts`) is filled with still-cloud voxels from the same seeded
 * 3D noise the moving puffs are built from.
 *
 * The block may sit anywhere vertically: only the slice of each column that
 * falls inside the block's own rows is written, so a block far above the
 * surface is all air, one far below is all dirt, and the meshing border is
 * generated by the same per-column rule at the world positions just outside
 * the block — on all six faces, including the top/bottom rows that duplicate
 * the vertically neighbouring blocks' boundary rows. Seam faces are culled
 * without ever reading a neighbour's store.
 */
export const fillStore = (
  store: VoxelStore,
  center: Dim3,
  config: TerrainConfig,
): void => {
  store.reset();
  const voxelSize = store.scale;
  const [vxN, vyN, vzN] = store.voxels;
  const p = store.padding;
  const halfY = vyN / 2;
  const seaLevel = config.seaLevel;

  // The still-cloud band. A block whose swept rows (meshing border included)
  // miss the band skips the cloud pass entirely, so ordinary fills cost
  // nothing extra; the noise is sampled per world coordinate, which makes the
  // border rows agree with the neighbouring blocks' clouds exactly as the
  // terrain rows do.
  const cloud = CLOUD_FILL_DEFAULTS;
  const bandMin = cloud.y - cloud.halfHeight;
  const bandMax = cloud.y + cloud.halfHeight;
  const sweptMinY = center[1] + (-p + 0.5 - vyN / 2) * voxelSize;
  const sweptMaxY = center[1] + (vyN + p - 0.5 - vyN / 2) * voxelSize;
  const cloudNoise =
    sweptMaxY >= bandMin && sweptMinY <= bandMax
      ? cloudFillNoise(config.seed)
      : undefined;

  /** The local row whose world Y is `worldY`: may be outside the block. */
  const rowOfY = (worldY: number): number =>
    Math.round((worldY - center[1]) / voxelSize + halfY);

  /**
   * Writes one column (signed `vx`/`vz`, sweeping `-1..vxN`/`-1..vzN` for the
   * border) through the padded layout, including the top/bottom border rows.
   */
  const writeColumn = (vx: number, vz: number): void => {
    const worldX = center[0] + (vx + 0.5 - vxN / 2) * voxelSize;
    const worldZ = center[2] + (vz + 0.5 - vzN / 2) * voxelSize;
    const height = heightAt(worldX, worldZ, config);
    const top = rowOfY(height);
    const waterBottom = seaLevel === undefined ? -Infinity : rowOfY(seaLevel);
    // One coverage sample per column, gate: columns below the coverage floor
    // stay clear and skip the per-voxel cloud noise (mirrors the puff field).
    const coverage =
      cloudNoise === undefined
        ? -Infinity
        : cloudColumnCoverage(cloudNoise, worldX, worldZ);
    const gated = coverage >= cloud.coverageThreshold;
    for (let vy = -p; vy < vyN + p; ++vy) {
      let id: number =
        vy === top
          ? VOXEL_GRASS
          : vy < top
            ? VOXEL_DIRT
            : seaLevel !== undefined && vy >= top + 1 && vy <= waterBottom
              ? VOXEL_WATER
              : VOXEL_AIR;
      // Clouds fill the open air of the band above the terrain; never
      // overwrite a solid column or the water above it (the band sits well
      // above the highest terrain, so this is defensive).
      if (id === VOXEL_AIR && gated && cloudNoise !== undefined) {
        const worldY = center[1] + (vy + 0.5 - vyN / 2) * voxelSize;
        if (
          worldY >= bandMin &&
          worldY <= bandMax &&
          cloudVoxelAt(cloudNoise, worldX, worldY, worldZ, coverage)
        ) {
          id = VOXEL_CLOUD;
        }
      }
      store.data[store.paddedIndex(vx, vy, vz)] = id;
      if (id !== VOXEL_AIR) {
        store.mightHaveVoxels = true;
      }
    }
  };
  for (let vz = -p; vz < vzN + p; ++vz) {
    for (let vx = -p; vx < vxN + p; ++vx) {
      writeColumn(vx, vz);
    }
  }
};
