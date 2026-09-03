// A block of the world as data: where it sits, and the voxels in it. Kept in
// its own module so a web worker can generate blocks without pulling in
// anything that draws them.
import { DEFAULT_TERRAIN, heightAt, type TerrainConfig } from "./noise";
import {
  VOXEL_AIR,
  VOXEL_CLOUD,
  VOXEL_LOG,
  VOXEL_LEAVES,
  VOXEL_WATER,
  VoxelStore,
  fillStore,
  type BorderSizes,
  type FillStoreFn,
} from "./voxel-store";
import { placeTrees } from "./tree-fill";
import { LightStore } from "./light-store";
import { fillSkyLight } from "./sky-light";
import { fillBlockLight } from "./block-light";

export type { TerrainConfig };

export type Dim3 = [number, number, number];

/**
 * World units per voxel at LOD 0; each higher LOD doubles this value.
 */
export const VOXEL_SIZE = 2;

/** How a block is sized at a level of detail: its world extent and its voxels. */
export const blockConfig = (
  lod: number,
): { voxels: Dim3; dimensions: Dim3; voxelSize: number } => {
  const voxelSize = VOXEL_SIZE * (1 << lod);
  return {
    voxels: [
      BLOCK_WORLD[0] / voxelSize,
      BLOCK_WORLD[1] / voxelSize,
      BLOCK_WORLD[2] / voxelSize,
    ],
    dimensions: BLOCK_WORLD,
    voxelSize,
  };
};
/**
 * The number of voxels per axis in a `WorldBlock`, the chunk the sphere
 * streams. A block is one 64³ volume.
 */
export const CHUNK_VOXELS = 64;
/**
 * World-unit extents of one full-resolution block: a 64³ voxel cube made up
 * of `VOXEL_SIZE`-unit voxels at level of detail (LOD) 0. Blocks stack in
 * every axis now — the window is a sphere of them around the player — so all
 * three extents are equal.
 */
export const BLOCK_WORLD: Dim3 = [
  CHUNK_VOXELS * VOXEL_SIZE,
  CHUNK_VOXELS * VOXEL_SIZE,
  CHUNK_VOXELS * VOXEL_SIZE,
];

export interface WorldBlock {
  center: Dim3;
  /** The voxels themselves, which an edit changes and a mesh is built from. */
  store: VoxelStore;
  /** Per-voxel light shadowing `store`, recomputed whenever the voxels change. */
  light: LightStore;
  /** The level of detail currently targeted or requested for this block. */
  targetLod?: number;
}

/**
 * Allocates an empty block centered at `params.center`: a dense CPU
 * `VoxelStore`, sized for the level of detail but holding no terrain. Every
 * voxel reads as air until something fills it — `buildBlock` here, or a fill
 * result adopted through `applyLevelData`.
 *
 * @param params.center - World-space center of the block.
 * @param params.lod - Level of detail to build at; defaults to 0.
 */
export const buildBlockShell = (params: {
  center: Dim3;
  lod?: number;
}): WorldBlock => {
  const lod = params.lod ?? 0;
  const { dimensions, voxels, voxelSize } = blockConfig(lod);
  return {
    center: params.center,
    store: new VoxelStore({ dims: dimensions, voxels, scale: voxelSize }),
    light: new LightStore(voxels),
    targetLod: lod,
  };
};

/**
 * Builds a fresh block of the shared noise-terrain height field centered at
 * `params.center`.
 *
 * @param params.center - World-space center of the block.
 * @param params.lod - Level of detail to build at; defaults to 0.
 * @param params.terrain - Terrain configuration to generate from; defaults to `DEFAULT_TERRAIN`.
 */
