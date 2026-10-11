import { describe, expect, it } from "vitest";

import { ChunkMeshBuilder } from "./chunk-mesh";
import {
  broadPassReach,
  BROAD_PASS_MAX_SOFTNESS,
  BROAD_PASS_UNIT,
  CORNER_OFFSETS,
  EDGE_CORNERS,
  EDGE_MASK,
  marchingCubes,
  marchingCubesScratchFor,
  MARCHING_CUBES_CELLS,
  MARCHING_CUBES_GRID,
  edgeAxis,
  TRI_TABLE,
  type MarchingCubesScratch,
} from "./marching-cubes";
import { describeReport, reportMesh } from "./mesh-report";
import { scratchFor, surfaceNets } from "./surface-nets";
import { sphere, sphereVolume, torus, torusVolume } from "./test-helpers";

const STEP = 6;
const N = 24;
const CENTRE = 80;

type Field = (x: number, y: number, z: number) => number;

const mesh = (
  field: Field,
  origin: readonly [number, number, number] = [0, 0, 0],
  samples = N,
  sampleSize = STEP,
  scratch: MarchingCubesScratch = marchingCubesScratchFor(samples),
  out = new ChunkMeshBuilder(),
): ChunkMeshBuilder => {
  marchingCubes({
    origin,
    samples,
    sampleSize,
    sampler: { distance: field },
    out,
    scratch,
    onVertex: (index, x, y, z) => {
      const h = sampleSize / 8;
      const g = [
        field(x + h, y, z) - field(x - h, y, z),
        field(x, y + h, z) - field(x, y - h, z),
        field(x, y, z + h) - field(x, y, z - h),
      ];
      const length =
        Math.hypot(g[0] as number, g[1] as number, g[2] as number) || 1;
      out.setNormal(
        index,
        (g[0] as number) / length,
        (g[1] as number) / length,
        (g[2] as number) / length,
      );
    },
  });
  return out;
};

/**
 * A field of four shapes, deliberately awkward: a ball, a box with flat walls, a thin ring, and a
 * pillar off to one side.
 *
 * **Disjoint, and inside the region the tests mesh — both because of what this field is for.** It
 * reaches a flat wall, a corner, a thin section and a separate shell in one mesh, so it exercises
 * every kind of cell marching cubes has. And the two constraints are load-bearing:
 *
 * - An earlier version reached to 165 on three axes, which the region does not cover, and the mesher
 *   reported a hundred open edges for it — correctly. A shape that leaves its region has no closed
 *   surface to find, so a test wanting a watertightness assertion was really asking about clipping.
 *   That case has its own test below.
 * - The shapes must not **overlap** either, or the union's topology is doing the work rather than
 *   the mesher. `mesh-report.test.ts` covers what this report says about a mesh that is not
 *   manifold, using meshes built to be so rather than waiting for a field to produce one.
 */
const mixed: Field = (x, y, z) =>
  Math.min(
    sphere(40, 40, 40, 18)(x, y, z),
    // A box, as the max of three slabs — the flat walls and the corners are where a vertex placed
    // wrongly shows up first.
    Math.max(
      Math.abs(x - 110) - 18,
      Math.abs(y - 40) - 18,
      Math.abs(z - 40) - 18,
    ),
    torus(60, 110, 60, 18, 8)(x, y, z),
    sphere(115, 115, 115, 16)(x, y, z),
  );

