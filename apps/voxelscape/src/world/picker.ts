// CPU voxel picking: a DDA raycast from the camera along its look direction
// against the live `VoxelStore`s (which already carry edits, since the edit
// layer is applied to stores on fill and on each edit). This is how the
// editing feature knows which voxel is under the crosshair and where a new one
// would sit; nothing on the graphics card is asked, because what it holds is
// geometry built from these stores rather than the voxels themselves.
import {
  blockWorldVoxelRange,
  worldVoxelToLocal,
  type WorldVoxel,
} from "./edit-layer";
import { VOXEL_SIZE, type Dim3, type WorldBlock } from "./level-data";
import { VOXEL_AIR } from "./voxel-store";

/** Default reach, in world units; about 4.5 voxels. */
export const DEFAULT_REACH = 9;

export interface VoxelPick {
  /** The first non-air voxel along the ray within reach, or null. */
  target: WorldVoxel | null;
  /** The empty voxel adjacent to the hit face (the placement cell), or null. */
  place: WorldVoxel | null;
  /**
   * How far along the ray the target's near face sits, in world units, and
   * `Infinity` when the ray crossed nothing. A tool compares this against
   * another kind of pick to find which of the two the crosshair is really on.
   */
  distance: number;
}

const readWorldVoxel = (blocks: WorldBlock[], w: WorldVoxel): number => {
  for (let i = 0; i < blocks.length; i++) {
    const { min, max } = blockWorldVoxelRange(blocks[i].center);
    if (
      w[0] >= min[0] &&
      w[0] <= max[0] &&
      w[1] >= min[1] &&
      w[1] <= max[1] &&
      w[2] >= min[2] &&
      w[2] <= max[2]
    ) {
      const local = worldVoxelToLocal(blocks[i].store, blocks[i].center, w);
      return blocks[i].store.get(local[0], local[1], local[2]);
    }
  }
  return VOXEL_AIR;
};

/**
 * Raycasts from `origin` (world units) along the unit `direction` and returns
 * the first non-air voxel within `maxReach` world units plus the empty cell
 * directly in front of it (the placement cell). Stores already reflect edits,
 * so no separate overlay lookup is needed.
 */
export const pickVoxel = (
  blocks: WorldBlock[],
  origin: Dim3,
  direction: Dim3,
  maxReach: number = DEFAULT_REACH,
): VoxelPick => {
  // Work in the LOD-0 voxel grid; the voxel is isotropic, so the ray direction
  // stays a unit vector in the same space.
  const o: [number, number, number] = [
    origin[0] / VOXEL_SIZE,
    origin[1] / VOXEL_SIZE,
    origin[2] / VOXEL_SIZE,
  ];
  let x = Math.floor(o[0]);
  let y = Math.floor(o[1]);
  let z = Math.floor(o[2]);
  const stepX = direction[0] > 0 ? 1 : direction[0] < 0 ? -1 : 0;
  const stepY = direction[1] > 0 ? 1 : direction[1] < 0 ? -1 : 0;
  const stepZ = direction[2] > 0 ? 1 : direction[2] < 0 ? -1 : 0;
  const tDeltaX = stepX === 0 ? Infinity : Math.abs(1 / direction[0]);
  const tDeltaY = stepY === 0 ? Infinity : Math.abs(1 / direction[1]);
  const tDeltaZ = stepZ === 0 ? Infinity : Math.abs(1 / direction[2]);
  let tMaxX =
    stepX === 0
      ? Infinity
      : stepX > 0
        ? (x + 1 - o[0]) * tDeltaX
        : (o[0] - x) * tDeltaX;
  let tMaxY =
    stepY === 0
      ? Infinity
      : stepY > 0
        ? (y + 1 - o[1]) * tDeltaY
        : (o[1] - y) * tDeltaY;
  let tMaxZ =
    stepZ === 0
      ? Infinity
      : stepZ > 0
        ? (z + 1 - o[2]) * tDeltaZ
        : (o[2] - z) * tDeltaZ;

  const maxVoxelT = maxReach / VOXEL_SIZE;

  let prev: WorldVoxel | null = null;
  let t = 0;

  // The camera may sit inside a solid voxel (e.g. buried against a hill); step
  // along the ray until it exits solid cells before hunting the first face.
  let guard = 0;
  const maxGuard = Math.ceil(maxVoxelT) + 8;
  while (
    readWorldVoxel(blocks, [x, y, z]) !== VOXEL_AIR &&
    guard++ < maxGuard
  ) {
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      t = tMaxX;
      x += stepX;
      tMaxX += tDeltaX;
    } else if (tMaxY < tMaxZ) {
      t = tMaxY;
      y += stepY;
      tMaxY += tDeltaY;
    } else {
      t = tMaxZ;
      z += stepZ;
      tMaxZ += tDeltaZ;
    }
    if (t > maxVoxelT) {
      return { target: null, place: prev, distance: Infinity };
    }
  }

  while (true) {
    const w: WorldVoxel = [x, y, z];
    const id = readWorldVoxel(blocks, w);
    if (id !== VOXEL_AIR) {
      return { target: w, place: prev, distance: t * VOXEL_SIZE };
    }
    prev = w;
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      t = tMaxX;
      x += stepX;
      tMaxX += tDeltaX;
    } else if (tMaxY < tMaxZ) {
      t = tMaxY;
      y += stepY;
      tMaxY += tDeltaY;
    } else {
      t = tMaxZ;
      z += stepZ;
      tMaxZ += tDeltaZ;
    }
    if (t > maxVoxelT) {
      return { target: null, place: prev, distance: Infinity };
    }
  }
};
