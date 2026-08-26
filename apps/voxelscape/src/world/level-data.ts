// CPU-side level data: the voxel store plus the GPU chunk layout (`Level`)
// derived from it, without the raymarch shader material code. Keeping this in
// its own module means a web worker can generate blocks (noise fill + surface
// sweep) without pulling in the shader DSL.
import {
  DataTexture,
  RedIntegerFormat,
  UnsignedByteType,
} from "@random-mesh/rmsl/scene";
import { Vector3D } from "../utils/maths";
import { DEFAULT_TERRAIN, type TerrainConfig } from "./noise";
import {
  VOXEL_AIR,
  VOXEL_WATER,
  VoxelStore,
  fillStore,
  sweepSurface,
  sweepWaterSurface,
  type FillStoreFn,
} from "./voxel-store";

export type { TerrainConfig };

/**
 * The number of voxels per axis in a chunk — the fixed-size unit that
 * `Level`'s GPU chunk storage is addressed in.
 */
export const CHUNK_DIM = 16;
/**
 * World-unit extents of a full-resolution block: 192 x 256 x 192 units made
 * up of `VOXEL_SIZE`-unit voxels at level of detail (LOD) 0. Each higher LOD
 * doubles the voxel size and halves the voxel count per axis, which keeps
 * blocks small enough for the scroll-recycle fill to stay cheap and the
 * render distance tight (about 480 units).
 */
export const BLOCK_WORLD: Vector3D = {
  x: 192,
  y: 256,
  z: 192,
};
/**
 * World units per voxel at LOD 0; each higher LOD doubles this value.
 */
export const VOXEL_SIZE = 2;

export const blockConfig = (
  lod: number,
): {
  voxels: Vector3D;
  broadDim: Vector3D;
  chunkDim: Vector3D;
  storageDim: Vector3D;
  dimensions: Vector3D;
  voxelSize: number;
} => {
  const voxelSize = VOXEL_SIZE * (1 << lod);
  const voxels = Vector3D.divideScalar(BLOCK_WORLD, voxelSize);
  const broadDim = Vector3D.divideScalar(voxels, CHUNK_DIM);
  // Storage holds exactly one chunk slot per broad cell (each cell owns at most
  // one allocated chunk), so sizing it from the broad grid keeps the fine
  // texture small — important across many recycled blocks.
  const storageDim = Vector3D.multiplyScalar(broadDim, CHUNK_DIM);
  const chunkDim = Vector3D.create(CHUNK_DIM, CHUNK_DIM, CHUNK_DIM);
  return {
    voxels,
    broadDim,
    chunkDim,
    storageDim,
    dimensions: BLOCK_WORLD,
    voxelSize,
  };
};

export class Level {
  /** Per broad cell: 0 for empty space, 1 for non-empty space. */
  broadData: Uint8Array;
  broadTexture: DataTexture;
  broadDim: Vector3D;
  /** Size of each chunk within a broad cell, per axis. */
  chunkDim: Vector3D;
  /** Size of the chunk storage, per axis. */
  storageDim: Vector3D;
  storageCount: Vector3D;
  data: Uint8Array;
  texture: DataTexture;
  nextStorage: Vector3D = { x: 0, y: 0, z: 0 };
  /** Number of chunk slots handed out so far; used by the storage-overflow guard. */
  allocCount: number = 0;
  warnedStorageOverflow: boolean = false;
  freeSpots: {
    storageXIdx: number;
    storageYIdx: number;
    storageZIdx: number;
  }[] = [];
  /** World-unit extents of the volume: a rectangular prism, not necessarily a cube. */
  dimensions: Vector3D;
  /**
   * `dimensions`, `broadDim` and `chunkDim` packed as the `vec3` uniforms the
   * raymarch shader reads. Built once at construction — none of the three
   * change afterwards, and the uniforms are read once per block per frame, so
   * packing them on demand would allocate three arrays per block per frame.
   */
  readonly dimensionsUniform: number[];
  readonly broadDimUniform: number[];
  readonly chunkDimUniform: number[];
  /** Voxel size in world units: `VOXEL_SIZE` at LOD 0, doubling at each higher LOD. */
  scale: number = 1;