export const buildBlock = (params: {
  center: Dim3;
  lod?: number;
  terrain?: TerrainConfig;
  customFillStore?: FillStoreFn;
  borderSizes?: BorderSizes;
}): WorldBlock => {
  const block = buildBlockShell(params);
  const fill = params.customFillStore ?? fillStore;
  fill(
    block.store,
    params.center,
    params.terrain ?? DEFAULT_TERRAIN,
    params.borderSizes,
  );
  placeTrees(
    block.store,
    params.center,
    params.terrain ?? DEFAULT_TERRAIN,
    VOXEL_LOG,
    VOXEL_LEAVES,
  );
  fillLight(block, params.terrain ?? DEFAULT_TERRAIN);
  return block;
};

/**
 * The chunk cell containing a world-space point, in the integer grid where a
 * block's interior covers world voxels `[cell*CHUNK_VOXELS/2 .. cell*CHUNK_VOXELS/2 +
 * CHUNK_VOXELS)` — i.e. world units `[cell*BLOCK_WORLD - BLOCK_WORLD/2,
 * cell*BLOCK_WORLD + BLOCK_WORLD/2), the same ownership `blockWorldVoxelRange`
 * describes. One resolved block per cell: the window never holds two blocks
 * at the same cell, so a point's cell names the block that owns its voxel.
 */
export const chunkCellOf = (
  worldX: number,
  worldY: number,
  worldZ: number,
): [number, number, number] => [
  Math.floor((worldX + BLOCK_WORLD[0] / 2) / BLOCK_WORLD[0]),
  Math.floor((worldY + BLOCK_WORLD[1] / 2) / BLOCK_WORLD[1]),
  Math.floor((worldZ + BLOCK_WORLD[2] / 2) / BLOCK_WORLD[2]),
];

/**
 * Resolves the block whose cell contains a world-space point. The spherical
 * window backs this with an O(1) cell map; the array form (`blocksQuery`) is
 * the test helper.
 */
export type BlockQuery = (
  worldX: number,
  worldY: number,
  worldZ: number,
) => WorldBlock | undefined;

/**
 * Builds a `BlockQuery` from a list of blocks, resolved by each block's cell
 * (`chunkCellOf` of its center). Two blocks sharing a cell overwrite each
 * other; the window never allows that, so the helper is only for tests and
 * small one-off worlds.
 */
export const blocksQuery = (blocks: WorldBlock[]): BlockQuery => {
  const byCell = new Map<string, WorldBlock>();
  for (const block of blocks) {
    const [cx, cy, cz] = chunkCellOf(
      block.center[0],
      block.center[1],
      block.center[2],
    );
    byCell.set(`${cx},${cy},${cz}`, block);
  }
  return (worldX, worldY, worldZ) => {
    const [cx, cy, cz] = chunkCellOf(worldX, worldY, worldZ);
    return byCell.get(`${cx},${cy},${cz}`);
  };
};

/**
 * The topmost solid voxel in a block's column at (`worldX`, `worldZ`), in
 * world Y, or `-Infinity` when the column in this block is empty. Water is
 * skipped so the player stands on the lakebed (or shore) under water, and the
 * still clouds are skipped so spawn, monster and weather heights read the
 * terrain — a cloud column is a floor the player can stand on, not the ground.
 */