describe("the table", () => {
  it("holds 256 cases of whole triangles, and validates on load", () => {
    expect(TRI_TABLE.length).toBe(256 * 16);
    let cases = 0;
    let triangles = 0;
    for (let pattern = 0; pattern < 256; pattern++) {
      const end = TRI_TABLE.indexOf(-1, pattern * 16) - pattern * 16;
      expect(
        end % 3,
        `case ${pattern} is not a whole number of triangles`,
      ).toBe(0);
      if (end > 0) cases++;
      triangles += end / 3;
    }
    expect(cases).toBe(254);
    expect(triangles).toBeGreaterThan(0);
  });

  it("only names edges the surface actually cuts", () => {
    // The invariant that makes the rest of this file's reasoning possible: a case's triangles are
    // built from crossings, so an edge the field does not cross has no vertex and the mesher would
    // emit a triangle against `-1`. This also catches a damaged transcription immediately.
    for (let pattern = 0; pattern < 256; pattern++) {
      for (let i = 0; i < 16; i += 1) {
        const edge = TRI_TABLE[pattern * 16 + i] as number;
        if (edge === -1) break;
        expect(
          (EDGE_MASK[pattern] as number) & (1 << edge),
          `case ${pattern} names uncrossed edge ${edge}`,
        ).not.toBe(0);
      }
    }
  });

  it("gives the all-inside and all-outside cases nothing", () => {
    expect(TRI_TABLE[0]).toBe(-1);
    expect(TRI_TABLE[255]).toBe(-1);
    expect(EDGE_MASK[0]).toBe(0);
    expect(EDGE_MASK[255]).toBe(0);
  });

  it("numbers corners and edges the way the table was written", () => {
    // Pinned because the published table is written against this ordering and `surface-nets.ts`
    // uses a *different* one. If either changes, the table becomes a table of nonsense and every
    // other test here fails in a way that does not say why.
    expect(CORNER_OFFSETS[0]).toEqual([0, 0, 0]);
    expect(CORNER_OFFSETS[2]).toEqual([1, 1, 0]);
    expect(CORNER_OFFSETS[6]).toEqual([1, 1, 1]);
    expect(EDGE_CORNERS[0]).toEqual([0, 1]);
    expect(EDGE_CORNERS[11]).toEqual([3, 7]);
    expect(Array.from({ length: 12 }, (_, e) => edgeAxis(e))).toEqual([
      0, 1, 0, 1, 0, 1, 0, 1, 2, 2, 2, 2,
    ]);
  });
});

/**
 * Face consistency, which is watertightness.
 *
 * **The one exhaustive check in this file, and the one the whole watertight claim rests on.** Two
 * cells sharing a face must draw the same curve across it, or the mesh cracks along the seam.
 *
 * Cells sharing a face agree on that face's four corner samples, so the only thing that varies
 * between them is the four corners *off* the face. So the space to check is: six faces, sixteen
 * sign patterns on the face, and sixteen × sixteen patterns off it — 24,576 pairs. Every one is
 * compared here, which is why this test is exhaustive rather than sampling shapes and hoping.
 *
 * The trace is read straight off the table: a triangle edge whose two vertices both lie on edges
 * bounding the face lies in the face's plane, and it joins those two of the face's four edges. A
 * face with two crossings has exactly one such join; a face with four — the ambiguous case, where
 * the table must choose a diagonal — has two, and which two is the choice being tested.
 */
