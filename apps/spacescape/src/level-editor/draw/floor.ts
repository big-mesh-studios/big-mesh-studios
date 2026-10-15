/**
 * A drawn outline, and the shape it becomes.
 *
 * **Pure, like `plane.ts` beside it: no DOM, no camera, no scene.** The split mirrors the one
 * `plane.ts` draws — the arithmetic a shape needs is here, and everything that needs a canvas
 * is in `app.tsx`. `walls.ts` builds operations; this builds a `LevelShape`, because a floor is
 * a level *shape* rather than a kind of its own (ADR 0053).
 *
 * ## Why the outline is stored in the shape's own plane
 *
 * **Every other primitive's parameters are local, and this one is no exception.** The world
 * points a person drew are only meaningful relative to a plane, and storing the plane's basis
 * beside them would be a second way of saying the same positions. Projecting onto
 * `(axisA, axisB)` and subtracting the centre costs two dot products per vertex once, and it
 * buys three things: the item rotates with `orientation` the way every other shape does, a level
 * file is diffable against another one drawn elsewhere, and `halfExtents` — which the BVH indexes
 * by, and which must be symmetric about the operation's own origin — has a centre to be symmetric
 * about.
 */

import type { Quat, Vec3 } from "@big-mesh-studios/core";
import { rotate } from "@big-mesh-studios/csg";
import { PRIMITIVES } from "@big-mesh-studios/sdf";
import type { OutlinePoint, ShapeType } from "@big-mesh-studios/sdf";

import { quatFromBasis } from "../../places/level/walls";
import type { DrawnFloor } from "./draw-lines-controller";
import type { DrawingPlane } from "./plane";

/**
 * How many points an outline may have, read from the table rather than written here.
 *
 * **One source of truth for a number that appears in three places** — the primitive's parameter
 * declaration, the level reader's refusal message, and this. A floor that drew itself 65 points
 * would be refused by a limit this file did not know about.
 */
export const floorPointBounds = (): readonly [number, number] => {
  const parameter = PRIMITIVES.Polygon.parameters.find(
    (candidate) => candidate.arity === "variable",
  );
  if (parameter === undefined || parameter.arity !== "variable") {
    throw new Error("the Polygon table entry has no outline parameter");
  }
  return [parameter.minPoints, parameter.maxPoints];
};

/** The shape type this file builds, named so a caller does not spell it twice. */
export const FLOOR_SHAPE: ShapeType = "Polygon";

/**
 * How close two points have to be to count as the same one.
 *
 * **A world-space epsilon, and not exact equality**, because a person closing a loop does it
 * by snapping and the snap is to a screen-space radius, so the vertex that lands on the first
 * one is near it rather than on it. A floor of about a centimetre on this world's ten-unit
 * voxels is far below anything a person can see and far above the error a snap can leave.
 */
const SAME_POINT = 0.01;

const samePoint = (a: Vec3, b: Vec3): boolean =>
  Math.abs(a.x - b.x) <= SAME_POINT &&
  Math.abs(a.y - b.y) <= SAME_POINT &&
  Math.abs(a.z - b.z) <= SAME_POINT;

/**
 * The drawn plane's basis, as the shape's own frame: which world direction its local `x`,
 * `y` and `z` axes point in.
 *
 * **`axisB` is not the third one, and that is not a detail.** `onbFromDirection` hands back
 * `(axisA, axisB, up)` right-handed — `axisA × axisB = up` — so `(axisA, up, axisB)` is a
 * *transposition* of that, which flips the handedness. A frame whose determinant is −1 is a
 * reflection rather than a rotation, so no quaternion represents it: `quatFromBasis` extracts
 * something, it just does not reproduce the basis, and the shape lands mirrored about its own
 * `up` — a floor on the wrong side of the ground, which still meshes and still renders.
 *
 * **So the third axis is computed rather than taken, and it is unit because `axisA` and `up`
 * are perpendicular by construction.** That makes the frame right-handed by definition rather
 * than by remembering which permutation of three vectors preserves handedness, and it keeps the
 * shape's local `z` meaning one thing: the direction `axisA × up` points.
 */
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

