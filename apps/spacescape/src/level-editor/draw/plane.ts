/**
 * The horizontal plane a wall is drawn in, and the arithmetic on it.
 *
 * ## What this file is
 *
 * **The drawing plane and nothing else.** The person picks a first point, that point and the
 * frame's own up at it make a plane, and every later point is where the pointer's ray meets
 * that plane (`rayPlanePoint`). Everything the gesture does that can be *wrong* — which point
 * a drag means, how long the segment is, which way it is turned, what a snap does to it — is
 * arithmetic on this plane, and it is here, with no renderer, no camera and no DOM, so it can
 * be tested against numbers.
 *
 * The controller (`draw-lines-controller.ts`) holds the *state* — the vertices, the current
 * aim, which lock is on — and calls into this. Splitting the two is the same split
 * `view/move-handle.ts` makes from `view/move-handles.ts`, and for the same reason: the part
 * with an answer that can be wrong is testable on its own, and the part that draws is not.
 *
 * ## Why the plane's normal is the frame's up, and not `+Y`
 *
 * **Because a wall stands up wherever it is drawn, and up is a function of position**
 * ([ADR 0037](../../../../docs/adr/0037-up-is-a-function-of-where-you-are.md)). On a flat
 * world the frame's up is `+Y` at every point; on a planet it points away from the centre, so
 * a wall drawn at the equator stands at right angles to one drawn at the pole. Hard-coding
 * `+Y` would make the equator's walls stand and the pole's lie flat — a difference that only
 * shows on a world nobody has built a level on yet, which is the worst time to find it.
 * `world/up.ts` already answers "which way is up here"; this asks it.
 *
 * ## Why the basis comes from `onbFromDirection`
 *
 * **Because the obvious basis has a degenerate input.** A cross product against a fixed axis
 * fails wherever the plane's normal is parallel to it, and the fix people reach for — pick
 * whichever of two fixed axes is further away — introduces a discontinuity where the choice
 * changes. `onbFromDirection` (Duff et al., in `@big-mesh-studios/core`) is continuous and
 * total, which is what the angle readout needs: an angle that jumps a quarter turn as a wall
 * is dragged across a line would read as the tool losing its place.
 *
 * ## Why an angle is measured from `axisA` toward `axisB`
 *
 * **Because it is the plane's own basis, not the world's, and the two are only the same on a
 * flat world.** A level is drawn in the plane the person made, so "0°, 90°, 180°" are this
 * plane's directions and the inspector says so by showing degrees beside the length. On a
 * flat world `axisA` happens to be `+X`, but nothing here depends on that.
 */

import type { Vec3 } from "@big-mesh-studios/core";
import {
  add,
  dot,
  normalize,
  onbFromDirection,
  scale,
  sub,
} from "@big-mesh-studios/core";
import type { Ray } from "@big-mesh-studios/picking";

import type { ScreenPoint } from "../view/move-handle";

/**
 * A plane to draw in: a point on it, the direction up from it, and two unit tangents its
 * directions are named against.
 *
 * **`axisA` and `axisB` are derived from `up`, not stored independently**, so a plane cannot
 * be built whose basis disagrees with its normal — the disagreement would be a plane whose
 * angles are measured in some other plane.
 */
export interface DrawingPlane {
  readonly origin: Vec3;
  /** The normal, unit. "Up" out of the plane, from the frame at the origin. */
  readonly up: Vec3;
  /** The tangent an angle of zero points along, unit. */
  readonly axisA: Vec3;
  /** The tangent an angle of ninety points along, unit. */
  readonly axisB: Vec3;
}

/** A point on the canvas, in CSS pixels from its top left. Reused from the move handles. */
export type { ScreenPoint };

/** The plane through `origin` with `up` as its normal, and the tangent basis that implies. */
export const planeThrough = (origin: Vec3, up: Vec3): DrawingPlane => {
  const normalized = normalize(up);
  // **A zero normal becomes world up rather than a plane with no basis.** `normalize` answers
  // the zero vector with zero, and a zero `up` would make both tangents zero as well — a plane
  // on which no point has a direction, and therefore no angle and no lock. Up is the only
  // sensible default, and it is the one `world/up.ts` uses at a planet's exact centre.
  const normal =
    normalized.x === 0 && normalized.y === 0 && normalized.z === 0
      ? { x: 0, y: 1, z: 0 }
      : normalized;
  const { b1, b2 } = onbFromDirection(normal);
  return { origin, up: normal, axisA: b1, axisB: b2 };
};