describe("face consistency", () => {
  const FACES: ReadonlyArray<readonly number[]> = [
    [0, 1, 2, 3],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [3, 2, 6, 7],
    [0, 3, 7, 4],
    [1, 2, 6, 5],
  ];

  const bounding = (face: readonly number[]): number[] => {
    const out: number[] = [];
    for (let i = 0; i < 4; i++) {
      const a = face[i] as number;
      const b = face[(i + 1) % 4] as number;
      for (let edge = 0; edge < 12; edge++) {
        const pair = EDGE_CORNERS[edge] as unknown as readonly [number, number];
        if (
          (pair[0] === a && pair[1] === b) ||
          (pair[0] === b && pair[1] === a)
        ) {
          out.push(edge);
          break;
        }
      }
    }
    expect(out.length, `face ${face.join(",")} does not bound four edges`).toBe(
      4,
    );
    return out;
  };

  const trace = (pattern: number, bounds: readonly number[]): string => {
    const joins = new Set<string>();
    const triangles: number[][] = [];
    for (let i = 0; (TRI_TABLE[pattern * 16 + i] as number) !== -1; i += 3) {
      triangles.push([
        TRI_TABLE[pattern * 16 + i] as number,
        TRI_TABLE[pattern * 16 + i + 1] as number,
        TRI_TABLE[pattern * 16 + i + 2] as number,
      ]);
    }
    for (const tri of triangles) {
      for (const [u, v] of [
        [tri[0] as number, tri[1] as number],
        [tri[1] as number, tri[2] as number],
        [tri[2] as number, tri[0] as number],
      ] as const) {
        const a = bounds.indexOf(u);
        const b = bounds.indexOf(v);
        if (a >= 0 && b >= 0 && a !== b)
          joins.add(a < b ? `${a},${b}` : `${b},${a}`);
      }
    }
    return [...joins].sort().join("|");
  };

  it("draws the same curve across every face from both sides", () => {
    let checked = 0;
    for (const face of FACES) {
      const bounds = bounding(face);
      const outside = [0, 1, 2, 3, 4, 5, 6, 7].filter((c) => !face.includes(c));
      const build = (bits: number, off: number): number => {
        let pattern = 0;
        for (let k = 0; k < 4; k++)
          pattern |= ((bits >> k) & 1) << (face[k] as number);
        for (let i = 0; i < 4; i++)
          pattern |= ((off >> i) & 1) << (outside[i] as number);
        return pattern;
      };
      for (let bits = 0; bits < 16; bits++) {
        for (let offA = 0; offA < 16; offA++) {
          for (let offB = 0; offB < 16; offB++) {
            const a = build(bits, offA);
            const b = build(bits, offB);
            if (a === 0 || a === 255 || b === 0 || b === 255) continue;
            checked++;
            expect(
              trace(a, bounds),
              `face [${face.join(",")}] cases ${a} and ${b} disagree across it`,
            ).toBe(trace(b, bounds));
          }
        }
      }
    }
    // 6 faces x 16 patterns on the face x 16 x 16 off it, less the pairs where a cell is entirely
    // one side and has no surface to draw: two per face per degenerate face pattern, for 372 in all.
    expect(checked).toBe(6 * 16 * 16 * 16 - 6 * 62);
  });
});

describe("a region with a surface in it", () => {
  it("emits vertices and triangles", () => {
    const out = mesh(sphere(CENTRE, CENTRE, CENTRE, 45));
    expect(out.vertexCount).toBeGreaterThan(0);
    expect(out.triangleCount).toBeGreaterThan(0);
    expect(out.indices.size).toBe(out.triangleCount * 3);
  });

  it("emits nothing for a field with no surface, in either direction", () => {
    expect(mesh(() => 1000).vertexCount).toBe(0);
    expect(mesh(() => -1000).vertexCount).toBe(0);
  });

  it("keeps every index inside the vertex range", () => {
    const out = mesh(mixed);
    for (const index of out.indices) {
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(out.vertexCount);
    }
  });

  it("allocates scratch buffers for the padded grid, not the owned count", () => {
    // Sized to `samples` the sample buffer would be too small, and every write past its end is
    // silently dropped while every read past it returns 0 — a field that is uniformly solid then
    // reads as half solid and the mesher invents a surface in the middle of rock.
    const scratch = marchingCubesScratchFor(N);
    const grid = MARCHING_CUBES_GRID(N);
    const cells = MARCHING_CUBES_CELLS(N);
    expect(scratch.samples.length).toBe(grid * grid * grid);
    expect(scratch.edgeX.length).toBe(grid * grid * cells);
    expect(scratch.edgeY.length).toBe(grid * grid * cells);
    expect(scratch.edgeZ.length).toBe(grid * grid * cells);
  });
});

/**
 * Watertightness, which is the reason this mesher is here.
 *
 * **Every shape below is asserted closed, manifold and consistently wound — not "closed wherever the
 * surface is well conditioned".** `surface-nets.test.ts` has to scope its manifoldness test that way
 * and says in its own header why; this file does not have to, and that difference is the whole
 * argument for marching cubes over surface nets for a mesh that will be printed.
 */
