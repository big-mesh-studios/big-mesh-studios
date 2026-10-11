/**
 * Carrying baked texture coordinates onto a rebuilt mesh.
 *
 * **A box and a flat quad, because their answers are diagrams.** Moving a box says exactly how
 * far every vertex is from where it was, which is the number the transfer reports and the number
 * a person would use to decide whether to rebake. A meshed model at the bottom covers the other
 * half: that it behaves on the irregular, near-degenerate input it is really given.
 */
import { budgetFor, ChunkMeshBuilder } from "@big-mesh-studios/meshing";
import type { ChunkMesh } from "@big-mesh-studios/meshing";
import { describe, expect, it } from "vitest";

import { meshParts } from "../model/mesh-model";
import { placedPart } from "../model/part";
import { centredBox } from "../print/fixtures";
import { TriangleBVH } from "./triangle-bvh";
import { transferUvs } from "./uv-transfer";

/** A box from -1 to 1 on each axis, whose eight vertices are all corners. */
const box = (): ChunkMesh => centredBox(2);

/** `mesh`'s vertices moved by `(x, y, z)`. */
const moved = (mesh: ChunkMesh, x: number, y: number, z: number): ChunkMesh => {
  const positions = new Float32Array(mesh.positions);
  for (let v = 0; v < mesh.vertexCount; v++) {
    positions[v * 3] += x;
    positions[v * 3 + 1] += y;
    positions[v * 3 + 2] += z;
  }
  return { ...mesh, positions };
};

/** `mesh`'s vertices scaled about the origin by `k`. */
const scaled = (mesh: ChunkMesh, k: number): ChunkMesh => {
  const positions = new Float32Array(mesh.positions);
  for (let v = 0; v < mesh.vertexCount; v++) {
    positions[v * 3] *= k;
    positions[v * 3 + 1] *= k;
    positions[v * 3 + 2] *= k;
  }
  return { ...mesh, positions };
};

/**
 * Coordinates that vary smoothly across the mesh's own extent, over the whole unit square.
 *
 * **A gradient rather than a per-face constant**, because a constant would hide the thing under
 * test: a transfer that silently handed back the coordinates of the *nearest vertex* rather than
 * interpolating across the triangle would still pass every face-based assertion, and would
 * staircase a real pattern.
 *
 * **Normalised by the mesh's own bounds**, so the same helper works for a unit box and a sphere
 * of radius four and still produces coordinates in `0..1` — which is where a baked atlas puts
 * them, and what the last test below asserts a transfer cannot leave.
 */
const coordinatesOf = (mesh: ChunkMesh): Float32Array => {
  const half = mesh.positions.reduce(
    (widest, at) => Math.max(widest, Math.abs(at)),
    0,
  );
  const uvs = new Float32Array(mesh.vertexCount * 2);
  for (let v = 0; v < mesh.vertexCount; v++) {
    uvs[v * 2] = mesh.positions[v * 3] / (2 * half) + 0.5;
    uvs[v * 2 + 1] = mesh.positions[v * 3 + 1] / (2 * half) + 0.5;
  }
  return uvs;
};

