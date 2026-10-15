import { describe, expect, it } from "vitest";

import {
  polygonHalfExtents,
  primitiveHalfExtents,
  sdPolygon2D,
  sdPolygonPrism,
  type OutlinePoint,
} from "./primitives";

/**
 * What an outline is, on its own.
 *
 * **`primitives.test.ts` checks that the polygon is in the table.** This checks what it
 * *is*, because every property here is one the table's generic tests cannot see: the sweep
 * there marches a ray from the origin and needs a star-shaped outline, and a real floor plan
 * is neither star-shaped nor convex. A shape whose only test is the sweep's would pass with
 * a rectangle and a concave plan meshing inside out.
 */

/** A unit square, wound counter-clockwise in the XZ plane. */
const square = (half: number): OutlinePoint[] => [
  { x: -half, z: -half },
  { x: half, z: -half },
  { x: half, z: half },
  { x: -half, z: half },
];

/**
 * An L: a six-unit square with its top-right quarter removed.
 *
 * **The case a rectangle cannot stand for.** The missing quarter is a *concavity*, and it is
 * where the two halves of this shape disagree — inside it the outline is solid, and outside
 * it but inside the bounding square it is not, which is a distinction no axis-aligned box
 * about the origin can make.
 */
const lShape = (): OutlinePoint[] => [
  { x: 0, z: 0 },
  { x: 6, z: 0 },
  { x: 6, z: 3 },
  { x: 3, z: 3 },
  { x: 3, z: 6 },
  { x: 0, z: 6 },
];

/**
 * The distance to the closest point on the outline, found by walking every edge.
 *
 * **Slow, and independent on purpose.** It samples along each edge rather than clamping a
 * projection onto it, so it shares no reasoning with `sdPolygon2D` and a bug in the clamping
 * cannot quietly agree with a bug in this.
 */
const nearestBoundaryPoint = (
  outline: readonly OutlinePoint[],
  x: number,
  z: number,
): number => {
  let best = Infinity;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i, i++) {
    for (let step = 0; step <= 2000; step++) {
      const t = step / 2000;
      best = Math.min(
        best,
        Math.hypot(
          x - (outline[j].x + (outline[i].x - outline[j].x) * t),
          z - (outline[j].z + (outline[i].z - outline[j].z) * t),
        ),
      );
    }
  }
  return best;
};