/** The dot product of two vectors, which is how a point is projected onto a frame's axis. */
const project = (point: Vec3, axis: Vec3): number =>
  point.x * axis.x + point.y * axis.y + point.z * axis.z;

/** Twice the signed area of the triangle `a`, `b`, `c` — positive when it turns one way. */
const orientation = (a: Vec3, b: Vec3, c: Vec3): number =>
  (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);

/**
 * Whether two segments cross, touching excluded.
 *
 * **Strict on every side, so a shared endpoint is not a crossing.** Edges that share a vertex
 * are excluded before this is called; the remaining case is two edges that graze, which this
 * calls simple. That is the forgiving direction, and the stricter gate is the level reader's
 * refusal of two consecutive identical points — a shape nobody drew is a better thing to catch
 * at the door than to reason about here.
 */
const segmentsCross = (a0: Vec3, a1: Vec3, b0: Vec3, b1: Vec3): boolean => {
  const d1 = orientation(a0, a1, b0);
  const d2 = orientation(a0, a1, b1);
  const d3 = orientation(b0, b1, a0);
  const d4 = orientation(b0, b1, a1);
  const opposite = (x: number, y: number): boolean =>
    (x > 0 && y < 0) || (x < 0 && y > 0);
  return opposite(d1, d2) && opposite(d3, d4);
};

/**
 * Whether an outline crosses itself.
 *
 * **O(n²), and run once per finish rather than per sample.** A mesh sample evaluates this
 * outline at millions of points; it cannot afford a pairwise test, and it does not need to —
 * `sdPolygon2D`'s crossing count is well defined for a self-intersecting outline and simply
 * reports one lobe inside and the other outside. The result is a floor with a puzzling bite
 * out of it rather than a NaN, which is survivable. A bite is not, so this is where it is
 * caught, on the one press that decides whether the floor exists.
 *
 * **Adjacent edges are excluded**, including the first and the last, which share a vertex
 * because the outline is closed.
 */
export const outlineIsSimple = (points: readonly Vec3[]): boolean => {
  const count = points.length;
  if (count < 3) return false;
  for (let i = 0; i < count; i++) {
    const a0 = points[i]!;
    const a1 = points[(i + 1) % count]!;
    for (let j = i + 1; j < count; j++) {
      // Adjacent in the closed loop, which is what excludes every shared vertex.
      if (j === i + 1 || (i === 0 && j === count - 1)) continue;
      if (segmentsCross(a0, a1, points[j]!, points[(j + 1) % count]!)) {
        return false;
      }
    }
  }
  return true;
};

/**
 * Drops a repeated closing point, and everything a closed loop brought with it.
 *
 * **The closing vertex is the same point as the first, and a polygon needs three distinct
 * ones.** Keeping it would give the reader two consecutive identical points, which it refuses
 * — and it would give the distance function an edge of no length, which divides by zero.
 * A person closing a drawn loop produces exactly this, so it is the normal case and not an
 * error.
 */
export const openOutline = (
  chain: readonly Vec3[],
): readonly Vec3[] | undefined => {
  const [minimum] = floorPointBounds();
  if (chain.length < minimum) return undefined;
  const first = chain[0]!;
  const last = chain[chain.length - 1]!;
  // **A chain of exactly the minimum is kept even though nothing closes it**, because three
  // points already enclose an area: the loop closes from the last back to the first whether
  // or not the person walked it. Requiring a repeated closing point here would refuse every
  // triangle drawn as a triangle, which is a thing people draw.
  const withoutClose =
    chain.length > minimum && samePoint(first, last)
      ? chain.slice(0, -1)
      : chain;
  return withoutClose.length >= minimum ? withoutClose : undefined;
};

/**
 * Why a chain cannot become a floor, or nothing when it can.
 *
 * **A string rather than a boolean, because the UI has to say which of four things is wrong.**
 * "You need three points" and "that loop crosses itself" are both refusals and they call for
 * different next presses, and a person who is told only "no" will try the same thing again.
 */
