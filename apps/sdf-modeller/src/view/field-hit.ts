/**
 * Where the brush is, found at the surface rather than on a facet.
 *
 * ## Why a raycast and then a Newton step, and not one or the other
 *
 * **Because each is bad at the thing the other is good at.** A sphere trace is exact at any
 * resolution but has no upper bound on its steps: `packages/picking` documents a grazing ray
 * needing six hundred, and a brush cursor is dragged along exactly the silhouettes where rays
 * graze. A triangle raycast is constant-time and predictable but lands on a facet of whatever
 * mesh it was given — which for the reference mesh means up to half of one 0.25-unit voxel off
 * the true surface.
 *
 * So the ray finds *approximately* where the surface is, cheaply, and three Newton steps take
 * it the rest of the way against the field itself. The result is a point exact to `epsilon` at
 * any mesh resolution, with a step count that does not depend on the angle of incidence.
 *
 * ## Why this matters more than it looks
 *
 * **Because the whole of M2 and M3 is built on the brush landing where a person aimed.** The
 * journal stores dab centres in part-local space and the rasteriser projects a disc along the
 * surface normal at that point. A brush a fraction of a voxel off puts every stroke a fraction
 * of a voxel off — which is invisible per stroke and becomes a visible smear across a
 * hundred of them on a curved surface, at a distance that grows with how far the surface is
 * from flat.
 *
 * ## Why the part index is answered here rather than by the caller
 *
 * **Because a dab is stored part-local and something has to say which part that is.** It is
 * the same question `pick-part.ts` answers for a tap, by the same arithmetic — the part whose
 * own surface is nearest the point — and answering it in two places would be two chances to
 * disagree about which part a stroke belongs to.
 */

import type { Vec3 } from "@big-mesh-studios/core";
import {
  pickAlong,
  rayThroughScreen,
  toNdc,
  type PickField,
} from "@big-mesh-studios/picking";
import type { PerspectiveCamera } from "@random-mesh/rmsl/scene";

import { distanceToPart, partIndexAt } from "./pick-part";
import type { ScreenPoint, ScreenSize } from "./move-handle";

/**
 * How close a brush hit gets to the true surface, in world units.
 *
 * **A hundredth of the reference voxel**, so a stroke lands four times finer than the mesh it
 * was found on and the residual is not something anybody can see on a curve. The cost of a
 * tighter one is a step; the cost of a looser one is the whole reason this file exists.
 */
export const BRUSH_EPSILON = 0.01;

/** Newton steps taken from the trace's end point. Three is a quadratic convergence budget. */
const REFINE_STEPS = 3;

/**
 * How far the sphere trace reaches, in world units.
 *
 * **A thousand, which is the same reach `pickPart` uses** — most of the camera's own far plane,
 * and a figure is a few units across inside it. A number here rather than a trace that runs out
 * is a trace that runs out.
 */
const REACH = 1000;

/**
 * How close the sphere trace stops, in world units.
 *
 * **Half the mesher's voxel, which is what `pickPart` uses and why.** This is the coarse stage;
 * {@link BRUSH_EPSILON} is the fine one, reached by Newton rather than by walking. Stopping
 * directly at a hundredth of a unit would cost many more steps to save three.
 */
const TRACE_EPSILON = 0.125;

/** A place on the model's surface, resolved as far as the field allows. */
export interface FieldHit {
  /** On the surface, to within {@link BRUSH_EPSILON}. */
  readonly point: Vec3;
  /** The outward normal there, from the field's gradient rather than from a facet. */
  readonly normal: Vec3;
  /** Which part put this surface here, which is what the dab is stored against. */
  readonly part: number;
}

/** What this file needs from a model, and nothing else. */
export interface BrushSurface {
  /** The folded field. The brush asks it for the surface and gets an exact answer. */
  readonly field: PickField;
  /** How many parts there are, and their own distance functions, for naming the surface. */
  readonly partCount: number;
  readonly partDistance: (part: number, point: Vec3) => number;
}

