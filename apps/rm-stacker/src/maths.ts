import { Dimensions2D } from "./types";

export interface Vector2D {
  x: number;
  y: number;
}

export namespace Vector2D {
  export function create(x = 0, y = 0) {
    return {
      x,
      y,
    };
  }

  export function round(a: Vector2D, out = Vector2D.create()) {
    out.x = Math.round(a.x - 0.5);
    out.y = Math.round(a.y - 0.5);
    return out;
  }

  export function sub(a: Vector2D, b: Vector2D, out = Vector2D.create()) {
    out.x = a.x - b.x;
    out.y = a.y - b.y;
    return out;
  }

  export function add(a: Vector2D, b: Vector2D, out = Vector2D.create()) {
    out.x = a.x + b.x;
    out.y = a.y + b.y;
    return out;
  }

  export function multiply(a: Vector2D, b: Vector2D, out = Vector2D.create()) {
    out.x = a.x * b.x;
    out.y = a.y * b.y;
    return out;
  }

  export function multiplyScalar(
    a: Vector2D,
    scalar: number,
    out = Vector2D.create(),
  ) {
    out.x = a.x * scalar;
    out.y = a.y * scalar;
    return out;
  }

  export function max(a: Vector2D, b: Vector2D, out = Vector2D.create()) {
    out.x = Math.max(a.x, b.x);
    out.y = Math.max(a.y, b.y);
    return out;
  }

  export function min(a: Vector2D, b: Vector2D, out = Vector2D.create()) {
    out.x = Math.min(a.x, b.x);
    out.y = Math.min(a.y, b.y);
    return out;
  }

  export function clamp(
    a: Vector2D,
    min: Vector2D,
    max: Vector2D,
    out = Vector2D.create(),
  ) {
    out.x = Math.max(Math.min(a.x, max.x), min.x);
    out.y = Math.max(Math.min(a.y, max.y), min.y);
    return out;
  }

  export const EMPTY = Object.freeze(create());
}

/**********************************************************************************/
/*                                    Vector3D                                    */
/**********************************************************************************/

export interface Vector3D extends Vector2D {
  z: number;
}

export namespace Vector3D {
  export function create(x = 0, y = 0, z = 0) {
    return {
      x,
      y,
      z,
    };
  }

  export function add(a: Vector3D, b: Vector3D, out = Vector3D.create()) {
    out.x = a.x + b.x;
    out.y = a.y + b.y;
    out.z = a.z + b.z;
    return out;
  }

  export function subtract(a: Vector3D, b: Vector3D, out = Vector3D.create()) {
    out.x = a.x - b.x;
    out.y = a.y - b.y;
    out.z = a.z - b.z;
    return out;
  }

  export function cross(a: Vector3D, b: Vector3D, out = Vector3D.create()) {
    // Written out of locals rather than straight into out, so that passing one
    // of the operands as out still reads the operand and not a half-written
    // result.
    const x = a.y * b.z - a.z * b.y;
    const y = a.z * b.x - a.x * b.z;
    const z = a.x * b.y - a.y * b.x;
    out.x = x;
    out.y = y;
    out.z = z;
    return out;
  }

  export function length(a: Vector3D) {
    return Math.hypot(a.x, a.y, a.z);
  }

  /** A vector of length zero has no direction to keep, so it is left as it is. */
  export function normalize(a: Vector3D, out = Vector3D.create()) {
    const len = Vector3D.length(a) || 1;
    out.x = a.x / len;
    out.y = a.y / len;
    out.z = a.z / len;
    return out;
  }

  export const EMPTY = Object.freeze(Vector3D.create());
}

/**********************************************************************************/
/*                                  Dimensions3D                                  */
/**********************************************************************************/

export interface Dimensions3D extends Dimensions2D {
  depth: number;
}

export namespace Dimensions3D {
  export function normalize(
    dimensions: Dimensions3D,
    out = { width: 0, height: 0, depth: 0 },
  ) {
    const max = Math.max(dimensions.width, dimensions.height, dimensions.depth);
    out.width = dimensions.width / max;
    out.height = dimensions.height / max;
    out.depth = dimensions.depth / max;
    return out;
  }

  export function equals(a: Dimensions3D, b: Dimensions3D) {
    return a.width === b.width && a.height === b.height && a.depth === b.depth;
  }
}

/**********************************************************************************/
/*                                      RGBA                                      */
/**********************************************************************************/

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export namespace RGBA {
  export function equals(a: RGBA, b: RGBA) {
    return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
  }

  export function toCSS({ r, g, b, a }: RGBA) {
    return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
  }
}

