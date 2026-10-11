/**
 * The unwrap adapter, against the real xatlas rather than a stand-in.
 *
 * **The library is WebAssembly with the binary inlined, and it runs under Vitest's Node
 * environment** — so these are not tests of a mock of it. Every assertion below is about what
 * xatlas actually does, which is the whole reason this file can say things like "the atlas is not
 * the size that was asked for" and have them be true on the next run.
 *
 * **Everything comes in through the application's own modules rather than `@big-mesh-studions/meshing`
 * directly.** That is not purity: a bare package import alongside `./unwrap` was what made this
 * file unresolvable (see the header of `./unwrap`), and a test that reaches for a builder it does
 * not need is a test with one more way to break. The adapter takes an `UnwrapMesh`, not a
 * `ChunkMesh`, so an empty one is two empty typed arrays.
 *
 * The coarse mesh throughout, because the measured cost is steep: 1.4 seconds for a sphere at
 * 9,740 triangles against 11.6 at 38,732. The table is in `./unwrap`.
 */
import { describe, expect, it } from "vitest";

import { budgetFor, meshParts } from "../model/mesh-model";
import type { MeshResult } from "../model/mesh-model";
import { placedPart } from "../model/part";
import { centredBox } from "../print/fixtures";
import { TriangleBVH } from "../mesh/triangle-bvh";
import { transferUvs } from "../mesh/uv-transfer";
import {
  DEFAULT_UNWRAP,
  loadXAtlas,
  REFERENCE_VOXEL_SIZE,
  unwrapMesh,
  type UnwrapMesh,
} from "./unwrap";

/** A sphere, at the resolution {@link REFERENCE_VOXEL_SIZE} names. */
const sphere = (): MeshResult["mesh"] =>
  meshParts(
    [placedPart("sphere", { type: "Sphere", radius: 4 }, { x: 0, y: 0, z: 0 })],
    budgetFor(REFERENCE_VOXEL_SIZE),
  )!.mesh;

const asUnwrapMesh = (mesh: MeshResult["mesh"]): UnwrapMesh => ({
  positions: mesh.positions,
  indices: mesh.indices,
  vertexCount: mesh.vertexCount,
});

/** **Small and fast**, because most assertions are about shape rather than about the picture. */
const box = (): MeshResult["mesh"] => centredBox(2);

describe("the seams xatlas cuts", () => {
  it("gives every triangle three coordinates from one chart", async () => {
    /**
     * **The bug this whole arrangement was changed for, stated as the invariant that prevents
     * it.**
     *
     * A brush hit is a point on a triangle plus three barycentric weights, and the atlas
     * coordinate is those three coordinates interpolated. If a triangle's corners came from
     * different charts — which is exactly what a vertex on a cut looks like once the cut has
     * been collapsed into one coordinate — the interpolation produces a point in *neither*
     * chart's triangle, and the dab lands wherever the arithmetic put it. That is the reported
     * symptom: the stroke you drew is there, and there is a second mark somewhere else on the
     * sheet, appearing only where the stroke crossed a seam.
     *
     * **Asserted over the whole mesh rather than at one seam**, because one seam is one triangle
     * and the defect is one bad triangle among thousands — which is why it survives looking at
     * the model and shows up instead as "randomly paints in extra places".
     */
    const xatlas = await loadXAtlas();
    const result = unwrapMesh(xatlas, asUnwrapMesh(sphere()));

    expect(result).toBeDefined();
    const { charts, indices } = result!.reference;
    for (let at = 0; at < indices.length; at += 3) {
      const a = charts[indices[at]!]!;
      expect(charts[indices[at + 1]!]!).toBe(a);
      expect(charts[indices[at + 2]!]!).toBe(a);
    }
  });

  it("cuts a sphere into more than one chart, so the test above means something", async () => {
    /**
     * **A guard on the guard.**
     *
     * "No triangle mixes charts" is not a property of this code — it is a property of the
     * output, and it only proves something when there are charts available to mix. A sphere at
     * this budget is measured at more than one; if a future packer stopped cutting it, the
     * invariant above would be passing vacuously and this is what says so.
     */
    const xatlas = await loadXAtlas();
    const result = unwrapMesh(xatlas, asUnwrapMesh(sphere()));

    expect(new Set(result!.reference.charts).size).toBeGreaterThan(1);
  });

  it("duplicates the vertices that sit on a cut", async () => {
    /**
     * **The mechanism, measured.** The unwelded mesh has one vertex per corner per triangle, so
     * it is strictly larger than the welded mesh it came from whenever anything was cut. Were
     * these counts equal, the cuts had been closed again and the invariant above would be
     * passing for the wrong reason.
     */
    const xatlas = await loadXAtlas();
    const mesh = asUnwrapMesh(sphere());
    const result = unwrapMesh(xatlas, mesh);

    expect(result!.reference.vertexCount).toBeGreaterThan(mesh.vertexCount);
    expect(result!.uvs.length).toBe(result!.reference.vertexCount * 2);
  });

  it("puts two different coordinates on one input vertex, rather than picking one", async () => {
    /**
     * **The thing the old code did, asserted to be gone.**
     *
     * The old unwrap collapsed xatlas's output back to one coordinate per input vertex,
     * keeping whichever chart was biggest — which is a defensible choice for the display mesh
     * and a wrong one for the brush. This asserts the information is still there: two output
     * vertices sharing an `xref` with different coordinates.
     */
    const xatlas = await loadXAtlas();
    const result = unwrapMesh(xatlas, asUnwrapMesh(sphere()));

    // **Counted through the source rather than the output**, because the output no longer says
    // which input vertex each corner came from — that mapping is what was deliberately dropped.
    // What is checkable without it is that the corners of some triangle are not all the same
    // point in the atlas, which is the case a collapsed unwrap can never produce.
    const { uvs, reference } = result!;
    let differing = 0;
    for (let at = 0; at < reference.indices.length; at += 3) {
      const a = reference.indices[at]! * 2;
      const b = reference.indices[at + 1]! * 2;
      if (uvs[a] !== uvs[b] || uvs[a + 1] !== uvs[b + 1]) differing++;
    }
    expect(differing).toBeGreaterThan(0);
  });
});

