/**
 * Choosing which part a tap on the canvas meant.
 *
 * ## Why a part is picked by its own box and not by tracing its field
 *
 * **Because a tap asks which part a person meant, and a trace through the folded field
 * answers where the surface is.** Every part already knows its own box: the primitive table
 * gives its half-extents and `shapePadding` gives the reach its softness adds. Testing a ray
 * against a few of those is arithmetic, and it selects the part a person aimed at even where
 * that part is behind a blend it is joined to — which a single surface could not distinguish.
 *
 * ## Why the ray is moved into the part's own frame
 *
 * **Because a part may be turned and its box may not.** `@big-mesh-studios/csg` already has
 * `rotate` and `conjugate` for exactly this — the fold uses them to evaluate a primitive in
 * its own frame — so a tap is tested by turning the ray by the inverse of the part's
 * orientation and moving it to the part's origin. That reduces an oriented-box test to the
 * same axis-aligned one a part with no turn gets, with no second rotation convention and no
 * rotated corners to rebound. The length of the ray is unchanged by the rotation, so the
 * distance the test reports is the world one.
 *
 * ## The one case where a part is skipped
 *
 * **A box the camera is inside is not selected.** A ray starting inside a box enters it at
 * distance zero, so the nearest crossing is always that one — and a person who has carved a
 * room out of a subtracted box could never select anything they built inside it. Only `Box`
 * is skipped, because every other primitive is one box too and the case this exists for is
 * specifically the subtracted box standing in for a room.
 */
import type { Vec3 } from "@big-mesh-studios/core";
import { conjugate, rotate } from "@big-mesh-studios/csg";
import { primitiveHalfExtents, shapePadding } from "@big-mesh-studios/sdf";
import { rayThroughScreen, toNdc, type Ray } from "@big-mesh-studios/picking";
import type { PerspectiveCamera } from "@random-mesh/rmsl/scene";

import type { Part } from "../model/part";
import type { ScreenPoint, ScreenSize } from "./move-handle";

/**
 * How far a tap reaches, in world units.
 *
 * **A thousand, which is most of the camera's own far plane.** A part is selected if the ray
 * meets its box anywhere the camera can see it, and the framing keeps a model well inside
 * this — so the number is only here to keep a tap on empty space from reporting a part that
 * is somewhere off the far side of the scene.
 */
export const SELECT_REACH = 1000;

/** A box, in whichever frame the caller is working in. */
export interface Bounds {
  readonly min: Vec3;
  readonly max: Vec3;
}

/**
 * The half-size of a part's box, in the part's own frame.
 *
 * **The primitive's half-extents padded by `shapePadding`,** which is the same number the
 * mesher uses: a soft part reaches beyond its own box by exactly that much, and a box that
 * did not admit it would make a blended limb unpickable where it is softest.
 */
export const partBoxHalf = (part: Part): Vec3 => {
  const half = primitiveHalfExtents(part.shape);
  const padding = shapePadding(part.shape, part.softness);
  return {
    x: half.x + padding,
    y: half.y + padding,
    z: half.z + padding,
  };
};

/** The box a part occupies in its own frame, centred on its origin. */
export const partLocalBox = (part: Part): Bounds => {
  const half = partBoxHalf(part);
  return {
    min: { x: -half.x, y: -half.y, z: -half.z },
    max: { x: half.x, y: half.y, z: half.z },
  };
};

/**
 * Where a ray crosses a box, or `undefined` if it misses.
 *
 * **The slab method**, with a negative near side clamped to zero so a box the ray starts
 * inside comes back as distance zero rather than being skipped — which is what makes the
 * camera-inside case in {@link pickPart} need its own check rather than falling out of the
 * arithmetic.
 */
export const rayBoxDistance = (ray: Ray, box: Bounds): number | undefined => {
  let near = -Infinity;
  let far = Infinity;

  for (const axis of ["x", "y", "z"] as const) {
    const origin = ray.origin[axis];
    const direction = ray.direction[axis];
    if (direction === 0) {
      // Parallel to this slab: a hit only if the origin is already between the planes.
      if (origin < box.min[axis] || origin > box.max[axis]) return undefined;
      continue;
    }
    const enter = (box.min[axis] - origin) / direction;
    const leave = (box.max[axis] - origin) / direction;
    near = Math.max(near, Math.min(enter, leave));
    far = Math.min(far, Math.max(enter, leave));
    if (near > far) return undefined;
  }

  if (far < 0) return undefined;
  return near < 0 ? 0 : near;
};

/** Whether a point is inside a box, on every face included. */
export const boxContains = (point: Vec3, box: Bounds): boolean =>
  point.x >= box.min.x &&
  point.x <= box.max.x &&
  point.y >= box.min.y &&
  point.y <= box.max.y &&
  point.z >= box.min.z &&
  point.z <= box.max.z;

/**
 * The ray as the part's own frame sees it.
 *
 * **The world point moved to the part's origin and then turned by the inverse of its
 * orientation.** `conjugate` of a unit quaternion is its inverse, and the direction is only
 * turned — a ray has no position of its own to move.
 */
export const rayInPartFrame = (part: Part, ray: Ray): Ray => {
  const inverse = conjugate(part.orientation);
  return {
    origin: rotate(
      {
        x: ray.origin.x - part.origin.x,
        y: ray.origin.y - part.origin.y,
        z: ray.origin.z - part.origin.z,
      },
      inverse,
    ),
    direction: rotate(ray.direction, inverse),
  };
};

/**
 * The nearest part a ray crosses within `reach`, or `undefined` for none.
 *
 * **Every part, and the nearest wins.** They are not tested in fold order, because a person
 * tapping a shape wants the shape they can see rather than the first one that happens to
 * contain the point — and the part in front may be a subtraction they made to cut a hole.
 */
export const pickPart = (
  parts: readonly Part[],
  ray: Ray,
  reach: number = SELECT_REACH,
): Part | undefined => {
  let best: Part | undefined;
  let bestDistance = Infinity;

  for (const part of parts) {
    const local = rayInPartFrame(part, ray);
    const box = partLocalBox(part);
    // The one skip. A camera inside a subtracted box would otherwise select that box for
    // every tap, forever. See the header.
    if (part.shape.type === "Box" && boxContains(local.origin, box)) continue;

    const distance = rayBoxDistance(local, box);
    if (distance === undefined || distance > reach) continue;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = part;
    }
  }

  return best;
};

/**
 * The part under a tap on the canvas, or `undefined` for empty space.
 *
 * **The screen point is in the canvas's own CSS pixels**, which is what a pointer event
 * reduced to canvas-local coordinates gives — the same space the move handles measure in.
 * The camera is updated first, because a ray read from a matrix the last frame left behind
 * would pick the part where the view *was*.
 */
export const pickPartAt = (
  parts: readonly Part[],
  camera: PerspectiveCamera,
  size: ScreenSize,
  point: ScreenPoint,
  reach: number = SELECT_REACH,
): Part | undefined => {
  camera.updateMatrixWorld();
  const ndc = toNdc(point.x, point.y, size.width, size.height);
  const ray = rayThroughScreen(camera, ndc.x, ndc.y);
  return pickPart(parts, ray, reach);
};
