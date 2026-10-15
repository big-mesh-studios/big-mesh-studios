import { describe, expect, it } from "vitest";

import type { Vec3 } from "@big-mesh-studios/core";
import { sdShape, primitiveHalfExtents } from "@big-mesh-studios/sdf";
import type { OperationShape } from "@big-mesh-studios/sdf";

import {
  FLOOR_SHAPE,
  floorCentre,
  floorDrawing,
  floorPlacement,
  floorPointBounds,
  floorRefusal,
  openOutline,
  outlineIsSimple,
} from "./floor";
import { planeThrough } from "./plane";
import { quatFromBasis } from "../../places/level/walls";

/**
 * The turn is the part that can be wrong without looking wrong.
 *
 * **A floor that is drawn on a planet's ground and built on world Y would still mesh, still
 * render, and still be pickable — as a slab lying over the horizon rather than lying on the
 * ground.** Nothing about the result looks broken; it is just in the wrong place, which is the
 * failure `walls.test.ts` checks for a wall and which this file checks for a floor by rotating
 * the shape's own axes back through the orientation and proving they land on the drawn plane's.
 */

const FLAT_UP: Vec3 = { x: 0, y: 1, z: 0 };
const flat = planeThrough({ x: 0, y: 0, z: 0 }, FLAT_UP);
const at = (x: number, z: number): Vec3 => ({ x, y: 0, z });

/** A square of the given half-width, counter-clockwise, with the corner first. */
const square = (half: number): Vec3[] => [
  at(-half, -half),
  at(half, -half),
  at(half, half),
  at(-half, half),
];

/**
 * Rotates a vector by a quaternion, which is what the fold does to a point in its own frame.
 *
 * **`v + 2·q⃗ × (q⃗ × v + w·v)`**, expanded so there is no quaternion library here. The identity
 * is the check: with `w = 1` and `q⃗ = 0` the cross products vanish and the vector comes back
 * unchanged, and a rotation written out longhand is exactly the kind of thing that is subtly
 * wrong in a way that still looks plausible.
 */
const rotate = (
  q: { x: number; y: number; z: number; w: number },
  v: Vec3,
): Vec3 => {
  const u = { x: q.x, y: q.y, z: q.z };
  const inner = cross(u, {
    x: cross(u, v).x + q.w * v.x,
    y: cross(u, v).y + q.w * v.y,
    z: cross(u, v).z + q.w * v.z,
  });
  return {
    x: v.x + 2 * inner.x,
    y: v.y + 2 * inner.y,
    z: v.z + 2 * inner.z,
  };
};

const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

const project = (point: Vec3, axis: Vec3): number =>
  point.x * axis.x + point.y * axis.y + point.z * axis.z;

describe("a floor's point limits", () => {
  it("come from the table, so the three places that quote them cannot drift", () => {
    const [minimum, maximum] = floorPointBounds();
    // The same numbers the level reader's refusal message uses, read from the same entry.
    expect(minimum).toBe(3);
    expect(maximum).toBe(64);
  });
});

