import type { Vector3 } from "@random-mesh/rmsl/scene";
import { VOXEL_SIZE } from "../../world/level-data";
import type { StructurePlan } from "../types";
import type { CameraRay } from "../camera/rig";
import { shapeBounds } from "../structures/plan";

/**
 * How far along `ray` it enters the box, or undefined where it misses. Boxes
 * are half-open on the far side, matching how a shape's bounds describe whole
 * voxels.
 */
const rayBoxDistance = (
  origin: Vector3,
  direction: Vector3,
  boxMin: [number, number, number],
  boxMax: [number, number, number],
): number | undefined => {
  let near = -Infinity;
  let far = Infinity;
  for (let axis = 0; axis < 3; axis++) {
    const o = origin.getComponent(axis);
    const d = direction.getComponent(axis);
    const lo = boxMin[axis];
    const hi = boxMax[axis];
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) {
        return undefined;
      }
      continue;
    }
    let t1 = (lo - o) / d;
    let t2 = (hi - o) / d;
    if (t1 > t2) {
      const swap = t1;
      t1 = t2;
      t2 = swap;
    }
    near = Math.max(near, t1);
    far = Math.min(far, t2);
    if (near > far) {
      return undefined;
    }
  }
  if (far < 0) {
    return undefined;
  }
  return near >= 0 ? near : 0;
};

/** A shape the ray crossed, and how far along it the crossing was. */
export interface ShapePick {
  index: number;
  distance: number;
}

/**
 * The nearest shape in `plan` the ray crosses within `reach` world units, or
 * undefined where it crosses none. Each shape is tested against the box its
 * expanded voxels fill, so a house or staircase is one hit.
 */
export const pickShape = (
  plan: StructurePlan,
  ray: CameraRay,
  reach: number,
): ShapePick | undefined => {
  let best: ShapePick | undefined;
  for (let index = 0; index < plan.length; index++) {
    const bounds = shapeBounds(plan[index]);
    const boxMin: [number, number, number] = [
      bounds.min[0] * VOXEL_SIZE,
      bounds.min[1] * VOXEL_SIZE,
      bounds.min[2] * VOXEL_SIZE,
    ];
    const boxMax: [number, number, number] = [
      (bounds.max[0] + 1) * VOXEL_SIZE,
      (bounds.max[1] + 1) * VOXEL_SIZE,
      (bounds.max[2] + 1) * VOXEL_SIZE,
    ];
    const distance = rayBoxDistance(ray.origin, ray.direction, boxMin, boxMax);
    if (
      distance !== undefined &&
      distance <= reach &&
      (best === undefined || distance < best.distance)
    ) {
      best = { index, distance };
    }
  }
  return best;
};