describe("watertightness", () => {
  const shapes: ReadonlyArray<readonly [string, Field]> = [
    ["sphere", sphere(CENTRE, CENTRE, CENTRE, 40)],
    [
      "sphere on round numbers",
      // The degenerate case: with the centre on a grid point and the radius a three-four-five
      // multiple, dozens of samples land *exactly* on the surface. See the corner-welding note in
      // `marching-cubes.ts`.
      sphere(72, 72, 72, 50),
    ],
    ["torus", torus(CENTRE, CENTRE, CENTRE, 30, 12)],
    ["thin torus", torus(CENTRE, CENTRE, CENTRE, 26, 6)],
    ["four shapes", mixed],
    ["off the grid", sphere(CENTRE + 0.3, CENTRE - 0.7, CENTRE + 0.1, 34)],
  ];

  for (const [name, field] of shapes) {
    it(`closes ${name}, with every edge in exactly two triangles`, () => {
      const report = reportMesh(mesh(field).finish());
      expect(report.triangleCount, name).toBeGreaterThan(0);
      expect(report.boundaryEdges, `${name}: open edges`).toBe(0);
      expect(report.nonManifoldEdges, `${name}: non-manifold edges`).toBe(0);
      expect(
        report.inconsistentEdges,
        `${name}: edges wound the same way`,
      ).toBe(0);
      expect(report.degenerateTriangles, `${name}: degenerate triangles`).toBe(
        0,
      );
      expect(report.watertight, name).toBe(true);
    });
  }

  it("encloses the volume the shape actually has", () => {
    // A mesh can be perfectly closed and the wrong size, so the volume is checked against the
    // analytic answer rather than against the mesh. Marching cubes places every vertex on a crossing
    // of the true surface, so its error is a fraction of a voxel — which is why the tolerance is a
    // percent rather than a rounding place.
    for (const [name, field, analytic] of [
      ["sphere r40", sphere(CENTRE, CENTRE, CENTRE, 40), sphereVolume(40)],
      [
        "sphere r34",
        sphere(CENTRE + 0.3, CENTRE - 0.7, CENTRE + 0.1, 34),
        sphereVolume(34),
      ],
      [
        "torus R30 r12",
        torus(CENTRE, CENTRE, CENTRE, 30, 12),
        torusVolume(30, 12),
      ],
    ] as const) {
      const report = reportMesh(mesh(field).finish());
      const error = Math.abs(report.volume / analytic - 1);
      expect(
        error,
        `${name}: volume ${Math.round(report.volume)} against ${Math.round(analytic)}`,
      ).toBeLessThan(0.06);
    }
  });

  it("is more accurate than surface nets on the same shapes", () => {
    // Not a claim this file has to make to be useful — but it is the reason marching cubes is worth
    // offering *alongside* surface nets rather than only instead of it, and a test is the only place
    // it can be stated so that it stays true if either mesher changes.
    const errors = (mesher: "cubes" | "nets"): number => {
      let worst = 0;
      for (const [field, analytic] of [
        [sphere(CENTRE, CENTRE, CENTRE, 40), sphereVolume(40)],
        [torus(CENTRE, CENTRE, CENTRE, 30, 12), torusVolume(30, 12)],
      ] as const) {
        const out = new ChunkMeshBuilder();
        const params = {
          origin: [0, 0, 0] as const,
          samples: N,
          sampleSize: STEP,
          sampler: { distance: field },
          out,
        };
        if (mesher === "cubes") {
          marchingCubes({ ...params, scratch: marchingCubesScratchFor(N) });
        } else {
          surfaceNets({ ...params, scratch: scratchFor(N) });
        }
        worst = Math.max(
          worst,
          Math.abs(reportMesh(out.finish()).volume / analytic - 1),
        );
      }
      return worst;
    };
    expect(errors("cubes")).toBeLessThan(errors("nets"));
  });

  it("reports a shape that leaves its region as open rather than as closed", () => {
    // The failure this report exists to catch, and the one that is easiest to ship by accident: the
    // region is derived from the model's bounds, so a model that grows past them is clipped, and the
    // mesh that comes back is a lidless shell. Nothing about it looks wrong on screen.
    const report = reportMesh(mesh(sphere(CENTRE, CENTRE, 170, 40)).finish());
    expect(report.triangleCount).toBeGreaterThan(0);
    expect(report.boundaryEdges).toBeGreaterThan(0);
    expect(report.watertight).toBe(false);
    expect(describeReport(report)).toMatch(/not printable/);
  });

  it("says nothing about a region with no surface in it", () => {
    // A watertight mesh of nothing is not a watertight mesh, and `triangleCount > 0` is what stops
    // an empty region reading as a pass.
    const report = reportMesh(mesh(() => 1000).finish());
    expect(report.watertight).toBe(false);
    expect(describeReport(report)).toBe("no surface");
  });

  it("gives every vertex a normal, so the report's winding check has something to read", () => {
    // The normals are the caller's to fill and the builder defaults them to +Y, so a caller that
    // forgot would get a mesh that shades as though it were right. Asserted through the mesh rather
    // than through `onVertex` so it covers the packed 16-bit round trip.
    const out = mesh(sphere(CENTRE, CENTRE, CENTRE, 40));
    const finished = out.finish();
    expect(finished.normalOct.length).toBe(finished.vertexCount * 2);
    for (const channel of finished.normalOct) {
      expect(channel).toBeGreaterThanOrEqual(-32767);
      expect(channel).toBeLessThanOrEqual(32767);
    }
    expect(reportMesh(finished).volume).toBeGreaterThan(0);
  });
});

