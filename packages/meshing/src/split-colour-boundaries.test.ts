import { describe, expect, it } from "vitest";

import { ChunkMeshBuilder, type ChunkMesh } from "./chunk-mesh";
import { marchingCubes, marchingCubesScratchFor } from "./marching-cubes";
import { describeReport, reportMesh } from "./mesh-report";
import {
  colourBoundaryScratchFor,
  splitColourBoundaries,
  type BoundaryColour,
  type ColourBoundaryScratch,
} from "./split-colour-boundaries";
import { sphere } from "./test-helpers";

const RED = { r: 220, g: 30, b: 40 };
const BLUE = { r: 30, g: 60, b: 220 };
const GREEN = { r: 30, g: 200, b: 60 };
const WHITE = { r: 255, g: 255, b: 255 };

/** Opaque, so a test that does not care about alpha does not have to say so again. */
const opaque = (colour: {
  r: number;
  g: number;
  b: number;
}): BoundaryColour => ({
  colour,
  material: 0,
});

/**
 * A rule with a genuine edge in it: red on one side of an oblique plane, blue on the other.
 *
 * **A plane rather than something curved, because the point of the test is the crossing and a
 * crossing is easiest to be sure of where it is.** The bisection finds the plane exactly, and a
 * test that cannot say where the answer ought to be is not pinning the answer.
 *
 * ## Why it has to be oblique, and this is not a detail
 *
 * **A marching cubes vertex lies on a grid-aligned coordinate unless it is on an edge running
 * along that axis, and the vertices on those edges land where the surface crosses — which for a
 * sphere near its equator is very nearly a grid plane.** So a plane rule of `x < c`, with `c`
 * between two samples, puts the colour boundary *exactly on the triangulation*: every vertex
 * is entirely one colour, no vertex is shared between two, and yet every triangle spanning the
 * boundary still blends across its width. There are no crossings to find at all, and a test
 * built that way would pass without ever exercising a bisection.
 *
 * Tilting the plane by an irrational-ish amount on `y` and `z` puts vertices either side of it
 * with real distances between them, which is what a crease between two coloured shapes
 * actually looks like.
 */
const leftRed = (x: number, y: number, z: number): BoundaryColour =>
  opaque(x + 0.37 * y + 0.11 * z < 0 ? RED : BLUE);

/** The same plane, axis-aligned and therefore exactly on the sample grid. See `leftRed`. */
const onGrid = (x: number): BoundaryColour => opaque(x < 0 ? RED : BLUE);

/** Splits a mesh, with a fresh scratch, so one case cannot leave state for the next. */
const split = (
  mesh: ChunkMesh,
  colourAt: (x: number, y: number, z: number) => BoundaryColour,
  tolerance?: number,
): ChunkMesh =>
  splitColourBoundaries(
    mesh,
    tolerance === undefined ? { colourAt } : { colourAt, tolerance },
    colourBoundaryScratchFor(mesh.triangleCount),
  );

/**
 * A real marching cubes sphere, coloured by `colourAt` at each vertex.
 *
 * **The region is centred on the origin rather than started at a fixed corner**, because a
 * region that does not contain the sphere gives a clipped mesh with a hole in it — and a test
 * asserting that splitting preserved watertightness would then be measuring the clip rather
 * than the pass. That is not a hypothetical: an earlier version of this helper put the origin
 * at `-radius - step` with too few samples, and reported a hundred and twelve open edges that
 * had nothing to do with colour.
 *
 * **It asserts the region contains the sphere** rather than trusting the caller's arithmetic,
 * because the failure is a hole in the test's own baseline and a hole looks like a hole.
 */
const sphereMesh = (
  colourAt: (x: number, y: number, z: number) => BoundaryColour,
  radius = 20,
  samples = 28,
  step = 2,
): ChunkMesh => {
  const reach = ((samples - 1) * step) / 2;
  if (reach < radius) {
    throw new Error(
      `${samples} samples of ${step} reach ${reach}, short of the radius ${radius}`,
    );
  }
  const field = sphere(0, 0, 0, radius);
  const out = new ChunkMeshBuilder();
  marchingCubes({
    origin: [-reach, -reach, -reach],
    samples,
    sampleSize: step,
    sampler: { distance: field },
    out,
    scratch: marchingCubesScratchFor(samples),
    onVertex: (index, x, y, z) => {
      const { colour, material } = colourAt(x, y, z);
      out.setColour(index, colour, material);
      out.setNormal(index, x / radius, y / radius, z / radius);
    },
  });
  return out.finish();
};