export const floorRefusal = (
  chains: readonly (readonly Vec3[])[],
): string | undefined => {
  const [minimum, maximum] = floorPointBounds();
  const kept = chains.filter((chain) => chain.length > 0);
  if (kept.length === 0) return "Draw a closed outline first";
  if (kept.length > 1) {
    return `A floor is one outline — undo the ${kept.length - 1} other ${kept.length === 2 ? "line" : "lines"}`;
  }
  const outline = openOutline(kept[0]!);
  if (outline === undefined) {
    return `Too short: a floor needs at least ${minimum} points`;
  }
  if (outline.length > maximum) {
    return `A floor takes at most ${maximum} points, and this has ${outline.length}`;
  }
  if (!outlineIsSimple(outline)) {
    return "That outline crosses itself — a floor's outline has to be one loop";
  }
  return undefined;
};

/** What a floor's geometry needs, given the outline and the plane it was drawn in. */
export interface FloorPlacement {
  /** The middle of the outline's bounding box, in world space. The slab's mid-plane. */
  readonly at: Vec3;
  /** The drawn plane's basis, so the item turns with everything else. */
  readonly orientation: Quat;
  /** The outline in the shape's own XZ plane, relative to `at`. */
  readonly points: readonly OutlinePoint[];
}

/**
 * The bounding box centre of an outline, in the plane's own coordinates.
 *
 * **The centre rather than the mean of the vertices**, and that is the same reason
 * `wallsCentre` uses one: `operationBoundsOf` rotates the eight corners of a *symmetric*
 * half-box about the operation's origin, so a shape indexed about anything else leaves part of
 * its own surface outside the box and re-meshes nothing when it changes. A bounding-box centre
 * is the midpoint of the box `halfExtents` reports, for any outline.
 */
export const floorCentre = (
  outline: readonly Vec3[],
  plane: DrawingPlane,
): Vec3 => {
  const first = outline[0];
  if (first === undefined) return { ...plane.origin };
  let minA = Infinity;
  let maxA = -Infinity;
  let minB = Infinity;
  let maxB = -Infinity;
  let minH = Infinity;
  let maxH = -Infinity;
  for (const point of outline) {
    const a = project(point, plane.axisA);
    const b = project(point, plane.axisB);
    // **The height is the projection onto `up`, and not the point's world `y`.** On the
    // ground those are the same number, which is why reading a world `y` here looks right on
    // every planet's equator and wrong at every other point of it — up is a function of
    // where you are (ADR 0037), and a plane drawn forty degrees off the vertical has points
    // whose world `y` says nothing about how far they are from each other along the plane's
    // own normal.
    const h = project(point, plane.up);
    if (a < minA) minA = a;
    if (a > maxA) maxA = a;
    if (b < minB) minB = b;
    if (b > maxB) maxB = b;
    if (h < minH) minH = h;
    if (h > maxH) maxH = h;
  }
  const centreA = (minA + maxA) / 2;
  const centreB = (minB + maxB) / 2;
  const centreH = (minH + maxH) / 2;
  // **No `plane.origin` here, and that is the whole of the arithmetic.** The projections are
  // of the absolute world points, so they are already absolute: a point on a plane whose
  // origin is a hundred units away has a projection a hundred units along it. Rebuilding
  // from `plane.origin` as well would count that origin twice, which is invisible on the
  // ground and wrong everywhere else.
  //
  // **And `(axisA, axisB, up)` is an orthonormal basis, so the three projections rebuild the
  // point exactly** — which is the licence for doing this at all.
  return {
    x: centreA * plane.axisA.x + centreB * plane.axisB.x + centreH * plane.up.x,
    y: centreA * plane.axisA.y + centreB * plane.axisB.y + centreH * plane.up.y,
    z: centreA * plane.axisA.z + centreB * plane.axisB.z + centreH * plane.up.z,
  };
};