/** Below this, a ray is treated as parallel to the plane rather than as a very far hit. */
const PARALLEL = 1e-9;

/**
 * Where a ray meets the plane, or `undefined` when it does not.
 *
 * **`undefined` for a ray that is parallel and for one that meets the plane behind its own
 * origin**, and both are the honest answer rather than a very large point. A camera looking
 * along the plane never meets it; a camera looking away from the plane meets it behind the
 * eye, and returning that point would put the aim of a wall on the far side of the camera —
 * mirrored into the view exactly as a projected point behind the eye is (`projectToScreen`
 * in `view/move-handle.ts` makes the same refusal). The caller wants a point in front or
 * nothing at all.
 */
export const rayPlanePoint = (
  ray: Ray,
  plane: DrawingPlane,
): Vec3 | undefined => {
  const denominator = dot(ray.direction, plane.up);
  if (Math.abs(denominator) < PARALLEL) return undefined;
  const t = dot(sub(plane.origin, ray.origin), plane.up) / denominator;
  if (t <= 0) return undefined;
  return add(ray.origin, scale(ray.direction, t));
};

/** A point's place in the plane's own two dimensions. */
export interface PlaneCoords {
  /** Distance along `axisA`. */
  readonly a: number;
  /** Distance along `axisB`. */
  readonly b: number;
}

/** A point on the plane, as the two coordinates the plane's basis names. */
export const planeCoords = (point: Vec3, plane: DrawingPlane): PlaneCoords => {
  const offset = sub(point, plane.origin);
  return { a: dot(offset, plane.axisA), b: dot(offset, plane.axisB) };
};

/** The world point two plane coordinates name. The inverse of `planeCoords`. */
export const planePoint = (plane: DrawingPlane, a: number, b: number): Vec3 =>
  add(plane.origin, add(scale(plane.axisA, a), scale(plane.axisB, b)));

/** A segment's two numbers, in the units the reader shows them in. */
export interface Segment {
  /** Length in world units. */
  readonly length: number;
  /** Turn from `axisA` toward `axisB`, in degrees, in `(-180, 180]`. */
  readonly angle: number;
}

/**
 * A segment's length and turn, in the plane.
 *
 * **Degrees, because the inspector's other angle is** — `PropertiesPanel`'s rotation fields
 * are degrees, and a length/angle readout beside them in radians would be a second convention
 * on one screen.
 */
export const segmentOf = (
  start: Vec3,
  to: Vec3,
  plane: DrawingPlane,
): Segment => {
  const offset = sub(to, start);
  const a = dot(offset, plane.axisA);
  const b = dot(offset, plane.axisB);
  return {
    length: Math.hypot(a, b),
    angle: (Math.atan2(b, a) * 180) / Math.PI,
  };
};

/** The point a length and a turn reach from `start`. The inverse of `segmentOf`. */
export const pointFromSegment = (
  start: Vec3,
  length: number,
  angle: number,
  plane: DrawingPlane,
): Vec3 => {
  const radians = (angle * Math.PI) / 180;
  return add(
    start,
    add(
      scale(plane.axisA, length * Math.cos(radians)),
      scale(plane.axisB, length * Math.sin(radians)),
    ),
  );
};

/**
 * Which direction a segment is held against.
 *
 * **Two plane axes and "continue", and no "up".** The reference project offers `X`, `Y` and
 * `Z` because it draws in any plane; here the plane's normal is already up and the segment
 * can only point along the two tangents, so a third axis would be a lock that always does
 * nothing — which reads as a broken button rather than as an absent one.
 */
export type AngleLock = "none" | "a" | "b" | "nearest" | "continue";

/** The point on the line through `start` along `axis` nearest to `to`. */
const projectOntoAxis = (start: Vec3, to: Vec3, axis: Vec3): Vec3 =>
  add(start, scale(axis, dot(sub(to, start), axis)));

/**
 * `to` with the current lock applied, or `to` untouched when the lock is `none`.
 *
 * **`continue` uses the previous segment's own direction**, which is the lock that makes a
 * hand-drawn corner square: the next wall runs straight on from the last one where the person
 * asked for it, and free where they did not. An absent or zero `previous` leaves `to` alone
 * rather than locking to a direction that does not exist.
 */