  allocChunk(out: { x: number; y: number; z: number }) {
    {
      let freeSpot = this.freeSpots.pop();
      if (freeSpot !== undefined) {
        out.x = freeSpot.storageXIdx;
        out.y = freeSpot.storageYIdx;
        out.z = freeSpot.storageZIdx;
        return;
      }
    }
    this.allocCount++;
    const capacity =
      this.storageCount.x * this.storageCount.y * this.storageCount.z;
    if (this.allocCount > capacity && !this.warnedStorageOverflow) {
      this.warnedStorageOverflow = true;
      console.warn(
        `[Level] storage exhausted: ${this.allocCount} chunks requested, storage holds ${capacity}`,
      );
    }
    out.x = this.nextStorage.x;
    out.y = this.nextStorage.y;
    out.z = this.nextStorage.z;
    this.nextStorage.x++;
    if (this.nextStorage.x === this.storageCount.x) {
      this.nextStorage.x = 0;
      this.nextStorage.y++;
      if (this.nextStorage.y === this.storageCount.y) {
        this.nextStorage.y = 0;
        this.nextStorage.z++;
      }
    }
  }

  _set_chunk: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  /**
   * Resolves a voxel coordinate to an index into `data`, following the same
   * broad-cell to chunk to fine-voxel lookup the shader performs.
   *
   * @returns The index into `data`, or -1 if the broad cell is empty.
   */
  private dataIndexFor(x: number, y: number, z: number): number {
    const bd = this.broadDim;
    const cd = this.chunkDim;
    const sd = this.storageDim;
    const broadXIdx = Math.floor(x / cd.x);
    const broadYIdx = Math.floor(y / cd.y);
    const broadZIdx = Math.floor(z / cd.z);
    const broadIdx =
      (broadZIdx * bd.y * bd.x + broadYIdx * bd.x + broadXIdx) << 2;
    if (this.broadData[broadIdx] === 0) {
      return -1;
    }
    const chunkXIdx = this.broadData[broadIdx + 1];
    const chunkYIdx = this.broadData[broadIdx + 2];
    const chunkZIdx = this.broadData[broadIdx + 3];
    const fineXIdx = chunkXIdx * cd.x + (x - broadXIdx * cd.x);
    const fineYIdx = chunkYIdx * cd.y + (y - broadYIdx * cd.y);
    const fineZIdx = chunkZIdx * cd.z + (z - broadZIdx * cd.z);
    return fineZIdx * sd.y * sd.x + fineYIdx * sd.x + fineXIdx;
  }

  set(x: number, y: number, z: number, val: number) {
    const bd = this.broadDim;
    const cd = this.chunkDim;
    const broadXIdx = Math.floor(x / cd.x);
    const broadYIdx = Math.floor(y / cd.y);
    const broadZIdx = Math.floor(z / cd.z);
    const broadIdx =
      (broadZIdx * bd.y * bd.x + broadYIdx * bd.x + broadXIdx) << 2;
    if (this.broadData[broadIdx] === 0) {
      this.allocChunk(this._set_chunk);
      this.broadData[broadIdx + 0] = 1;
      this.broadData[broadIdx + 1] = this._set_chunk.x;
      this.broadData[broadIdx + 2] = this._set_chunk.y;
      this.broadData[broadIdx + 3] = this._set_chunk.z;
    }
    const idx = this.dataIndexFor(x, y, z);
    if (idx >= 0) {
      this.data[idx] = val;
    }
  }

  get(x: number, y: number, z: number): number {
    const idx = this.dataIndexFor(x, y, z);
    return idx >= 0 ? this.data[idx] : 0;
  }

  constructor(params?: {
    broadDim?: Vector3D;
    chunkDim?: Vector3D;
    storageDim?: Vector3D;
    dimensions?: Vector3D;
    scale?: number;
  }) {
    const def = blockConfig(0);
    const { broadDim, chunkDim, storageDim, dimensions, scale } = params ?? {};
    const bd = broadDim ?? def.broadDim;
    const cd = chunkDim ?? def.chunkDim;
    const sd = storageDim ?? def.storageDim;
    this.broadDim = bd;
    this.chunkDim = cd;
    this.storageDim = sd;
    this.storageCount = {
      x: Math.floor(sd.x / cd.x),
      y: Math.floor(sd.y / cd.y),
      z: Math.floor(sd.z / cd.z),
    };
    this.dimensions = dimensions ?? {
      x: bd.x * cd.x,
      y: bd.y * cd.y,
      z: bd.z * cd.z,
    };
    this.scale = scale ?? 1;
    this.dimensionsUniform = Vector3D.toArray(this.dimensions);
    this.broadDimUniform = Vector3D.toArray(bd);
    this.chunkDimUniform = Vector3D.toArray(cd);
    this.broadData = new Uint8Array(bd.x * bd.y * bd.z * 4);
    this.broadTexture = new DataTexture(this.broadData, bd.x, bd.y, bd.z);
    this.data = new Uint8Array(sd.x * sd.y * sd.z);
    this.texture = new DataTexture(
      this.data,
      sd.x,
      sd.y,
      sd.z,
      RedIntegerFormat,
      UnsignedByteType,
    );
  }
}

