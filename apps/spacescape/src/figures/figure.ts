/**
 * Where a figure is, and how its world is turned into its own.
 *
 * ## Why this is a file of arithmetic and nothing else
 *
 * **Three things have to agree about a figure's placement — what is drawn, what the player
 * walks into, and what the cursor picks — and the only way three of them can agree is if they
 * are the same arithmetic.** So the placement is a value, the two directions out of it are
 * functions here, and the collider and the picker both use them. A second copy of "rotate the
 * point back by the yaw" would eventually be a sign error, and the symptom would be a figure
 * whose collision box rotated the other way from its mesh — which is the sort of bug that is
 * invisible until somebody walks into the corner of a car.
 *
 * ## A yaw and a uniform scale, and why nothing else
 *
 * **Because that is what a place script can express, and because `Operation` has no scale.**
 * The model is a list of primitives with fixed sizes; a placement scales that list and turns it,
 * and there is no other transform in this engine's vocabulary — not on a mesh, not on an
 * operation. Adding a full rotation would mean a quaternion crossing the effect boundary, and
 * a non-uniform scale would break normals and mean nothing to a place author who cannot see it.
 *
 * **Non-uniform scale is refused rather than ignored**, at the effect layer, so a script that
 * asks for it is told rather than given something subtly wrong.
 */

import type { Quat, Vec3 } from "@big-mesh-studios/core";

/**
 * A figure's placement, in world units.
 *
 * **`at` is the figure's own origin**, which is the model's origin, not its centre and not its
 * feet. A model is authored wherever its author put it and `boundsOf` says where that is; a
 * place author positions by that same origin, so a model sitting on its own origin stands where
 * it was drawn and one floating a unit above the floor floats a unit above the floor.
 */
export interface FigureTransform {
  /**
   * The figure's origin in world space.
   *
   * **Mutable, and the only reason is that moving a figure writes three numbers.** A frozen
   * placement would mean a new object per step for something that is read by the collider every
   * frame and by the renderer every frame; the alternative is an allocation on the frame an NPC
   * takes a step, which is the hot path this whole file exists to keep cheap. Nothing else
   * mutates one — `FigureSet.add` builds a fresh transform rather than sharing.
   */
  at: Vec3;
  /** Rotation about world `+Y`, in radians. */
  yaw: number;
  /** Uniform scale about the figure's own origin. */
  scale: number;
}

/**
 * An identity placement.
 *
 * **Frozen**, because a shared constant with writable fields is a constant somebody writes to,
 * and the first thing a test would do with it is put a figure somewhere.
 */
export const IDENTICAL_TRANSFORM: Readonly<FigureTransform> = Object.freeze({
  at: Object.freeze({ x: 0, y: 0, z: 0 }) as Vec3,
  yaw: 0,
  scale: 1,
});

/**
 * A world point as the figure sees it: turned back by the yaw and scaled down.
 *
 * **The inverse of `toWorld`, and the reason it exists as a separate function is that the two
 * have to be inverses.** Everything downstream — the solid test, the pick — works in the figure's
 * own frame, because that is where the model's box is axis-aligned and where `sdBox` is cheap.
 */
export const toLocal = (t: FigureTransform, p: Vec3): Vec3 => {
  const s = Math.sin(t.yaw);
  const c = Math.cos(t.yaw);
  const dx = p.x - t.at.x;
  const dy = p.y - t.at.y;
  const dz = p.z - t.at.z;
  return {
    x: (dx * c - dz * s) / t.scale,
    y: dy / t.scale,
    z: (dx * s + dz * c) / t.scale,
  };
};

/** A point in the figure's own frame as a world point. */
export const toWorld = (t: FigureTransform, v: Vec3): Vec3 => {
  const s = Math.sin(t.yaw);
  const c = Math.cos(t.yaw);
  const x = v.x * t.scale;
  const y = v.y * t.scale;
  const z = v.z * t.scale;
  return {
    x: t.at.x + x * c + z * s,
    y: t.at.y + y,
    z: t.at.z - x * s + z * c,
  };
};