export const applyAngleLock = (
  start: Vec3,
  to: Vec3,
  lock: AngleLock,
  plane: DrawingPlane,
  previous: Vec3 | undefined,
): Vec3 => {
  switch (lock) {
    case "none":
      return to;
    case "a":
      return projectOntoAxis(start, to, plane.axisA);
    case "b":
      return projectOntoAxis(start, to, plane.axisB);
    case "nearest": {
      /**
       * **Whichever of 0° and 90° the free aim is nearer to**, then exactly what that single-axis
       * lock would do — so the one button is the two buttons, chosen by the hand rather than by a
       * decision the person has to make twice.
       *
       * **The projection, not a turn at the same distance.** This is what keeps it identical to
       * `a` and `b`: a point dragged along the axis keeps its distance from the corner rather than
       * jumping to the radius of the free aim. `segmentOf` measures from `axisA` toward `axisB`,
       * so rounding its angle to the nearest quarter turn says which of the two axes the aim is
       * nearer: an even number of quarter turns is `0°` (or its back, `180°`), an odd number is
       * `90°` (or `-90°`). A tie on the diagonal rounds away from zero, which is as good a way to
       * break it as any and the same one the two explicit buttons never had to choose.
       */
      const { angle } = segmentOf(start, to, plane);
      const nearer =
        Math.round(angle / 90) % 2 === 0 ? plane.axisA : plane.axisB;
      return projectOntoAxis(start, to, nearer);
    }
    case "continue": {
      if (previous === undefined) return to;
      const direction = normalize(sub(previous, start));
      if (direction.x === 0 && direction.y === 0 && direction.z === 0)
        return to;
      return projectOntoAxis(start, to, direction);
    }
  }
};

/**
 * `to` turned to the nearest multiple of `stepDegrees` from `start`, at the same distance.
 *
 * **A step of zero is no step**, which is the "free" setting and the reason this is safe to
 * call unconditionally. `offsetDegrees` shifts the whole ladder, so a grid can be measured
 * from the first wall's angle rather than from the plane's axis.
 */
export const snapAngleTo = (
  start: Vec3,
  to: Vec3,
  plane: DrawingPlane,
  stepDegrees: number,
  offsetDegrees = 0,
): Vec3 => {
  if (!(stepDegrees > 0)) return to;
  const segment = segmentOf(start, to, plane);
  if (segment.length === 0) return to;
  const snapped =
    Math.round((segment.angle - offsetDegrees) / stepDegrees) * stepDegrees +
    offsetDegrees;
  return pointFromSegment(start, segment.length, snapped, plane);
};

/** A candidate the aim landed on, and how near it was on screen. */
export interface VertexSnap {
  readonly point: Vec3;
  /** Screen-space distance from the pointer, in CSS pixels. */
  readonly screenDistance: number;
}

/**
 * The nearest vertex to the pointer within `radius` CSS pixels, or `undefined`.
 *
 * **Measured on screen, not in the world**, which is the decision `view/move-handle.ts` makes
 * for the same reason: a fixed world distance is a large target when the camera is close and
 * an unhittable one when it is far, while a screen radius is the same size to the finger at
 * every zoom. A candidate the projection refuses — behind the camera — is skipped rather than
 * snapped to, because the projection would otherwise answer with a point mirrored into the
 * middle of the view.
 *
 * **The nearest wins**, and ties are impossible at these radii, so a snap onto two coincident
 * vertices is a snap onto the one the loop saw first, which is the one they share.
 */
export const snapToVertices = (
  candidates: readonly Vec3[],
  project: (point: Vec3) => ScreenPoint | undefined,
  pointer: ScreenPoint,
  radius: number,
): VertexSnap | undefined => {
  let closest: VertexSnap | undefined;
  for (const candidate of candidates) {
    const onScreen = project(candidate);
    if (onScreen === undefined) continue;
    const distance = Math.hypot(onScreen.x - pointer.x, onScreen.y - pointer.y);
    if (distance > radius) continue;
    if (closest === undefined || distance < closest.screenDistance) {
      closest = { point: candidate, screenDistance: distance };
    }
  }
  return closest;
};