describe("unwrapMesh", () => {
  it("answers nothing for a mesh with no triangles in it", async () => {
    const xatlas = await loadXAtlas();

    // **Not an exception, and not an empty atlas.** xatlas accepts an empty mesh and packs it
    // into 0×0 with no charts, which is a plausible-looking result that would be used to size a
    // texture. Refusing before the library sees it is the only place that can tell the difference.
    expect(
      unwrapMesh(xatlas, {
        positions: new Float32Array(0),
        indices: new Uint32Array(0),
        vertexCount: 0,
      }),
    ).toBeUndefined();
  });

  it("answers nothing for a mesh with a triangle's worth of nothing", async () => {
    const xatlas = await loadXAtlas();

    expect(
      unwrapMesh(xatlas, {
        positions: new Float32Array(3),
        indices: new Uint32Array(0),
        vertexCount: 1,
      }),
    ).toBeUndefined();
  });

  it("gives one coordinate pair a vertex of the surface it laid out", async () => {
    const xatlas = await loadXAtlas();
    const mesh = box();

    const result = unwrapMesh(xatlas, asUnwrapMesh(mesh));

    expect(result).toBeDefined();
    // **In the unwelded mesh's vertex order, not the input's** — which is the change, and the
    // reason the two can no longer be the same array. See "the seams xatlas cuts" above.
    expect(result!.uvs.length).toBe(result!.reference.vertexCount * 2);
    expect(result!.uncovered).toBe(0);
  });

  it("puts every coordinate in the unit square", async () => {
    const xatlas = await loadXAtlas();
    const result = unwrapMesh(xatlas, asUnwrapMesh(box()))!;

    // **The one translation the adapter exists for.** xatlas answers in atlas texels: a sphere's
    // largest `u` measured 1224.5 in a 1225-wide atlas. Handed straight to a sampler those would
    // be coordinates tens of times outside the picture.
    for (const value of result.uvs) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("gives the corners of a box different coordinates", async () => {
    const xatlas = await loadXAtlas();
    const mesh = box();
    const result = unwrapMesh(xatlas, asUnwrapMesh(mesh))!;

    // A single coordinate for the whole mesh would pass every range assertion above and draw one
    // flat colour over the figure, so this is the assertion that the mapping is not degenerate.
    const distinct = new Set<string>();
    for (let v = 0; v < mesh.vertexCount; v++) {
      distinct.add(
        `${result.uvs[v * 2]!.toFixed(6)},${result.uvs[v * 2 + 1]!.toFixed(6)}`,
      );
    }
    expect(distinct.size).toBe(mesh.vertexCount);
  });

  it("reports an atlas that is not the size it asked for", async () => {
    const xatlas = await loadXAtlas();
    const result = unwrapMesh(xatlas, asUnwrapMesh(box()), DEFAULT_UNWRAP)!;

    // **`resolution` is a scale, not a size, and nothing promises it is even square.** Measured
    // 1225×847, 1145×1202 and 812×1270 for the same request on three meshes. Whatever allocates
    // the texture has to allocate it from these two numbers.
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.width === 1024 && result.height === 1024).toBe(false);
  });

  it("reports what it did, so a caller can show it", async () => {
    const xatlas = await loadXAtlas();
    const result = unwrapMesh(xatlas, asUnwrapMesh(box()))!;

    // **The numbers the other application throws away.** A chart count and a utilisation are the
    // only evidence anybody has that an atlas came out well, and there is nothing else to look at.
    expect(result.chartCount).toBeGreaterThan(0);
    expect(result.texelsPerUnit).toBeGreaterThan(0);
    expect(result.utilization).toBeGreaterThan(0);
    expect(result.utilization).toBeLessThanOrEqual(1);
  });

  it("spends more of the atlas with a gutter than without", async () => {
    const xatlas = await loadXAtlas();
    const mesh = asUnwrapMesh(box());

    const flush = unwrapMesh(xatlas, mesh, {
      resolution: 512,
      padding: 0,
      maxIterations: 1,
    })!;
    const padded = unwrapMesh(xatlas, mesh, {
      resolution: 512,
      padding: 4,
      maxIterations: 1,
    })!;

    // **Padding costs room and buys a clean edge**, because without it two charts' pixels sit side
    // by side and bilinear filtering samples across the line. That the room comes out of
    // utilisation is the argument for spending it, measured.
    expect(padded.utilization).toBeLessThan(flush.utilization);
  });

  it("puts a coordinate on every corner of a seam-split mesh", async () => {
    const xatlas = await loadXAtlas();
    const mesh = sphere();

    // The hard case, and the reason the adapter walks `xref` at all: xatlas splits a large share
    // of a sphere's vertices across charts, so its output has more vertices than its input and
    // the two are not in step. Every corner that survives gets a coordinate, and no input vertex
    // is left behind.
    const result = unwrapMesh(xatlas, asUnwrapMesh(mesh))!;

    expect(result.uncovered).toBe(0);
    expect(result.uvs.length).toBe(result.reference.vertexCount * 2);
    expect(result.reference.positions.length).toBe(
      result.reference.vertexCount * 3,
    );
    expect(result.reference.indices.length).toBe(
      result.reference.triangleCount * 3,
    );
  });

  it("draws the same picture back onto a mesh that has not moved", async () => {
    const xatlas = await loadXAtlas();
    const mesh = sphere();
    const reference = asUnwrapMesh(mesh);

    const result = unwrapMesh(xatlas, reference)!;
    // **Over the unwelded mesh, because that is what the transfer runs over** — the same tree
    // the brush raycasts, so this checks the coordinates the brush will actually read rather
    // than a version of them that no longer exists.
    const carried = transferUvs(
      TriangleBVH.of(result.reference),
      result.uvs,
      mesh,
    );

    // **The whole design, checked end to end in one assertion.** Coordinates are baked onto a
    // surface and carried onto the mesh that is actually on screen; if the two agree here then a
    // painted pixel lands where the texture says it should.
    expect(carried.unmatched).toBe(0);
    expect(carried.drift).toBe(0);
    expect(carried.uvs.length).toBe(mesh.vertexCount * 2);

    // **And every vertex of the display mesh lands inside the unit square**, which is what "the
    // picture lands where the texture says" reduces to once the transfer is over.
    for (const value of carried.uvs) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("names a mesh it refuses, rather than throwing something the library wrote", async () => {
    const xatlas = await loadXAtlas();

    // An index past the end of the positions is the failure a caller can actually cause, and the
    // library's own message for it is "an index is >= vertex count" — which says nothing about
    // which mesh. This one names what happened.
    expect(() =>
      unwrapMesh(xatlas, {
        positions: new Float32Array(9),
        indices: new Uint32Array([0, 1, 99]),
        vertexCount: 3,
      }),
    ).toThrow(/refused the mesh/);
  });
});
