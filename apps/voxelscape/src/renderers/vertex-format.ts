// What one vertex of terrain carries, and how the four small quantities that
// used to be four float attributes share one four-byte lane group.
//
// A vertex is twenty bytes: twelve of position, four of `packed`, four of `uv`.
// The three attributes are what the renderer binds; the five quantities are
// what the mesher writes and the shader reads, and this module is the only
// place that knows which lane holds which.
//
// The lane group exists because a buffer carrying one attribute has to have a
// stride that is a multiple of four. A face index, the two light channels and
// a tile index are one byte each and fill a `unorm8x4` exactly: the face in
// `x`, the sky light in `y`, the tile index in `z`, and the block light in
// `w`. Sky and block light are separate lanes because the shader scales the
// former by the time of day while the latter shines on its own.
import { float, vec3, type Node } from "@random-mesh/rmsl";

/** Bytes one vertex of merged geometry occupies, position and both lanes. */
export const VERTEX_BYTES = 20;

/**
 * The three vertex formats this layout's attributes are in, named the way the
 * graphics APIs name them.
 */
export type VertexFormat = "float32x3" | "float16x2" | "unorm8x4";

/**
 * The largest tile index the sheet lane can hold. A sheet with more cells than
 * this cannot be addressed by a byte, which `TriangleRenderer.setTiles` checks
 * when an atlas arrives rather than letting the index wrap silently.
 */
export const MAX_TILE_INDEX = 255;

/**
 * The largest texture coordinate `uv` can carry exactly. Coordinates count
 * cells rather than sweeping nought to one, so a merged quad's run to its far
 * edge is as long as the block is wide — far inside this.
 */
export const MAX_UV = 1024;

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
 * The unit normal a face index names, off the graphics card: what
 * `faceNormalOf` rebuilds in the shader, and the inverse of `faceIndexOf`.
 */
export const normalOfFaceIndex = (face: number): [number, number, number] => {
  const axis = face >> 1;
  const sign = face % 2 === 0 ? 1 : -1;
  return [axis === 0 ? sign : 0, axis === 1 ? sign : 0, axis === 2 ? sign : 0];
};

/**
 * The unit normal a face index names, rebuilt in the shader from the one byte
 * that replaced it. Six directions is under three bits of information, which is
 * what makes the byte worth spending on the tile and the light beside it.
 *
 * @param face The index as `faceIndexOf` wrote it, decoded back to 0..5.
 */
export const faceNormalOf = (face: Node<"float">): Node<"vec3"> => {
  const axis = face.mul(0.5).floor();
  // The low bit is the direction: even faces point along the axis, odd against.
  const sign = float(1).sub(face.sub(axis.mul(2)).mul(2));
  // One where the face lies on this axis and nothing where it does not, without
  // a branch: the axes are whole numbers, so anything but a match is at least
  // one away.
  const on = (which: number): Node<"float"> =>
    float(1).sub(axis.sub(float(which)).abs().min(float(1)));
  return vec3(on(0), on(1), on(2)).mul(sign);
};

/**
 * A whole number as the bits of a half float, which is what `uv` is stored as.
 *
 * Only whole numbers from 0 to `MAX_UV` are in range, which is every texture
 * coordinate the mesher writes: a coordinate counts cells, and a quad cannot
 * cover more of them than the block is wide. Within that range the conversion
 * is exact in both directions, so a coordinate reaches the shader as the number
 * the mesher wrote — which the tile lookup depends on, because it takes the
 * fraction of the coordinate and a value a hair under a whole number would take
 * the far edge of the tile instead of the near one.
 */
export const halfOfWholeNumber = (value: number): number => {
  if (value === 0) {
    return 0;
  }
  const exponent = Math.floor(Math.log2(value));
  const mantissa = (value - 2 ** exponent) << (10 - exponent);
  return ((exponent + 15) << 10) | mantissa;
};

/**
 * The number a half float's bits hold, off the graphics card: the inverse of
 * `halfOfWholeNumber`, over the same range of whole numbers.
 */
export const wholeNumberOfHalf = (bits: number): number => {
  if (bits === 0) {
    return 0;
  }
  const exponent = (bits >> 10) - 15;
  const mantissa = bits & 0x3ff;
  return 2 ** exponent * (1 + mantissa / 1024);
};