describe("an outline", () => {
  it("loses the closing point, because the first one is already there", () => {
    // **The normal case, not an error.** A person closes a drawn loop by snapping back onto
    // the first vertex, so the chain arrives with that vertex twice — and a polygon needs
    // three distinct points, since two consecutive identical ones are an edge of no length
    // and the distance function divides by its squared length.
    const closed = [...square(10), at(-10, -10)];
    expect(closed).toHaveLength(5);
    expect(openOutline(closed)).toHaveLength(4);
  });

  it("is refused when there are only two points, because two points make a line", () => {
    expect(openOutline([at(0, 0), at(1, 1)])).toBeUndefined();
    expect(openOutline([at(0, 0)])).toBeUndefined();
  });

  it("keeps an outline that was drawn open, because a triangle is three points", () => {
    // **Not every outline needs a repeated closing point.** A person who stops on the third
    // point has still closed the loop as far as the shape is concerned, and dropping
    // `chain[0]` would be wrong.
    expect(openOutline([at(0, 0), at(10, 0), at(0, 10)])).toHaveLength(3);
  });

  it("recognises a simple outline and a crossed one", () => {
    expect(outlineIsSimple(square(10))).toBe(true);
    // A figure of eight: four points, the middle pair swapped so two edges cross.
    expect(outlineIsSimple([at(0, 0), at(10, 10), at(10, 0), at(0, 10)])).toBe(
      false,
    );
    // An L is concave and perfectly simple — concavity is not what this catches.
    expect(
      outlineIsSimple([
        at(0, 0),
        at(6, 0),
        at(6, 3),
        at(3, 3),
        at(3, 6),
        at(0, 6),
      ]),
    ).toBe(true);
  });

  it("does not call the first and last edges a crossing, because they share a vertex", () => {
    // **The mistake this guards against is an outline that can never be drawn.** If the
    // closing pair were treated as non-adjacent, every closed loop would be reported as
    // crossing itself and the tool would refuse everything.
    expect(outlineIsSimple(square(10))).toBe(true);
  });
});

describe("why a chain is not a floor", () => {
  const chain = (points: Vec3[]): readonly (readonly Vec3[])[] => [points];

  it("says nothing when the chain is one closed, simple outline", () => {
    expect(floorRefusal(chain([...square(10), at(-10, -10)]))).toBeUndefined();
  });

  it("says to draw something when there is nothing", () => {
    expect(floorRefusal([[]])).toMatch(/draw a closed outline/i);
  });

  it("says the chain is too short when there are only two points", () => {
    expect(floorRefusal(chain([at(0, 0), at(10, 0)]))).toMatch(
      /at least 3 points/i,
    );
    expect(floorRefusal(chain([at(0, 0)]))).toMatch(/at least 3 points/i);
  });

  it("says it is two things when there are two chains", () => {
    expect(floorRefusal([square(10), [at(0, 0), at(1, 0), at(1, 1)]])).toMatch(
      /one outline/,
    );
  });

  it("names the limit when there are too many points", () => {
    const [, maximum] = floorPointBounds();
    const many = Array.from({ length: maximum + 1 }, (_, i) => at(i, i));
    expect(floorRefusal(chain(many))).toMatch(
      new RegExp(`at most ${maximum} points`),
    );
  });

  it("says the loop crosses itself when it does", () => {
    expect(
      floorRefusal(chain([at(0, 0), at(10, 10), at(10, 0), at(0, 10)])),
    ).toMatch(/crosses itself/i);
  });
});

describe("a floor's centre", () => {
  it("is the middle of the outline's box, not the mean of its vertices", () => {
    // **And the mean would be wrong in a way that is not obvious.** Three of these four
    // corners are at x = 10, so the average sits a quarter of the way along the shape rather
    // than in the middle of it — and `halfExtents` is a symmetric box about this point, so a
    // centre that is not the box's midpoint leaves part of the floor's own surface outside
    // the box the BVH indexes it by, and re-meshes nothing when it changes.
    const centre = floorCentre(square(10), flat);
    expect(centre.x).toBeCloseTo(0, 12);
    expect(centre.z).toBeCloseTo(0, 12);
    const lopsided = floorCentre(
      [at(0, 0), at(30, 0), at(30, 10), at(0, 10)],
      flat,
    );
    expect(lopsided).toEqual({ x: 15, y: 0, z: 5 });
    // And the mean of that outline's vertices is x = 15 too, so use a shape where they differ.
    const arrow = floorCentre(
      [at(0, 0), at(10, 0), at(10, 10), at(9, 10), at(0, 10)],
      flat,
    );
    expect(arrow.x).toBeCloseTo(5, 12);
    const mean = (0 + 10 + 10 + 9 + 0) / 5;
    expect(mean).not.toBeCloseTo(arrow.x, 6);
  });

  it("is the middle of the slab's own height, so `at.y` is the mid-plane", () => {
    // **The decision ADR 0053 records**, and the reason the shape's extent stays symmetric
    // about where it is indexed. A floor's top surface is `at.y + len / 2` and its underside
    // is `at.y - len / 2`; nothing about the shape hangs off one side of its origin.
    const plane = planeThrough({ x: 0, y: 0, z: 0 }, FLAT_UP);
    expect(
      floorCentre([at(-5, -5), at(5, -5), at(5, 5), at(-5, 5)], plane).y,
    ).toBe(0);
  });
});

