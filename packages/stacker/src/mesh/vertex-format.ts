// What one vertex of merged geometry carries, and which lane of it holds what.
//
// A vertex is sixteen bytes: twelve of position, four of `packed`. The two
// attributes are what a renderer binds; the two quantities are what the mesher
// writes and the shader reads, and this module is the only place that knows
// which lane holds which.
//
// The lanes exist because a buffer carrying one attribute has to have a stride
// that is a multiple of four, and a buffer carrying a single byte per vertex
// has a stride of one. A face index and a palette index are one byte each and
// fill a `unorm8x4` between them.
//
// The palette index is carried rather than the colour itself so that changing a
// colour in the palette re-uploads a thirty-two-texel texture instead of
// re-meshing every chunk of the model.

/** Bytes one vertex of merged geometry occupies: a position and the lanes. */
export const VERTEX_BYTES = 16;

/** The lane of `packed` holding the face index, counted from the vertex's first. */
export const FACE_LANE = 0;

/** The lane of `packed` holding the palette index. */
export const COLOUR_LANE = 1;

/** The lane of `packed` holding a face's palette index, one vertex on. */
export const colourLaneAt = (vertex: number): number =>
  vertex * 4 + COLOUR_LANE;

/**
 * Which of the six axis-aligned directions a face points, as the byte the
 * `packed` lane holds: two per axis, the positive direction first.
 *
 * @param axis 0, 1 or 2.
 * @param sign +1 or −1.
 */
export const faceIndexOf = (axis: number, sign: number): number =>
  axis * 2 + (sign > 0 ? 0 : 1);

/**
 * The unit normal a face index names, off the graphics card: what a material
 * rebuilds the normal from in its shader, and the inverse of `faceIndexOf`.
 */
export const normalOfFaceIndex = (face: number): [number, number, number] => {
  const axis = face >> 1;
  const sign = face % 2 === 0 ? 1 : -1;
  return [axis === 0 ? sign : 0, axis === 1 ? sign : 0, axis === 2 ? sign : 0];
};