describe("transferUvs", () => {
  it("hands a mesh its own coordinates back unchanged", () => {
    const mesh = box();
    const uvs = coordinatesOf(mesh);

    const carried = transferUvs(TriangleBVH.of(mesh), uvs, mesh);

    expect(carried.unmatched).toBe(0);
    expect(carried.drift).toBe(0);
    for (let i = 0; i < uvs.length; i++)
      expect(carried.uvs[i]).toBeCloseTo(uvs[i]!, 6);
  });

  it("gives a vertex the coordinates of the nearest point, not of the nearest vertex", () => {
    const mesh = box();
    const uvs = coordinatesOf(mesh);

    // Two units past the +x face. Every vertex is now outside the box on the same side, so every
    // one of them has its nearest point somewhere on the +x face — and so every one of them
    // comes back with the same first coordinate. A transfer that took the nearest *vertex* would
    // instead hand each vertex its own neighbour's, and the eight answers would differ.
    const carried = transferUvs(
      TriangleBVH.of(mesh),
      uvs,
      moved(mesh, 2, 0, 0),
    );

    const first = uvs[1 * 2]!;
    for (let v = 0; v < mesh.vertexCount; v++) {
      expect(carried.uvs[v * 2], `vertex ${v}`).toBeCloseTo(first, 6);
    }
  });

  it("keeps the second coordinate independent of the first", () => {
    const mesh = box();
    const uvs = coordinatesOf(mesh);

    // A move along x alone must not disturb v at all, or the transfer is interpolating the pair
    // rather than two numbers. Only the vertices whose y has not changed can be compared, because
    // moving in x does move their nearest point along the face they sit on.
    const carried = transferUvs(
      TriangleBVH.of(mesh),
      uvs,
      moved(mesh, 0.3, 0, 0),
    );

    for (let v = 0; v < mesh.vertexCount; v++) {
      expect(carried.uvs[v * 2 + 1], `vertex ${v}`).toBeCloseTo(
        uvs[v * 2 + 1]!,
        6,
      );
    }
  });

  it("reports how far the mesh has moved from where its coordinates were baked", () => {
    const mesh = box();
    const uvs = coordinatesOf(mesh);
    const bvh = TriangleBVH.of(mesh);

    // A third of a unit past the +x face, and no further anywhere: the far side is still on its
    // own face, so the furthest any vertex has moved from the surface is a third of a unit.
    expect(transferUvs(bvh, uvs, moved(mesh, 0.3, 0, 0)).drift).toBeCloseTo(
      0.3,
      6,
    );
    // Half of a unit past every face. **A corner, not a face centre**, so the nearest point is the
    // opposite corner and the distance is the diagonal — `sqrt(3) / 2`, not a half.
    expect(transferUvs(bvh, uvs, scaled(mesh, 1.5)).drift).toBeCloseTo(
      Math.sqrt(3) / 2,
      6,
    );
    // And the same in the other direction, where the nearest point is the nearest face itself.
    expect(transferUvs(bvh, uvs, scaled(mesh, 0.5)).drift).toBeCloseTo(0.5, 6);
  });

  it("reports no drift for a mesh that has not moved", () => {
    const mesh = box();

    expect(
      transferUvs(TriangleBVH.of(mesh), coordinatesOf(mesh), mesh).drift,
    ).toBe(0);
  });

  it("counts a vertex with no surface to reach, and gives it nothing", () => {
    // **Only an empty reference can fail this way, and that is the point.** Every point in space
    // has a nearest point on any surface at all, however far away, so a vertex whose model has
    // gone somewhere else still gets an answer. The only mesh a vertex cannot find is one with no
    // triangles — a model with no parts in it — and that is exactly the case the count is for,
    // because it is the case where the honest answer is "no coordinates" rather than coordinates
    // borrowed from a surface that is not there.
    const builder = new ChunkMeshBuilder();
    builder.vertex(0, 0, 0);
    builder.vertex(1, 0, 0);
    builder.vertex(0, 1, 0);
    const target = builder.finish();

    const carried = transferUvs(
      TriangleBVH.of(new ChunkMeshBuilder().finish()),
      new Float32Array(0),
      target,
    );

    expect(carried.unmatched).toBe(3);
    expect(carried.drift).toBe(0);
    for (let i = 0; i < carried.uvs.length; i++) expect(carried.uvs[i]).toBe(0);
  });

  it("interpolates along an edge rather than copying an end", () => {
    // The case a nearest-vertex transfer gets wrong, and the reason the transfer interpolates
    // three vertices rather than finding one.
    const builder = new ChunkMeshBuilder();
    const [a, b, c, d] = [
      builder.vertex(0, 0, 0),
      builder.vertex(2, 0, 0),
      builder.vertex(2, 2, 0),
      builder.vertex(0, 2, 0),
    ].map((v) => v as number);
    builder.quad(a, b, c, d);
    const reference = builder.finish();
    const uvs = coordinatesOf(reference);
    // The square runs -2..2, so its corners are at a quarter, a half, three quarters and one.
    expect(uvs[a * 2]).toBeCloseTo(0.5, 6);
    expect(uvs[b * 2]).toBeCloseTo(1, 6);

    // A model whose four vertices all sit on the reference surface: one of its corners, the
    // midpoint of the bottom edge, the midpoint of the right edge, and the opposite corner.
    const target = new ChunkMeshBuilder();
    const here = target.vertex(0, 0, 0);
    const alongBottom = target.vertex(1, 0, 0);
    const alongRight = target.vertex(2, 1, 0);
    const opposite = target.vertex(0, 2, 0);
    target.quad(here, alongBottom, alongRight, opposite);
    const rebuilt = target.finish();

    const carried = transferUvs(TriangleBVH.of(reference), uvs, rebuilt);

    expect(carried.unmatched).toBe(0);
    expect(carried.drift).toBe(0);

    // A vertex the reference also has is that vertex, exactly.
    expect(carried.uvs[here * 2]).toBeCloseTo(uvs[a * 2]!, 6);
    expect(carried.uvs[opposite * 2 + 1]).toBeCloseTo(uvs[d * 2 + 1]!, 6);

    // The two edge midpoints are strictly between the ends, on each axis in turn. **Both
    // coordinates matter**, because an edge along one axis varies only in the other: on the
    // bottom edge u has to interpolate and v is constant, and a transfer that copied a vertex
    // would answer a quarter or three quarters instead of a half.
    expect(carried.uvs[alongBottom * 2]).toBeCloseTo(0.75, 6);
    expect(carried.uvs[alongBottom * 2 + 1]).toBeCloseTo(uvs[a * 2 + 1]!, 6);
    expect(carried.uvs[alongRight * 2 + 1]).toBeCloseTo(0.75, 6);
    expect(carried.uvs[alongRight * 2]).toBeCloseTo(uvs[b * 2]!, 6);
  });

  it("works across a meshed model, not just a box", () => {
    const part = placedPart(
      "sphere",
      { type: "Sphere", radius: 4 },
      { x: 0, y: 0, z: 0 },
    );
    // The reference is meshed fine and the model that receives its coordinates is meshed coarsely.
    // That is the real relationship: the pinned surface is a snapshot, and the mesh on screen is
    // whatever resolution the person is looking at.
    const reference = meshParts([part], budgetFor(0.125))!.mesh;
    const coarse = meshParts([part], budgetFor(0.25))!.mesh;

    const uvs = coordinatesOf(reference);
    const carried = transferUvs(TriangleBVH.of(reference), uvs, coarse);

    expect(carried.unmatched).toBe(0);
    // A coarse sphere's vertices sit within about half a coarse sample of the fine surface.
    expect(carried.drift).toBeGreaterThan(0);
    expect(carried.drift).toBeLessThan(0.25);
    // Interpolating between coordinates that all lie in the unit square cannot leave it, which is
    // what would catch a divide by a zero weight or a missing third vertex.
    for (const value of carried.uvs) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});