describe("the distance to an outline", () => {
  it("is negative inside it and positive outside it", () => {
    const room = square(2);
    expect(sdPolygon2D(room, 0, 0)).toBeLessThan(0);
    expect(sdPolygon2D(room, 1.9, 1.9)).toBeLessThan(0);
    expect(sdPolygon2D(room, 2.1, 0)).toBeGreaterThan(0);
    expect(sdPolygon2D(room, 0, -2.1)).toBeGreaterThan(0);
  });

  it("is zero on it", () => {
    const room = square(2);
    // On each of the four flats, and on a corner.
    expect(Math.abs(sdPolygon2D(room, 2, 0))).toBeLessThan(1e-12);
    expect(Math.abs(sdPolygon2D(room, -2, 0))).toBeLessThan(1e-12);
    expect(Math.abs(sdPolygon2D(room, 0, 2))).toBeLessThan(1e-12);
    expect(Math.abs(sdPolygon2D(room, 0, -2))).toBeLessThan(1e-12);
    expect(Math.abs(sdPolygon2D(room, 2, 2))).toBeLessThan(1e-12);
    // And still negative on the flats themselves rather than flipping outside of them.
    expect(sdPolygon2D(room, 1.999, 0)).toBeLessThan(0);
    expect(sdPolygon2D(room, 2.001, 0)).toBeGreaterThan(0);
  });

  it("is the true distance to the nearest edge, outside", () => {
    // The magnitude outside is exact for a convex outline, which is what makes it usable
    // as a step and what makes the `exact: false` flag about the *inside* only.
    const room = square(2);
    // Squarely off one flat, 3 away from the face at x = 2.
    expect(sdPolygon2D(room, 5, 0)).toBeCloseTo(3, 12);
    // Off a corner, where the nearest point is the corner itself and the distance is
    // the hypotenuse rather than either distance alone.
    expect(sdPolygon2D(room, 4, 4)).toBeCloseTo(Math.SQRT2 * 2, 12);
    // Along a flat but past the end, where the nearest point is a vertex.
    expect(sdPolygon2D(room, 5, 3)).toBeCloseTo(Math.sqrt(9 + 1), 12);
  });

  it("does not care which way round the outline was drawn", () => {
    // **The property that saves a hand-drawn floor plan.** A person closes a loop in
    // whichever direction their hand went, and the crossing count this uses is odd
    // exactly when the point is inside for *either* winding. An implementation that
    // assumed one would return a sign that is wrong for the other, which meshes as the
    // infinite complement of a room — solid everywhere except inside the walls.
    const forwards = square(2);
    const backwards = [...forwards].reverse();
    for (const [x, z] of [
      [0, 0],
      [1.5, 1.5],
      [3, 0],
      [0, 3],
      [-4, -4],
      [2.1, -2.1],
    ]) {
      expect(sdPolygon2D(backwards, x, z), `at (${x}, ${z})`).toBeCloseTo(
        sdPolygon2D(forwards, x, z),
        12,
      );
    }
  });

  it("distinguishes a concavity from its own bounding box", () => {
    // The point inside the bounding square and inside the L.
    expect(sdPolygon2D(lShape(), 1, 1)).toBeLessThan(0);
    // And the point inside the bounding square and *outside* the L. A box about the
    // origin cannot tell these apart, which is the whole reason a polygon is not a box.
    expect(sdPolygon2D(lShape(), 5, 5)).toBeGreaterThan(0);
    // Above the whole thing, and to the right of it.
    expect(sdPolygon2D(lShape(), -1, 3)).toBeGreaterThan(0);
    expect(sdPolygon2D(lShape(), 7, 1)).toBeGreaterThan(0);
  });

  it("is the true distance to the outline on both sides of it", () => {
    // **The claim that makes the `exact: false` on `Polygon` about the prism and not
    // about this.** The usual thing said about polygon distance functions is that they
    // degrade inside a non-convex region, and this one does not: the boundary of the
    // interior *is* the outline, so the closest boundary point to an interior point is
    // the closest point on the outline to it. Checked against a brute-force search
    // along every edge, which is slow and assumes nothing this implementation does.
    const outline = lShape();
    for (const [x, z] of [
      [1, 1], // inside, nearest edge is a flat
      [0.5, 0.5],
      [2, 2], // inside, nearest point is a corner
      [1, 5], // inside the tall arm, across the notch
      [5, 1], // inside the wide arm, across the notch
      [1.5, 4.5],
      [5.5, 5.5], // outside, in the removed quarter
      [8, 1],
      [-1, -1],
      [3, 3], // on the inner corner
    ]) {
      expect(Math.abs(sdPolygon2D(outline, x, z)), `(${x}, ${z})`).toBeCloseTo(
        nearestBoundaryPoint(outline, x, z),
        3,
      );
    }
  });

  it("is finite for an outline it cannot make a shape of", () => {
    // Two fewer points than a polygon has, and then one fewer than that. Both reach the
    // field as a NaN rather than a distance if the guard is missing, and a NaN propagates
    // through every comparison as false — a hole in the mesh that nothing downstream can
    // explain.
    for (const outline of [
      [],
      [{ x: 0, z: 0 }],
      [
        { x: 0, z: 0 },
        { x: 1, z: 0 },
      ],
    ]) {
      expect(Number.isFinite(sdPolygon2D(outline, 0.5, 0.5))).toBe(true);
      expect(Number.isFinite(sdPolygon2D(outline, 1e6, 0))).toBe(true);
    }
  });

  it("survives two vertices at the same place", () => {
    // **A zero-length edge divides by zero.** `clamp(NaN, 0, 1)` is still NaN, so the
    // minimum over the edges would be NaN and every point in the bounding box would be.
    // The level reader refuses consecutive duplicates; this is what happens when one gets
    // past it anyway, which a merge conflict is enough to arrange.
    const outline: OutlinePoint[] = [
      { x: 0, z: 0 },
      { x: 0, z: 0 },
      { x: 4, z: 0 },
      { x: 4, z: 4 },
      { x: 0, z: 4 },
    ];
    for (const [x, z] of [
      [2, 2],
      [5, 2],
      [0, 0],
      [-3, -3],
    ]) {
      expect(
        Number.isFinite(sdPolygon2D(outline, x, z)),
        `at (${x}, ${z})`,
      ).toBe(true);
    }
    // And it still got the sign right: the square it was meant to be.
    expect(sdPolygon2D(outline, 2, 2)).toBeLessThan(0);
    expect(sdPolygon2D(outline, 5, 2)).toBeGreaterThan(0);
  });
});

