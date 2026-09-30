import type { Vector3 } from "@random-mesh/rmsl/scene";
import { VOXEL_SIZE } from "../../world/level-data";
import { pickFigure, type AimTarget } from "../../places/figure-pick";
import type { PlanItem, StructurePlan } from "../types";
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

/** Whether a point sits within an inclusive world-space box. */
const boxContainsPoint = (
  point: Vector3,
  boxMin: [number, number, number],
  boxMax: [number, number, number],
): boolean =>
  point.x >= boxMin[0] &&
  point.x <= boxMax[0] &&
  point.y >= boxMin[1] &&
  point.y <= boxMax[1] &&
  point.z >= boxMin[2] &&
  point.z <= boxMax[2];

/** A shape the ray crossed, and how far along it the crossing was. */
export interface ShapePick {
  index: number;
  distance: number;
}

/**
 * The standing box a select click tests a planned NPC or prop against. `half`
 * and `height` are the body its model drew when that has loaded, `yaw` the
 * heading it faces, and `y` the feet height a plan that left it to the
 * terrain resolves to.
 */
export interface FigureSpec {
  half: number;
  height: number;
  yaw: number;
  y: number;
}

/**
 * Reads the body to test a planned NPC or prop against, or undefined to test
 * the default body. A structure always returns undefined, meaning no figure
 * box competes with its own.
 */
export type FigureSpecFor = (item: PlanItem) => FigureSpec | undefined;

/** The body a figure is tested against before its model has loaded. */
export const DEFAULT_FIGURE_HALF = 0.6;
export const DEFAULT_FIGURE_HEIGHT = 2;

/** An item the ray crossed, and how far along it the crossing was. */
export interface ItemPick {
  /** The index into the items array the crossing belongs to. */
  index: number;
  distance: number;
}

/**
 * The nearest item in `plan` the ray crosses within `reach` world units, or
 * undefined where it crosses none. A structure is tested against the box its
 * expanded voxels fill — a house or staircase is one hit, and a box at the
 * ray's origin is skipped so a creator standing inside one can select the
 * structures built within it. An NPC or a prop is tested against the upright
 * box its figure stands as, turned to face the heading it draws with, exactly
 * the body the player's own crosshair aims at.
 */
export const pickItem = (
  items: PlanItem[],
  ray: CameraRay,
  reach: number,
  figureFor: FigureSpecFor = () => undefined,
): ItemPick | undefined => {
  const origin: [number, number, number] = [
    ray.origin.x,
    ray.origin.y,
    ray.origin.z,
  ];
  const direction: [number, number, number] = [
    ray.direction.x,
    ray.direction.y,
    ray.direction.z,
  ];
  let best: ItemPick | undefined;
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    let distance: number | undefined;
    if (item.type === "structure") {
      const bounds = shapeBounds(item.value);
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
      if (
        item.value.kind === "box" &&
        boxContainsPoint(ray.origin, boxMin, boxMax)
      ) {
        continue;
      }
      distance = rayBoxDistance(ray.origin, ray.direction, boxMin, boxMax);
    } else {
      const value = item.value;
      const spec = figureFor(item);
      const target: AimTarget = {
        id: value.id,
        x: value.x,
        y: spec?.y ?? value.y ?? 0,
        z: value.z,
        yaw: spec?.yaw ?? value.yaw ?? 0,
        half: spec?.half ?? DEFAULT_FIGURE_HALF,
        height:
          spec?.height ??
          (item.type === "prop"
            ? (item.value.height ?? DEFAULT_FIGURE_HEIGHT)
            : DEFAULT_FIGURE_HEIGHT),
      };
      distance = pickFigure(origin, direction, [target], reach)?.distance;
    }
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

/**
 * The nearest shape in `plan` the ray crosses within `reach` world units, or
 * undefined where it crosses none. Tested as the shapes of a plan of items,
 * so a select that cares only for structures names the same boxes `pickItem`
 * does.
 */
export const pickShape = (
  plan: StructurePlan,
  ray: CameraRay,
  reach: number,
): ShapePick | undefined =>
  pickItem(
    plan.map((value) => ({ type: "structure" as const, value })),
    ray,
    reach,
  );
