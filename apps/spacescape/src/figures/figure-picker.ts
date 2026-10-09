/**
 * What the crosshair is on.
 *
 * ## The field, not the box
 *
 * **A figure is picked by tracing its own field, not by testing its collision box.** The box
 * is a yaw-aligned extent and knows nothing about the shape inside it, so a box pick puts a
 * crosshair on the vending machine's *shelf* and refuses to select the machine at all, and
 * would happily select it through the serving window if the window happened to be near the
 * shelf. The answer a player expects from "what am I looking at" is the answer the pixels give,
 * and the pixels are of a field.
 *
 * The cost is a sphere trace per nearby figure per frame, which is the right trade: it is one
 * ray, and every figure whose reach sphere the ray misses is rejected before any trigonometry.
 * A hundred figures cost a hundred cheap rejections and a handful of traces.
 *
 * ## The ray goes into the figure's own frame
 *
 * **Because the field is in model coordinates and the ray is in world ones.** `toLocal` turns
 * the origin and the direction; the distance that comes back is in the figure's frame and is
 * divided by its scale on the way out, because a figure drawn at twice size is twice as far
 * away as the model is. The nearest figure wins, ties going to the nearer hit, which is what
 * "what is in front of me" means when two figures overlap.
 */

import type { Vec3 } from "@big-mesh-studios/core";

import { pickAlong, type PickField } from "@big-mesh-studios/picking";

import { figureReach, toLocal, type FigureTransform } from "./figure";

/**
 * How far the crosshair reaches, in world units.
 *
 * **About eight player half-widths.** `DEFAULT_PLAYER_CONFIG` puts `halfSize` at 5 and
 * `collisionRadius` at 3, so forty units is far enough to look at something on the far side of
 * a counter and near enough that a figure across a large room is not selected by looking at
 * the wall behind it. The sibling engine reaches five units for the same decision at a scale an
 * order of magnitude smaller, which is the same proportion.
 */
export const FIGURE_REACH = 40;

/** What a pick found. */
export interface FigureHit<T> {
  /** The figure that was hit, as the caller passed it in. */
  readonly figure: T;
  /** How far along the ray its surface is, in world units. */
  readonly distance: number;
  /** Where on the ray that is, in world space. */
  readonly point: Vec3;
}

/**
 * What a pick needs to know about a figure, so that this module holds none of its own.
 *
 * **`half` is declared rather than derived**, because the field cannot say how big it is
 * without a search and the caller already knows: it is the same half the collider uses, which
 * is why the reach sphere and the collision box cannot drift apart.
 */
export interface PickableFigure<T> {
  /** The placement, which carries the model frame the field lives in. */
  readonly transform: FigureTransform;
  /** The model's field, in model coordinates. A `Field` from `@big-mesh-studios/csg`. */
  readonly field: PickField;
  /** Half the model's box, for the reach sphere. */
  readonly half: Vec3;
  /** How the caller refers to the figure it handed over. */
  readonly value: T;
}

/**
 * The figure the ray meets first within `reach`, or `undefined`.
 *
 * **A miss is `undefined` rather than a sentinel**, following `pickAlong`'s own rule: "there is
 * nothing there" and "the surface is at the origin" are different answers, and a caller that has
 * to tell them apart is a caller that will eventually not.
 */
export const pickFigure = <T>(
  figures: readonly PickableFigure<T>[],
  origin: Vec3,
  direction: Vec3,
  reach: number = FIGURE_REACH,
): FigureHit<T> | undefined => {
  const length = Math.hypot(direction.x, direction.y, direction.z);
  // **A zero-length direction is not a direction**, and normalising it would divide by zero.
  // "Nothing there" is the honest answer, and it is the one `Game.raycast` gives too.
  if (length === 0) return undefined;

  const ray = {
    x: direction.x / length,
    y: direction.y / length,
    z: direction.z / length,
  };
  // **One step along the unit ray, for turning world into local.** Computed once rather than
  // three times: `toLocal` is a rotation and a divide, and a pick that calls it per axis would
  // be paying for the same answer three times over.
  const ahead = {
    x: origin.x + ray.x,
    y: origin.y + ray.y,
    z: origin.z + ray.z,
  };

  let best: FigureHit<T> | undefined;

  for (const figure of figures) {
    const { transform } = figure;

    // **The reach sphere, against the ray's segment rather than its whole line.** A figure
    // behind the player has its nearest point on the infinite ray at a negative `t`, and an
    // unclamped test reads that as "close" and selects what the player is facing away from.
    // Three subtractions and a square root is the whole cost, and everything it rejects never
    // reaches a field.
    const apart = apartFromRay(origin, ray, transform.at);
    if (apart > figureReach(transform, figure.half)) continue;

    const localOrigin = toLocal(transform, origin);
    const localAhead = toLocal(transform, ahead);
    const localDirection = {
      x: localAhead.x - localOrigin.x,
      y: localAhead.y - localOrigin.y,
      z: localAhead.z - localOrigin.z,
    };

    const hit = pickAlong(
      figure.field,
      { origin: localOrigin, direction: localDirection },
      {
        // **Both of these divided by the scale, or a scaled figure is picked at the wrong
        // tolerance.** The trace runs in model coordinates, where one world unit is
        // `1 / scale` local units — so a figure drawn at half size has a surface half as far
        // away in its own units, and a tolerance of half a *world* unit would be a whole
        // *local* unit on it.
        reach: reach / transform.scale,
        epsilon: 0.5 / transform.scale,
      },
    );
    if (hit === undefined) continue;

    // **Multiplied by the scale, and the direction is the reason.** `toLocal` divides the
    // world by the scale, so one world unit is `1 / scale` local units; `pickAlong` reports
    // its distance along a *normalised* local ray, so a local distance of `t` is `t · scale`
    // world units away. Dividing here instead of multiplying put a figure drawn twice as big at
    // a sixth of the distance it should have been.
    const distance = hit.distance * transform.scale;
    // **`<` rather than `<=`, so the nearer of two figures at the same distance is the one that
    // was passed first** — a total order rather than a coin toss.
    if (best !== undefined && distance >= best.distance) continue;

    best = {
      figure: figure.value,
      distance,
      point: {
        x: origin.x + ray.x * distance,
        y: origin.y + ray.y * distance,
        z: origin.z + ray.z * distance,
      },
    };
  }

  return best;
};

/**
 * How far a world point is from a ray's forward half, measured from its origin.
 *
 * **The ray rather than the line**, and the reason is in the caller's note. This is the standard
 * closest-point-on-a-ray with `t` floored at zero, which is the smallest change that stops a
 * crosshair selecting the thing behind the player.
 */
const apartFromRay = (origin: Vec3, ray: Vec3, point: Vec3): number => {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const dz = point.z - origin.z;
  const t = Math.max(0, dx * ray.x + dy * ray.y + dz * ray.z);
  return Math.hypot(dx - ray.x * t, dy - ray.y * t, dz - ray.z * t);
};
