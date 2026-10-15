/**
 * A drawn wall's geometry, against numbers.
 *
 * **The turn is the part that can be wrong without looking wrong.** A segment stood up as an
 * axis-aligned box is still a box, still in the level, still meshed — just the wrong shape in
 * the wrong place, which reads as a person having drawn badly rather than as a bug. So the
 * basis-to-quaternion step is checked by rotating the box's own axes back through it and
 * proving they land on the wall's.
 */
import { describe, expect, it } from "vitest";
import { rotate } from "@big-mesh-studios/csg";
import type { Vec3 } from "@big-mesh-studios/core";

import {
  quatFromBasis,
  wallParts,
  wallSegments,
  wallsBounds,
  wallsCentre,
} from "./walls";
import type { LevelWalls } from "./types";

const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

const pointsAt = (got: Vec3, expected: Vec3): boolean =>
  close(got.x, expected.x) &&
  close(got.y, expected.y) &&
  close(got.z, expected.z);

const walls = (over: Partial<LevelWalls> = {}): LevelWalls => ({
  kind: "walls",
  id: "wall",
  at: [0, 0, 0],
  up: [0, 1, 0],
  lines: [
    [
      [0, 0, 0],
      [40, 0, 0],
    ],
  ],
  height: 30,
  thickness: 6,
  combine: "Add",
  ...over,
});

describe("wallSegments", () => {
  it("runs consecutive points and numbers them across every line", () => {
    const segments = wallSegments(
      walls({
        lines: [
          [
            [0, 0, 0],
            [10, 0, 0],
            [10, 0, 10],
          ],
          [
            [0, 0, 50],
            [10, 0, 50],
          ],
        ],
      }),
    );
    expect(segments.map((segment) => segment.index)).toEqual([0, 1, 2]);
    expect(segments[0].a).toEqual({ x: 0, y: 0, z: 0 });
    expect(segments[0].b).toEqual({ x: 10, y: 0, z: 0 });
    expect(segments[2].b).toEqual({ x: 10, y: 0, z: 50 });
  });
});

describe("wallParts", () => {
  it("stands each segment on the line and reaches the height up from it", () => {
    const [part] = wallParts(walls());
    // Middle of the run, lifted half the height so the base sits on y = 0.
    expect(part.at).toEqual({ x: 20, y: 15, z: 0 });
    expect(part.shape).toEqual({
      type: "Box",
      len: { x: 20, y: 15, z: 3 },
    });
  });

  it("is the identity for a run along the first axis", () => {
    const [part] = wallParts(walls());
    // A run along +X with up +Y gives the world's own axes, so no turn at all.
    expect(part.orientation.x).toBeCloseTo(0, 9);
    expect(part.orientation.y).toBeCloseTo(0, 9);
    expect(part.orientation.z).toBeCloseTo(0, 9);
    expect(part.orientation.w).toBeCloseTo(1, 9);
  });

  it("turns the box so its own axes land on the wall's", () => {
    // **The claim worth proving rather than eyeballing.** Rotating the box's local +X by the
    // quaternion has to give the run's direction, and local +Y has to give up — for a wall
    // running along Z, which is the case an axis-aligned box gets wrong.
    const run: Vec3 = { x: 0, y: 0, z: 40 };
    const [part] = wallParts(
      walls({
        lines: [
          [
            [0, 0, 0],
            [run.x, run.y, run.z],
          ],
        ],
      }),
    );
    const localX = rotate({ x: 1, y: 0, z: 0 }, part.orientation);
    const localY = rotate({ x: 0, y: 1, z: 0 }, part.orientation);
    expect(pointsAt(localX, { x: 0, y: 0, z: 1 })).toBe(true);
    expect(pointsAt(localY, { x: 0, y: 1, z: 0 })).toBe(true);
  });

  it("derives an id from the item's own, per segment", () => {
    const parts = wallParts(
      walls({
        lines: [
          [
            [0, 0, 0],
            [10, 0, 0],
            [20, 0, 0],
          ],
        ],
      }),
    );
    expect(parts.map((part) => part.id)).toEqual(["wall#0", "wall#1"]);
  });
});

describe("quatFromBasis", () => {
  it("is the identity for the world's own axes", () => {
    const q = quatFromBasis(
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
    );
    expect(q).toEqual({ x: 0, y: 0, z: 0, w: 1 });
  });

  it("reads a quarter turn about up", () => {
    // Local +X lands on world +Z, so it is a quarter turn about Y; the sign is whichever way
    // the basis came out, and the magnitude is the claim.
    const q = quatFromBasis(
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 1, z: 0 },
      { x: -1, y: 0, z: 0 },
    );
    expect(Math.abs(q.y)).toBeCloseTo(Math.SQRT1_2, 9);
    expect(Math.abs(q.w)).toBeCloseTo(Math.SQRT1_2, 9);
    expect(close(q.x, 0)).toBe(true);
    expect(close(q.z, 0)).toBe(true);
  });
});

describe("wallsBounds / wallsCentre", () => {
  it("covers every point and lifts the box by the height", () => {
    const bounds = wallsBounds(
      walls({
        lines: [
          [
            [0, 0, 0],
            [200, 0, -300],
          ],
        ],
      }),
    );
    expect(bounds.min.x).toBeCloseTo(0, 6);
    expect(bounds.max.x).toBeCloseTo(200, 6);
    expect(bounds.min.z).toBeCloseTo(-300, 6);
    expect(bounds.min.y).toBeCloseTo(0, 6);
    expect(bounds.max.y).toBeCloseTo(30, 6);
  });

  it("centres on the middle of the box", () => {
    const centre = wallsCentre(
      walls({
        lines: [
          [
            [0, 0, 0],
            [100, 0, 40],
          ],
        ],
        height: 20,
      }),
    );
    expect(centre.x).toBeCloseTo(50, 6);
    expect(centre.y).toBeCloseTo(10, 6);
    expect(centre.z).toBeCloseTo(20, 6);
  });
});
