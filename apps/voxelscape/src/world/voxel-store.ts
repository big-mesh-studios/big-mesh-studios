import type { Dim3 } from "./level-data";
import {
  CLOUD_FILL_DEFAULTS,
  cloudColumnCoverage,
  cloudFillNoise,
  cloudVoxelAt,
} from "./cloud-fill";
import { caveFillNoise, DIRT_LAYER_DEPTH, isCaveVoxel } from "./cave-fill";
import { heightAt, type TerrainConfig } from "./noise";

export const VOXEL_AIR = 0;
export const VOXEL_GRASS = 1;
export const VOXEL_DIRT = 2;
export const VOXEL_WATER = 3;
export const VOXEL_STONE = 4;
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

/**
 * The voxel size (world units per voxel) of each neighbouring block, keyed by
 * face. A block's meshing border on a face whose neighbour is built at a
 * different level of detail is derived from every finest-resolution cell
 * inside the coarser voxel, so a face is culled only against a neighbour that
 * is solid (or water) across the whole voxel — never against one the fine
 * detail leaves air in. A face whose neighbour matches the block's own size
 * keeps the single-cell rule. Missing faces fall back to the block's own
 * resolution.
 */
export interface BorderSizes {
  /** The +X neighbour's voxel size in world units. */
  px?: number;
  /** The -X neighbour's voxel size in world units. */
  nx?: number;
  /** The +Y neighbour's voxel size in world units. */
  py?: number;
  /** The -Y neighbour's voxel size in world units. */
  ny?: number;
  /** The +Z neighbour's voxel size in world units. */
  pz?: number;
  /** The -Z neighbour's voxel size in world units. */
  nz?: number;
}

export type FillStoreFn = (
  store: VoxelStore,
  center: Dim3,
  config: TerrainConfig,
  borderSizes?: BorderSizes,
) => void;

/**
 * Fills an existing `store` with solid terrain columns derived from the
 * shared noise height field sampled at the block's absolute world xz (so
 * neighbouring blocks meet seamlessly). Each column is solid from below up
 * to the noise height; the top voxel is grass and everything below is dirt.
 * When `config.seaLevel` is set, the air above columns that dip below it is
 * filled with water up to sea level. The open air of the cloud band
 * (`cloud-fill.ts`) is filled with still-cloud voxels from a seeded 3D noise.
 *
 * The block may sit anywhere vertically: only the slice of each column that
 * falls inside the block's own rows is written, so a block far above the
 * surface is all air, one far below is all dirt, and the meshing border is
 * generated by the same per-column rule at the world positions just outside
 * the block — on all six faces, including the top/bottom rows that duplicate
 * the vertically neighbouring blocks' boundary rows. Seam faces are culled
 * without ever reading a neighbour's store. A border face whose neighbour is
 * built at a coarser (or finer) resolution is sampled from every cell of the
 * finer grid inside the coarser voxel instead, so the two blocks agree about
 * where their shared boundary is solid (`borderSizes`).
 */