describe("the shape a drawn outline makes", () => {
  const floorOf = (outline: Vec3[], plane = flat) => {
    const placement = floorPlacement(outline, plane);
    const shape: OperationShape = {
      type: "Polygon",
      points: placement.points,
      len: 4,
    };
    return { ...placement, shape };
  };

  it("stands the shape's own axes on the plane it was drawn in", () => {
    // **The property that can be wrong without looking wrong.** A floor built on world Y
    // would mesh, render and be pickable — as a slab lying over the horizon rather than lying
    // on the ground. So the shape's local axes are rotated back through the orientation and
    // proved to land on the drawn plane's own three.
    const plane = planeThrough({ x: 0, y: 0, z: 0 }, FLAT_UP);
    const { orientation } = floorOf(square(10), plane);
    const ez = cross(plane.axisA, plane.up);
    const ex = rotate(orientation, { x: 1, y: 0, z: 0 });
    const ey = rotate(orientation, { x: 0, y: 1, z: 0 });
    const third = rotate(orientation, { x: 0, y: 0, z: 1 });
    const close = (a: Vec3, b: Vec3) =>
      Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
    expect(close(ex, plane.axisA)).toBeLessThan(1e-9);
    expect(close(ey, plane.up)).toBeLessThan(1e-9);
    expect(close(third, ez)).toBeLessThan(1e-9);
    // **And the frame is right-handed, which is what makes it a rotation at all.** The
    // natural reading — that the shape's local `z` is the plane's `axisB` — is a
    // transposition of `(axisA, axisB, up)` and flips the determinant, and a determinant of
    // −1 is a reflection that no quaternion reproduces. `quatFromBasis` still returns
    // something for it; the something is not this frame, and the floor would be mirrored
    // about its own `up` and still mesh.
    expect(close(cross(ex, ey), ez)).toBeLessThan(1e-9);
    expect(close(cross(ex, ey), plane.axisB)).toBeGreaterThan(1);
    // And it is the same quaternion `walls.ts` builds a wall from, so a floor and a wall
    // drawn on the same plane stand the same way up.
    expect(orientation).toEqual(quatFromBasis(plane.axisA, plane.up, ez));
  });

  it("puts the outline in the shape's own plane, so the item turns with everything else", () => {
    const plane = planeThrough({ x: 0, y: 0, z: 0 }, FLAT_UP);
    const { points, at: centre } = floorOf(square(10), plane);
    expect(centre.x).toBeCloseTo(0, 9);
    expect(centre.y).toBeCloseTo(0, 9);
    expect(centre.z).toBeCloseTo(0, 9);
    // **In the plane's own axes, and not in the world's.** `planeThrough` builds its basis
    // with `onbFromDirection` precisely so it is continuous and total, which means its
    // `axisA` is whichever of the two tangents that function happened to hand back for this
    // normal — it is continuous in the direction, not equal to world +X. The local
    // coordinates are therefore whatever the plane says, and the orientation is what carries
    // that back to the world; writing them against world axes here would be asserting a
    // property `plane.ts` deliberately does not have.
    const ez = cross(plane.axisA, plane.up);
    const localOf = (p: Vec3) => [
      project(p, plane.axisA) - project(centre, plane.axisA),
      project(p, ez) - project(centre, ez),
    ];
    expect(points.map((point) => [point.x, point.z])).toEqual(
      square(10).map(localOf),
    );
    // And every corner is ten from the centre on one axis or the other, which is the
    // property the shape's half-extents are read from.
    for (const point of points) {
      expect(Math.max(Math.abs(point.x), Math.abs(point.z))).toBeCloseTo(10, 9);
    }
  });

  it("recovers a world point from the shape's own frame and the orientation", () => {
    // **The round trip, which is what makes the local coordinates trustworthy.** The fold
    // turns a world point into a shape's own frame by subtracting the origin and rotating by
    // the conjugate; putting a corner back the other way has to give the point that was
    // drawn, or the floor is somewhere other than where it was sketched.
    const plane = planeThrough({ x: 0, y: 0, z: 0 }, FLAT_UP);
    const drawn = square(10);
    const { points, at: centre, orientation } = floorPlacement(drawn, plane);
    for (const [i, corner] of drawn.entries()) {
      const local = points[i]!;
      const ez = cross(plane.axisA, plane.up);
      const world = {
        x: centre.x + local.x * plane.axisA.x + local.z * ez.x,
        y: centre.y,
        z: centre.z + local.x * plane.axisA.z + local.z * ez.z,
      };
      expect(world.x).toBeCloseTo(corner.x, 9);
      expect(world.z).toBeCloseTo(corner.z, 9);
      // And through the quaternion, which is the other way round the same claim.
      const back = rotate(orientation, { x: local.x, y: 0, z: local.z });
      expect(back.x).toBeCloseTo(corner.x - centre.x, 9);
      expect(back.z).toBeCloseTo(corner.z - centre.z, 9);
    }
  });

  it("builds a shape the distance function agrees with", () => {
    // **The two halves meeting.** `floor.ts` turns a drawn loop into a `Polygon`, and the
    // table's own `sdf` is what the fold calls; if the local coordinates were projected onto
    // the wrong pair of axes the floor would still be a polygon, and it would be a polygon
    // lying on its side somewhere else. So: the centre is inside, a corner is on the surface,
    // and a point beyond the edge is outside.
    const { shape } = floorOf(square(10));
    expect(shape.type).toBe(FLOOR_SHAPE);
    expect(sdShape(shape, { x: 0, y: 0, z: 0 })).toBeLessThan(0);
    expect(Math.abs(sdShape(shape, { x: 10, y: 0, z: 5 }))).toBeLessThan(1e-9);
    expect(sdShape(shape, { x: 12, y: 0, z: 5 })).toBeCloseTo(2, 9);
    // The half-extents are a box that contains it, which is the BVH's whole requirement.
    expect(primitiveHalfExtents(shape)).toEqual({ x: 10, y: 2, z: 10 });
  });

  it("comes back out of the shape it was put into, exactly", () => {
    // **The inverse, and it is what makes "Edit outline" safe.** `planeThrough` cannot stand
    // in for it, because a fresh basis in the same plane is a different set of coordinates
    // for the same points — and `floorCentre` takes the centre from the bounding box *in
    // that basis*, so rotating the basis inside a plane moves the centre by up to the
    // difference between two enclosing boxes. A person who opened the editor and pressed
    // Finish without moving anything would watch the floor slide across the room.
    //
    // So this asserts the whole round trip: outline → shape → outline → shape, with the
    // centre, the turn and every local coordinate unchanged.
    for (const plane of [
      flat,
      planeThrough({ x: 0, y: 0, z: 0 }, FLAT_UP),
      planeThrough({ x: 100, y: 0, z: 0 }, { x: 0.6, y: 0.8, z: 0 }),
      planeThrough({ x: -40, y: 12, z: 7 }, { x: -0.2, y: 0.3, z: 0.93 }),
    ]) {
      // **Built in the plane's own coordinates, not in world ones.** A tilted plane's points
      // are not at world `y = 0`, and an outline that is not in the plane is not one a draw
      // tool can produce — every point there is a ray met with the plane. A non-planar
      // outline is projected onto the plane, which is well defined but not an inverse.
      const inPlane = (a: number, b: number): Vec3 => ({
        x: plane.origin.x + a * plane.axisA.x + b * plane.axisB.x,
        y: plane.origin.y + a * plane.axisA.y + b * plane.axisB.y,
        z: plane.origin.z + a * plane.axisA.z + b * plane.axisB.z,
      });
      const drawn = [
        inPlane(-10, -10),
        inPlane(10, -10),
        inPlane(10, 10),
        inPlane(6, 9),
        inPlane(-3, 12),
        inPlane(-10, 10),
      ];
      const first = floorPlacement(drawn, plane);
      const back = floorDrawing(first.points, first.at, first.orientation);
      expect(back.plane.up.x).toBeCloseTo(plane.up.x, 9);
      expect(back.plane.up.y).toBeCloseTo(plane.up.y, 9);
      expect(back.plane.up.z).toBeCloseTo(plane.up.z, 9);
      // The world points came back.
      for (const [i, point] of back.outline.entries()) {
        expect(point.x).toBeCloseTo(drawn[i]!.x, 8);
        expect(point.y).toBeCloseTo(drawn[i]!.y, 8);
        expect(point.z).toBeCloseTo(drawn[i]!.z, 8);
      }
      // And putting them through again gives the identical shape — same centre, same turn,
      // same coordinates — so a redraw with no edits written is a no-op on the file.
      const second = floorPlacement(back.outline, back.plane);
      expect(second.at.x).toBeCloseTo(first.at.x, 8);
      expect(second.at.y).toBeCloseTo(first.at.y, 8);
      expect(second.at.z).toBeCloseTo(first.at.z, 8);
      expect(second.orientation.x).toBeCloseTo(first.orientation.x, 9);
      expect(second.orientation.y).toBeCloseTo(first.orientation.y, 9);
      expect(second.orientation.z).toBeCloseTo(first.orientation.z, 9);
      expect(second.orientation.w).toBeCloseTo(first.orientation.w, 9);
      for (const [i, point] of second.points.entries()) {
        expect(point.x).toBeCloseTo(first.points[i]!.x, 8);
        expect(point.z).toBeCloseTo(first.points[i]!.z, 8);
      }
    }
  });

  it("works on a plane that is not flat, which is a planet", () => {
    // **Up is a function of where you are (ADR 0037), and a floor drawn on a world that is
    // a sphere has no world `up` to be built on.** The whole of `floor.ts` goes through the
    // drawn plane's own basis, so the only thing to check is that a tilted plane gives a
    // tilted floor.
    const up: Vec3 = { x: 0.6, y: 0.8, z: 0 };
    const plane = planeThrough({ x: 100, y: 0, z: 0 }, up);
    const local = (x: number, b: number): Vec3 => ({
      x: plane.origin.x + x * plane.axisA.x + b * plane.axisB.x,
      y: plane.origin.y + x * plane.axisA.y + b * plane.axisB.y,
      z: plane.origin.z + x * plane.axisA.z + b * plane.axisB.z,
    });
    const drawn = [
      local(-10, -10),
      local(10, -10),
      local(10, 10),
      local(-10, 10),
    ];
    const { shape, orientation } = floorOf(drawn, plane);
    // Its axes stand on the plane rather than on the world.
    const ey = rotate(orientation, { x: 0, y: 1, z: 0 });
    expect(ey.x).toBeCloseTo(up.x, 9);
    expect(ey.y).toBeCloseTo(up.y, 9);
    expect(ey.z).toBeCloseTo(up.z, 9);
    // And the shape is still a twenty-wide square in its own frame, wherever the world is.
    const half = primitiveHalfExtents(shape);
    expect(half.x).toBeCloseTo(10, 9);
    expect(half.y).toBeCloseTo(2, 9);
    expect(half.z).toBeCloseTo(10, 9);
    expect(sdShape(shape, { x: 0, y: 0, z: 0 })).toBeLessThan(0);
  });
});
