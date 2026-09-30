// The rays a place script casts: a march through the voxel grid and a slab
// test against a world-space box, each returning the first contact and the
// face it struck. Both are pure functions of the world they are handed, so a
// script's ray answers the same way on every peer given the same terrain and
// the same figures.
import { VOXEL_SIZE } from "../world/level-data";

/**
 * How many voxels one voxel ray may cross before it gives up. A ray that
 * misses everything within its distance limit would otherwise walk forever
 * along a direction that never leaves the axis-aligned grid.
 */
const MAX_RAY_STEPS = 4096;

/** One box in world units, its two corners each smallest first. */
export interface RayBox {
  min: readonly [number, number, number];
  max: readonly [number, number, number];
}

/** Where a ray met a surface: how far along it, and the face normal there. */
export interface RayContact {
  distance: number;
  nx: number;
  ny: number;
  nz: number;
}

/** A direction of unit length, or null when the given one has none. */
export const unitDirection = (
  x: number,
  y: number,
  z: number,
): [number, number, number] | null => {
  const length = Math.hypot(x, y, z);
  if (length === 0) {
    return null;
  }
  return [x / length, y / length, z / length];
};

/**
 * The first crossing of the axis-aligned box `box` by a ray from `origin`
 * along the unit vector (`dx`, `dy`, `dz`), or null before `maxDistance` or
 * when it misses. An origin inside the box counts as a crossing at distance
 * zero with no normal, since no face was passed through.
 */
export const raycastAabb = (
  origin: readonly [number, number, number],
  dx: number,
  dy: number,
  dz: number,
  box: RayBox,
  maxDistance: number,
): RayContact | null => {
  const direction = [dx, dy, dz];
  let entry = -Infinity;
  let exit = Infinity;
  let entryAxis = -1;
  let entrySign = 0;
  for (let axis = 0; axis < 3; axis++) {
    const o = origin[axis];
    const d = direction[axis];
    const min = box.min[axis];
    const max = box.max[axis];
    if (Math.abs(d) < 1e-12) {
      if (o < min || o > max) {
        return null;
      }
      continue;
    }
    let near = (min - o) / d;
    let far = (max - o) / d;
    let sign = -Math.sign(d);
    if (near > far) {
      const swap = near;
      near = far;
      far = swap;
      sign = -sign;
    }
    if (near > entry) {
      entry = near;
      entryAxis = axis;
      entrySign = sign;
    }
    if (far < exit) {
      exit = far;
    }
    if (entry > exit) {
      return null;
    }
  }
  if (exit < 0 || entry > maxDistance) {
    return null;
  }
  const distance = entry < 0 ? 0 : entry;
  const normal = [0, 0, 0];
  if (entry >= 0 && entryAxis >= 0) {
    normal[entryAxis] = entrySign;
  }
  return {
    distance,
    nx: normal[0],
    ny: normal[1],
    nz: normal[2],
  };
};

/**
 * The first solid voxel a ray from `origin` along the unit vector
 * (`dx`, `dy`, `dz`) enters, or null before `maxDistance`. `isSolid` answers
 * for a world point the way the world's own solid query does.
 */
export const raycastVoxels = (
  origin: readonly [number, number, number],
  dx: number,
  dy: number,
  dz: number,
  maxDistance: number,
  isSolid: (x: number, y: number, z: number) => boolean,
): RayContact | null => {
  const direction = [dx, dy, dz];
  const cell: [number, number, number] = [
    Math.floor(origin[0] / VOXEL_SIZE),
    Math.floor(origin[1] / VOXEL_SIZE),
    Math.floor(origin[2] / VOXEL_SIZE),
  ];
  const step: [number, number, number] = [0, 0, 0];
  const tMax: [number, number, number] = [Infinity, Infinity, Infinity];
  const tDelta: [number, number, number] = [Infinity, Infinity, Infinity];
  for (let axis = 0; axis < 3; axis++) {
    const d = direction[axis];
    if (d === 0) {
      continue;
    }
    step[axis] = d > 0 ? 1 : -1;
    const boundary =
      d > 0 ? (cell[axis] + 1) * VOXEL_SIZE : cell[axis] * VOXEL_SIZE;
    tMax[axis] = (boundary - origin[axis]) / d;
    tDelta[axis] = VOXEL_SIZE / Math.abs(d);
  }
  let distance = 0;
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let stepCount = 0; stepCount <= MAX_RAY_STEPS; stepCount++) {
    if (distance > maxDistance) {
      return null;
    }
    const center = [
      (cell[0] + 0.5) * VOXEL_SIZE,
      (cell[1] + 0.5) * VOXEL_SIZE,
      (cell[2] + 0.5) * VOXEL_SIZE,
    ] as const;
    if (isSolid(center[0], center[1], center[2])) {
      return { distance, nx, ny, nz };
    }
    let axis = 0;
    if (tMax[1] < tMax[0]) {
      axis = 1;
    }
    if (tMax[2] < tMax[axis]) {
      axis = 2;
    }
    distance = tMax[axis];
    cell[axis] += step[axis];
    tMax[axis] += tDelta[axis];
    nx = axis === 0 ? -step[0] : 0;
    ny = axis === 1 ? -step[1] : 0;
    nz = axis === 2 ? -step[2] : 0;
  }
  return null;
};
