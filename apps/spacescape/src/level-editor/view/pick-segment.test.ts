/**
 * Picking a wall segment on screen, against numbers.
 *
 * **The projection is a stub, so the test is about the pick and not about a camera.** A world
 * point says where it is on the canvas directly, which is what lets the distance-and-nearest
 * arithmetic be checked without a scene, exactly as `move-handle.test.ts` checks the arrows.
 */

import { describe, expect, it } from "vitest";
import type { Vec3 } from "@big-mesh-studios/core";

import { segmentUnderPointer, type PickableSegment } from "./pick-segment";

/** Screen x is world x, screen y is world z — the same stand-in the draw tests use. */
const project = (point: Vec3): { x: number; y: number } => ({
  x: point.x,
  y: point.z,
});

const SEGMENTS: readonly PickableSegment[] = [
  // A horizontal run along z = 0, from x = 0 to 10.
  {
    itemId: "a",
    index: 0,
    lineIndex: 0,
    a: { x: 0, y: 0, z: 0 },
    b: { x: 10, y: 0, z: 0 },
  },
  // A vertical run at x = 10, from z = 0 to 10, on the same line.
  {
    itemId: "a",
    index: 1,
    lineIndex: 0,
    a: { x: 10, y: 0, z: 0 },
    b: { x: 10, y: 0, z: 10 },
  },
  // A separate wall further away.
  {
    itemId: "b",
    index: 0,
    lineIndex: 0,
    a: { x: 0, y: 0, z: 40 },
    b: { x: 10, y: 0, z: 40 },
  },
];

describe("segmentUnderPointer", () => {
  it("picks the nearest segment within the radius", () => {
    expect(segmentUnderPointer(SEGMENTS, project, { x: 5, y: 1 }, 5)).toEqual({
      itemId: "a",
      index: 0,
      lineIndex: 0,
    });
    expect(
      segmentUnderPointer(SEGMENTS, project, { x: 10.5, y: 5 }, 5),
    ).toEqual({
      itemId: "a",
      index: 1,
      lineIndex: 0,
    });
  });

  it("answers undefined when nothing is within the radius", () => {
    expect(
      segmentUnderPointer(SEGMENTS, project, { x: 5, y: 20 }, 5),
    ).toBeUndefined();
  });

  it("skips a segment an endpoint puts behind the camera", () => {
    // The far wall's second point cannot be projected; measuring against the mirrored point the
    // projection would otherwise answer is exactly the bug this skip avoids.
    const sometimes = (point: Vec3) =>
      point.z > 15 ? undefined : project(point);
    expect(
      segmentUnderPointer(SEGMENTS, sometimes, { x: 5, y: 40 }, 5),
    ).toBeUndefined();
  });
});