/** The rotation a placement is, as a quaternion for a `Mesh` to hold. */
export const transformYaw = (yaw: number): Quat => {
  const h = yaw / 2;
  return { x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) };
};

/**
 * The distance from a world point to a figure's collision box.
 *
 * **A yaw-aligned box and not the model's field, and this is the decision ADR 0047 records.**
 * `getSolidAt` runs several times a frame per player corner; a field trace per figure per call
 * does not fit in a frame, and a box is three subtractions after the rotation. What it costs is
 * that a figure's holes are solid — you cannot stand in the gap in a bench — which is the
 * conservative direction and is the same answer the player sees standing in front of it.
 *
 * **Exact, not a bound**, so it is safe to step by as well as to test a sign against: the
 * figure's transform is a rotation and a uniform scale, both of which preserve distances up to
 * the scale, so the distance this returns is the true distance to the box and a trace along it
 * converges.
 */
export const figureDistance = (
  t: FigureTransform,
  half: Vec3,
  p: Vec3,
): number => {
  const q = toLocal(t, p);
  const dx = Math.abs(q.x) - half.x;
  const dy = Math.abs(q.y) - half.y;
  const dz = Math.abs(q.z) - half.z;
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0));
  const inside = Math.min(Math.max(dx, Math.max(dy, dz)), 0);
  return (outside + inside) * t.scale;
};

/**
 * The distance from a world point to the nearest solid figure, or `undefined` when there are
 * none at all.
 *
 * **`undefined` only for "this world has no figures".** That is the same distinction
 * `GameWorld.getMediumAt` draws — a world with no figures and a world with figures that are
 * all a long way away are different claims, and the caller that pays for the check should be
 * the one that knows it is worth it. A figure being *far* is not that claim: it is a large
 * number, and the surface search in `getGroundDistanceAt` marches a point by whatever this
 * returns, so returning nothing for it would mean an unbounded step.
 *
 * ## The reject bounds rather than excludes
 *
 * **A figure whose reach sphere does not contain the point is at least `distance − reach` away,
 * and that is the number used.** Dropping it instead would be wrong in the way that matters:
 * `getSolidAt` would still read the sign correctly, but `getGroundDistanceAt` is a march, and a
 * march handed nothing steps by everything and lands inside the far side of a car. Taking the
 * minimum of a bound and an exact answer is exact where it is close enough to matter and
 * conservative where it is not, and it keeps the trigonometry out of the frame's critical path
 * for the figures the player is not standing next to.
 */
export const nearestFigureDistance = (
  figures: readonly {
    readonly transform: FigureTransform;
    readonly half: Vec3;
  }[],
): ((p: Vec3) => number | undefined) => {
  if (figures.length === 0) return () => undefined;

  return (p: Vec3): number => {
    let nearest = Infinity;
    for (const figure of figures) {
      const reach = figureReach(figure.transform, figure.half);
      const dx = p.x - figure.transform.at.x;
      const dy = p.y - figure.transform.at.y;
      const dz = p.z - figure.transform.at.z;
      const away = Math.hypot(dx, dy, dz);

      const distance =
        away > reach
          ? // **The bound, not a skip.** See the note above; a march needs a number.
            away - reach
          : figureDistance(figure.transform, figure.half, p);

      if (distance < nearest) nearest = distance;
    }
    return nearest;
  };
};

/**
 * How far from its origin a figure's box can possibly reach.
 *
 * **The half-diagonal, and it is the whole-diagonal in every case**: a point further than this
 * from the origin is outside the box whatever the box is turned to do, which is exactly what a
 * rejection test wants and is why it is not the largest half-extent.
 */
export const figureReach = (t: FigureTransform, half: Vec3): number =>
  Math.hypot(half.x, half.y, half.z) * Math.max(t.scale, 1e-6);