export const fillStore = (
  store: VoxelStore,
  center: Dim3,
  config: TerrainConfig,
  borderSizes?: BorderSizes,
): void => {
  store.reset();
  const voxelSize = store.scale;
  const [vxN, vyN, vzN] = store.voxels;
  const p = store.padding;
  const halfY = vyN / 2;
  const spanY = store.dims[1];
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

  const caveNoise = caveFillNoise(config.seed);

  /** The local row whose world Y is `worldY`: may be outside the block. */
  const rowOfY = (worldY: number): number =>
    Math.round((worldY - center[1]) / voxelSize + halfY);

  /**
   * A border cell on a face whose neighbour is built at a different size: the
   * coarser of the two voxels spanning the cell has every finest-resolution
   * cell inside it sampled. When they all agree on solid or water the border
   * takes that, so the block culls its face only against a neighbour that is
   * solid (or water) across the whole voxel; anything else — air, or a mix of
   * solid and water — stays air, and the face stays drawn. A same-sized
   * neighbour (the footprint is this one cell) yields the single-cell rule,
   * which callers skip by checking the sizes first.
   */
  const coarseBorderId = (
    wx: number,
    wy: number,
    wz: number,
    neighbourSize: number,
  ): number => {
    const coarse = Math.max(voxelSize, neighbourSize);
    const fine = Math.min(voxelSize, neighbourSize);
    const k = Math.round(coarse / fine);
    const ccx = Math.floor(wx / coarse) * coarse + coarse / 2;
    const ccy = Math.floor(wy / coarse) * coarse + coarse / 2;
    const ccz = Math.floor(wz / coarse) * coarse + coarse / 2;
    const originX = ccx + (0.5 - k / 2) * fine;
    const originY = ccy + (0.5 - k / 2) * fine;
    const originZ = ccz + (0.5 - k / 2) * fine;
    const halfYAt = spanY / 2 / fine;
    let category: "solid" | "water" | undefined;
    for (let i = 0; i < k; i++) {
      const subWx = originX + i * fine;
      for (let l = 0; l < k; l++) {
        const subWz = originZ + l * fine;
        const subHeight = heightAt(subWx, subWz, config);
        const subTop = Math.round((subHeight - center[1]) / fine + halfYAt);
        const subCoverage =
          cloudNoise === undefined
            ? -Infinity
            : cloudColumnCoverage(cloudNoise, subWx, subWz);
        const subGated = subCoverage >= cloud.coverageThreshold;

        for (let j = 0; j < k; j++) {
          const subWy = originY + j * fine;
          const subVy = Math.round((subWy - center[1]) / fine + halfYAt - 0.5);

          const subInCave = isCaveVoxel(
            caveNoise,
            subWx,
            subWy,
            subWz,
            subHeight,
            config.amplitude,
          );
          let id: number;
          if (subInCave) {
            id =
              seaLevel !== undefined &&
              subVy >= subTop + 1 &&
              subVy <= Math.round((seaLevel - center[1]) / fine + halfYAt)
                ? VOXEL_WATER
                : VOXEL_AIR;
          } else if (subVy === subTop) {
            id = VOXEL_GRASS;
          } else if (subVy < subTop) {
            id =
              subWy >= subHeight - DIRT_LAYER_DEPTH
                ? VOXEL_DIRT
                : VOXEL_STONE;
          } else if (
            seaLevel !== undefined &&
            subVy >= subTop + 1 &&
            subVy <= Math.round((seaLevel - center[1]) / fine + halfYAt)
          ) {
            id = VOXEL_WATER;
          } else {
            id = VOXEL_AIR;
          }

          if (
            id === VOXEL_AIR &&
            subGated &&
            cloudNoise !== undefined &&
            subWy >= bandMin &&
            subWy <= bandMax &&
            cloudVoxelAt(cloudNoise, subWx, subWy, subWz, subCoverage)
          ) {
            id = VOXEL_CLOUD;
          }

          if (id === VOXEL_AIR) {
            return VOXEL_AIR;
          }
          const cell = id === VOXEL_WATER ? "water" : "solid";
          if (category === undefined) {
            category = cell;
          } else if (cell !== category) {
            return VOXEL_AIR;
          }
        }
      }
    }
    return category === "water" ? VOXEL_WATER : VOXEL_DIRT;
  };

  /**
   * Writes one column (signed `vx`/`vz`, sweeping `-1..vxN`/`-1..vzN` for the
   * border) through the padded layout, including the top/bottom border rows.
   */
  const writeColumn = (vx: number, vz: number): void => {
    const worldX = center[0] + (vx + 0.5 - vxN / 2) * voxelSize;
    const worldZ = center[2] + (vz + 0.5 - vzN / 2) * voxelSize;
    const xBorderSize =
      vx < 0
        ? (borderSizes?.nx ?? voxelSize)
        : vx >= vxN
          ? (borderSizes?.px ?? voxelSize)
          : undefined;
    const zBorderSize =
      vz < 0
        ? (borderSizes?.nz ?? voxelSize)
        : vz >= vzN
          ? (borderSizes?.pz ?? voxelSize)
          : undefined;
    const height = heightAt(worldX, worldZ, config);
    const top = rowOfY(height);
    const waterBottom = seaLevel === undefined ? -Infinity : rowOfY(seaLevel);
    // One coverage sample per column, gate: columns below the coverage floor
    // stay clear and skip the per-voxel cloud noise.
    const coverage =
      cloudNoise === undefined
        ? -Infinity
        : cloudColumnCoverage(cloudNoise, worldX, worldZ);
    const gated = coverage >= cloud.coverageThreshold;
    /** The single-cell rule for one row: caves, surface voxel, dirt, stone, water, clouds. */
    const plainId = (vy: number, worldY: number): number => {
      const inCave = isCaveVoxel(
        caveNoise,
        worldX,
        worldY,
        worldZ,
        height,
        config.amplitude,
      );
      if (inCave) {
        if (seaLevel !== undefined && vy >= top + 1 && vy <= waterBottom) {
          return VOXEL_WATER;
        }
        return VOXEL_AIR;
      }
      let id: number;
      if (vy === top) {
        id = VOXEL_GRASS;
      } else if (vy < top) {
        id =
          worldY >= height - DIRT_LAYER_DEPTH ? VOXEL_DIRT : VOXEL_STONE;
      } else if (seaLevel !== undefined && vy >= top + 1 && vy <= waterBottom) {
        id = VOXEL_WATER;
      } else {
        id = VOXEL_AIR;
      }
      // Clouds fill the open air of the band above the terrain; never
      // overwrite a solid column or the water above it (the band sits well
      // above the highest terrain, so this is defensive).
      if (id === VOXEL_AIR && gated && cloudNoise !== undefined) {
        if (
          worldY >= bandMin &&
          worldY <= bandMax &&
          cloudVoxelAt(cloudNoise, worldX, worldY, worldZ, coverage)
        ) {
          return VOXEL_CLOUD;
        }
      }
      return id;
    };
    for (let vy = -p; vy < vyN + p; ++vy) {
      const worldY = center[1] + (vy + 0.5 - vyN / 2) * voxelSize;
      const yBorderSize =
        vy < 0
          ? (borderSizes?.ny ?? voxelSize)
          : vy >= vyN
            ? (borderSizes?.py ?? voxelSize)
            : undefined;
      let id: number;
      // A border cell's rule is decided by the faces it actually sits on: an
      // interior axis contributes nothing, so a cell on just the +X face
      // samples against that neighbour alone, never the block's own size.
      if (
        xBorderSize !== undefined ||
        yBorderSize !== undefined ||
        zBorderSize !== undefined
      ) {
        const involved: number[] = [];
        if (xBorderSize !== undefined) {
          involved.push(xBorderSize);
        }
        if (yBorderSize !== undefined) {
          involved.push(yBorderSize);
        }
        if (zBorderSize !== undefined) {
          involved.push(zBorderSize);
        }
        id = involved.some((size) => size !== voxelSize)
          ? coarseBorderId(worldX, worldY, worldZ, Math.max(...involved))
          : plainId(vy, worldY);
      } else {
        id = plainId(vy, worldY);
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
