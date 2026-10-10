/**
 * Choosing which part a tap on the canvas meant.
 *
 * ## Why this marches the model's own field rather than testing boxes
 *
 * **Because a part's box is not its shape, and the gap between them is where a wrong part
 * gets picked.** The padding that keeps a shape's surface inside its box is a whole world
 * unit (`shapePadding`), so a sphere of radius a half has a box of radius one and a half —
 * three times its size. A tap that lands well clear of the sphere but inside that box selects
 * it, which is exactly the "I did not touch that" a person notices and cannot explain.
 *
 * So the tap is traced through the *folded* field — `pickAlong` over `operationsField`, the
 * same field the mesher samples — to the surface the person can actually see. The trace
 * answers where the surface is, and the part is then chosen as the one whose own surface is
 * nearest that point. Neither step knows about a box.
 *
 * ## Why the part is found by its own signed distance at the surface
 *
 * **Because the surface under the tap belongs to whichever part is nearest it there.** At a
 * point on the folded surface, the part that put the surface there has a signed distance of
 * about zero and every other part is further away, so the smallest absolute distance names
 * it. This is the same arithmetic the fold itself does to blend the parts — `sdShape` in the
 * part's own frame is one term of it — so a tap cannot disagree with the picture about where
 * a part's surface is.
 *
 * ## Why the surface point is moved into the part's own frame
 *
 * **Because a part may be turned and its own distance function does not know that.**
 * `@big-mesh-studios/csg` already has `rotate` and `conjugate` for exactly this — the fold
 * uses them to evaluate a primitive in its own frame — so the point the trace found is turned
 * by the inverse of the part's orientation and moved to its origin before `sdShape` is asked.
 * The rotation preserves lengths, so the distance that comes back is a world distance.
 */
import type { Vec3 } from "@big-mesh-studios/core";
import { conjugate, rotate } from "@big-mesh-studios/csg";
import {
  pickAlong,
  rayThroughScreen,
  toNdc,
  type Ray,
} from "@big-mesh-studios/picking";
import { primitiveHalfExtents, sdShape } from "@big-mesh-studios/sdf";
import type { PerspectiveCamera } from "@random-mesh/rmsl/scene";

import type { Part } from "../model/part";
import {
  DEFAULT_BUDGET,
  operationsField,
  partsToOperations,
} from "../model/mesh-model";
import type { ScreenPoint, ScreenSize } from "./move-handle";

/**
 * How far a tap reaches, in world units.
 *
 * **A thousand, which is most of the camera's own far plane.** A part is selected if the ray
 * meets its surface anywhere the camera can see it, and the framing keeps a model well inside
 * this — so the number is only here to keep a tap on empty space from tracing to something on
 * the far side of the scene.
 */
export const SELECT_REACH = 1000;

/**
 * How close to the surface a trace stops, in world units.
 *
 * **Half of the finest sample the mesher takes**, because that is the finest the surface is
 * drawn to and a trace that stopped sooner would report a point the picture does not show. A
 * tighter one costs steps and buys precision nothing on screen can use.
 */
const SURFACE_EPSILON = DEFAULT_BUDGET.voxelSize / 2;

/** A box, in whichever frame the caller is working in. */
export interface Bounds {
  readonly min: Vec3;
  readonly max: Vec3;
}

/**
 * The half-size of a part's own box, in the part's own frame.
 *
 * **The primitive's half-extents and nothing else.** This is deliberately *not* the padded
 * box the mesher stores a shape's surface in — that box carries a whole world unit of slack
 * so the BVH cannot miss an operation, and around a part a couple of units across it would
 * draw an outline at twice the part. Since the tap is traced to the true surface now (see the
 * header), the outline is free to be the primitive's own extent, which is what a person reads
 * as "this part". A soft part's blend reaches a little past this; the box marks the primitive.
 */
export const partBoxHalf = (part: Part): Vec3 => primitiveHalfExtents(part.shape);

/** The box a part occupies in its own frame, centred on its origin. */
export const partLocalBox = (part: Part): Bounds => {
  const half = partBoxHalf(part);
  return {
    min: { x: -half.x, y: -half.y, z: -half.z },
    max: { x: half.x, y: half.y, z: half.z },
  };
};

/**
 * A world point in the part's own frame.
 *
 * **Moved to the part's origin and then turned by the inverse of its orientation.**
 * `conjugate` of a unit quaternion is its inverse, so this is the same frame `sdShape`
 * measures in and the same transform the fold applies.
 */
export const pointInPartFrame = (part: Part, point: Vec3): Vec3 => {
  const inverse = conjugate(part.orientation);
  return rotate(
    {
      x: point.x - part.origin.x,
      y: point.y - part.origin.y,
      z: point.z - part.origin.z,
    },
    inverse,
  );
};

/** How far a world point is from a part's own surface, whatever its boolean. */
export const distanceToPart = (part: Part, point: Vec3): number =>
  sdShape(part.shape, pointInPartFrame(part, point));

/**
 * The part whose own surface passes nearest `point`.
 *
 * **The smallest absolute signed distance.** A point on the folded surface is on the surface
 * of whichever part put it there — that part's distance is about zero and the others are not —
 * so the nearest surface names it. A point equidistant from two parts is genuinely ambiguous
 * and the earlier part wins, which at least makes the answer stable.
 */
export const closestPart = (
  parts: readonly Part[],
  point: Vec3,
): Part | undefined => {
  let best: Part | undefined;
  let bestAway = Infinity;
  for (const part of parts) {
    const away = Math.abs(distanceToPart(part, point));
    if (away < bestAway) {
      bestAway = away;
      best = part;
    }
  }
  return best;
};

/**
 * The part under a ray, or `undefined` for empty space.
 *
 * **The ray is traced to the visible surface and the part chosen there**, so a tap selects
 * what is drawn under it rather than what happens to be boxed around it. A ray that meets no
 * surface — a tap on the sky, or a model made only of subtractions, which has no surface to
 * meet — answers nothing, and the caller clears the selection.
 */
export const pickPart = (
  parts: readonly Part[],
  ray: Ray,
  reach: number = SELECT_REACH,
): Part | undefined => {
  if (parts.length === 0) return undefined;

  // The folded field the mesher samples, so the surface the tap is tested against is the
  // surface on screen. Built per tap rather than held, because a tap is rare and a held field
  // would be a second thing to keep in step with the model.
  const field = operationsField(partsToOperations(parts), DEFAULT_BUDGET);
  const hit = pickAlong(field, ray, { reach, epsilon: SURFACE_EPSILON });
  if (hit === undefined) return undefined;

  return closestPart(parts, hit.point);
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