/**
 * Clears an existing `level` back to empty space and resets its chunk
 * allocator, so it can be recycled in place by a subsequent call to
 * `syncLevelFromStore`. Textures are re-uploaded once that sync marks them
 * dirty.
 *
 * @param level - The level to clear and reset.
 */
export const resetLevel = (level: Level): void => {
  level.broadData.fill(0);
  level.data.fill(0);
  level.nextStorage = { x: 0, y: 0, z: 0 };
  level.allocCount = 0;
  level.freeSpots = [];
  level.warnedStorageOverflow = false;
};

/**
 * Derives the GPU chunk data (broad grid plus fine chunks) of `level` from
 * the CPU-side `store`.
 *
 * With `surfaceOnly` true (the default), only surface voxels — solid voxels
 * touching air — are written, so chunks holding nothing but interior rock
 * are never allocated and the raymarcher skips them. Pass `surfaceOnly:
 * false` to upload the full solid volume instead, which is needed when a
 * camera can sit inside solid terrain: the origin-inside `skipSolid` escape
 * relies on interior voxels being present.
 *
 * @param level - The level to write derived chunk data into.
 * @param store - The CPU-side voxel store to derive it from.
 * @param opts.surfaceOnly - Whether to write only surface voxels. Defaults to true.
 */
export const syncLevelFromStore = (
  level: Level,
  store: VoxelStore,
  opts?: { surfaceOnly?: boolean },
): void => {
  const surfaceOnly = opts?.surfaceOnly ?? true;
  resetLevel(level);
  if (surfaceOnly) {
    sweepSurface(store, (x, y, z, id) => {
      level.set(x, y, z, id);
    });
    // only the water surface layer is stored: the water pass shades at the
    // surface, so the body below doesn't need to occupy GPU chunk space
    sweepWaterSurface(store, (x, y, z, id) => {
      level.set(x, y, z, id);
    });
  } else {
    const { x: vxN, y: vyN, z: vzN } = store.voxels;
    for (let vz = 0; vz < vzN; ++vz) {
      for (let vy = 0; vy < vyN; ++vy) {
        for (let vx = 0; vx < vxN; ++vx) {
          const id = store.get(vx, vy, vz);
          if (id !== 0) {
            level.set(vx, vy, vz, id);
          }
        }
      }
    }
  }
  level.broadTexture.needsUpdate = true;
  level.texture.needsUpdate = true;
};

export interface WorldBlock {
  level: Level;
  center: Vector3D;
  /**
   * CPU-side source of truth that `level`'s chunk data is derived from.
   * Voxel edits are meant to mutate this store directly and then re-run
   * `syncLevelFromStore` to push the change into `level`.
   */
  store: VoxelStore;
}

/**
 * Builds a fresh block of the shared noise-terrain height field centered at
 * `params.center`: a dense CPU `VoxelStore` (the editable source of truth)
 * plus its derived GPU `Level`.
 *
 * @param params.center - World-space center of the block.
 * @param params.lod - Level of detail to build at; defaults to 0.
 * @param params.terrain - Terrain configuration to generate from; defaults to `DEFAULT_TERRAIN`.
 * @param params.surfaceOnly - Whether the derived `Level` stores only surface voxels; defaults to true.
 */
export const buildBlock = (params: {
  center: Vector3D;
  lod?: number;
  terrain?: TerrainConfig;
  surfaceOnly?: boolean;
  customFillStore?: FillStoreFn;
}): WorldBlock => {
  const lod = params.lod ?? 0;
  const { broadDim, chunkDim, storageDim, dimensions, voxels, voxelSize } =
    blockConfig(lod);
  const level = new Level({
    broadDim,
    chunkDim,
    storageDim,
    dimensions,
    scale: voxelSize,
  });
  const store = new VoxelStore({
    dims: dimensions,
    voxels,
    scale: voxelSize,
  });
  const block: WorldBlock = {
    level,
    center: params.center,
    store,
  };
  const fill = params.customFillStore ?? fillStore;
  fill(store, params.center, params.terrain ?? DEFAULT_TERRAIN);
  syncLevelFromStore(level, store, {
    surfaceOnly: params.surfaceOnly ?? true,
  });
  return block;
};