describe("the region it was given", () => {
  it("meshes that region and nothing outside it", () => {
    // The property that lets two meshers be compared at all, and the reason the sample grid is
    // padded by one on each side rather than exactly filling the box: a vertex outside the region
    // would be a vertex belonging to a neighbour, drawn in one place by one region and another by
    // another. Marching cubes places a vertex between two samples, so a region of `n` samples spans
    // `n` steps plus the two half-steps to its outer samples.
    const span = N * STEP;
    const out = mesh(sphere(CENTRE, CENTRE, CENTRE, 40)).finish();
    expect(out.triangleCount).toBeGreaterThan(0);
    for (let i = 0; i < out.vertexCount; i++) {
      for (const [axis, value] of [
        ["x", out.positions[i * 3] as number],
        ["y", out.positions[i * 3 + 1] as number],
        ["z", out.positions[i * 3 + 2] as number],
      ] as const) {
        expect(value, `vertex ${i} ${axis}`).toBeGreaterThanOrEqual(-STEP);
        expect(value, `vertex ${i} ${axis}`).toBeLessThanOrEqual(span + STEP);
      }
    }
  });

  it("covers the same world span at a coarser stride", () => {
    // A resolution control changes the stride and not the region, which is what makes two
    // resolutions of the same model comparable rather than two different models.
    const fine = mesh(
      sphere(CENTRE, CENTRE, CENTRE, 40),
      [0, 0, 0],
      N,
      STEP,
    ).finish();
    const coarse = mesh(
      sphere(CENTRE, CENTRE, CENTRE, 40),
      [0, 0, 0],
      N / 2,
      STEP * 2,
    ).finish();
    expect(coarse.triangleCount).toBeGreaterThan(0);
    expect(coarse.vertexCount).toBeLessThan(fine.vertexCount);
    for (let i = 0; i < coarse.vertexCount; i++) {
      expect(coarse.positions[i * 3] as number).toBeGreaterThanOrEqual(
        -STEP * 2,
      );
      expect(coarse.positions[i * 3] as number).toBeLessThanOrEqual(
        N * STEP + STEP * 2,
      );
    }
  });
});

