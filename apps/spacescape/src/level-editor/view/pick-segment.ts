/**
 * Which wall segment a pointer is over, measured on screen.
 *
 * ## Why screen-space rather than a raycast
 *
 * **Because the thing being picked is a line, and a line has no thickness to hit.** The wall
 * items' boxes (`wallParts`) are solids a ray can meet, but the *segment* a person means is the
 * run between two corners, and testing the box would pick the one whose box happens to swallow
 * the ray first. Projecting the two endpoints and measuring the pointer's distance to the drawn
 * line is the same choice `view/move-handle.ts` makes for its arrows, and for the same reason: a
 * target a finger can see is a target a finger can hit, at every zoom.
 *
 * ## Why it takes projections rather than a camera
 *
 * **Because the projection already exists for the drawing overlay and for the handles**, and this
 * is arithmetic over whatever it returns. The caller owns the camera and the canvas; here there
 * is only a list of segments, a way to put a world point on the canvas, and a pointer. That is
 * what makes the picker testable against a stub projection and no scene at all.
 */

import type { Vec3 } from "@big-mesh-studios/core";

import { distanceToSegment, type ScreenPoint } from "./move-handle";

/** One segment a pick can land on: which item and edge it is, and its two world endpoints. */
export interface PickableSegment {
  readonly itemId: string;
  /** The edge's index in its item's own global segment order, as `wallSegments` assigns it. */
  readonly index: number;
  readonly a: Vec3;
  readonly b: Vec3;
}

/** The segment a pick landed on: the item and the edge index. */
export interface SegmentPick {
  readonly itemId: string;
  readonly index: number;
}

/**
 * The nearest segment to `pointer` within `radius` CSS pixels, or `undefined` for none.
 *
 * **The nearest wins**, matching `armUnderPointer`, so segments crossing on screen resolve to the
 * one under the cursor's middle rather than to whichever was listed first. A segment an endpoint
 * of which projects behind the camera is skipped rather than measured against a mirrored point.
 */
export const segmentUnderPointer = (
  segments: readonly PickableSegment[],
  project: (point: Vec3) => ScreenPoint | undefined,
  pointer: ScreenPoint,
  radius: number,
): SegmentPick | undefined => {
  let closest: { pick: SegmentPick; distance: number } | undefined;
  for (const segment of segments) {
    const a = project(segment.a);
    const b = project(segment.b);
    if (a === undefined || b === undefined) continue;
    const distance = distanceToSegment(pointer, a, b);
    if (distance > radius) continue;
    if (closest === undefined || distance < closest.distance) {
      closest = {
        pick: { itemId: segment.itemId, index: segment.index },
        distance,
      };
    }
  }
  return closest?.pick;
};
