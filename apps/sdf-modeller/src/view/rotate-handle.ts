/**
 * Where the turn handles are on the screen, and how far round a ring a drag has gone.
 *
 * ## Why this file is arithmetic and nothing else
 *
 * **Because it is what turns a finger's travel into an angle, and an angle that is wrong
 * turns the part the wrong way about the wrong axis.** The rings themselves are three
 * toruses and whether they are drawn is a matter of taste; "which ring did the finger take
 * hold of" and "how far round has it carried it" are arithmetic on a projection, and
 * getting them wrong produces a tool that looks like it is working while quietly rotating
 * about the wrong line. So the projection, the hit test and the angle are here, with no
 * renderer in sight, and tested against numbers — the same split `move-handle` makes and
 * for the same reason.
 *
 * ## Why the hit test is a polyline and not a raycast
 *
 * **Because a ring one pixel thick is a target no finger can hit.** A torus is a thin tube,
 * so a raycast would make it grabbable over a much smaller band than it is *drawn* as — and
 * on a phone, where a finger is fifty pixels across, that is the difference between a
 * handle that works and one that cannot be reached. Measuring the pointer against the
 * ring's drawn outline, walked point by point, gives it the size it appears to be.
 *
 * ## How a two-dimensional drag becomes an angle
 *
 * **By reading the angle the pointer has swept about the ring's middle**, rather than by
 * intersecting a ray with the ring's plane. The ring is a circle drawn round the point it
 * turns about, so the bearing from that middle to the finger *is* the place on the ring the
 * finger is holding, and the change in that bearing is the turn. It is the same thing a
 * person does by eye: the finger went a quarter of the way round, so the part turned a
 * quarter turn.
 *
 * ## Why a ring seen from behind turns the other way
 *
 * **Because that is what it looks like it is doing.** A ring's own axis points either
 * towards the viewer or away, and the same clockwise sweep of the finger is a turn in
 * opposite senses depending on which. `RingOnScreen.facing` carries that, and the drag is
 * negated for a ring whose axis points away, so the part always follows the finger.
 */
import {
  GRAB_RADIUS,
  distanceToSegment,
  type Axis,
  type ScreenPoint,
} from "./move-handle";

/**
 * How much of the view's height a ring spans, across.
 *
 * **A fraction of the camera's distance, for the reason the arrows are**: a ring of fixed
 * world radius is a dot on a figure seen whole and a hula hoop up close, and scaling by the
 * distance keeps it the same fraction of the canvas at any zoom. A little larger than the
 * arms' share, because a ring's target is its thin edge and a slightly bigger circle costs
 * nothing.
 */
export const RING_VIEW_SHARE = 0.3;

/** How thick a ring is drawn, in units of its own radius. */
export const TUBE_RADIUS = 0.02;

/** How many points a ring is measured along where it lies on the canvas. */
export const AROUND = 48;

/** A ring as it lies on the canvas: where its middle is, and its way round. */
export interface RingOnScreen {
  readonly axis: Axis;
  /** The point the ring turns about, which is the part's origin on screen. */
  readonly middle: ScreenPoint;
  /** Where the ring runs, point by point, in the order it is walked. */
  readonly around: readonly ScreenPoint[];
  /**
   * Whether the axis the ring lies across points towards whoever is looking.
   *
   * A ring seen from its far side runs the other way about the canvas, so a drag round it
   * has to turn the part the other way as well. See the header.
   */
  readonly facing: boolean;
}

/**
 * Which ring the pointer has hold of, or `undefined` when it is over none.
 *
 * **The nearest wins where two rings cross**, which is what makes the one drawn in front
 * the one that is taken hold of, and it is why this does not test x, then y, then z: a
 * widget whose pick order is its axis order silently reaches through the figure for the
 * ring behind it.
 */
export const ringUnderPointer = (
  pointer: ScreenPoint,
  rings: readonly RingOnScreen[],
): Axis | undefined => {
  let closest: { axis: Axis; distance: number } | undefined;

  for (const ring of rings) {
    for (let index = 0; index < ring.around.length; index++) {
      const distance = distanceToSegment(
        pointer,
        ring.around[index]!,
        ring.around[(index + 1) % ring.around.length]!,
      );

      if (
        distance <= GRAB_RADIUS &&
        (closest === undefined || distance < closest.distance)
      ) {
        closest = { axis: ring.axis, distance };
      }
    }
  }

  return closest?.axis;
};

/**
 * How far round its own axis a drag has carried a ring, in radians.
 *
 * **Absolute rather than accumulated.** The caller passes where the pointer took hold and
 * where it is now, so the answer is recomputed from the grab every time — a version that
 * added up each move would keep every rounding, and a part that does not come back to where
 * it was put down when the finger returns to where it started is the kind of wrong that
 * makes a tool feel broken. This is the same choice `distanceDragged` makes for a slide.
 *
 * @param from Where the pointer took hold of the ring, in pixels.
 * @param to Where the pointer is now, in pixels.
 */
export const radiansDragged = (
  from: ScreenPoint,
  to: ScreenPoint,
  ring: RingOnScreen,
): number => {
  const swept =
    Math.atan2(to.y - ring.middle.y, to.x - ring.middle.x) -
    Math.atan2(from.y - ring.middle.y, from.x - ring.middle.x);

  // **The canvas counts its y downwards**, so an angle swept across it runs the opposite
  // way to one swept in the world — and a ring whose axis points away from the viewer runs
  // the other way again.
  return (ring.facing ? -1 : 1) * swept;
};
