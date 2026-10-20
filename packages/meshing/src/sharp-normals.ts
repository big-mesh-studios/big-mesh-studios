/**
 * Making a crease look like a crease rather than a smooth ramp.
 *
 * ## What is wrong without this
 *
 * **Sharp geometry is not sharp shading.** A dual mesher can put a box's crease exactly on
 * the intersection of its two faces, and the surface will still be lit as a curve, because
 * a normal is per vertex and every triangle touching the crease shares those vertices. The
 * average of the two faces is the bisector, and the rasteriser interpolates it across the
 * triangles on both sides. The eye reads a rounded edge even where the geometry has none.
 *
 * The fix is not in the shader. It is the same thing a modeller calls a smoothing group:
 * give each side of the crease its own copy of the vertices, carrying that side's face
 * normal, so the interpolator has nothing to blend. Two vertices in one place are already
 * a normal state in this project — chunk boundaries have them (ADR 0003) and the colour
 * pass creates them — and `reportMesh` counts edges by position precisely so that they
 * remain one surface to every reader downstream.
 *
 * ## Why the test is against the stored normal rather than against a dihedral angle
 *
 * A triangle's own face normal is the answer a flat-shaded version of that triangle would
 * have. The stored vertex normal is the answer it has now. If the two disagree by more
 * than the threshold, the vertex is being pulled by a face this triangle does not belong
 * to, and that is exactly the case worth cutting. A dihedral test across each mesh edge
 * would need the edge's two users and would still have to decide which vertices to split;
 * this asks the question at the triangle, which is where the shading is decided.
 *
 * **A smooth surface is not split by it.** On a sphere the stored normal is the average of
 * the incident faces, and a face's normal is close to that average — the angle is the local
 * curvature over one cell, not the angle between the surface and a neighbouring plane. The
 * default threshold is well above what a resolved sphere produces at the coarsest level
 * this project meshes, and a box's 45° is well above the threshold. Models of both kinds
 * are what `sharp-normals.test.ts` holds it to.
 *
 * ## Ordering
 *
 * **After the averaged normals are written, and before anything duplicates a vertex.**
 * Averaging a clipped fan gives a normal leaned towards the faces that survived (see
 * `vertex-normals`), so this cannot run after `split-colour-boundaries`, which clips one
 * fan per colour side. It runs on the mesh the mesher left, where every vertex's fan is
 * the whole surface around it. The caller decides whether to run the colour pass after.
 */

import { encodeOctahedralSnorm16, SNORM16_MAX } from "@big-mesh-studios/core";

import type { ChunkMesh } from "./chunk-mesh";
import { Growable } from "./growable";

/**
 * How far a face may lean away from a vertex's normal before the vertex is split, in
 * degrees.
 *
 * **Thirty-five is above a resolved sphere's per-cell curvature and below a box's 45°.**
 * It is a default, not a law: a level made of shallow wedges may want it lower, and a very
 * coarse landscape may want it higher. `MeshResolution.sharpEdges` is where a place says
 * what it wants.
 */
export const DEFAULT_SHARP_ANGLE = 35;

export interface SharpNormalOptions {
  /** The angle in degrees. Defaults to `DEFAULT_SHARP_ANGLE`. */
  readonly angle?: number;
}

/**
 * Scratch for one mesh's decoded normals.
 *
 * **Decoded once and reused by the detection pass and the rebuild.** `normalOct` is the
 * packed form the GPU wants, but every comparison here needs a unit vector, and decoding
 * twice per triangle would be the same arithmetic with a worse cache story. The array is
 * sized for the widest mesh this thread has seen and only the first `vertexCount * 3`
 * entries are read.
 */
export class SharpNormalScratch {
  normals = new Float32Array(0);

  /** Decodes `mesh`'s packed normals into `normals`, growing the buffer if it must. */
  reset(mesh: ChunkMesh): void {
    const count = mesh.vertexCount;
    const needed = count * 3;
    if (this.normals.length < needed) {
      this.normals = new Float32Array(needed);
    }
    const normals = this.normals;
    for (let i = 0; i < count; i++) {
      decodeNormal(
        mesh.normalOct[i * 2] as number,
        mesh.normalOct[i * 2 + 1] as number,
        normals,
        i * 3,
      );
    }
  }
}

/**
 * `mesh` with a flat-shaded copy of every triangle that leans away from its corners'
 * normals, or `mesh` itself when there is nothing to cut.
 *
 * **Returns the argument rather than a copy when there is nothing to do.** A smooth model,
 * a water sheet, or a level that never asked for sharp edges pays one pass over the index
 * buffer and no allocation — which is what makes it safe to call unconditionally from a
 * mesher that has already decided to sharpen.
 */
export const splitSharpNormals = (
  mesh: ChunkMesh,
  options: SharpNormalOptions = {},
  scratch: SharpNormalScratch = new SharpNormalScratch(),
): ChunkMesh => {
  if (mesh.triangleCount === 0 || mesh.vertexCount === 0) return mesh;

  const angle = options.angle ?? DEFAULT_SHARP_ANGLE;
  const threshold = Math.cos(
    (Math.max(0, Math.min(180, angle)) * Math.PI) / 180,
  );
  scratch.reset(mesh);

  const face = { x: 0, y: 0, z: 0 };
  if (!hasSharpTriangle(mesh, scratch.normals, threshold, face)) return mesh;

  return rebuild(mesh, scratch.normals, threshold, face);
};