/**
 * Walks a point onto the surface of a field.
 *
 * **A Newton step on the signed distance, not a fixed march.** The surface is where `d` is
 * zero, and `∇d` points away from it, so subtracting `d · ∇d` lands on it — and near the
 * surface, where every step after the first is taken, that is quadratic rather than linear.
 * A fixed march would need as many steps as the starting error is large in units of `epsilon`,
 * which is a number nobody knows at the call site.
 */
const refine = (field: PickField, from: Vec3): Vec3 => {
  let x = from.x;
  let y = from.y;
  let z = from.z;
  for (let step = 0; step < REFINE_STEPS; step++) {
    const distance = field.distance(x, y, z);
    if (Math.abs(distance) <= BRUSH_EPSILON) break;
    const gradient = field.gradient(x, y, z);
    x -= distance * gradient.x;
    y -= distance * gradient.y;
    z -= distance * gradient.z;
  }
  return { x, y, z };
};

/**
 * The surface under a ray, or `undefined` for a ray that misses.
 *
 * **The raycast is two-sided and unguarded**, because a model is drawn double-sided and a
 * cursor that vanished at a silhouette would be worse than one that is briefly on the far
 * surface. The refinement then pulls it to whichever surface the field actually says is
 * nearer, which is the one being looked at.
 */
export const fieldHitAlong = (
  surface: BrushSurface,
  origin: Vec3,
  direction: Vec3,
): FieldHit | undefined => {
  // **Sphere-traced, with no mesh involved at all.**
  //
  // This is `pickPart`'s own question asked with a held field instead of a fresh one, and it
  // works because select-mode picking already does exactly this and already works. The earlier
  // version raycast the *viewport* mesh first and only fell back to a trace, on the reasoning
  // that a trace is slow at grazing angles. That was a false economy: the viewport mesh is
  // meshed at whatever resolution the slider is on, so at a coarse setting it was too sparse to
  // hit, the brush stopped finding the surface, and the symptom was a brush that did nothing
  // and a cursor that never moved — with the atlas it was raycasting a *reference* mesh at a
  // fixed 0.25, which is why the same code worked before.
  //
  // **The trace's epsilon is the mesher's, and the refinement below is what tightens it.** A
  // tight epsilon costs steps; stopping at half a voxel and then taking three Newton steps is
  // both cheaper and better conditioned, because the steps after the first start on the surface.
  const near = pickAlong(
    surface.field,
    { origin, direction },
    { reach: REACH, epsilon: TRACE_EPSILON },
  )?.point;
  if (near === undefined) return undefined;

  const point = refine(surface.field, near);
  const gradient = surface.field.gradient(point.x, point.y, point.z);
  const length = Math.hypot(gradient.x, gradient.y, gradient.z);
  const normal =
    length === 0
      ? { x: 0, y: 1, z: 0 }
      : {
          x: gradient.x / length,
          y: gradient.y / length,
          z: gradient.z / length,
        };
  // **Turned to face the ray**, for the same reason `pick-part.ts` does: a disc laid on a
  // surface is the same disc from either side, and a cursor standing inside the model looks
  // like a cursor bug.
  const facing =
    normal.x * direction.x + normal.y * direction.y + normal.z * direction.z;
  const outward =
    facing < 0 ? { x: -normal.x, y: -normal.y, z: -normal.z } : normal;
  return { point, normal: outward, part: namePart(surface, point) };
};

/**
 * Which part put the surface at `point`.
 *
 * **The smallest absolute signed distance**, as `pick-part.ts` does for a tap, and for the
 * same reason: a point on the folded surface is on the surface of whichever part put it there,
 * so that part's distance is about zero and the others are not.
 */
const namePart = (surface: BrushSurface, point: Vec3): number =>
  partIndexAt(
    surface.partCount,
    (part) => surface.partDistance(part, point),
    point,
  );

/** The same question asked of a screen point, which is what the brush and the cursor ask. */
export const fieldHit = (
  surface: BrushSurface,
  camera: PerspectiveCamera,
  size: ScreenSize,
  pointer: ScreenPoint,
): FieldHit | undefined => {
  const ndc = toNdc(pointer.x, pointer.y, size.width, size.height);
  const ray = rayThroughScreen(camera, ndc.x, ndc.y);
  return fieldHitAlong(surface, ray.origin, ray.direction);
};

export { distanceToPart };