/**********************************************************************************/
/*                                      HSVA                                      */
/**********************************************************************************/

export interface HSVA {
  /** Hue in degrees, `0..360`. */
  h: number;
  /** Saturation, `0..1`. */
  s: number;
  /** Value (brightness), `0..1`. */
  v: number;
  /** Alpha, `0..1`. */
  a: number;
}

export namespace HSVA {
  function wrapHue(h: number) {
    return ((h % 360) + 360) % 360;
  }

  function clamp(value: number) {
    return Math.max(0, Math.min(1, value));
  }

  export function equals(a: HSVA, b: HSVA) {
    return a.h === b.h && a.s === b.s && a.v === b.v && a.a === b.a;
  }

  /**
   * Converts to 8-bit RGBA. Hue wraps and the other components clamp, so
   * out-of-range input can never produce out-of-range channels.
   */
  export function toRGBA(hsva: HSVA): RGBA {
    const h = wrapHue(hsva.h);
    const s = clamp(hsva.s);
    const v = clamp(hsva.v);
    const a = clamp(hsva.a);

    const chroma = v * s;
    const sector = h / 60;
    // Rises and falls across each pair of sectors, tracing the ramp between primaries.
    const ramp = chroma * (1 - Math.abs((sector % 2) - 1));
    const floor = v - chroma;

    const [r, g, b] =
      sector < 1
        ? [chroma, ramp, 0]
        : sector < 2
          ? [ramp, chroma, 0]
          : sector < 3
            ? [0, chroma, ramp]
            : sector < 4
              ? [0, ramp, chroma]
              : sector < 5
                ? [ramp, 0, chroma]
                : [chroma, 0, ramp];

    return {
      r: Math.round((r + floor) * 255),
      g: Math.round((g + floor) * 255),
      b: Math.round((b + floor) * 255),
      a: Math.round(a * 255),
    };
  }

  /**
   * Converts from 8-bit RGBA.
   *
   * The conversion is not total: every grey has no defined hue, and black has
   * no defined hue or saturation. Those components are taken from `fallback`
   * instead, so a colour passing through a degenerate point keeps the hue and
   * saturation the user last chose.
   */
  export function fromRGBA(rgba: RGBA, fallback: HSVA): HSVA {
    const r = rgba.r / 255;
    const g = rgba.g / 255;
    const b = rgba.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;

    // `max === 0` implies `chroma === 0`, so black takes both fallbacks.
    const s = max === 0 ? fallback.s : chroma / max;
    const h =
      chroma === 0
        ? fallback.h
        : wrapHue(
            60 *
              (max === r
                ? (g - b) / chroma
                : max === g
                  ? (b - r) / chroma + 2
                  : (r - g) / chroma + 4),
          );

    return { h, s, v: max, a: rgba.a / 255 };
  }

  export function toCSS(hsva: HSVA) {
    return RGBA.toCSS(toRGBA(hsva));
  }
}

export interface Bitmap {
  width: number;
  height: number;
  /** One palette index per cell, row by row. `EMPTY` where nothing is drawn. */
  data: Uint8Array;
}

export namespace Bitmap {
  /**
   * A cell with nothing drawn in it. Zero is a real palette index, so emptiness
   * needs a value of its own rather than falling out of a zero-filled array.
   */
  export const EMPTY = 255;

  export function create(width: number, height: number): Bitmap {
    const data = new Uint8Array(width * height);
    data.fill(EMPTY);
    return { width, height, data };
  }

  export function clone(bitmap: Bitmap): Bitmap {
    return {
      ...bitmap,
      data: new Uint8Array(bitmap.data),
    };
  }

  export function offset(bitmap: Bitmap, x: number, y: number): number {
    return y * bitmap.width + x;
  }

  export function contains(bitmap: Bitmap, x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < bitmap.width && y < bitmap.height;
  }

  export function get(bitmap: Bitmap, x: number, y: number): number {
    return bitmap.data[offset(bitmap, x, y)];
  }

  export function set(
    bitmap: Bitmap,
    x: number,
    y: number,
    index: number,
  ): void {
    bitmap.data[offset(bitmap, x, y)] = index;
  }

  export function isEmpty(bitmap: Bitmap, x: number, y: number): boolean {
    return get(bitmap, x, y) === EMPTY;
  }

