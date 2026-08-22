// CPU-side level data: the voxel store plus the GPU chunk layout (`Level`)
// derived from it, without the raymarch shader material code. Keeping this in
// its own module means a web worker can generate blocks (noise fill + surface
// sweep) without pulling in the shader DSL.
import {
  DataTexture,
  RedIntegerFormat,
  UnsignedByteType,
} from "@random-mesh/rmsl/scene";
import { DEFAULT_TERRAIN, type TerrainConfig } from "./noise";
import {
  VOXEL_WATER,
  VoxelStore,
  fillStore,
  sweepSurface,
  sweepWaterSurface,
} from "./voxel-store";

export type { TerrainConfig };

export type Dim3 = [number, number, number];

// A block is a rectangular-prism volume of voxels. A full-res block is
// 192 x 256 x 192 world units at VOXEL_SIZE-unit voxels (2 at LOD0); each LOD
// level doubles the voxel size (halves the voxel count per axis). Small blocks
// keep the scroll-recycle fill cheap and the render distance tight (~480u).
export const CHUNK_DIM = 16;
export const BLOCK_WORLD: Dim3 = [192, 256, 192];
// world units per voxel at LOD0 (2 => voxels render twice as large)
export const VOXEL_SIZE = 2;

export const blockConfig = (
  lod: number,
): {
  voxels: Dim3;
  broadDim: Dim3;
  chunkDim: Dim3;
  storageDim: Dim3;
  dimensions: Dim3;
  voxelSize: number;
} => {
  const voxelSize = VOXEL_SIZE * (1 << lod);
  const voxels: Dim3 = [
    BLOCK_WORLD[0] / voxelSize,
    BLOCK_WORLD[1] / voxelSize,
    BLOCK_WORLD[2] / voxelSize,
  ];
  const broadDim: Dim3 = [
    voxels[0] / CHUNK_DIM,
    voxels[1] / CHUNK_DIM,
    voxels[2] / CHUNK_DIM,
  ];
  // Storage holds exactly one chunk slot per broad cell (each cell owns at most
  // one allocated chunk), so sizing it from the broad grid keeps the fine
  // texture small — important across many recycled blocks.
  const storageDim: Dim3 = [
    broadDim[0] * CHUNK_DIM,
    broadDim[1] * CHUNK_DIM,
    broadDim[2] * CHUNK_DIM,
  ];
  const chunkDim: Dim3 = [CHUNK_DIM, CHUNK_DIM, CHUNK_DIM];
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
  // broad cell r === 0 -> empty space; r === 1 -> non-empty space
  broadData: Uint8Array;
  broadTexture: DataTexture;
  broadDim: Dim3;
  // the size of each of the chunks in a broad cell, per axis
  chunkDim: Dim3;
  // the size of the storage, per axis
  storageDim: Dim3;
  storageCount: Dim3;
  data: Uint8Array;
  texture: DataTexture;
  //
  nextStorage: Dim3 = [0, 0, 0];
  // number of chunk slots handed out (for the storage-overflow guard)
  allocCount: number = 0;
  warnedStorageOverflow: boolean = false;
  freeSpots: {
    storageXIdx: number;
    storageYIdx: number;
    storageZIdx: number;
  }[] = [];
  // world-unit extents of the volume; a rectangular prism, not necessarily a cube
  dimensions: Dim3;
  // voxel size in world units: VOXEL_SIZE at LOD0, double each LOD (matches `blockConfig`)
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
      this.storageCount[0] * this.storageCount[1] * this.storageCount[2];
    if (this.allocCount > capacity && !this.warnedStorageOverflow) {
      this.warnedStorageOverflow = true;
      console.warn(
        `[Level] storage exhausted: ${this.allocCount} chunks requested, storage holds ${capacity}`,
      );
    }
    out.x = this.nextStorage[0];
    out.y = this.nextStorage[1];
    out.z = this.nextStorage[2];
    this.nextStorage[0]++;
    if (this.nextStorage[0] === this.storageCount[0]) {
      this.nextStorage[0] = 0;
      this.nextStorage[1]++;
      if (this.nextStorage[1] === this.storageCount[1]) {
        this.nextStorage[1] = 0;
        this.nextStorage[2]++;
      }
    }
  }

  _set_chunk: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  // Resolves the voxel coordinate to an index into `data` (mirrors the shader's
  // broad -> chunk -> fine lookup). Returns -1 when the broad cell is empty.
  private dataIndexFor(x: number, y: number, z: number): number {
    const bd = this.broadDim;
    const cd = this.chunkDim;
    const sd = this.storageDim;
    const broadXIdx = Math.floor(x / cd[0]);
    const broadYIdx = Math.floor(y / cd[1]);
    const broadZIdx = Math.floor(z / cd[2]);
    const broadIdx =
      (broadZIdx * bd[1] * bd[0] + broadYIdx * bd[0] + broadXIdx) << 2;
    if (this.broadData[broadIdx] === 0) {
      return -1;
    }
    const chunkXIdx = this.broadData[broadIdx + 1];
    const chunkYIdx = this.broadData[broadIdx + 2];
    const chunkZIdx = this.broadData[broadIdx + 3];
    const fineXIdx = chunkXIdx * cd[0] + (x - broadXIdx * cd[0]);
    const fineYIdx = chunkYIdx * cd[1] + (y - broadYIdx * cd[1]);
    const fineZIdx = chunkZIdx * cd[2] + (z - broadZIdx * cd[2]);
    return fineZIdx * sd[1] * sd[0] + fineYIdx * sd[0] + fineXIdx;
  }

  set(x: number, y: number, z: number, val: number) {
    const bd = this.broadDim;
    const cd = this.chunkDim;
    const broadXIdx = Math.floor(x / cd[0]);
    const broadYIdx = Math.floor(y / cd[1]);
    const broadZIdx = Math.floor(z / cd[2]);
    const broadIdx =
      (broadZIdx * bd[1] * bd[0] + broadYIdx * bd[0] + broadXIdx) << 2;
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
    broadDim?: Dim3;
    chunkDim?: Dim3;
    storageDim?: Dim3;
    dimensions?: Dim3;
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
    this.storageCount = [
      Math.floor(sd[0] / cd[0]),
      Math.floor(sd[1] / cd[1]),
      Math.floor(sd[2] / cd[2]),
    ];
    this.dimensions = dimensions ?? [
      bd[0] * cd[0],
      bd[1] * cd[1],
      bd[2] * cd[2],
    ];
    this.scale = scale ?? 1;
    this.broadData = new Uint8Array(bd[0] * bd[1] * bd[2] * 4);
    this.broadTexture = new DataTexture(this.broadData, bd[0], bd[1], bd[2]);
    this.data = new Uint8Array(sd[0] * sd[1] * sd[2]);
    this.texture = new DataTexture(
      this.data,
      sd[0],
      sd[1],
      sd[2],
      RedIntegerFormat,
      UnsignedByteType,
    );
  }
}

