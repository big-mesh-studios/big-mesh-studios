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
  deleteWallSegment,
  deleteWallSegmentFrom,
  quatFromBasis,
  wallParts,
  wallSegments,
  wallSideAt,
  wallsBounds,
  wallsCentre,
  withWallSide,
} from "./walls";
import type { LevelWalls } from "./types";
import type { WallPart } from "./walls";

const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

/** A wall part's half-length, narrowed because every wall part is a box. */
const halfLength = (part: WallPart | undefined): number => {
  if (part?.shape.type !== "Box") throw new Error("expected a box");
  return part.shape.len.x;
};

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
    expect(segments.map((segment) => segment.lineIndex)).toEqual([0, 0, 1]);
    expect(segments[0].a).toEqual({ x: 0, y: 0, z: 0 });
    expect(segments[0].b).toEqual({ x: 10, y: 0, z: 0 });
    expect(segments[2].b).toEqual({ x: 10, y: 0, z: 50 });
  });
});

describe("deleteWallSegment", () => {
  /** A horizontal line at height `z`, through the given x positions. */
  const line = (z: number, xs: readonly number[]): [number, number, number][] =>
    xs.map((x) => [x, 0, z]);

  it("shortens the line when an end segment goes", () => {
    const lines = [line(0, [0, 10, 20])];
    expect(deleteWallSegment(lines, 0)).toEqual([line(0, [10, 20])]);
    expect(deleteWallSegment(lines, 1)).toEqual([line(0, [0, 10])]);
  });

  it("splits the line in two when a middle segment goes", () => {
    const lines = [line(0, [0, 10, 20, 30])];
    // Segment 1 joins the middle two points, so removing it severs the run in half — and the
    // halves do not reconnect, which is the whole point of a split over a stitched line.
    expect(deleteWallSegment(lines, 1)).toEqual([
      line(0, [0, 10]),
      line(0, [20, 30]),
    ]);
  });

  it("removes a two-point line when its only segment goes", () => {
    expect(deleteWallSegment([line(0, [0, 10])], 0)).toEqual([]);
  });

  it("counts the index across every line, in order", () => {
    const lines = [line(0, [0, 10, 20]), line(50, [0, 10])];
    // The first line has segments 0 and 1; the second line's only segment is 2.
    expect(deleteWallSegment(lines, 2)).toEqual([line(0, [0, 10, 20])]);
    // Index 1 is the first line's last segment, leaving the second line alone.
    expect(deleteWallSegment(lines, 1)).toEqual([
      line(0, [0, 10]),
      line(50, [0, 10]),
    ]);
  });

  it("answers undefined for an index that names no segment", () => {
    expect(deleteWallSegment([line(0, [0, 10])], 1)).toBeUndefined();
    expect(deleteWallSegment([line(0, [0, 10])], -1)).toBeUndefined();
    expect(deleteWallSegment([], 0)).toBeUndefined();
  });
});

describe("deleteWallSegmentFrom", () => {
  /** A stored item's lines and their parallel sides, as the editor holds them. */
  const item = {
    lines: [
      [
        [0, 0, 0],
        [10, 0, 0],
        [20, 0, 0],
        [30, 0, 0],
      ],
      [
        [0, 0, 50],
        [10, 0, 50],
      ],
    ] as [number, number, number][][],
    sides: ["left", "right"] as const,
  };

  it("keeps the side array parallel when a whole line goes", () => {
    expect(deleteWallSegmentFrom(item, 3)).toEqual({
      lines: [item.lines[0]],
      sides: ["left"],
    });
  });

  it("gives both halves the split line's side", () => {
    expect(deleteWallSegmentFrom(item, 1)).toEqual({
      lines: [
        [item.lines[0][0], item.lines[0][1]],
        [item.lines[0][2], item.lines[0][3]],
        item.lines[1],
      ],
      sides: ["left", "left", "right"],
    });
  });

  it("leaves the array unchanged when only an end segment goes", () => {
    expect(deleteWallSegmentFrom(item, 0)).toEqual({
      lines: [
        [
          [10, 0, 0],
          [20, 0, 0],
          [30, 0, 0],
        ],
        item.lines[1],
      ],
      sides: ["left", "right"],
    });
  });

  it("does not invent sides for an item that has none", () => {
    expect(
      deleteWallSegmentFrom({ lines: item.lines }, 0)?.sides,
    ).toBeUndefined();
  });
});