describe("reusing a scratch buffer", () => {
  it("produces the same mesh twice from the same scratch", () => {
    const scratch = marchingCubesScratchFor(N);
    const field = sphere(CENTRE, CENTRE, CENTRE, 40);
    const first = mesh(field, [0, 0, 0], N, STEP, scratch).finish();
    const second = mesh(field, [0, 0, 0], N, STEP, scratch).finish();
    expect(second.vertexCount).toBe(first.vertexCount);
    expect(second.triangleCount).toBe(first.triangleCount);
    expect([...second.indices]).toEqual([...first.indices]);
  });

  it("does not carry one region's vertices into another's", () => {
    const scratch = marchingCubesScratchFor(N);
    expect(mesh(() => 1000, [0, 0, 0], N, STEP, scratch).vertexCount).toBe(0);
    expect(
      mesh(sphere(CENTRE, CENTRE, CENTRE, 40), [0, 0, 0], N, STEP, scratch)
        .vertexCount,
    ).toBeGreaterThan(0);
    const after = mesh(() => 1000, [0, 0, 0], N, STEP, scratch).finish();
    expect(after.vertexCount).toBe(0);
    expect(after.indices.length).toBe(0);
  });
});

describe("the broad pass", () => {
  /**
   * **The one thing this file's other tests cannot check, and why they do not accidentally check
   * it either.**
   *
   * Every other suite here calls `marchingCubes` without a `softness`, which is the declined
   * case: the pass never runs and the sampling loop is the one it always was. So the whole of the
   * broad pass would otherwise be untested by 171 passing assertions, and this file is the place
   * that says so rather than the place it happens.
   */
  const bothWays = (
    field: Field,
    softness: number | undefined,
    origin: readonly [number, number, number] = [0, 0, 0],
    samples = N,
    sampleSize = STEP,
  ): [ChunkMeshBuilder, ChunkMeshBuilder] => {
    const run = (): ChunkMeshBuilder => {
      const out = new ChunkMeshBuilder();
      marchingCubes({
        origin,
        samples,
        sampleSize,
        sampler: { distance: field },
        out,
        scratch: marchingCubesScratchFor(samples),
        softness,
      });
      return out;
    };
    return [run(), run()];
  };

  it("produces the same mesh, in the same order, as not running it", () => {
    /**
     * **Identical indices rather than an equal triangle count.**
     *
     * A pass that skipped a block outright would leave the same triangles in a different order —
     * the same set, and a different mesh to anything diffing two rebuilds. The order is the
     * claim; the count alone would pass on a pass that is merely correct.
     */
    for (const field of [
      sphere(CENTRE, CENTRE, CENTRE, 40),
      torus(CENTRE, CENTRE, CENTRE, 30, 10),
      // Two spheres, so there is air on every side of both and blocks to drop around each.
      (x: number, y: number, z: number): number =>
        Math.min(
          Math.hypot(x - 40, y - CENTRE, z - CENTRE) - 30,
          Math.hypot(x - 110, y - CENTRE, z - CENTRE) - 20,
        ),
    ]) {
      const [declined, broad] = bothWays(field, 0);
      expect(broad.finish().triangleCount).toBeGreaterThan(0);
      expect([...broad.finish().indices]).toEqual([
        ...declined.finish().indices,
      ]);
      expect([...broad.finish().positions]).toEqual([
        ...declined.finish().positions,
      ]);
    }
  });

  it("actually drops blocks, rather than running and culling nothing", () => {
    /**
     * **The pass that always says no is not a pass.** If this fails the one above is vacuous: it
     * would be asserting that two identical computations agree.
     */
    const field = sphere(CENTRE, CENTRE, CENTRE, 40);
    const scratch = marchingCubesScratchFor(N);
    const out = new ChunkMeshBuilder();
    marchingCubes({
      origin: [0, 0, 0],
      samples: N,
      sampleSize: STEP,
      sampler: { distance: field },
      out,
      scratch,
      softness: 0,
    });
    const blocks = Math.ceil(MARCHING_CUBES_GRID(N) / BROAD_PASS_UNIT);
    const dropped = scratch.blockEmpty.reduce((a, b) => a + b, 0);
    expect(
      dropped,
      "blocks the pass should drop around a lone sphere",
    ).toBeGreaterThan(0);
    expect(dropped).toBeLessThan(blocks ** 3);
    expect(out.triangleCount).toBeGreaterThan(0);
  });

  it("declines a field it cannot vouch for, and agrees with itself anyway", () => {
    /**
     * **Above `BROAD_PASS_MAX_SOFTNESS` the answer is the dense one**, and the test is that the
     * mesh is unchanged rather than that it is slow. A caller that has gone around the clamp both
     * applications put on `softness` lands here, and what it gets is the mesh it had before the
     * pass existed.
     */
    const field = sphere(CENTRE, CENTRE, CENTRE, 40);
    const [declined, tooWide] = bothWays(field, BROAD_PASS_MAX_SOFTNESS + 0.01);
    const [, negative] = bothWays(field, -1);
    expect([...tooWide.finish().indices]).toEqual([
      ...declined.finish().indices,
    ]);
    expect([...negative.finish().indices]).toEqual([
      ...declined.finish().indices,
    ]);
  });

  it("keeps a surface that runs through a block's middle and near no corner", () => {
    /**
     * **The shape the reach's proof is about.** A thin slab crossing the grid on the diagonal is
     * far from every lattice point a four-sample block reads, and is still a surface. If the
     * reach were short by a factor — a quarter diagonal, a half of one computed as if it were the
     * whole — this is the mesh that loses it, and it loses it at its extremities rather than in
     * the middle, which is the part of it that is easy to miss.
     *
     * **A slab and not a sheet, and a sheet would mesh nothing.** `Math.abs` alone is never
     * negative, so marching cubes' `value < 0` finds no inside anywhere and the assertion would
     * pass on two empty meshes. The sphere is a clip rather than decoration: without it the slab
     * runs off the region and the mesh is open at every face, which is true of the dense pass as
     * well and would make a watertightness check here meaningless.
     *
     * The clip is centred **on** the plane, because a sphere whose centre is off it does not meet
     * it at all: `x + y + z = 96` passes nearest a centre of `(72, 72, 72)` at `(32, 32, 32)`,
     * which is sixty-nine units away, and a sphere of radius fifty around there clips the slab
     * away entirely. Both meshes then come back empty and the assertion passes on nothing.
     */
    const field = (x: number, y: number, z: number): number =>
      Math.max(
        Math.abs(x + y + z - 96) - 2,
        Math.hypot(x - 32, y - 32, z - 32) - 50,
      );
    const [declined, broad] = bothWays(field, 0);
    expect(declined.finish().triangleCount).toBeGreaterThan(0);
    expect([...broad.finish().indices]).toEqual([...declined.finish().indices]);
  });

  it("agrees on every grid a block can land badly on", () => {
    /**
     * **Every residue of the grid against `BROAD_PASS_UNIT`, which is the ragged edge.**
     *
     * A region is `samples + 2` per axis, so the last block along each axis is short by a
     * different amount on each, and its far corner has to be pulled in to the grid rather than
     * read off the end of it. Sweeping `samples` is the only way to hit all of those shapes, and
     * one residue out of four is enough to hide it.
     */
    for (let samples = 6; samples <= 26; samples++) {
      const field = sphere(CENTRE, CENTRE, CENTRE, 40);
      const [declined, broad] = bothWays(field, 0, [0, 0, 0], samples, STEP);
      expect(
        [...broad.finish().indices],
        `samples ${samples}, grid ${samples + 2} (${(samples + 2) % BROAD_PASS_UNIT} into a block)`,
      ).toEqual([...declined.finish().indices]);
    }
  });

  it("holds a surface on a block boundary, which is where welding has to agree", () => {
    /**
     * **A surface landing exactly on a coarse plane**, so the block either side of it is dropped
     * or kept on the strength of the very samples their cells read. Marching cubes welds a vertex
     * to the grid edge it lies on, and that edge is shared by cells in two blocks; if one of them
     * is dropped on the other's account the two patches do not join, and the report says so.
     */
    const onAPlane = 8 * STEP;
    const field = (x: number, y: number, z: number): number =>
      Math.max(
        Math.abs(x - onAPlane) - 2,
        Math.hypot(x - onAPlane, y - CENTRE, z - CENTRE) - 40,
      );
    const [declined, broad] = bothWays(field, 0);
    expect(declined.finish().triangleCount).toBeGreaterThan(0);
    expect([...broad.finish().indices]).toEqual([...declined.finish().indices]);
    const report = reportMesh(broad.finish());
    expect(report.watertight, "a slab through a block boundary").toBe(true);
    expect(report.boundaryEdges).toBe(0);
    expect(report.nonManifoldEdges).toBe(0);
  });

  it("reports progress that ends on the total and never goes backwards", () => {
    /**
     * **Counted over the blocks rather than the samples written**, so a rebuild that dropped most
     * of its grid still finishes rather than stopping short and being jumped over by the second
     * pass. `MeshProgress` in `surface-nets` is where the contract is written down.
     */
    for (const softness of [undefined, 0]) {
      const seen: number[] = [];
      const out = new ChunkMeshBuilder();
      marchingCubes({
        origin: [0, 0, 0],
        samples: N,
        sampleSize: STEP,
        sampler: { distance: sphere(CENTRE, CENTRE, CENTRE, 40) },
        out,
        scratch: marchingCubesScratchFor(N),
        softness,
        onProgress: (done, total) => seen.push(done / total),
      });
      expect(seen.length, "distinct fractions, so it moved").toBeGreaterThan(4);
      /**
       * **The last is one, and the rest are not.** `MeshProgress` promises `done` reaches `total`
       * exactly once so a caller can treat the last message as finished rather than watching for a
       * fraction that rounds to one. **Nothing here says the first is zero**, because it never
       * was: the first report comes after the first row of work, which is already something.
       */
      expect(seen[seen.length - 1]).toBe(1);
      expect(seen.filter((f) => f === 1).length, "reaches one once").toBe(1);
      for (let i = 1; i < seen.length; i++)
        expect(seen[i], "never backwards").toBeGreaterThanOrEqual(
          seen[i - 1] as number,
        );
    }
  });
});