/** Every distinct colour in a mesh, counted by corner, as the packed keys. */
const cornerColours = (mesh: ChunkMesh): Map<string, number> => {
  const seen = new Map<string, number>();
  for (const vertex of mesh.indices) {
    const at = vertex * 4;
    const key = `${mesh.colours[at]},${mesh.colours[at + 1]},${mesh.colours[at + 2]},${mesh.colours[at + 3]}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return seen;
};

/** How many triangles hold three corners of one colour. */
const uniformTriangles = (mesh: ChunkMesh): number => {
  let count = 0;
  for (let t = 0; t + 2 < mesh.indices.length; t += 3) {
    const at = (v: number): string => {
      const a = v * 4;
      return `${mesh.colours[a]},${mesh.colours[a + 1]},${mesh.colours[a + 2]},${mesh.colours[a + 3]}`;
    };
    const first = at(mesh.indices[t] as number);
    if (
      first === at(mesh.indices[t + 1] as number) &&
      first === at(mesh.indices[t + 2] as number)
    ) {
      count++;
    }
  }
  return count;
};

/** Builds a mesh from vertices and triangles written out by hand. */
const handmade = (
  positions: readonly (readonly [number, number, number])[],
  triangles: readonly (readonly [number, number, number])[],
  colourOf: (vertex: number) => {
    colour: { r: number; g: number; b: number };
    material: number;
  },
): ChunkMesh => {
  const out = new ChunkMeshBuilder();
  for (const [x, y, z] of positions) out.vertex(x, y, z);
  for (const [a, b, c] of triangles) out.triangle(a, b, c);
  for (let v = 0; v < positions.length; v++) {
    const { colour, material } = colourOf(v);
    out.setColour(v, colour, material);
    out.setNormal(v, 0, 1, 0);
  }
  return out.finish();
};

describe("splitting colour boundaries", () => {
  it("leaves a mesh alone when no vertex is shared by two colours", () => {
    // **The bail, and it is what makes this safe to leave switched on.** A single-colour model
    // is most models, and the drag ghost is one of them; returning the argument rather than a
    // copy of it means neither pays for anything.
    const mesh = sphereMesh(() => ({ colour: WHITE, material: 1 }));
    expect(split(mesh, () => ({ colour: WHITE, material: 1 }))).toBe(mesh);
  });

  it("leaves a mesh with no surface alone", () => {
    const empty = new ChunkMeshBuilder().finish();
    expect(empty.triangleCount).toBe(0);
    expect(split(empty, leftRed)).toBe(empty);
  });

  it("makes every triangle one colour, which is the whole point", () => {
    // **Counted before as well as after, because a pass that did nothing would pass a test
    // written only for the after.** Before this, triangles carrying three corners of two colours
    // are the ones straddling the join; after, there are none.
    const mesh = sphereMesh(leftRed);
    expect(uniformTriangles(mesh), "nothing is uniform yet").toBeLessThan(
      mesh.triangleCount,
    );
    const cut = split(mesh, leftRed);
    expect(uniformTriangles(cut)).toBe(cut.triangleCount);
  });

  it("keeps exactly the colours the field named, and no new ones", () => {
    // **The seam must not invent a colour.** An interpolation somewhere — a crossed channel, a
    // blended normal written where a colour belongs — would show up here as a third key.
    const mesh = sphereMesh(leftRed);
    const cut = split(mesh, leftRed);
    for (const [key, uses] of cornerColours(cut)) {
      expect(
        [`${RED.r},${RED.g},${RED.b},0`, `${BLUE.r},${BLUE.g},${BLUE.b},0`],
        `colour ${key} with ${uses} corners`,
      ).toContain(key);
    }
  });

  it("puts each crossing strictly inside its edge, and each copy where it belongs", () => {
    // **Both halves of the claim.** A crossing at an endpoint bounds a region of no area, and a
    // crossing created twice for one edge is a seam the two triangles sharing that edge do not
    // agree on — which is the failure that would open a hole rather than merely look wrong.
    const mesh = sphereMesh(leftRed);
    const cut = split(mesh, leftRed);
    const fresh = cut.vertexCount - mesh.vertexCount;
    expect(fresh).toBeGreaterThan(0);
    // Two a crossing, always: one colour's copy and the other's.
    expect(fresh % 2).toBe(0);

    const onPlane = (x: number, y: number, z: number): number =>
      x + 0.37 * y + 0.11 * z;
    /**
     * **Every new vertex is either on the plane or a sliver away from an existing vertex.**
     *
     * The second case is a crossing clamped to `CROSSING_TOLERANCE` from an endpoint, and it is
     * expected rather than exceptional: a vertex sitting exactly *on* the boundary has its
     * crossings land on it, and cutting a thousandth of the way in is what stands between that
     * and a triangle of no area.
     *
     * **One allowance covers both cases, and it is a hundredth of a cell.** The bisection stops
     * when its bracket is a `CROSSING_TOLERANCE` of the edge and takes the midpoint, so a
     * crossing it did not fully resolve can be half of that from the true place — and the true
     * place is on the *plane*, whose own gradient is not a unit vector, so the shortfall in
     * world units is a little more than the shortfall in the parameter.
     */
    const original: [number, number, number][] = [];
    for (let v = 0; v < mesh.vertexCount; v++) {
      original.push([
        cut.positions[v * 3] as number,
        cut.positions[v * 3 + 1] as number,
        cut.positions[v * 3 + 2] as number,
      ]);
    }
    let onThePlane = 0;
    for (let v = mesh.vertexCount; v < cut.vertexCount; v++) {
      const x = cut.positions[v * 3] as number;
      const y = cut.positions[v * 3 + 1] as number;
      const z = cut.positions[v * 3 + 2] as number;
      if (Math.abs(onPlane(x, y, z)) < 0.01) {
        onThePlane++;
        continue;
      }
      const near = original.some(
        ([px, py, pz]) => Math.hypot(px - x, py - y, pz - z) < 0.01,
      );
      expect(
        near,
        `vertex ${v} at ${x},${y},${z} is neither on the plane nor beside an existing vertex`,
      ).toBe(true);
    }
    expect(onThePlane, "crossings land on the plane").toBeGreaterThan(0);
  });

  it("gives the two copies of a crossing the two colours its edge led between", () => {
    const mesh = sphereMesh(leftRed);
    const cut = split(mesh, leftRed);
    for (let v = mesh.vertexCount; v < cut.vertexCount; v += 2) {
      const a = cut.colours[v * 4] as number;
      const b = cut.colours[(v + 1) * 4] as number;
      expect([RED, BLUE].map((c) => c.r)).toContain(a);
      expect([RED, BLUE].map((c) => c.r)).toContain(b);
      expect(a, "the two copies differ").not.toBe(b);
    }
  });

  it("adds vertices only at boundaries, so a model's cost is its join rather than its surface", () => {
    // **The whole economy of the pass.** Doubling the resolution multiplies the surface by
    // eight; a join between the same two shapes grows by about the square of it, because the
    // boundary is a curve on a surface. So the growth must be far below the triangle growth,
    // or this is not the pass it was designed to be.
    const coarse = sphereMesh(leftRed, 20, 24, 2);
    const fine = sphereMesh(leftRed, 20, 48, 1);
    const growth =
      (split(fine, leftRed).vertexCount - fine.vertexCount) / fine.vertexCount;
    expect(fine.triangleCount / coarse.triangleCount).toBeGreaterThan(2);
    expect(growth).toBeLessThan(0.2);
  });

  it("gives the same answer twice", () => {
    // **A pass that walks a `Map` in insertion order and a pass that walks it in hash order
    // produce the same triangles and different buffers**, and the difference is invisible until
    // two exports of one model differ.
    const mesh = sphereMesh(leftRed);
    const first = split(mesh, leftRed);
    const second = split(mesh, leftRed);
    expect([...second.indices]).toEqual([...first.indices]);
    expect([...second.colours]).toEqual([...first.colours]);
    expect([...second.positions]).toEqual([...first.positions]);
    expect(second.vertexCount).toBe(first.vertexCount);
  });

  it("winds every piece of a cut triangle the same way as the solid it came from", () => {
    // **Outward, measured against the sphere's own centre.** A sub-triangle wound the wrong way
    // is invisible from outside a solid and is what `mesh-report` calls an inconsistent edge,
    // and comparing winding against the vertex normals would not catch it — on a curved surface
    // those are nearly perpendicular wherever the surface turns away, so the comparison is
    // decided by rounding there rather than by geometry. That is the long argument in
    // `mesh-report.ts` and this is the test that would otherwise rediscover it.
    const mesh = sphereMesh(leftRed, 20, 28, 2);
    const cut = split(mesh, leftRed);
    const outward = (t: number): number => {
      const v = [
        cut.indices[t * 3] as number,
        cut.indices[t * 3 + 1] as number,
        cut.indices[t * 3 + 2] as number,
      ];
      const p = v.map((i) => [
        cut.positions[i * 3] as number,
        cut.positions[i * 3 + 1] as number,
        cut.positions[i * 3 + 2] as number,
      ]);
      const [a, b, c] = p as [
        [number, number, number],
        [number, number, number],
        [number, number, number],
      ];
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const n = [
        u[1] * w[2] - u[2] * w[1],
        u[2] * w[0] - u[0] * w[2],
        u[0] * w[1] - u[1] * w[0],
      ];
      return n[0] * a[0] + n[1] * a[1] + n[2] * a[2];
    };

    let inward = 0;
    for (let t = 0; t < cut.triangleCount; t++) {
      if (outward(t) <= 0) inward++;
    }
    expect(inward, "every piece faces away from the sphere's centre").toBe(0);
  });

  it("puts a part of the surface in the colour that part is in", () => {
    // **The join has to be where the rule says, not merely sharp.** Asking for the colour of a
    // vertex nearest a known point cannot be faked by a pass that swapped the two halves, so the
    // two sides are asked separately and both have to come back right. The probes are on the
    // side of `leftRed`'s plane that their coordinates put them on.
    const mesh = sphereMesh(leftRed, 20, 28, 2);
    const cut = split(mesh, leftRed);
    const nearestColour = (at: readonly [number, number, number]): number => {
      let best = Infinity;
      let found = -1;
      for (let v = 0; v < cut.vertexCount; v++) {
        const d = Math.hypot(
          (cut.positions[v * 3] as number) - at[0],
          (cut.positions[v * 3 + 1] as number) - at[1],
          (cut.positions[v * 3 + 2] as number) - at[2],
        );
        if (d < best) {
          best = d;
          found = v;
        }
      }
      return cut.colours[found * 4] as number;
    };
    // Red side, whose plane value is comfortably negative.
    expect(nearestColour([-19, 0, 0])).toBe(RED.r);
    expect(nearestColour([-10, -14, 0])).toBe(RED.r);
    expect(nearestColour([0, 0, -19])).toBe(RED.r);
    // Blue side, comfortably positive.
    expect(nearestColour([19, 0, 0])).toBe(BLUE.r);
    expect(nearestColour([10, 14, 0])).toBe(BLUE.r);
    expect(nearestColour([0, 0, 19])).toBe(BLUE.r);
  });
});

/**
 * The guarantee this pass has to keep, which is the reason it is shaped the way it is.
 *
 * **Every edge with differently-coloured endpoints is cut in both of the triangles sharing it,
 * at one and the same position.** That is why a crossing is a pure function of the two
 * endpoints, why the endpoints are ordered by index before the search rather than by which
 * triangle asked, and why both triangles reuse a single recorded crossing instead of each
 * finding its own.
 *
 * So the mesh has to come out with the same edge counts it went in with, and `reportMesh` is
 * the thing that counts them. Duplicated vertices do not disturb it: it counts edges by
 * rounded **position**, precisely because it expects a mesh to hold two vertices in one place.
 */
describe("what splitting does to the mesh's topology", () => {
  for (const samples of [22, 30, 40]) {
    it(`is unchanged at ${samples} samples a side`, () => {
      const mesh = sphereMesh(leftRed, 20, samples, 2);
      const cut = split(mesh, leftRed);
      expect(cut.vertexCount).toBeGreaterThan(mesh.vertexCount);

      const before = reportMesh(mesh);
      const after = reportMesh(cut);
      expect(after.watertight, describeReport(after)).toBe(true);
      expect(before.watertight, describeReport(before)).toBe(true);
      expect(after.boundaryEdges).toBe(before.boundaryEdges);
      expect(after.nonManifoldEdges).toBe(before.nonManifoldEdges);
      expect(after.inconsistentEdges).toBe(before.inconsistentEdges);
      expect(after.degenerateTriangles).toBe(0);
      // **Volume to a tolerance rather than exactly**, because a crossing vertex is an
      // interpolated point rather than a copied one and the triangulation it belongs to has
      // marginally different area. The tolerance is loose on purpose: this is checking that the
      // solid did not change, not that it did not change at all.
      expect(after.volume / before.volume).toBeCloseTo(1, 4);
    });
  }

  it("adds no degenerate triangle, which a crossing near a corner would", () => {
    // **`degenerateTriangles` counts repeated indices and zero area**, and the only way this
    // pass could add either is by cutting so close to a corner that a piece of the fan has no
    // area left. `CROSSING_TOLERANCE` is the thing that prevents it.
    const mesh = sphereMesh(leftRed, 20, 44, 1);
    expect(reportMesh(split(mesh, leftRed)).degenerateTriangles).toBe(0);
  });

  it("is more triangles and never more than three a triangle", () => {
    const mesh = sphereMesh(leftRed, 20, 28, 2);
    const cut = split(mesh, leftRed);
    expect(cut.triangleCount).toBeGreaterThanOrEqual(mesh.triangleCount);
    expect(cut.triangleCount).toBeLessThanOrEqual(mesh.triangleCount * 3);
    expect(cut.indices.length).toBe(cut.triangleCount * 3);
  });
});

/**
 * The cases the geometry has to answer for by hand, because a sphere's plane never produces
 * them and a rule that mishandles one of them shows up on a real model as a speck.
 */
describe("the awkward triangles", () => {
  it("gives a triangle with two crossings a region either side of the join", () => {
    // **One triangle, one join across it.** Red, red, blue walking round: the red side is the
    // quad and the blue side the triangle, and between them they cover the original exactly
    // once. Four corners and three, so three triangles out.
    const mesh = handmade(
      [
        [-2, 0, 0],
        [-1, 2, 0],
        [2, 0, 0],
        [0, -2, 0],
      ],
      [
        [0, 1, 2],
        [0, 2, 3],
      ],
      (v) => opaque(v === 2 ? BLUE : RED),
    );
    const rule = (x: number) => opaque(x < 0 ? RED : BLUE);
    const cut = split(mesh, (x) => rule(x));
    expect(uniformTriangles(cut)).toBe(cut.triangleCount);
    expect(cut.triangleCount).toBeGreaterThanOrEqual(2);
  });

  it("cuts a plane that lands exactly on the sample grid", () => {
    /**
     * **The pathological case, and it is not a rare accident.**
     *
     * A vertex that sits exactly *on* the colour boundary has every crossing on its own edges
     * land on it, so every one of those edges is rejected as a sliver and the triangles around
     * it arrive with mixed corners and nothing to cut with. A boundary that lines up with the
     * sample grid — which a grid-aligned primitive boundary very often does — is therefore a
     * shape this pass has to draw, not an edge case it may decline.
     */
    const mesh = sphereMesh(onGrid, 20, 28, 2);
    const cut = split(mesh, onGrid);
    expect(uniformTriangles(cut), "every triangle is one colour").toBe(
      cut.triangleCount,
    );
    expect(reportMesh(cut).watertight, describeReport(reportMesh(cut))).toBe(
      true,
    );
    // **And it still puts each side in its own colour**, which is the part that could go wrong:
    // answering a grid-aligned boundary by making the whole sphere one colour would pass the
    // uniformity check above.
    expect(cornerColours(cut).size).toBe(2);
  });

  it("gives a triangle with one crossing the colour of the two corners that agree", () => {
    // **A single cut has to enter and leave, and there is nowhere for it to leave**, so the only
    // region with any area is the two-corners one. Putting `b` exactly on the plane is what
    // forces this shape rather than the ordinary two-crossing one.
    const mesh = handmade(
      [
        [-2, 0, 0],
        [0, 2, 0],
        [2, 0, 0],
        [0, -2, 0],
      ],
      [
        [0, 1, 2],
        [0, 2, 3],
      ],
      (v) => opaque(v === 0 ? RED : BLUE),
    );
    // **`b` is blue and both triangles it belongs to are then entirely blue**, so this is the
    // case: one disagreeing corner, one crossing, and the whole triangle takes the majority.
    const rule = (x: number) => opaque(x < -1 ? RED : BLUE);
    const cut = split(mesh, (x) => rule(x));
    expect(uniformTriangles(cut)).toBe(cut.triangleCount);
    // The red corner is still there for its other triangle, so the vertex survives.
    expect(cut.vertexCount).toBeGreaterThanOrEqual(mesh.vertexCount);
  });

  it("cuts beside an endpoint rather than on it, so no piece has no area", () => {
    /**
     * **The sliver rule, made observable.**
     *
     * The plane is a hundredth of a unit from `b`, so the crossing is a hundredth of a unit
     * from an endpoint and the red side of the triangle is a piece of area too small to draw.
     * The pass has to cut *beside* that endpoint rather than on it — cutting on it would bound
     * a region of no area, which is what a slicer prints as a speck and what every downstream
     * normal calculation has to special-case.
     *
     * **Not declining to cut is the other half of it**, and the reason is in the module's
     * header: refusing leaves that edge uncut on both of the triangles that share it, while the
     * triangle on the other side of its *other* edges has been cut, and a triangle naming an
     * edge no other triangle names is an open edge.
     */
    const mesh = handmade(
      [
        [-2, 0, 0],
        [0, 2, 0],
        [2, 0, 0],
        [0, -2, 0],
      ],
      [[0, 1, 2]],
      (v) => opaque(v === 0 ? RED : BLUE),
    );
    const rule = (x: number) => opaque(x < -0.01 ? RED : BLUE);
    const cut = split(mesh, (x) => rule(x));
    expect(reportMesh(cut).degenerateTriangles).toBe(0);
    expect(uniformTriangles(cut)).toBe(cut.triangleCount);
    // The cut happened, and it happened strictly inside the edge rather than at its end.
    expect(cut.vertexCount).toBeGreaterThan(mesh.vertexCount);
    for (let v = mesh.vertexCount; v < cut.vertexCount; v += 2) {
      expect(Math.abs((cut.positions[v * 3] as number) + 0.01)).toBeGreaterThan(
        1e-4,
      );
    }
  });

  it("handles a third colour arriving along an edge", () => {
    // **Three colours meeting is three crossings, not two**, so the triangle is cut into three
    // regions rather than two. A rule that assumed two would either drop the middle colour or
    // close a region on the wrong chord.
    const mesh = handmade(
      [
        [-3, 0, 0],
        [0, 3, 0],
        [3, 0, 0],
      ],
      [[0, 1, 2]],
      (v) => opaque(v === 0 ? RED : v === 1 ? GREEN : BLUE),
    );
    const rule = (
      x: number,
      y: number,
    ): { colour: { r: number; g: number; b: number }; material: number } =>
      opaque(x + y < 0 ? RED : x - y < 0 ? GREEN : BLUE);
    const cut = split(mesh, rule);
    expect(uniformTriangles(cut)).toBe(cut.triangleCount);
    for (const key of cornerColours(cut).keys()) {
      expect(
        // **Zero and not 255**: the fourth byte is a material now (ADR 0048), and these
        // fixtures set no material on the colours they hand the builder.
        [RED, GREEN, BLUE].map((c) => `${c.r},${c.g},${c.b},0`),
      ).toContain(key);
    }
    // **Three crossings is four pieces, not three** — the three corner wedges plus the middle
    // one their chords enclose, whose colour is asked for because no corner of the original is
    // inside it. Dropping that middle is what left a hundred and twelve open edges on a sphere
    // before it was found.
    expect(cut.triangleCount).toBe(4);
  });

  it("does nothing at all when the field disagrees with the vertices it wrote", () => {
    // **The one contract a caller can break, and it has to fail by doing nothing.** A `colourAt`
    // that is not the rule that filled the mesh leaves every bisection unbracketed, so no edge
    // is cut — and with no crossing there is no region and nothing this pass can do about a
    // gradient. The mesh comes back as the argument rather than as a copy cut somewhere arbitrary
    // on the strength of a bracket that was never there.
    const mesh = sphereMesh(leftRed, 20, 24, 2);
    const lying = () => opaque(GREEN);
    expect(split(mesh, lying)).toBe(mesh);
  });
});

describe("scratch reuse", () => {
  it("gives the same answer on a second mesh as on a first", () => {
    // **Because the caller is meant to hold one across rebuilds**, and a scratch that carried
    // anything over would make the second rebuild of a session differ from the first — which
    // the mesher's own test pins for its scratch and which this one has to pin too.
    const scratch: ColourBoundaryScratch = colourBoundaryScratchFor(0);
    const rule = (x: number) => opaque(x < 0 ? RED : BLUE);
    const small = sphereMesh(rule, 12, 18, 2);
    const large = sphereMesh(rule, 20, 28, 2);

    const first = splitColourBoundaries(small, { colourAt: rule }, scratch);
    const second = splitColourBoundaries(large, { colourAt: rule }, scratch);
    const again = split(large, rule);

    expect(second.vertexCount).toBe(again.vertexCount);
    expect(second.triangleCount).toBe(again.triangleCount);
    expect([...second.indices]).toEqual([...again.indices]);
    expect(first.vertexCount).toBeGreaterThan(0);
  });
});
