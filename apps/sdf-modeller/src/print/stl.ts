/**
 * A model written as a binary STL.
 *
 * ## What an STL is
 *
 * **A list of triangles and nothing else.** There is no unit, no colour, no name and no
 * structure — just a triangle soup that every slicer and every mesh tool of the last thirty
 * years reads. That is the whole of its appeal, and the whole of what it cannot do: a model
 * painted in the modeller prints in whatever colour the filament happens to be, and a slicer
 * has to be told what size the numbers are in, because the file does not say.
 *
 * The numbers written here are millimetres, like the 3MF writer's, because that is what slicers
 * assume and because both files come out of the same `standOnBed`. What a person sees in a
 * slicer is then the same size whichever one they chose.
 *
 * ## Why binary rather than ASCII
 *
 * **Because the same mesh is a quarter of the size and does not lose precision.** An ASCII STL
 * is a decimal number in a text file for every coordinate, which is several times the bytes of
 * a `float32` and rounds the model through an assumption about how many places are worth
 * writing. A binary STL is a fixed 50 bytes a triangle, which is also what makes the file a
 * thing a program can read without parsing anything.
 *
 * ## Why the normal is computed rather than supplied
 *
 * **Because an STL stores a normal and the mesh this is built from does not.** `PrintSolid` is
 * positions and indices, and a triangle's normal is not data — it is the cross product of two
 * of its edges. Many programs ignore the stored normal and recompute it; the ones that use it
 * are reading the only statement the format gives about which side of the triangle is outside,
 * so it is worth writing correctly rather than as zero. `standOnBed` keeps the winding, so the
 * right-hand rule gives the same outward normal a slicer would work out for itself.
 */
/** The 80 bytes at the front, which a binary STL reserves and most readers ignore. */
const HEADER_BYTES = 80;

/** The triangle count, as an unsigned 32-bit little-endian integer. */
const COUNT_BYTES = 4;

/** One triangle: a normal, three corners and a two-byte attribute count. */
const TRIANGLE_BYTES = 50;

/**
 * What the header says, so a person opening the file in a hex editor can see what wrote it.
 *
 * **Not starting with `solid`,** which is how some readers decide whether to parse a file as
 * ASCII STL. A binary file whose header begins with that word is the classic way to make an
 * otherwise correct export open as a model with no triangles in it.
 */
const HEADER = "sdf-modeller binary STL";

/** Three floats a corner, in millimetres from the bed. */
export interface StlMesh {
  readonly vertices: Float32Array;
  /** Three of them a triangle, counting from the start of `vertices`. */
  readonly indices: Uint32Array;
}

/**
 * `mesh` as the bytes of a binary STL.
 *
 * **Takes only vertices and indices**, so the two exports measure and stand the model through
 * one piece of code rather than two that can disagree about how big it is. A corner with no
 * triangle is not written, because an STL has no vertices — only the corners of triangles.
 */
export function encodeStl(mesh: StlMesh): Blob {
  const triangles = Math.floor(mesh.indices.length / 3);
  const bytes = new ArrayBuffer(
    HEADER_BYTES + COUNT_BYTES + triangles * TRIANGLE_BYTES,
  );
  const view = new DataView(bytes);

  for (let i = 0; i < HEADER.length; i++) {
    view.setUint8(i, HEADER.charCodeAt(i));
  }
  view.setUint32(HEADER_BYTES, triangles, true);

  let offset = HEADER_BYTES + COUNT_BYTES;
  for (let t = 0; t + 2 < mesh.indices.length; t += 3) {
    const a = (mesh.indices[t] as number) * 3;
    const b = (mesh.indices[t + 1] as number) * 3;
    const c = (mesh.indices[t + 2] as number) * 3;

    const ax = mesh.vertices[a] as number;
    const ay = mesh.vertices[a + 1] as number;
    const az = mesh.vertices[a + 2] as number;
    const bx = mesh.vertices[b] as number;
    const by = mesh.vertices[b + 1] as number;
    const bz = mesh.vertices[b + 2] as number;
    const cx = mesh.vertices[c] as number;
    const cy = mesh.vertices[c + 1] as number;
    const cz = mesh.vertices[c + 2] as number;

    // **The cross product of two edges, normalised.** A degenerate triangle — which a marching
    // cubes mesh can produce on a corner it clips to nothing — has no direction to point in, so
    // it writes zero rather than a vector divided by a length of zero.
    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    const scale = length > 0 ? 1 / length : 0;

    view.setFloat32(offset, nx * scale, true);
    view.setFloat32(offset + 4, ny * scale, true);
    view.setFloat32(offset + 8, nz * scale, true);
    offset += 12;

    for (const corner of [a, b, c]) {
      view.setFloat32(offset, mesh.vertices[corner] as number, true);
      view.setFloat32(offset + 4, mesh.vertices[corner + 1] as number, true);
      view.setFloat32(offset + 8, mesh.vertices[corner + 2] as number, true);
      offset += 12;
    }

    // **The attribute byte count, which is always zero.** Some dialects put a colour in it;
    // the format this writes is the plain one, and a slicer that sees zero uses its own colour.
    view.setUint16(offset, 0, true);
    offset += 2;
  }

  return new Blob([bytes], { type: "model/stl" });
}