// Clears an existing `level` back to empty space and resets the chunk
// allocator, so it can be recycled in place by a subsequent `syncLevelFromStore`
// (textures are re-uploaded when the sync marks them dirty).
export const resetLevel = (level: Level): void => {
  level.broadData.fill(0);
  level.data.fill(0);
  level.nextStorage = [0, 0, 0];
  level.allocCount = 0;
  level.freeSpots = [];
  level.warnedStorageOverflow = false;
};

// Derives the GPU chunk data (broad grid + fine chunks) of `level` from the
// CPU-side `store`. With `surfaceOnly` (default), only surface voxels — solid
// voxels touching air — are written, so chunks that hold nothing but interior
// rock are never allocated and the raymarcher skips them. Use `surfaceOnly:
// false` to upload the full solid volume (needed if a camera can sit inside
// solid terrain; the origin-inside `skipSolid` escape relies on interior
// voxels being present).
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
    const [vxN, vyN, vzN] = store.voxels;
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
  center: Dim3;
  // CPU-side source of truth the `level`'s chunk data is derived from; future
  // runtime voxel edits mutate this then re-run `syncLevelFromStore`.
  store: VoxelStore;
}

// Builds a fresh block of the shared noise-terrain height field for `center`:
// a dense CPU `VoxelStore` (the editable source of truth) plus its derived GPU
// `Level`.
export const buildBlock = (params: {
  center: Dim3;
  lod?: number;
  terrain?: TerrainConfig;
  surfaceOnly?: boolean;
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
  fillStore(store, params.center, params.terrain ?? DEFAULT_TERRAIN);
  syncLevelFromStore(level, store, {
    surfaceOnly: params.surfaceOnly ?? true,
  });
  return block;
};

// CPU ground-height sampler: finds the voxel surface at (worldX, worldZ) by
// scanning the containing block's CPU store top-down (so it stays correct once
// the store is edited at runtime). Mirrors the shader's world -> local -> voxel
// mapping, so it respects each block's LOD scale. Returns -Infinity when the
// point is outside every block or over empty space.
export const getWorldHeight = (
  blocks: WorldBlock[],
  worldX: number,
  worldZ: number,
): number => {
  let best: WorldBlock | undefined;
  let bestDistSq = Infinity;
  for (const block of blocks) {
    const dx = worldX - block.center[0];
    const dz = worldZ - block.center[2];
    const hx = block.level.dimensions[0] / 2;
    const hz = block.level.dimensions[2] / 2;
    if (Math.abs(dx) > hx || Math.abs(dz) > hz) {
      continue;
    }
    const d = dx * dx + dz * dz;
    if (d < bestDistSq) {
      bestDistSq = d;
      best = block;
    }
  }
  if (best === undefined) {
    return -Infinity;
  }
  const store = best.store;
  const scale = store.scale;
  const [vxN, vyN, vzN] = store.voxels;
  const clampAxis = (v: number, n: number): number =>
    Math.max(0, Math.min(n - 1, v));
  const vx = clampAxis(
    Math.floor((worldX - best.center[0]) / scale + vxN / 2),
    vxN,
  );
  const vz = clampAxis(
    Math.floor((worldZ - best.center[2]) / scale + vzN / 2),
    vzN,
  );
  for (let vy = vyN - 1; vy >= 0; --vy) {
    const id = store.get(vx, vy, vz);
    // skip water so the player stands on the lakebed (or shore) under water
    if (id !== 0 && id !== VOXEL_WATER) {
      return best.center[1] + (vy + 1 - vyN / 2) * scale;
    }
  }
  return -Infinity;
};

// The worker-facing output of one block generation: the voxel store data plus
// the derived GPU level arrays (broad grid + fine chunks), ready to transfer.
export interface BlockData {
  storeData: Uint8Array;
  broadData: Uint8Array;
  fineData: Uint8Array;
}

// Generates a block's voxel data + its derived level arrays (the CPU half of
// `buildBlock`) into plain arrays that can be posted to another thread. Used by
// the fill worker; also unit-tested against the synchronous path.
export const buildBlockData = (params: {
  center: Dim3;
  terrain?: TerrainConfig;
  surfaceOnly?: boolean;
}): BlockData => {
  const block = buildBlock(params);
  return {
    storeData: block.store.data,
    broadData: block.level.broadData,
    fineData: block.level.data,
  };
};

// Adopts worker-generated arrays into a block's store and level in place,
// zero-copy: the store keeps the transferred buffer and the DataTextures' image
// is swapped so the renderer re-uploads into its existing GPU textures on the
// next draw (no new texture allocation, so nothing leaks).
export const applyLevelData = (block: WorldBlock, data: BlockData): void => {
  block.store.data = data.storeData;
  block.level.broadData = data.broadData;
  block.level.data = data.fineData;
  block.level.broadTexture.image = data.broadData;
  block.level.texture.image = data.fineData;
  block.level.broadTexture.needsUpdate = true;
  block.level.texture.needsUpdate = true;
};
