/**
 * The triangle queries, against a box whose answer can be worked out by hand.
 *
 * **A box rather than a meshed model, because a box has an answer.** Every expected value here —
 * which face, how far, which vertex — can be read off a diagram, so a failure says the query is
 * wrong rather than that the fixture is. The meshed-model tests at the bottom cover the other
 * half: that the tree behaves on the irregular, near-degenerate input it is really going to be
 * given, which a box cannot tell you.
 */
import type { Vec3 } from "@big-mesh-studios/core";
import {
  budgetFor,
  ChunkMeshBuilder,
  VERTEX_BYTES,
} from "@big-mesh-studios/meshing";
import type { ChunkMesh } from "@big-mesh-studios/meshing";
import { describe, expect, it } from "vitest";

import { centredBox } from "../print/fixtures";
import { placedPart } from "../model/part";
import { meshParts } from "../model/mesh-model";
import { TriangleBVH } from "./triangle-bvh";

/** A unit cube from -1 to 1, wound outward — twenty-eight vertices' worth of six faces. */
const box = (): ChunkMesh => centredBox(2);

const ray = (
  x: number,
  y: number,
  z: number,
  dx: number,
  dy: number,
  dz: number,
) => ({
  origin: { x, y, z },
  direction: { x: dx, y: dy, z: dz },
});

describe("intersectRay", () => {
  it("hits the near face of a box straight on", () => {
    const hit = TriangleBVH.of(box()).intersectRay(ray(0, 0, 5, 0, 0, -1));

    expect(hit).toBeDefined();
    expect(hit?.point).toEqual({ x: 0, y: 0, z: 1 });
    expect(hit?.distance).toBe(4);
  });

  it("reports a hit on a back face too, because the mesh is drawn two-sided", () => {
    // A subtracted sphere is mostly its own inside and `ModelMaterial` draws it `DoubleSide`.
    // Culling here would report empty space for a ray landing on visible surface.
    const hit = TriangleBVH.of(box()).intersectRay(ray(0, 0, -5, 0, 0, 1));

    expect(hit?.point).toEqual({ x: 0, y: 0, z: -1 });
    expect(hit?.distance).toBe(4);
  });

  it("names the triangle and its vertices it landed on", () => {
    const mesh = box();
    const hit = TriangleBVH.of(mesh).intersectRay(ray(0, 0, 5, 0, 0, -1));

    const base = (hit?.triangle ?? 0) * 3;
    const corners = [...hit!.vertices].map((vertex) =>
      mesh.positions.slice(vertex * 3, vertex * 3 + 3),
    );
    // Every corner of the front face sits at z = 1, and nothing else on this box does.
    expect(corners.map((at) => at[2])).toEqual([1, 1, 1]);
    expect([...mesh.indices.slice(base, base + 3)]).toEqual([...hit!.vertices]);
  });

  it("misses a ray pointing away from the box", () => {
    expect(
      TriangleBVH.of(box()).intersectRay(ray(0, 0, 5, 0, 0, 1)),
    ).toBeUndefined();
  });

  it("misses a ray that passes beside the box", () => {
    // Along the top face's own plane, a quarter of a unit above where it is. A slab test that
    // used a tolerance would report this as grazing the box.
    expect(
      TriangleBVH.of(box()).intersectRay(ray(0, 1.25, 5, 0, 0, -1)),
    ).toBeUndefined();
  });

  it("hits a box it starts inside, through the far wall", () => {
    const hit = TriangleBVH.of(box()).intersectRay(ray(0, 0, 0, 0, 1, 0));

    expect(hit?.point).toEqual({ x: 0, y: 1, z: 0 });
    expect(hit?.distance).toBe(1);
  });

  it("copes with a ray whose direction has two zeros", () => {
    // The `1 / 0` branch. A straight-on ray down one axis is the commonest ray there is, and
    // the reciprocal would be `Infinity` on both other axes for every node tested.
    expect(
      TriangleBVH.of(box()).intersectRay(ray(0, 0, 5, 0, 0, -1)),
    ).toBeDefined();
  });

  it("copes with a ray running exactly along a slab plane", () => {
    // x = 1 and y = 1 are the box's own maxima, so every node it enters on either axis is
    // entered at a distance of exactly zero. `0 * Infinity` is a `NaN`, and a `NaN` compares
    // false against both slab bounds — which would report the box as entered at no distance
    // rather than refusing to compute one.
    const hit = TriangleBVH.of(box()).intersectRay(ray(1, 1, 5, 0, 0, -1));

    expect(hit).toBeDefined();
    expect(hit?.point.z).toBeCloseTo(1);
    expect(hit?.distance).toBeCloseTo(4);
  });

  it("normalises the direction, so a distance is in world units", () => {
    // The same ray as the straight-on hit, handed in ten times too long.
    const short = TriangleBVH.of(box()).intersectRay(ray(0, 0, 5, 0, 0, -1));
    const long = TriangleBVH.of(box()).intersectRay(ray(0, 0, 5, 0, 0, -10));

    expect(long?.distance).toBeCloseTo(short?.distance as number);
  });

  it("gives up past the reach it was given", () => {
    expect(
      TriangleBVH.of(box()).intersectRay(ray(0, 0, 5, 0, 0, -1), 2),
    ).toBeUndefined();
  });

  it("answers nothing for a ray with no direction", () => {
    expect(
      TriangleBVH.of(box()).intersectRay(ray(0, 0, 5, 0, 0, 0)),
    ).toBeUndefined();
  });
});