/** Finds the block whose footprint contains (`worldX`, `worldZ`), closest to that point if more than one does. */
const findContainingBlock = (
  blocks: WorldBlock[],
  worldX: number,
  worldZ: number,
): WorldBlock | undefined => {
  let best: WorldBlock | undefined;
  let bestDistSq = Infinity;
  for (const block of blocks) {
    const dx = worldX - block.center.x;
    const dz = worldZ - block.center.z;
    const hx = block.level.dimensions.x / 2;
    const hz = block.level.dimensions.z / 2;
    if (Math.abs(dx) > hx || Math.abs(dz) > hz) {
      continue;
    }
    const d = dx * dx + dz * dz;
    if (d < bestDistSq) {
      bestDistSq = d;
      best = block;
    }
  }
  return best;
};

/**
 * CPU ground-height sampler: finds the voxel surface at (`worldX`, `worldZ`)
 * by scanning the containing block's CPU store top-down, so it stays correct
 * even after the store is edited at runtime. Mirrors the shader's world to
 * local to voxel mapping, so it respects each block's level-of-detail scale.
 *
 * Always finds the topmost solid surface in the column, which is exactly
 * what spawn placement and sea-level checks want — but it isn't player
 * collision: a tunnel's ceiling would report as "the ground" here, since
 * it's above whatever solid floor the tunnel itself has. For that, use
 * `getGroundHeightBelow`.
 *
 * @param blocks - The candidate blocks to search.
 * @param worldX - World-space X coordinate to sample.
 * @param worldZ - World-space Z coordinate to sample.
 * @returns The world-space Y height of the ground surface, or `-Infinity`
 * when the point is outside every block or over empty space.
 */
export const getWorldHeight = (
  blocks: WorldBlock[],
  worldX: number,
  worldZ: number,
): number => {
  const best = findContainingBlock(blocks, worldX, worldZ);
  if (best === undefined) {
    return -Infinity;
  }
  const store = best.store;
  const scale = store.scale;
  const { x: vxN, y: vyN, z: vzN } = store.voxels;
  const clampAxis = (v: number, n: number): number =>
    Math.max(0, Math.min(n - 1, v));
  const vx = clampAxis(
    Math.floor((worldX - best.center.x) / scale + vxN / 2),
    vxN,
  );
  const vz = clampAxis(
    Math.floor((worldZ - best.center.z) / scale + vzN / 2),
    vzN,
  );
  for (let vy = vyN - 1; vy >= 0; --vy) {
    const id = store.get(vx, vy, vz);
    // skip water so the player stands on the lakebed (or shore) under water
    if (id !== 0 && id !== VOXEL_WATER) {
      return best.center.y + (vy + 1 - vyN / 2) * scale;
    }
  }
  return -Infinity;
};

/**
 * CPU ground-height sampler for player collision: like `getWorldHeight`,
 * but scans downward starting at the voxel containing `worldY` instead of
 * from the top of the world, so it finds the solid surface directly beneath
 * the sample rather than the topmost one in the whole column. Without this,
 * a tunnel dug under a hill would report the hill's roof as the ground,
 * since a top-down scan finds that solid voxel first — ejecting the player
 * up onto the hilltop the moment they walked into the tunnel.
 *
 * Starting inside `worldY`'s own voxel rather than above it bounds how far
 * up the answer can ever be: a sample taken at the player's feet reports a
 * surface above them only when their feet are inside solid material, and
 * then by at most the one voxel they're buried in. Callers rely on that to
 * tell a step up from a wall.
 *
 * @param blocks - The candidate blocks to search.
 * @param worldX - World-space X coordinate to sample.
 * @param worldY - World-space Y coordinate to scan downward from (the player's feet).
 * @param worldZ - World-space Z coordinate to sample.
 * @returns The world-space Y height of the nearest solid surface at or
 * below `worldY`, or `-Infinity` when there isn't one (open air/void below).
 */
