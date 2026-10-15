/**
 * The draft's geometry, against numbers.
 *
 * **The count and the ring are the two things a scene cannot tell you.** A draft that drew the
 * wrong number of segments still looks like a line, and a ring that was a polygon, or one that
 * had collapsed to a point, still looks like a marker in a screenshot. Both are pinned here,
 * together with the radius relationship the rings are sized by — which is the one number that
 * decides whether a finger can see what it can grab.
 */
import { describe, expect, it } from "vitest";
import type { Vec3 } from "@big-mesh-studios/core";

import { planeThrough } from "./plane";
import {
  overlayPositions,
  screenRadiusToWorld,
  RING_SEGMENTS,
} from "./draw-lines-overlay";
import type { DrawLinesSnapshot } from "./draw-lines-controller";

const FLAT_UP: Vec3 = { x: 0, y: 1, z: 0 };
const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 };
const AT = (x: number, z: number): Vec3 => ({ x, y: 0, z });

const snapshotOf = (
  overrides: Partial<DrawLinesSnapshot> = {},
): DrawLinesSnapshot => ({
  active: true,
  plane: planeThrough(ORIGIN, FLAT_UP),
  chains: [],
  aim: undefined,
  aimScreen: undefined,
  length: 0,
  angle: 0,
  lock: "none",
  canCommit: false,
  canFinish: false,
  canNewLine: false,
  canUndo: false,
  ...overrides,
});

const floatsPerSegment = 6;

describe("overlayPositions", () => {
  it("draws one segment per edge of every chain, plus the aim stretched from the last point", () => {
    const state = snapshotOf({
      chains: [
        [AT(0, 0), AT(10, 0), AT(10, 10)],
        [AT(0, 20), AT(10, 20)],
      ],
      aim: AT(30, 30),
    });
    // Two edges in the first chain, one in the second, one from the last committed point to
    // the aim: four segments, and no rings.
    const positions = overlayPositions(state, 0);
    expect(positions.length).toBe(4 * floatsPerSegment);
    expect([...positions.slice(0, 6)]).toEqual([0, 0, 0, 10, 0, 0]);
  });

  it("adds a closed ring at every placed point and at the aim", () => {
    const state = snapshotOf({
      chains: [[AT(0, 0), AT(10, 0)]],
      aim: AT(10, 10),
    });
    const ringSegments = 8;
    const positions = overlayPositions(state, 3, ringSegments);
    const points = 3; // two committed and the aim
    // One chain edge, one segment out to the aim, and a ring at each of the three points.
    expect(positions.length).toBe(
      (2 + points * ringSegments) * floatsPerSegment,
    );
  });

  it("draws no ring for a radius of zero, so rings can be absent by number alone", () => {
    const state = snapshotOf({ chains: [[AT(0, 0), AT(10, 0)]] });
    expect(overlayPositions(state, 0).length).toBe(floatsPerSegment);
    expect(overlayPositions(state, 0, 0).length).toBe(floatsPerSegment);
  });

  it("draws nothing before a plane exists", () => {
    const state = snapshotOf({
      active: false,
      plane: undefined,
      chains: [[AT(0, 0), AT(10, 0)]],
    });
    expect(overlayPositions(state, 5).length).toBe(0);
  });

  it("draws a ring whose points are on the plane, at the radius asked for", () => {
    const state = snapshotOf({ chains: [[AT(0, 0)]] });
    const positions = overlayPositions(state, 5, RING_SEGMENTS);
    // Every ring point is on the plane (y = 0) and at the radius from the centre.
    for (let at = 0; at < positions.length; at += 3) {
      const x = positions[at];
      const y = positions[at + 1];
      const z = positions[at + 2];
      expect(Math.abs(y)).toBeLessThan(1e-5);
      expect(Math.hypot(x, z)).toBeCloseTo(5, 5);
    }
  });
});

describe("screenRadiusToWorld", () => {
  it("scales with distance and inversely with the canvas height", () => {
    const size = { width: 800, height: 400 };
    // 20 px at a distance of 100 on a 400-pixel-tall canvas is 5 world units.
    expect(screenRadiusToWorld(20, 100, size)).toBeCloseTo(5, 9);
    expect(screenRadiusToWorld(20, 200, size)).toBeCloseTo(10, 9);
    expect(
      screenRadiusToWorld(20, 100, { width: 800, height: 800 }),
    ).toBeCloseTo(2.5, 9);
  });

  it("answers zero for a canvas or a distance of nothing, rather than dividing by it", () => {
    expect(screenRadiusToWorld(20, 100, { width: 0, height: 0 })).toBe(0);
    expect(screenRadiusToWorld(20, 0, { width: 800, height: 400 })).toBe(0);
  });
});
