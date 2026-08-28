// A block of the world as data: where it sits, and the voxels in it. Kept in
// its own module so a web worker can generate blocks without pulling in
// anything that draws them.
import { DEFAULT_TERRAIN, type TerrainConfig } from "./noise";
import {
  VOXEL_AIR,
  VOXEL_WATER,
  VoxelStore,
  fillStore,
  type FillStoreFn,
} from "./voxel-store";

export type { TerrainConfig };

export type Dim3 = [number, number, number];

/**
 * World-unit extents of a full-resolution block: 192 x 256 x 192 units made
 * up of `VOXEL_SIZE`-unit voxels at level of detail (LOD) 0. Each higher LOD
 * doubles the voxel size and halves the voxel count per axis, which keeps
 * blocks small enough for the scroll-recycle fill to stay cheap and the
 * render distance tight (about 480 units).
 */
export const BLOCK_WORLD: Dim3 = [192, 256, 192];
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

export interface WorldBlock {
  center: Dim3;
  /** The voxels themselves, which an edit changes and a mesh is built from. */
  store: VoxelStore;
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
  const { dimensions, voxels, voxelSize } = blockConfig(params.lod ?? 0);
  return {
    center: params.center,
    store: new VoxelStore({ dims: dimensions, voxels, scale: voxelSize }),
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
}): WorldBlock => {
  const block = buildBlockShell(params);
  const fill = params.customFillStore ?? fillStore;
  fill(block.store, params.center, params.terrain ?? DEFAULT_TERRAIN);
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
    const dx = worldX - block.center[0];
    const dz = worldZ - block.center[2];
    const hx = block.store.dims[0] / 2;
    const hz = block.store.dims[2] / 2;
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
  const startVy = clampAxis(
    Math.floor((worldY - best.center[1]) / scale + vyN / 2),
    vyN,
  );
  for (let vy = startVy; vy >= 0; --vy) {
    const id = store.get(vx, vy, vz);
    // skip water so the player stands on the lakebed (or shore) under water
    if (id !== 0 && id !== VOXEL_WATER) {
      return best.center[1] + (vy + 1 - vyN / 2) * scale;
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
  const [vxN, vyN, vzN] = store.voxels;
  // `store.get` reads out-of-range cells as air, so unlike the height
  // samplers this deliberately doesn't clamp: clamping would smear the
  // block's edge voxels outward across everything beyond them.
  return store.get(
    Math.floor((worldX - best.center[0]) / scale + vxN / 2),
    Math.floor((worldY - best.center[1]) / scale + vyN / 2),
    Math.floor((worldZ - best.center[2]) / scale + vzN / 2),
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
  center: Dim3;
  terrain?: TerrainConfig;
  customFillStore?: FillStoreFn;
}): BlockData => {
  return { storeData: buildBlock(params).store.data };
};

/**
 * Adopts worker-generated voxels into a block in place, zero-copy: the block's
 * store keeps the transferred buffer rather than copying out of it.
 *
 * @param block - The block to update in place.
 * @param data - The worker-generated arrays to adopt.
 */
export const applyLevelData = (block: WorldBlock, data: BlockData): void => {
  block.store.data = data.storeData;
};