const topSolidYInColumn = (
  block: WorldBlock,
  worldX: number,
  worldZ: number,
): number => {
  const store = block.store;
  const scale = store.scale;
  const [vxN, vyN, vzN] = store.voxels;
  const clampAxis = (v: number, n: number): number =>
    Math.max(0, Math.min(n - 1, v));
  const vx = clampAxis(
    Math.floor((worldX - block.center[0]) / scale + vxN / 2),
    vxN,
  );
  const vz = clampAxis(
    Math.floor((worldZ - block.center[2]) / scale + vzN / 2),
    vzN,
  );
  for (let vy = vyN - 1; vy >= 0; --vy) {
    const id = store.get(vx, vy, vz);
    if (id !== 0 && id !== VOXEL_WATER && id !== VOXEL_CLOUD) {
      return block.center[1] + (vy + 1 - vyN / 2) * scale;
    }
  }
  return -Infinity;
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
 * Blocks stack vertically now, so the scan resolves the loaded cells of the
 * column around the analytic noise height and takes the highest solid voxel;
 * `terrain` anchors that search, and its fallback covers columns whose block
 * has not been filled yet.
 *
 * @param query - Resolves a world point to the block whose cell contains it.
 * @param worldX - World-space X coordinate to sample.
 * @param worldZ - World-space Z coordinate to sample.
 * @param terrain - Terrain configuration anchoring the column search; defaults to `DEFAULT_TERRAIN`.
 * @returns The world-space Y height of the ground surface, or `-Infinity`
 * when the point is over empty space.
 */
export const getWorldHeight = (
  query: BlockQuery,
  worldX: number,
  worldZ: number,
  terrain: TerrainConfig = DEFAULT_TERRAIN,
): number => {
  const anchorCellY = chunkCellOf(
    worldX,
    heightAt(worldX, worldZ, terrain),
    worldZ,
  )[1];
  for (let off = 24; off >= -32; off--) {
    const cy = anchorCellY + off;
    const probeY = cy * BLOCK_WORLD[1];
    const block = query(worldX, probeY, worldZ);
    if (block === undefined) {
      continue;
    }
    const height = topSolidYInColumn(block, worldX, worldZ);
    if (height !== -Infinity) {
      return height;
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
 * @param query - Resolves a world point to the block whose cell contains it.
 * @param worldX - World-space X coordinate to sample.
 * @param worldY - World-space Y coordinate to scan downward from (the player's feet).
 * @param worldZ - World-space Z coordinate to sample.
 * @returns The world-space Y height of the nearest solid surface at or
 * below `worldY`, or `-Infinity` when there isn't one (open air/void below).
 */
export const getGroundHeightBelow = (
  query: BlockQuery,
  worldX: number,
  worldY: number,
  worldZ: number,
): number => {
  const cell = chunkCellOf(worldX, worldY, worldZ);
  for (let cellsScanned = 0; cellsScanned < 4; cellsScanned++) {
    const probeY = cell[1] * BLOCK_WORLD[1];
    const block = query(worldX, probeY, worldZ);
    if (block === undefined) {
      return -Infinity;
    }
    const store = block.store;
    const scale = store.scale;
    const [vxN, vyN, vzN] = store.voxels;
    const clampAxis = (v: number, n: number): number =>
      Math.max(0, Math.min(n - 1, v));
    const vx = clampAxis(
      Math.floor((worldX - block.center[0]) / scale + vxN / 2),
      vxN,
    );
    const vz = clampAxis(
      Math.floor((worldZ - block.center[2]) / scale + vzN / 2),
      vzN,
    );
    const startVy = clampAxis(
      Math.floor((worldY - block.center[1]) / scale + vyN / 2),
      vyN,
    );
    for (let vy = startVy; vy >= 0; --vy) {
      const id = store.get(vx, vy, vz);
      // skip water so the player stands on the lakebed (or shore) under water
      if (id !== 0 && id !== VOXEL_WATER) {
        return block.center[1] + (vy + 1 - vyN / 2) * scale;
      }
    }
    cell[1]--;
  }
  return -Infinity;
};

/**
 * The voxel that contains a world-space point, read from the live store so
 * it reflects every edit made to it. Anywhere outside the loaded blocks
 * reads as air.
 */
const voxelIdAt = (
  query: BlockQuery,
  worldX: number,
  worldY: number,
  worldZ: number,
): number => {
  const block = query(worldX, worldY, worldZ);
  if (block === undefined) {
    return VOXEL_AIR;
  }
  const store = block.store;
  const scale = store.scale;
  const [vxN, vyN, vzN] = store.voxels;
  // `store.get` reads out-of-range cells as air, so unlike the height
  // samplers this deliberately doesn't clamp: clamping would smear the
  // block's edge voxels outward across everything beyond them.
  return store.get(
    Math.floor((worldX - block.center[0]) / scale + vxN / 2),
    Math.floor((worldY - block.center[1]) / scale + vyN / 2),
    Math.floor((worldZ - block.center[2]) / scale + vzN / 2),
  );
};

/**
 * Whether the voxel containing a world-space point blocks movement — the
 * query player collision resolves against. Water doesn't block (the player
 * swims through it), and air outside the loaded blocks means an unfilled
 * neighbour never walls the player in while it streams.
 */
export const isSolidAt = (
  query: BlockQuery,
  worldX: number,
  worldY: number,
  worldZ: number,
): boolean => {
  const id = voxelIdAt(query, worldX, worldY, worldZ);
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
  query: BlockQuery,
  worldX: number,
  worldY: number,
  worldZ: number,
): boolean => voxelIdAt(query, worldX, worldY, worldZ) === VOXEL_WATER;

/** The worker-facing output of one block generation, ready to transfer. */
export interface BlockData {
  storeData: Uint8Array;
  /** Whether these voxels are worth meshing; see `VoxelStore.mightHaveVoxels`. */
  mightHaveVoxels: boolean;
  /** Whether these voxels hold any water; see `VoxelStore.hasWater`. */
  hasWater: boolean;
  /** The level of detail these voxels were generated at. */
  lod: number;
  /** The block's sky light channel, one byte per padded voxel. */
  skyLight: Uint8Array;
  /** The block's block light channel, one byte per padded voxel. */
  blockLight: Uint8Array;
}

/**
 * Fills a block's two light channels from its finished voxels: sky light from
 * the world surface downward, block light from each emissive voxel outward.
 * Runs after `fillStore` (and after any runtime edit) on a block that already
 * has its voxels, so `store` and `light` always agree.
 */
export const fillLight = (
  block: WorldBlock,
  terrain: TerrainConfig = DEFAULT_TERRAIN,
): void => {
  fillSkyLight(block.store, block.light, block.center, terrain);
  fillBlockLight(block.store, block.light);
};

/**
 * Generates a block's voxels — the same work `buildBlock` does — into plain
 * arrays that can be posted to another thread. Used by the fill worker.
 *
 * @param params - Same block-generation parameters as `buildBlock`.
 * @returns The generated arrays, ready to transfer.
 */
export const buildBlockData = (params: {
  center: Dim3;
  lod?: number;
  terrain?: TerrainConfig;
  customFillStore?: FillStoreFn;
  borderSizes?: BorderSizes;
}): BlockData => {
  const lod = params.lod ?? 0;
  const { store, light } = buildBlock({ ...params, lod });
  return {
    storeData: store.data,
    mightHaveVoxels: store.mightHaveVoxels,
    hasWater: store.hasWater,
    lod,
    skyLight: light.skylight,
    blockLight: light.blocklight,
  };
};

/**
 * Adopts worker-generated voxels into a block in place, zero-copy: the block's
 * store keeps the transferred buffer rather than copying out of it.
 *
 * @param block - The block to update in place.
 * @param data - The worker-generated arrays to adopt.
 */
export const applyLevelData = (block: WorldBlock, data: BlockData): void => {
  // The store's resolution follows the data it adopts, so a slot refilled at
  // a different level of detail reads its voxels at that LOD's scale rather
  // than the one the shell was built at.
  const { dimensions, voxels, voxelSize } = blockConfig(data.lod);
  block.store.dims = dimensions;
  block.store.voxels = voxels;
  block.store.scale = voxelSize;
  block.store.data = data.storeData;
  block.store.mightHaveVoxels = data.mightHaveVoxels;
  block.store.hasWater = data.hasWater;
  block.light.voxels = voxels;
  block.light.skylight = data.skyLight;
  block.light.blocklight = data.blockLight;
  block.targetLod = data.lod;
};