describe("the distance to an outline with a thickness", () => {
  const slab = (points: OutlinePoint[], len: number) =>
    ({ type: "Polygon", points, len }) as const;

  it("is negative inside the slab and positive outside it", () => {
    const floor = slab(square(2), 0.4);
    expect(sdPolygonPrism(square(2), 0.4, { x: 0, y: 0, z: 0 })).toBeLessThan(
      0,
    );
    // Inside the outline but above the top face.
    expect(
      sdPolygonPrism(square(2), 0.4, { x: 0, y: 0.21, z: 0 }),
    ).toBeGreaterThan(0);
    // Inside the slab's height but outside the outline.
    expect(
      sdPolygonPrism(square(2), 0.4, { x: 2.5, y: 0, z: 0 }),
    ).toBeGreaterThan(0);
    // Outside on both counts.
    expect(
      sdPolygonPrism(square(2), 0.4, { x: 9, y: 9, z: 0 }),
    ).toBeGreaterThan(0);
    expect(floor.len).toBe(0.4);
  });

  it("puts its top and bottom faces exactly half the thickness away", () => {
    // **The extrusion is `max(planar, axial)` and this is the half that is not the
    // outline.** Over the middle of a room, where the point is inside the outline, the
    // distance is entirely the slab's — so it is exact and it is the number a roof's
    // height is measured against.
    const room = square(2);
    for (const y of [0.2, 0.5, 3, 40]) {
      expect(sdPolygonPrism(room, 0.4, { x: 0, y, z: 0 })).toBeCloseTo(
        y - 0.2,
        12,
      );
      expect(sdPolygonPrism(room, 0.4, { x: 0, y: -y, z: 0 })).toBeCloseTo(
        y - 0.2,
        12,
      );
    }
    // On the faces themselves.
    expect(
      Math.abs(sdPolygonPrism(room, 0.4, { x: 0, y: 0.2, z: 0 })),
    ).toBeLessThan(1e-12);
  });

  it("is the outline's own distance off to one side, within the slab", () => {
    // Where the outline is the binding constraint, the slab must not get in the way —
    // a max takes the larger of two distances, so this checks it took the outline's.
    const room = square(2);
    // On the face itself the prism's distance is the outline's, and is zero.
    expect(
      Math.abs(sdPolygonPrism(room, 0.4, { x: 2, y: 0, z: 0 })),
    ).toBeLessThan(1e-12);
    // A unit further out, still inside the slab's height, is a unit from the wall.
    expect(sdPolygonPrism(room, 0.4, { x: 3, y: 0, z: 0 })).toBeCloseTo(1, 12);
    // And it did not take the slab's half-thickness, which is the bug this is here for:
    // a max takes the larger of the two, and 0.2 would be the wrong one.
    expect(sdPolygonPrism(room, 0.4, { x: 3, y: 0, z: 0 })).not.toBeCloseTo(
      0.2,
      6,
    );
  });

  it("is exact everywhere except outside the outline and the slab at once", () => {
    // **The whole of what `exact: false` means, measured rather than claimed.** A point
    // outside both the outline *and* the slab's height should be a hypotenuse from the
    // corner of the solid; `max` reports the longer leg. Everywhere else the report is
    // the true distance, and that is the part worth pinning too — a flag that only ever
    // says "approximate" is a flag nobody can act on.
    //
    // A grid rather than a list of points, because the claim is about *regions* and a list
    // would only ever sample three of the four corners of one outline. Y is stepped finer
    // than X and Z because the slab is four tenths thick and the faces are the regions
    // most worth landing on.
    const outline = lShape();
    const len = 0.4;
    const half = len / 2;
    let exact = 0;
    let short = 0;
    for (let xi = -8; xi <= 16; xi += 1) {
      for (let yi = -10; yi <= 10; yi += 1) {
        for (let zi = -8; zi <= 16; zi += 1) {
          const p = { x: xi / 2, y: yi / 10, z: zi / 2 };
          const planar = sdPolygon2D(outline, p.x, p.z);
          const axial = Math.abs(p.y) - half;
          const reported = sdPolygonPrism(outline, len, p);
          expect(reported).toBeCloseTo(Math.max(planar, axial), 12);

          // The truth, by which of the four regions the point is in.
          const walls = Math.abs(planar);
          const inOutline = planar <= 0;
          const inSlab = axial <= 0;
          const truth =
            inOutline && inSlab
              ? -Math.min(walls, -axial)
              : inOutline && !inSlab
                ? axial
                : !inOutline && inSlab
                  ? walls
                  : Math.hypot(walls, axial);

          const where = `(${p.x}, ${p.y}, ${p.z})`;
          // **The safety direction, checked everywhere rather than claimed: a sphere
          // tracer stepping by this number must land short of the surface.**
          expect(reported, `over-reports at ${where}`).toBeLessThanOrEqual(
            truth + 1e-9,
          );
          if (inSlab) {
            // Inside the slab's height, the report is exact whether the point is inside
            // the outline or past its wall.
            expect(reported, `inexact at ${where}`).toBeCloseTo(truth, 9);
            exact++;
          } else if (inOutline) {
            expect(reported, `inexact at a face in ${where}`).toBeCloseTo(
              truth,
              9,
            );
            exact++;
          } else {
            // Outside both: the only region where it may be short, and never by more than
            // the factor of √2 a longer leg against a hypotenuse allows. Strictly short
            // only once both legs are non-zero, because a point exactly on the outline's
            // boundary has one leg of zero and the hypotenuse *is* the other one.
            expect(reported, `over-reports at ${where}`).toBeLessThanOrEqual(
              truth,
            );
            if (walls > 0 && axial > 0) {
              expect(reported, `not short at ${where}`).toBeLessThan(truth);
              expect(reported / truth).toBeGreaterThan(1 / Math.SQRT2 - 1e-9);
            }
            short++;
          }
        }
      }
    }
    // So the grid is not vacuous in either direction — a test that only ever landed in
    // one region would pass an implementation that was wrong in the other three.
    expect(exact).toBeGreaterThan(1000);
    expect(short).toBeGreaterThan(1000);
  });

  it("keeps the same concavity the outline had", () => {
    // **A floor and a decal are different shapes**, and this is the assertion that says
    // which one this is: the removed quarter is hollow at *every* height in the slab,
    // not only in the plane the outline was drawn in.
    const outline = lShape();
    expect(sdPolygonPrism(outline, 0.4, { x: 1, y: 0, z: 1 })).toBeLessThan(0);
    expect(sdPolygonPrism(outline, 0.4, { x: 5, y: 0, z: 5 })).toBeGreaterThan(
      0,
    );
    expect(
      sdPolygonPrism(outline, 0.4, { x: 5, y: 0.19, z: 5 }),
    ).toBeGreaterThan(0);
    expect(
      sdPolygonPrism(outline, 0.4, { x: 5, y: -0.19, z: 5 }),
    ).toBeGreaterThan(0);
  });

  it("is centred on its own origin, so a box about it contains it", () => {
    // **The property that makes `halfExtents` usable as a BVH index.** The fold rotates a
    // *symmetric* half-box about the operation's origin, so a shape whose own extent is
    // not symmetric about where it is indexed would leave part of its surface outside the
    // box and re-mesh nothing when it changed.
    const room = square(2);
    const half = primitiveHalfExtents(slab(room, 0.4));
    expect(half).toEqual({ x: 2, y: 0.2, z: 2 });
    // The far corner of the slab is inside, and just outside it is not.
    expect(
      sdPolygonPrism(room, 0.4, { x: 2, y: 0.2, z: 2 }),
    ).toBeLessThanOrEqual(0);
    expect(
      sdPolygonPrism(room, 0.4, { x: 2.01, y: 0.21, z: 2.01 }),
    ).toBeGreaterThan(0);
  });

  it("measures its box over the points it has and not over a fixed capacity", () => {
    // **The trap the walls plan recorded, in its polygon form.** A box sized for the
    // table's `maxPoints` would cover empty space; a box sized for a *smaller* outline
    // than the shape once had would clip the surface. Both are one call away.
    const narrow = polygonHalfExtents(
      [
        { x: -1, z: -3 },
        { x: 1, z: -3 },
        { x: 1, z: 3 },
        { x: -1, z: 3 },
      ],
      2,
    );
    expect(narrow).toEqual({ x: 1, y: 1, z: 3 });
    const wide = polygonHalfExtents(square(10), 2);
    expect(wide).toEqual({ x: 10, y: 1, z: 10 });
    // An outline whose own box is off-centre still reports a symmetric half-box, because
    // the operation's origin is its centre — the level editor's job, not the SDF's.
    const offCentre = polygonHalfExtents(
      [
        { x: 4, z: -1 },
        { x: 6, z: -1 },
        { x: 6, z: 1 },
        { x: 4, z: 1 },
      ],
      2,
    );
    expect(offCentre).toEqual({ x: 1, y: 1, z: 1 });
  });

  it("stays finite when the thickness is nothing", () => {
    // A scale-to-zero in a transform panel. The clamp is `radius`, which is where every
    // axial size in this table is clamped, and a degenerate slab is a thin one rather
    // than a NaN.
    expect(
      Number.isFinite(sdPolygonPrism(square(2), 0, { x: 0, y: 0, z: 0 })),
    ).toBe(true);
    expect(
      Number.isFinite(sdPolygonPrism(square(2), -5, { x: 0, y: 0, z: 0 })),
    ).toBe(true);
  });
});