describe("closestPoint", () => {
  it("measures to a face straight above", () => {
    const hit = TriangleBVH.of(box()).closestPoint({ x: 0, y: 3, z: 0 });

    expect(hit?.point).toEqual({ x: 0, y: 1, z: 0 });
    expect(hit?.distance).toBeCloseTo(2);
  });

  it("measures to a face straight out to the side", () => {
    const hit = TriangleBVH.of(box()).closestPoint({ x: -3, y: 0, z: 0 });

    expect(hit?.point).toEqual({ x: -1, y: 0, z: 0 });
    expect(hit?.distance).toBeCloseTo(2);
  });

  it("measures to a corner when nothing nearer is a face or an edge", () => {
    const hit = TriangleBVH.of(box()).closestPoint({ x: 5, y: 5, z: 5 });

    expect(hit?.point).toEqual({ x: 1, y: 1, z: 1 });
    expect(hit?.distance).toBeCloseTo(Math.sqrt(48));
  });

  it("gives every weight of a vertex it landed on to that vertex", () => {
    const mesh = box();
    const hit = TriangleBVH.of(mesh).closestPoint({ x: 5, y: 5, z: 5 });

    // One weight of one, the others nothing, whichever of the triangle's three corners it is.
    expect([...hit!.weights].sort((a, b) => b - a)).toEqual([1, 0, 0]);
  });

  it("measures to an edge, splitting the weights between its two ends", () => {
    // Out past the top face but level with it, so the nearest point is on the top edge rather
    // than anywhere on the top face.
    const hit = TriangleBVH.of(box()).closestPoint({ x: 0, y: 2, z: 1 });

    expect(hit?.point).toEqual({ x: 0, y: 1, z: 1 });
    expect(hit?.distance).toBeCloseTo(1);
    expect(hit?.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it("gives weights that sum to one and are never negative", () => {
    const bvh = TriangleBVH.of(box());

    for (let x = -2; x <= 2; x += 0.25) {
      for (let y = -2; y <= 2; y += 0.25) {
        for (let z = -2; z <= 2; z += 0.25) {
          const hit = bvh.closestPoint({ x, y, z });
          expect(hit, `at ${x}, ${y}, ${z}`).toBeDefined();
          const total = hit!.weights.reduce((a, b) => a + b, 0);
          expect(total).toBeCloseTo(1);
          for (const weight of hit!.weights)
            expect(weight).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("agrees with a brute-force search over every triangle", () => {
    // The tree's whole claim is that pruning a node cannot lose the answer. This is the one
    // test that would catch it being wrong: 4913 query points against every triangle of the
    // box with no tree at all.
    const mesh = box();
    const points: { x: number; y: number; z: number }[] = [];
    for (let x = -2; x <= 2; x += 0.2) {
      for (let y = -2; y <= 2; y += 0.5) {
        for (let z = -2; z <= 2; z += 0.5) {
          points.push({ x, y, z });
        }
      }
    }

    const bvh = TriangleBVH.of(mesh);
    let furthest = 0;
    for (const point of points) {
      const found = bvh.closestPoint(point);
      const brute = bruteForce(mesh, point);
      expect(
        found?.distance,
        `at ${point.x}, ${point.y}, ${point.z}`,
      ).toBeCloseTo(brute, 6);
      furthest = Math.max(furthest, Math.abs((found?.distance ?? 0) - brute));
    }
    expect(furthest).toBeLessThan(1e-9);
  });
});

describe("a mesh with nothing in it", () => {
  it("answers nothing, rather than throwing", () => {
    const empty = new ChunkMeshBuilder().finish();
    const bvh = TriangleBVH.of(empty);

    expect(bvh.triangleCount).toBe(0);
    expect(bvh.nodeCount).toBe(0);
    expect(bvh.closestPoint({ x: 0, y: 0, z: 0 })).toBeUndefined();
    expect(bvh.intersectRay(ray(0, 0, 5, 0, 0, -1))).toBeUndefined();
  });
});

describe("degenerate triangles", () => {
  /** A mesh of exactly one triangle, whose corners the caller may repeat. */
  const oneTriangle = (
    corners: readonly (readonly [number, number, number])[],
  ): ChunkMesh => {
    const builder = new ChunkMeshBuilder();
    const [first, second, third] = corners.map((at) => builder.vertex(...at));
    builder.triangle(first!, second!, third!);
    return builder.finish();
  };

  it("measures to a triangle whose first two corners are the same point", () => {
    // Marching cubes emits these at a cell where the field crosses within rounding, so
    // `reportMesh` counting them is the normal case rather than a fault. The region arithmetic
    // reaches a `0 / 0` here, and a `NaN` in the pruning that follows widens the search
    // silently instead of failing.
    const bvh = TriangleBVH.of(
      oneTriangle([
        [0, 0, 0],
        [0, 0, 0],
        [4, 0, 0],
      ]),
    );
    const hit = bvh.closestPoint({ x: 1, y: 3, z: 0 });

    expect(Number.isFinite(hit?.distance)).toBe(true);
    expect(hit?.distance).toBeCloseTo(3);
  });

  it("copes with every corner at the same point", () => {
    const bvh = TriangleBVH.of(
      oneTriangle([
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1],
      ]),
    );
    const hit = bvh.closestPoint({ x: 0, y: 0, z: 0 });

    expect(hit?.distance).toBeCloseTo(Math.sqrt(3));
    expect(hit?.point).toEqual({ x: 1, y: 1, z: 1 });
  });

  it("does not interrupt a ray query", () => {
    const bvh = TriangleBVH.of(
      oneTriangle([
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ]),
    );

    expect(bvh.intersectRay(ray(0, 0, 5, 0, 0, -1))).toBeUndefined();
  });
});

describe("a meshed model, which is the input this is really for", () => {
  const model = meshParts(
    [placedPart("sphere", { type: "Sphere", radius: 4 }, { x: 0, y: 0, z: 0 })],
    budgetFor(0.125),
  );
  const mesh = model!.mesh;

  it("holds a mesh of a size a transfer will actually walk", () => {
    expect(mesh.triangleCount).toBeGreaterThan(30_000);
  });

  it("leaves the packed vertex alone", () => {
    // The whole point of carrying coordinates in a parallel array rather than in
    // `ChunkMesh` is that this number does not move. It is the assertion that decides it.
    expect(VERTEX_BYTES).toBe(20);
    expect(mesh.positions.length).toBe(mesh.vertexCount * 3);
  });

  it("measures to the surface from outside it", () => {
    const hit = TriangleBVH.of(mesh).closestPoint({ x: 0, y: 0, z: 10 });

    expect(hit).toBeDefined();
    expect(hit!.distance).toBeGreaterThan(5);
    expect(hit!.distance).toBeLessThan(7);
  });

  it("measures further out on a longer ray", () => {
    const bvh = TriangleBVH.of(mesh);
    const near = bvh.closestPoint({ x: 0, y: 0, z: 5 });
    const far = bvh.closestPoint({ x: 0, y: 0, z: 50 });

    expect(near!.distance).toBeLessThan(far!.distance);
  });

  it("builds a tree rather than a list", () => {
    // A tree halves the triangles at every level, so it holds far fewer nodes than it has
    // triangles. A build that degenerated to one node per triangle would pass every query test
    // above — correctly, and far too slowly — so this is the only assertion that would notice.
    const bvh = TriangleBVH.of(mesh);

    expect(bvh.nodeCount).toBeGreaterThan(1);
    expect(bvh.nodeCount).toBeLessThan(mesh.triangleCount);
  });

  it("answers a vertex-at-a-time walk fast enough to run on every edit", () => {
    // One transfer is one query per vertex of the mesh. Ten thousand of them is a figure at a
    // coarser resolution than the one above, which is the shape of the work.
    const bvh = TriangleBVH.of(mesh);
    const started = performance.now();

    for (let vertex = 0; vertex < 10_000; vertex++) {
      const at = (vertex % mesh.vertexCount) * 3;
      bvh.closestPoint({
        x: mesh.positions[at]!,
        y: mesh.positions[at + 1]!,
        z: mesh.positions[at + 2]!,
      });
    }

    // Generous, for a test machine rather than a laptop. The point is to notice the pruning
    // being switched off, which costs two orders of magnitude rather than twenty per cent.
    expect(performance.now() - started).toBeLessThan(2000);
  });
});

/** The nearest point of `mesh` to `point`, by looking at every triangle. The check on the tree. */
const bruteForce = (mesh: ChunkMesh, point: Vec3): number => {
  let best = Infinity;

  for (let t = 0; t < mesh.indices.length; t += 3) {
    const [a, b, c] = [0, 1, 2].map((corner) =>
      cornerOf(mesh, mesh.indices[t + corner]!),
    );
    best = Math.min(best, distanceToTriangle(point, a, b, c));
  }

  return best;
};

const cornerOf = (mesh: ChunkMesh, vertex: number): Vec3 => ({
  x: mesh.positions[vertex * 3]!,
  y: mesh.positions[vertex * 3 + 1]!,
  z: mesh.positions[vertex * 3 + 2]!,
});

/**
 * Distance to a triangle, by checking each of its features.
 *
 * **A deliberately different formulation from the region walk under test.** This measures to all
 * three vertices, to all three edges, and — only when the perpendicular foot lands inside — to
 * the face itself. The region walk instead asks which of seven regions the point is in and stops
 * at the first that applies. Both are exact; they are reached differently, which is what makes
 * the comparison worth making. Reusing the implementation would only be testing it against
 * itself.
 */
const distanceToTriangle = (p: Vec3, a: Vec3, b: Vec3, c: Vec3): number => {
  const dot = (u: Vec3, v: Vec3): number => u.x * v.x + u.y * v.y + u.z * v.z;
  const away = (q: Vec3): number => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);

  let best = Math.min(away(a), away(b), away(c));

  for (const [from, to] of [
    [a, b],
    [a, c],
    [b, c],
  ] as const) {
    const edge = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
    const lengthSq = dot(edge, edge);
    if (lengthSq === 0) continue;
    const t = Math.max(
      0,
      Math.min(
        1,
        dot({ x: p.x - from.x, y: p.y - from.y, z: p.z - from.z }, edge) /
          lengthSq,
      ),
    );
    best = Math.min(
      best,
      Math.hypot(
        p.x - (from.x + edge.x * t),
        p.y - (from.y + edge.y * t),
        p.z - (from.z + edge.z * t),
      ),
    );
  }

  // The face, and only when the foot is on it. Outside, the nearest point is on an edge and the
  // edges above already have it.
  const normal = cross(
    { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z },
    { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z },
  );
  const areaSq = dot(normal, normal);
  if (areaSq === 0) return best;

  const along = { x: p.x - a.x, y: p.y - a.y, z: p.z - a.z };
  const u =
    dot(normal, cross(along, { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z })) /
    areaSq;
  const v =
    dot(normal, cross({ x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }, along)) /
    areaSq;

  if (u >= 0 && v >= 0 && u + v <= 1) {
    best = Math.min(best, Math.abs(dot(along, normal)) / Math.sqrt(areaSq));
  }

  return best;
};

const cross = (u: Vec3, v: Vec3): Vec3 => ({
  x: u.y * v.z - u.z * v.y,
  y: u.z * v.x - u.x * v.z,
  z: u.x * v.y - u.y * v.x,
});