describe("the reach the broad pass relies on", () => {
  it("is half a block's diagonal, which is the most it can be", () => {
    /**
     * **The bound, checked against the thing it is a bound on.** Every point of a cube is within
     * half its diagonal of the nearest corner, and the centre is exactly there — so this is the
     * tightest reach a block can use, and a pass using more of it is leaving blocks on the table.
     */
    const side = 7;
    expect(broadPassReach(side, side, side, 1, 0)).toBeCloseTo(
      (side * Math.sqrt(3)) / 2,
      12,
    );

    // Swept rather than spot-checked, because "every point is within half a diagonal of a corner"
    // is a statement about a cube and not about any one of its points.
    const grid = 24;
    let worst = 0;
    for (let i = 0; i <= grid; i++)
      for (let j = 0; j <= grid; j++)
        for (let k = 0; k <= grid; k++) {
          const p = [i / grid, j / grid, k / grid];
          let nearest = Infinity;
          for (let c = 0; c < 8; c++) {
            const corner = [c & 1, (c >> 1) & 1, (c >> 2) & 1];
            nearest = Math.min(
              nearest,
              Math.hypot(
                (p[0] as number) - (corner[0] as number),
                (p[1] as number) - (corner[1] as number),
                (p[2] as number) - (corner[2] as number),
              ),
            );
          }
          worst = Math.max(worst, nearest);
        }
    expect(worst, "the worst point is the centre").toBeCloseTo(
      Math.sqrt(3) / 2,
      2,
    );
  });

  it("is widened by the blend, because that is the direction a dent moves", () => {
    // A smooth minimum takes a dent *out* of the field, so the value under-reads and the surface
    // is closer than the number says. The only sound response is a stricter test.
    expect(broadPassReach(4, 4, 4, 1, 0.25)).toBeGreaterThan(
      broadPassReach(4, 4, 4, 1, 0),
    );
    // And a block short on one axis is a smaller block, not a differently-shaped one.
    expect(broadPassReach(4, 4, 2, 1, 0)).toBeLessThan(
      broadPassReach(4, 4, 4, 1, 0),
    );
    expect(BROAD_PASS_MAX_SOFTNESS).toBe(0.25);
  });
});
