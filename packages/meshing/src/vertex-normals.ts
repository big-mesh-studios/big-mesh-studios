/**
 * Vertex normals from the mesh's own faces, rather than from the field.
 *
 * ## Why this exists
 *
 * A mesher's per-vertex normal has two possible sources: the gradient of the field at the
 * vertex, or the faces around it. The gradient is the more fundamental answer and it costs
 * six field evaluations a vertex, because `Field.gradient` is six central differences and
 * each one is a whole fold of the operation list. On a chunk of this project's landscape
 * that was measured at 2.34 ms of a 38.4 ms chunk — six per cent, and the sixth is the
 * largest single thing in the field's budget that is not sampling the grid.
 *
 * Averaging the incident faces costs one pass over the index buffer and no field
 * evaluations at all, and on a smooth surface the two answers agree closely, because the
 * discrete Gauss theorem says the sum of a closed fan's area-weighted face normals is
 * parallel to the surface normal the fan is approximating.
 *
 * ## What it cannot do
 *
 * **It cannot cross a chunk boundary**, and this is the one thing to know before using it.
 * A chunk meshes only its own cells, so a vertex on the chunk's outer layer is referenced
 * only by this chunk's quads — its fan is clipped by the chunk edge, and averaging a
 * clipped fan gives a normal tilted towards the faces that survived. Two chunks meeting at
 * a boundary each hold their own vertex where their cells meet, at the same world position,
 * so both would shade from a one-sided average and disagree.
 *
 * Where two neighbouring chunks tessellate identically the two clipped fans are the same
 * faces, so the two one-sided averages agree and nothing needs doing. Where they tessellate
 * at different strides — a level-of-detail boundary, which ADR 0035 closes by having the
 * coarser chunk mesh one cell into the finer one — the fans differ and the averages do not.
 *
 * So a caller that needs the boundary to shade as one surface asks for the gradient on the
 * chunk's outer layer and averages everywhere else, and `resolveFaceNormal` returning
 * nothing is what tells it which vertices those are.
 *
 * ## The other thing that clips a fan
 *
 * **`split-colour-boundaries` clips one too, and it is easier to walk into.** That pass puts
 * two vertices where there was one, each holding the triangles on its own side of the colour
 * boundary, so averaging after it gives each copy a fan missing the faces that would have
 * cancelled its tilt — the same failure as a chunk edge, produced by a pass that has nothing
 * to do with chunks. So the order is not a preference: **average on the mesh as the mesher
 * left it, before anything duplicates a vertex.** `apps/sdf-modeller` does, and its reason
 * for being able to is that it has one bounded box and therefore no chunk boundary at all.
 */

import { writeOctahedralNormal } from "@big-mesh-studios/core";

/** Scratch for one chunk's accumulated face normals, kept across chunks. */
export class FaceNormalScratch {
  /**
   * Three sums a vertex, zeroed at the start of every mesh.
   *
   * **`Float32Array`, and the reason is accumulation order.** These are sums of a few
   * dozen face normals at most, every term of the same sign in each component on a
   * convex patch, so the running error is a few ulps of a quantity that is then normalised.
   * Float64 would buy nothing a vertex buffer can hold: the answer is encoded to
   * `snorm16x2` at the end, which is coarser by four orders of magnitude.
   */
  readonly sums: Float32Array;

  constructor(vertexCapacity: number) {
    this.sums = new Float32Array(Math.max(1, vertexCapacity) * 3);
  }

  /** How many vertices' worth of sums are held. */
  get capacity(): number {
    return Math.floor(this.sums.length / 3);
  }

  /**
   * Zeroes the sums for the vertices about to be written.
   *
   * Only the first `vertexCount` vertices, because those are the only ones the previous
   * mesh left values in and the only ones this one will read — zeroing the whole buffer
   * would be a second pass over a chunk-sized array for no gain.
   */
  clear(vertexCount: number): void {
    this.sums.fill(0, 0, Math.min(vertexCount, this.capacity) * 3);
  }
}

/**
 * Adds every triangle's area-weighted normal into the sums of its three vertices.
 *
 * **The cross product is not normalised, and that is the area weighting.** `|a × b|` is
 * twice the triangle's area, so summing raw cross products weights each face by its area
 * without a division or a square root anywhere — which is both the weighting a smooth
 * surface wants and the cheapest thing available. Normalising first and then weighting by
 * area separately would need the same square root twice over.
 *
 * **Per triangle, not per quad.** `SurfaceOutput.quad` emits two triangles over four
 * shared vertices, and those four are a bilinear patch through four cell centres rather
 * than a planar quad, so the two triangles have different normals. Averaging the quad's
 * corners as one would fold that difference in and lose it.
 *
 * **Positions are read from the array rather than through `ChunkMeshBuilder.positionOf`**,
 * which returns a fresh `{x, y, z}` per call — one object per corner per triangle, which
 * for a chunk is tens of thousands of short-lived allocations in the middle of the one
 * loop that has to be cheap.
 */
