/**
 * The drawing plane, against numbers.
 *
 * **`rayPlanePoint` is the one that decides where every wall goes**, and it is worth a test
 * rather than a screen because a wrong answer here is a wall that lands somewhere plausible.
 * The parallel and behind-the-camera cases in particular: a ray that grazes the plane, or one
 * that looks away from it, must answer "nowhere" rather than a point that the caller would
 * happily put a vertex on.
 *
 * The angle tests are written against the plane's own basis rather than the world's, because
 * the two are only the same on a flat world and the whole point of asking the frame for up is
 * that they need not be.
 */
import { describe, expect, it } from "vitest";
import type { Vec3 } from "@big-mesh-studios/core";
import { cross, dot, length, sub } from "@big-mesh-studios/core";

import {
  applyAngleLock,
  planeCoords,
  planePoint,
  planeThrough,
  pointFromSegment,
  rayPlanePoint,
  segmentOf,
  snapAngleTo,
  snapToVertices,
  type DrawingPlane,
} from "./plane";

const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

const flat = (origin: Vec3 = { x: 0, y: 0, z: 0 }): DrawingPlane =>
  planeThrough(origin, { x: 0, y: 1, z: 0 });

describe("planeThrough", () => {
  it("keeps the point it was given and makes the normal unit", () => {
    const plane = planeThrough({ x: 4, y: -3, z: 2 }, { x: 0, y: 7, z: 0 });
    expect(plane.origin).toEqual({ x: 4, y: -3, z: 2 });
    expect(close(length(plane.up), 1)).toBe(true);
    expect(close(plane.up.y, 1)).toBe(true);
  });

  it("builds two tangents that are unit and perpendicular to each other and the normal", () => {
    // **Not necessarily `+X`/`+Z`**, because `onbFromDirection` chooses a continuous basis
    // rather than a world-aligned one. What has to hold is that it is a basis.
    for (const up of [
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0.3, y: 0.8, z: -0.5 },
    ]) {
      const plane = planeThrough({ x: 0, y: 0, z: 0 }, up);
      expect(close(length(plane.axisA), 1)).toBe(true);
      expect(close(length(plane.axisB), 1)).toBe(true);
      expect(close(dot(plane.axisA, plane.axisB), 0)).toBe(true);
      expect(close(dot(plane.axisA, plane.up), 0)).toBe(true);
      expect(close(dot(plane.axisB, plane.up), 0)).toBe(true);
    }
  });

  it("falls back to world up for a normal of no length, rather than to no basis", () => {
    const plane = planeThrough({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    expect(plane.up).toEqual({ x: 0, y: 1, z: 0 });
    expect(close(length(plane.axisA), 1)).toBe(true);
    expect(close(length(plane.axisB), 1)).toBe(true);
  });
});

describe("rayPlanePoint", () => {
  it("finds where a ray aimed at the plane meets it", () => {
    const plane = flat();
    const hit = rayPlanePoint(
      { origin: { x: 0, y: 10, z: 0 }, direction: { x: 0, y: -1, z: 0 } },
      plane,
    );
    expect(hit).toBeDefined();
    expect(close(hit!.x, 0)).toBe(true);
    expect(close(hit!.y, 0)).toBe(true);
    expect(close(hit!.z, 0)).toBe(true);
  });

  it("finds the meeting point for a ray that is not axis-aligned", () => {
    const plane = flat();
    const origin = { x: 2, y: 5, z: 3 };
    const towards = sub({ x: 0, y: 0, z: 0 }, origin);
    const hit = rayPlanePoint({ origin, direction: towards }, plane);
    expect(hit).toBeDefined();
    expect(close(hit!.x, 0)).toBe(true);
    expect(close(hit!.y, 0)).toBe(true);
    expect(close(hit!.z, 0)).toBe(true);
  });

  it("answers nothing for a ray parallel to the plane", () => {
    const hit = rayPlanePoint(
      { origin: { x: 0, y: 5, z: 0 }, direction: { x: 1, y: 0, z: 0 } },
      flat(),
    );
    expect(hit).toBeUndefined();
  });

  it("answers nothing for a ray that meets the plane behind its own origin", () => {
    // A camera below the plane looking further down never meets it in front, and a point
    // behind the eye would be mirrored into the view where the caller would put a vertex.
    const hit = rayPlanePoint(
      { origin: { x: 0, y: -5, z: 0 }, direction: { x: 0, y: -1, z: 0 } },
      flat(),
    );
    expect(hit).toBeUndefined();
  });
});

describe("planeCoords / planePoint", () => {
  it("round-trips a point through the plane's two dimensions", () => {
    const plane = planeThrough(
      { x: 3, y: 1, z: -2 },
      { x: 0.2, y: 0.9, z: 0.4 },
    );
    const point = planePoint(plane, 2.5, -4);
    const coords = planeCoords(point, plane);
    expect(coords.a).toBeCloseTo(2.5, 9);
    expect(coords.b).toBeCloseTo(-4, 9);
  });
});

describe("segmentOf / pointFromSegment", () => {
  it("measures a segment along the first axis as zero degrees", () => {
    const plane = flat();
    const to = planePoint(plane, 3, 0);
    const segment = segmentOf(plane.origin, to, plane);
    expect(close(segment.length, 3)).toBe(true);
    expect(close(segment.angle, 0)).toBe(true);
  });

  it("measures a segment along the second axis as ninety degrees", () => {
    const plane = flat();
    const to = planePoint(plane, 0, 3);
    const segment = segmentOf(plane.origin, to, plane);
    expect(close(segment.length, 3)).toBe(true);
    expect(close(segment.angle, 90)).toBe(true);
  });

  it("round-trips a length and an angle through a point", () => {
    const plane = flat();
    const start = planePoint(plane, 1, 1);
    const to = pointFromSegment(start, 5, 37, plane);
    const back = segmentOf(start, to, plane);
    expect(back.length).toBeCloseTo(5, 9);
    expect(back.angle).toBeCloseTo(37, 9);
  });
});

describe("applyAngleLock", () => {
  it("leaves the point alone when nothing is locked", () => {
    const plane = flat();
    const to = planePoint(plane, 3, 4);
    expect(applyAngleLock(plane.origin, to, "none", plane, undefined)).toBe(to);
  });

  it("puts the point on the first axis for lock `a`", () => {
    const plane = flat();
    const to = planePoint(plane, 3, 4);
    const locked = applyAngleLock(plane.origin, to, "a", plane, undefined);
    expect(close(planeCoords(locked, plane).b, 0)).toBe(true);
    // The component along the axis survives, so the wall keeps the distance the person
    // dragged it to rather than collapsing to the axis origin.
    expect(close(planeCoords(locked, plane).a, 3)).toBe(true);
  });

  it("puts the point on the second axis for lock `b`", () => {
    const plane = flat();
    const to = planePoint(plane, 3, 4);
    const locked = applyAngleLock(plane.origin, to, "b", plane, undefined);
    expect(close(planeCoords(locked, plane).a, 0)).toBe(true);
    expect(close(planeCoords(locked, plane).b, 4)).toBe(true);
  });

  it("continues the previous segment's direction for lock `continue`", () => {
    const plane = flat();
    // A previous segment turned 60°, and a later point off that line. Locked to continue, the
    // later point lands on the line through `start` and `previous`, at its own distance along
    // it — which is what makes a hand-drawn wall run on straight.
    const start = planePoint(plane, 0, 0);
    const previous = pointFromSegment(start, 2, 60, plane);
    const to = planePoint(plane, 4, 1);
    const locked = applyAngleLock(start, to, "continue", plane, previous);

    const direction = sub(previous, start);
    const offset = sub(locked, start);
    expect(close(length(cross(direction, offset)), 0)).toBe(true);
  });

  it("leaves the point alone for `continue` with no previous segment", () => {
    const plane = flat();
    const to = planePoint(plane, 4, 1);
    expect(applyAngleLock(plane.origin, to, "continue", plane, undefined)).toBe(
      to,
    );
  });
});

describe("snapAngleTo", () => {
  it("turns the segment to the nearest step at the same distance", () => {
    const plane = flat();
    const to = pointFromSegment(plane.origin, 5, 20, plane);
    const snapped = snapAngleTo(plane.origin, to, plane, 15);
    const segment = segmentOf(plane.origin, snapped, plane);
    expect(close(segment.angle, 15)).toBe(true);
    expect(close(segment.length, 5)).toBe(true);
  });

  it("measures the ladder from the offset when one is given", () => {
    const plane = flat();
    const to = pointFromSegment(plane.origin, 5, 100, plane);
    const snapped = snapAngleTo(plane.origin, to, plane, 45, 10);
    expect(close(segmentOf(plane.origin, snapped, plane).angle, 100)).toBe(
      true,
    );
  });

  it("does nothing for a step of zero, so it can be called unconditionally", () => {
    const plane = flat();
    const to = pointFromSegment(plane.origin, 5, 20, plane);
    expect(snapAngleTo(plane.origin, to, plane, 0)).toBe(to);
  });
});

describe("snapToVertices", () => {
  // A stub projection onto the plane's own x/z, so the world points and the screen points are
  // the same numbers and the test is about the snap rather than about a camera.
  const ontoPlane = (point: Vec3): { x: number; y: number } | undefined =>
    point.y < 0 ? undefined : { x: point.x, y: point.z };

  it("returns the nearest candidate within the radius", () => {
    const candidates = [
      { x: 10, y: 0, z: 0 },
      { x: 2, y: 0, z: 2 },
    ];
    const snap = snapToVertices(candidates, ontoPlane, { x: 1, y: 1 }, 5);
    expect(snap?.point).toEqual({ x: 2, y: 0, z: 2 });
    expect(snap?.screenDistance).toBeCloseTo(Math.hypot(1, 1), 9);
  });

  it("returns nothing when every candidate is further than the radius", () => {
    expect(
      snapToVertices([{ x: 100, y: 0, z: 100 }], ontoPlane, { x: 0, y: 0 }, 5),
    ).toBeUndefined();
  });

  it("skips a candidate the projection refuses, rather than snapping behind the camera", () => {
    const candidates = [
      { x: 0, y: -5, z: 0 }, // behind the eye: the projection answers nothing
      { x: 1, y: 0, z: 1 },
    ];
    const snap = snapToVertices(candidates, ontoPlane, { x: 1, y: 1 }, 5);
    expect(snap?.point).toEqual({ x: 1, y: 0, z: 1 });
  });

  it("returns nothing for no candidates at all", () => {
    expect(snapToVertices([], ontoPlane, { x: 0, y: 0 }, 5)).toBeUndefined();
  });
});