describe("wallSideAt and withWallSide", () => {
  const twoLines: LevelWalls = walls({
    lines: [
      [
        [0, 0, 0],
        [10, 0, 0],
      ],
      [
        [0, 0, 50],
        [10, 0, 50],
      ],
    ],
    sides: ["left", "right"],
  });

  it("reads a missing side as centred", () => {
    expect(wallSideAt(walls(), 0)).toBe("centre");
    expect(wallSideAt(twoLines, 1)).toBe("right");
  });

  it("changes one line and fills the others from the item's sides", () => {
    expect(withWallSide(twoLines, 0, "centre").sides).toEqual([
      "centre",
      "right",
    ]);
    expect(withWallSide(twoLines, 1, "left").sides).toEqual(["left", "left"]);
  });

  it("writes centred for lines the item did not name", () => {
    const unnamed = walls({ lines: twoLines.lines });
    expect(withWallSide(unnamed, 1, "right").sides).toEqual([
      "centre",
      "right",
    ]);
  });

  it("drops the array once every line is centred", () => {
    const oneLeft = walls({ lines: twoLines.lines, sides: ["left", "right"] });
    const half = withWallSide(oneLeft, 0, "centre");
    expect(half.sides).toEqual(["centre", "right"]);
    expect(withWallSide(half, 1, "centre").sides).toBeUndefined();
  });

  it("leaves an item with no such line unchanged", () => {
    expect(withWallSide(twoLines, 9, "left")).toBe(twoLines);
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

  it("puts a left wall entirely on the line's left, so the line is its right face", () => {
    // The run goes +X, so +Z is its right and -Z is its left. A left wall's middle is half
    // the thickness to the left, which leaves the line itself on the wall's right face.
    const [part] = wallParts(walls({ sides: ["left"] }));
    expect(part.at).toEqual({ x: 20, y: 15, z: -3 });
    expect(part.shape).toEqual({
      type: "Box",
      len: { x: 20, y: 15, z: 3 },
    });
  });

  it("puts a right wall on the line's right", () => {
    const [part] = wallParts(walls({ sides: ["right"] }));
    expect(part.at).toEqual({ x: 20, y: 15, z: 3 });
  });

  it("reads a side per line rather than per item", () => {
    const [first, second] = wallParts(
      walls({
        lines: [
          [
            [0, 0, 0],
            [40, 0, 0],
          ],
          [
            [0, 0, 50],
            [40, 0, 50],
          ],
        ],
        sides: ["left", "right"],
      }),
    );
    expect(first?.at.z).toBe(-3);
    expect(second?.at.z).toBe(53);
  });

  it("closes the outside of a corner by extending both side walls", () => {
    // East then north is a left turn. A right wall is on the outside, where the two boxes
    // meet only at the drawn vertex; each has to run a thickness past it. A left wall would
    // be on the inside and needs no extension.
    const [east, north] = wallParts(
      walls({
        lines: [
          [
            [0, 0, 0],
            [40, 0, 0],
            [40, 0, -40],
          ],
        ],
        sides: ["right"],
      }),
    );
    // The east run is twenty long, plus a half-extent of three at its outside end, and its
    // middle moves three along the run.
    expect(halfLength(east)).toBe(23);
    expect(east?.at).toEqual({ x: 23, y: 15, z: 3 });
    // The north run is extended at its start, and its right is east.
    expect(halfLength(north)).toBe(23);
    expect(north?.at).toEqual({ x: 43, y: 15, z: -17 });
  });

  it("does not extend a wall that is on the inside of a corner", () => {
    const [east, south] = wallParts(
      walls({
        lines: [
          [
            [0, 0, 0],
            [40, 0, 0],
            [40, 0, 40],
          ],
        ],
        sides: ["right"],
      }),
    );
    // East then south is a right turn, so the right wall is on the inside of the corner.
    expect(halfLength(east)).toBe(20);
    expect(halfLength(south)).toBe(20);
  });

  it("closes a closed line's final corner as well as its interior ones", () => {
    // A clockwise square, so the outside of every corner is on the left. The first segment's
    // start has to look at the last segment, which is the only way the closing corner is
    // treated as a corner at all.
    const parts = wallParts(
      walls({
        lines: [
          [
            [0, 0, 0],
            [40, 0, 0],
            [40, 0, 40],
            [0, 0, 40],
            [0, 0, 0],
          ],
        ],
        sides: ["left"],
      }),
    );
    // Every run is twenty long and extends one thickness (six) at each outside end, split
    // across the two ends, so every box is twenty-six long.
    expect(parts.map(halfLength)).toEqual([26, 26, 26, 26]);
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
  it("covers every corner of the wall, thickness and height included", () => {
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
    // The run's own half-length and the half-thickness both reach past the line's ends and
    // sides; the box is turned, so the AABB is the union of its eight corners.
    expect(bounds.min.x).toBeCloseTo(-2.4962, 3);
    expect(bounds.max.x).toBeCloseTo(202.4962, 3);
    expect(bounds.min.z).toBeCloseTo(-301.6641, 3);
    expect(bounds.max.z).toBeCloseTo(1.6641, 3);
    expect(bounds.min.y).toBeCloseTo(0, 6);
    expect(bounds.max.y).toBeCloseTo(30, 6);
  });

  it("follows a side wall onto its side of the line", () => {
    const bounds = wallsBounds(walls({ sides: ["left"] }));
    expect(bounds.min.z).toBeCloseTo(-6, 6);
    expect(bounds.max.z).toBeCloseTo(0, 6);
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