export const accumulateFaceNormals = (
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
  vertexCount: number,
  scratch: FaceNormalScratch,
): void => {
  scratch.clear(vertexCount);

  for (let i = 0; i + 2 < indices.length; i += 3) {
    const a = indices[i] as number;
    const b = indices[i + 1] as number;
    const c = indices[i + 2] as number;

    const ax = positions[a * 3] as number;
    const ay = positions[a * 3 + 1] as number;
    const az = positions[a * 3 + 2] as number;
    const ux = (positions[b * 3] as number) - ax;
    const uy = (positions[b * 3 + 1] as number) - ay;
    const uz = (positions[b * 3 + 2] as number) - az;
    const vx = (positions[c * 3] as number) - ax;
    const vy = (positions[c * 3 + 1] as number) - ay;
    const vz = (positions[c * 3 + 2] as number) - az;

    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    // A triangle with no area contributes no direction, and adding its zeroes is the same
    // answer as not adding it — `quadAcross` already refuses to emit a quad with a
    // repeated vertex, but a cell so thin its crossings coincide still lands here.
    if (nx === 0 && ny === 0 && nz === 0) continue;

    scratch.sums[a * 3] = (scratch.sums[a * 3] as number) + nx;
    scratch.sums[a * 3 + 1] = (scratch.sums[a * 3 + 1] as number) + ny;
    scratch.sums[a * 3 + 2] = (scratch.sums[a * 3 + 2] as number) + nz;
    scratch.sums[b * 3] = (scratch.sums[b * 3] as number) + nx;
    scratch.sums[b * 3 + 1] = (scratch.sums[b * 3 + 1] as number) + ny;
    scratch.sums[b * 3 + 2] = (scratch.sums[b * 3 + 2] as number) + nz;
    scratch.sums[c * 3] = (scratch.sums[c * 3] as number) + nx;
    scratch.sums[c * 3 + 1] = (scratch.sums[c * 3 + 1] as number) + ny;
    scratch.sums[c * 3 + 2] = (scratch.sums[c * 3 + 2] as number) + nz;
  }
};

/**
 * The unit normal a vertex's accumulated faces describe, written into `out`.
 *
 * Returns `false` when nothing was accumulated for it, which is the caller's signal to ask
 * the field instead. Two things produce that, and they want different answers:
 *
 * - **A vertex no emitted triangle names.** `SurfaceOutput.vertex` is called for every cell
 *   whose corners disagree and `quadAcross` refuses to emit unless all four of its cells
 *   have vertices, so a vertex on the far side of a thin surface can be owned by no quad.
 *   The field has a real gradient there.
 * - **A degenerate fan.** Two faces whose normals cancel exactly — a fold, or a cell so
 *   thin the crossings put its vertex on the surface twice.
 *
 * **A zero normal must not reach the vertex buffer.** `writeOctahedralNormal` would fold it
 * to `(0, 0)`, which decodes in the shader to a black triangle — the failure `Field`'s own
 * `fallbackNormal` exists to prevent, arriving by the other route.
 */
export const resolveFaceNormal = (
  scratch: FaceNormalScratch,
  index: number,
  out: { x: number; y: number; z: number },
): boolean => {
  if (index >= scratch.capacity) return false;
  const x = scratch.sums[index * 3] as number;
  const y = scratch.sums[index * 3 + 1] as number;
  const z = scratch.sums[index * 3 + 2] as number;
  const length = Math.sqrt(x * x + y * y + z * z);
  if (length === 0) return false;
  out.x = x / length;
  out.y = y / length;
  out.z = z / length;
  return true;
};

/** Scratch for a chunk mesher's face normals, held for its whole life beside its others. */
export class FaceNormalWriter {
  private readonly scratch: FaceNormalScratch;
  private readonly resolved = { x: 0, y: 0, z: 0 };

  constructor(vertexCapacity: number) {
    this.scratch = new FaceNormalScratch(vertexCapacity);
  }

  /**
   * Accumulates from a mesh's own positions and indices, once the mesh is complete.
   *
   * **After the geometry, not during it.** A face's normal needs all three of its
   * vertices' positions, and the second and third of a quad are only known once the quad
   * is emitted — so there is no point at which a triangle could be accumulated as it is
   * written. This is a second pass over the index buffer, and it is still cheaper than one
   * field evaluation.
   */
  accumulate(positions: ArrayLike<number>, indices: ArrayLike<number>): void {
    accumulateFaceNormals(
      positions,
      indices,
      Math.floor(positions.length / 3),
      this.scratch,
    );
  }

  /**
   * Writes one vertex's normal as `snorm16x2`, or returns `false` having written nothing
   * so the caller can fall back to the field.
   */
  write(index: number, into: Int16Array): boolean {
    if (!resolveFaceNormal(this.scratch, index, this.resolved)) return false;
    writeOctahedralNormal(into, index * 2, this.resolved);
    return true;
  }
}