/**
 * A drawn outline, and the shape it becomes.
 *
 * **The slab is centred on `at` in its own plane, so `at.y` is its mid-plane.** That keeps
 * `halfExtents` symmetric about the operation's origin, which is what the BVH needs, and it
 * means the floor's surfaces are `at.y ± len / 2` rather than `at.y` and `at.y + len`. The
 * alternative — standing the slab on its line the way a wall does — would put the shape's
 * extent on one side of where it is indexed, which is the trap `draw-walls-plan.md` recorded.
 */
export const floorPlacement = (
  outline: readonly Vec3[],
  plane: DrawingPlane,
): FloorPlacement => {
  const at = floorCentre(outline, plane);
  // **Projected onto the frame's own three axes rather than onto `(axisA, axisB)`.** The
  // drawing happens in the plane, so a point's `up` component is zero and only two of the
  // three matter — but writing them as `axisA` and `axisB` would say the shape's local `z` is
  // `axisB`, which is the left-handed frame this whole file exists to not build.
  const ez = cross(plane.axisA, plane.up);
  const points = outline.map((point) => {
    const from = {
      x: point.x - at.x,
      y: point.y - at.y,
      z: point.z - at.z,
    };
    return {
      x: project(from, plane.axisA),
      z: project(from, ez),
    };
  });
  return {
    at,
    orientation: quatFromBasis(plane.axisA, plane.up, ez),
    points,
  };
};

/**
 * The world points and the plane an outline was drawn in, read back out of a finished shape.
 *
 * **The inverse of `floorPlacement`, and it has to be exact or "Edit outline" moves the
 * floor.** `planeThrough` cannot stand in for it: it builds a fresh basis with
 * `onbFromDirection`, and a different basis in the same plane is a different *set of
 * coordinates for the same points* — except for the centre, which `floorCentre` takes as the
 * bounding box of the outline **in that basis**. Rotating the basis inside a plane rotates the
 * box, so the centre moves by up to the difference between two enclosing boxes. A person who
 * pressed Edit outline and pressed Finish again without moving a point would watch the floor
 * slide across the room.
 *
 * **So the frame is recovered from the orientation rather than rebuilt from the normal**, and
 * `floorPlacement` then reproduces the same `at`, the same quaternion and the same local
 * coordinates. `rotate` is the engine's own, which is what the fold uses to get a point into a
 * shape's frame — computing it here a second time would be a second thing to get wrong.
 *
 * **The outline that comes back is its projection onto the plane**, which is the identity for
 * an outline the draw tool made, because every point there is a ray met with the plane and so
 * already lies in it. A shape whose outline somehow does not lie in its plane — which nothing
 * in this editor can produce, and which the reader does not check — would be flattened onto
 * its plane on the way through here. That is the one case where this is not an inverse, and
 * it is stated rather than defended against because defending it would mean carrying the
 * off-plane component through a frame that has no axis to carry it on.
 */
export const floorDrawing = (
  points: readonly OutlinePoint[],
  at: Vec3,
  orientation: Quat,
): DrawnFloor => {
  const axisA = rotate({ x: 1, y: 0, z: 0 }, orientation);
  const up = rotate({ x: 0, y: 1, z: 0 }, orientation);
  const ez = rotate({ x: 0, y: 0, z: 1 }, orientation);
  // **The plane's own `axisB` is the negated `ez`,** which is the whole of the handedness
  // argument in `floorPlacement`: `DrawingPlane` wants `(axisA, axisB, up)` right-handed
  // because that is how `planeCoords` reads a point off the plane, and `floorPlacement`
  // derives its third axis rather than taking `axisB` for exactly that reason.
  const plane: DrawingPlane = {
    origin: at,
    up,
    axisA,
    axisB: cross(up, axisA),
  };
  return {
    plane,
    outline: points.map((point) => ({
      x: at.x + point.x * axisA.x + point.z * ez.x,
      y: at.y + point.x * axisA.y + point.z * ez.y,
      z: at.z + point.x * axisA.z + point.z * ez.z,
    })),
  };
};