/** Whether any triangle's face normal disagrees with one of its corners. */
const hasSharpTriangle = (
  mesh: ChunkMesh,
  normals: Float32Array,
  threshold: number,
  face: { x: number; y: number; z: number },
): boolean => {
  const positions = mesh.positions;
  const indices = mesh.indices;
  for (let t = 0; t < mesh.triangleCount; t++) {
    const a = indices[t * 3] as number;
    const b = indices[t * 3 + 1] as number;
    const c = indices[t * 3 + 2] as number;
    if (!faceNormal(positions, a, b, c, face)) continue;
    if (
      dot(normals, a, face) < threshold ||
      dot(normals, b, face) < threshold ||
      dot(normals, c, face) < threshold
    ) {
      return true;
    }
  }
  return false;
};

/**
 * Copies the mesh and appends a flat copy of every triangle that needs one.
 *
 * The original vertices are copied first, in index order, so every un-split triangle keeps
 * the index it had. A split triangle's three copies are appended together; their order is
 * the triangle's own, which preserves its winding.
 */
const rebuild = (
  mesh: ChunkMesh,
  normals: Float32Array,
  threshold: number,
  face: { x: number; y: number; z: number },
): ChunkMesh => {
  const positions = new Growable<Float32Array>(
    Float32Array,
    mesh.positions.length,
  );
  const normalOct = new Growable<Int16Array>(Int16Array, mesh.normalOct.length);
  const colours = new Growable<Uint8Array>(Uint8Array, mesh.colours.length);
  const indices = new Growable<Uint32Array>(Uint32Array, mesh.indices.length);

  positions.pushMany(mesh.positions);
  normalOct.pushMany(mesh.normalOct);
  colours.pushMany(mesh.colours);

  const source = mesh.positions;
  const sourceIndices = mesh.indices;
  const sourceColours = mesh.colours;
  let next = mesh.vertexCount;

  for (let t = 0; t < mesh.triangleCount; t++) {
    const a = sourceIndices[t * 3] as number;
    const b = sourceIndices[t * 3 + 1] as number;
    const c = sourceIndices[t * 3 + 2] as number;
    if (
      !faceNormal(source, a, b, c, face) ||
      (dot(normals, a, face) >= threshold &&
        dot(normals, b, face) >= threshold &&
        dot(normals, c, face) >= threshold)
    ) {
      indices.push(a);
      indices.push(b);
      indices.push(c);
      continue;
    }

    const [nx, ny] = encodeOctahedralSnorm16(face);
    for (const vertex of [a, b, c]) {
      positions.push(source[vertex * 3] as number);
      positions.push(source[vertex * 3 + 1] as number);
      positions.push(source[vertex * 3 + 2] as number);
      normalOct.push(nx);
      normalOct.push(ny);
      colours.push(sourceColours[vertex * 4] as number);
      colours.push(sourceColours[vertex * 4 + 1] as number);
      colours.push(sourceColours[vertex * 4 + 2] as number);
      colours.push(sourceColours[vertex * 4 + 3] as number);
    }
    indices.push(next);
    indices.push(next + 1);
    indices.push(next + 2);
    next += 3;
  }

  return {
    positions: positions.exact(),
    normalOct: normalOct.exact(),
    colours: colours.exact(),
    indices: indices.exact(),
    vertexCount: next,
    triangleCount: mesh.triangleCount,
  };
};

/**
 * Writes a triangle's unit face normal into `out`, or returns `false` for a degenerate
 * triangle.
 *
 * **Not normalised in the array, because the dot products are against unit stored normals
 * and a zero-area triangle has no direction at all.** Returning false lets the caller copy
 * such a triangle untouched, which is the one answer that cannot make a normal worse.
 */
const faceNormal = (
  positions: ArrayLike<number>,
  a: number,
  b: number,
  c: number,
  out: { x: number; y: number; z: number },
): boolean => {
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
  const length = Math.hypot(nx, ny, nz);
  if (!(length > 0) || !Number.isFinite(length)) return false;
  out.x = nx / length;
  out.y = ny / length;
  out.z = nz / length;
  return true;
};

/** The stored normal at a vertex, dotted with a face normal. Both are unit-length. */
const dot = (
  normals: Float32Array,
  vertex: number,
  face: { x: number; y: number; z: number },
): number =>
  (normals[vertex * 3] as number) * face.x +
  (normals[vertex * 3 + 1] as number) * face.y +
  (normals[vertex * 3 + 2] as number) * face.z;

/** The inverse of `writeOctahedralNormal`, inlined so decoding a mesh allocates nothing. */
const decodeNormal = (
  sx: number,
  sy: number,
  out: Float32Array,
  at: number,
): void => {
  let x = sx / SNORM16_MAX;
  let y = sy / SNORM16_MAX;
  let z = 1 - Math.abs(x) - Math.abs(y);
  if (z < 0) {
    const fold = -z;
    x += x >= 0 ? -fold : fold;
    y += y >= 0 ? -fold : fold;
  }
  const length = Math.hypot(x, y, z);
  if (length === 0) {
    out[at] = 0;
    out[at + 1] = 0;
    out[at + 2] = 1;
    return;
  }
  out[at] = x / length;
  out[at + 1] = y / length;
  out[at + 2] = z / length;
};