  /**
   * Resolves every cell through the palette. `out` is reused between draws so
   * that drawing a panel does not allocate an image the size of it every frame.
   *
   * A cell naming a colour the palette does not have is drawn as empty rather
   * than throwing, so that a file written against a longer palette still opens.
   */
  export function toImageData(
    bitmap: Bitmap,
    palette: RGBA[],
    out = new ImageData(bitmap.width, bitmap.height),
  ): ImageData {
    for (let i = 0; i < bitmap.data.length; i++) {
      const colour =
        bitmap.data[i] === EMPTY ? undefined : palette[bitmap.data[i]];
      const target = i << 2;

      out.data[target + 0] = colour?.r ?? 0;
      out.data[target + 1] = colour?.g ?? 0;
      out.data[target + 2] = colour?.b ?? 0;
      out.data[target + 3] = colour === undefined ? 0 : colour.a;
    }

    return out;
  }
}

/**********************************************************************************/
/*                                   Matrix 3x3                                   */
/**********************************************************************************/

export class Matrix3x3 extends Float32Array {}

export namespace Matrix3x3 {
  export function create(
    a = 0,
    b = 0,
    c = 0,
    d = 0,
    e = 0,
    f = 0,
    g = 0,
    h = 0,
    i = 0,
  ) {
    return new Matrix3x3([a, b, c, d, e, f, g, h, i]);
  }

  /**
   * The orientation of a camera that sits at `eye` and points at `target`:
   * takes a direction written in camera space, where the camera looks down its
   * own negative z, and gives that same direction in world space.
   *
   * Its three columns are the camera's right, up and backward axes, which makes
   * it the rotation half of a camera-to-world transform — the opposite
   * direction to the one {@link Matrix4x4.lookAt} rotates in. A ray that starts
   * life in camera space and has to be followed through the world needs this
   * one; a point that starts in the world and has to be drawn needs lookAt.
   *
   * Carrying only the rotation is also what keeps it usable on a direction:
   * a direction has no position, so a camera translation must not reach it.
   */
  export function orientation(
    eye: Vector3D,
    target: Vector3D,
    up: Vector3D,
    out = Matrix3x3.create(),
  ) {
    const backward = Vector3D.normalize(Vector3D.subtract(eye, target));
    const right = Vector3D.normalize(Vector3D.cross(up, backward));
    const trueUp = Vector3D.cross(backward, right);

    // Column-major, the layout WebGL uploads: one axis per column, so each axis
    // occupies three consecutive slots.
    out[0] = right.x;
    out[1] = right.y;
    out[2] = right.z;
    out[3] = trueUp.x;
    out[4] = trueUp.y;
    out[5] = trueUp.z;
    out[6] = backward.x;
    out[7] = backward.y;
    out[8] = backward.z;
    return out;
  }

  /**
   * A turn of `angle` radians about the x axis. Negating the angle gives the
   * inverse, since undoing a turn is only turning back the other way.
   */
  export function rotationX(angle: number, out = Matrix3x3.create()) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = cos;
    out[5] = sin;
    out[6] = 0;
    out[7] = -sin;
    out[8] = cos;
    return out;
  }

  /**
   * A turn of `angle` radians about the y axis, counterclockwise seen from
   * above. Negating the angle gives the inverse, since undoing a turn is only
   * turning back the other way.
   */
  export function rotationY(angle: number, out = Matrix3x3.create()) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    out[0] = cos;
    out[1] = 0;
    out[2] = -sin;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = sin;
    out[7] = 0;
    out[8] = cos;
    return out;
  }

  export function multiply(
    a: Matrix3x3,
    b: Matrix3x3,
    out = Matrix3x3.create(),
  ) {
    const product = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let column = 0; column < 3; column++) {
      for (let row = 0; row < 3; row++) {
        product[column * 3 + row] =
          a[row] * b[column * 3] +
          a[3 + row] * b[column * 3 + 1] +
          a[6 + row] * b[column * 3 + 2];
      }
    }
    out.set(product);
    return out;
  }

  export function transform(
    matrix: Matrix3x3,
    vector: Vector3D,
    out = Vector3D.create(),
  ) {
    const x =
      matrix[0] * vector.x + matrix[3] * vector.y + matrix[6] * vector.z;
    const y =
      matrix[1] * vector.x + matrix[4] * vector.y + matrix[7] * vector.z;
    const z =
      matrix[2] * vector.x + matrix[5] * vector.y + matrix[8] * vector.z;
    out.x = x;
    out.y = y;
    out.z = z;
    return out;
  }
}