export const getGroundHeightBelow = (
  blocks: WorldBlock[],
  worldX: number,
  worldY: number,
  worldZ: number,
): number => {
  const best = findContainingBlock(blocks, worldX, worldZ);
  if (best === undefined) {
    return -Infinity;
  }
  const store = best.store;
  const scale = store.scale;
  const { x: vxN, y: vyN, z: vzN } = store.voxels;
  const clampAxis = (v: number, n: number): number =>
    Math.max(0, Math.min(n - 1, v));
  const vx = clampAxis(
    Math.floor((worldX - best.center.x) / scale + vxN / 2),
    vxN,
  );
  const vz = clampAxis(
    Math.floor((worldZ - best.center.z) / scale + vzN / 2),
    vzN,
  );
  const startVy = clampAxis(
    Math.floor((worldY - best.center.y) / scale + vyN / 2),
    vyN,
  );
  for (let vy = startVy; vy >= 0; --vy) {
    const id = store.get(vx, vy, vz);
    // skip water so the player stands on the lakebed (or shore) under water
    if (id !== 0 && id !== VOXEL_WATER) {
      return best.center.y + (vy + 1 - vyN / 2) * scale;
    }
  }
  return -Infinity;
};

/**
 * The voxel that contains a world-space point, read from the live store so
 * it reflects every edit made to it. Anywhere outside the loaded blocks
 * reads as air.
 */
const voxelIdAt = (
  blocks: WorldBlock[],
  worldX: number,
  worldY: number,
  worldZ: number,
): number => {
  const best = findContainingBlock(blocks, worldX, worldZ);
  if (best === undefined) {
    return VOXEL_AIR;
  }
  const store = best.store;
  const scale = store.scale;
  const { x: vxN, y: vyN, z: vzN } = store.voxels;
  // `store.get` reads out-of-range cells as air, so unlike the height
  // samplers this deliberately doesn't clamp: clamping would smear the
  // block's edge voxels outward across everything beyond them.
  return store.get(
    Math.floor((worldX - best.center.x) / scale + vxN / 2),
    Math.floor((worldY - best.center.y) / scale + vyN / 2),
    Math.floor((worldZ - best.center.z) / scale + vzN / 2),
  );
};

/**
 * Whether the voxel containing a world-space point blocks movement — the
 * query player collision resolves against. Water doesn't block (the player
 * swims through it), and air outside the loaded blocks means an unfilled
 * neighbour never walls the player in while it streams.
 */
export const isSolidAt = (
  blocks: WorldBlock[],
  worldX: number,
  worldY: number,
  worldZ: number,
): boolean => {
  const id = voxelIdAt(blocks, worldX, worldY, worldZ);
  return id !== VOXEL_AIR && id !== VOXEL_WATER;
};

/**
 * Whether a world-space point is inside water.
 *
 * This asks the voxel itself rather than comparing the column's surface
 * against sea level, because the two stop agreeing the moment anyone digs.
 * Mining a shaft below sea level drops that column's topmost solid voxel
 * below sea level, and a sea-level comparison then calls the dry shaft
 * flooded and has the player swimming down it in slow motion.
 */
export const isWaterAt = (
  blocks: WorldBlock[],
  worldX: number,
  worldY: number,
  worldZ: number,
): boolean => voxelIdAt(blocks, worldX, worldY, worldZ) === VOXEL_WATER;

/**
 * The worker-facing output of one block generation: the voxel store data
 * plus the derived GPU level arrays (broad grid and fine chunks), ready to
 * transfer to another thread.
 */
export interface BlockData {
  storeData: Uint8Array;
  broadData: Uint8Array;
  fineData: Uint8Array;
}

/**
 * Generates a block's voxel data and its derived level arrays — the same
 * work `buildBlock` does — into plain arrays that can be posted to another
 * thread. Used by the fill worker.
 *
 * @param params - Same block-generation parameters as `buildBlock`.
 * @returns The generated arrays, ready to transfer.
 */
export const buildBlockData = (params: {
  center: Vector3D;
  terrain?: TerrainConfig;
  surfaceOnly?: boolean;
  customFillStore?: FillStoreFn;
}): BlockData => {
  const block = buildBlock(params);
  return {
    storeData: block.store.data,
    broadData: block.level.broadData,
    fineData: block.level.data,
  };
};

/**
 * Adopts worker-generated arrays into a block's store and level in place,
 * zero-copy: the store keeps the transferred buffer, and the data textures'
 * image is swapped so the renderer re-uploads into its existing GPU textures
 * on the next draw. No new texture is allocated, so nothing leaks.
 *
 * @param block - The block to update in place.
 * @param data - The worker-generated arrays to adopt.
 */
export const applyLevelData = (block: WorldBlock, data: BlockData): void => {
  block.store.data = data.storeData;
  block.level.broadData = data.broadData;
  block.level.data = data.fineData;
  block.level.broadTexture.image = data.broadData;
  block.level.texture.image = data.fineData;
  block.level.broadTexture.needsUpdate = true;
  block.level.texture.needsUpdate = true;
};
