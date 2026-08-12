import { Dimensions2D } from "./types";

export interface Vector2D {
  x: number;
  y: number;
}

export namespace Vector2D {
  export function round(a: Vector2D, out = { x: 0, y: 0 }) {
    out.x = Math.round(a.x - 0.5);
    out.y = Math.round(a.y - 0.5);
    return out;
  }

  export function sub(a: Vector2D, b: Vector2D, out = { x: 0, y: 0 }) {
    out.x = a.x - b.x;
    out.y = a.y - b.y;
    return out;
  }

  export function add(a: Vector2D, b: Vector2D, out = { x: 0, y: 0 }) {
    out.x = a.x + b.x;
    out.y = a.y + b.y;
    return out;
  }

  export function multiply(a: Vector2D, b: Vector2D, out = { x: 0, y: 0 }) {
    out.x = a.x * b.x;
    out.y = a.y * b.y;
    return out;
  }

  export function multiplyScalar(a: Vector2D, scalar: number, out = { x: 0, y: 0 }) {
    out.x = a.x * scalar;
    out.y = a.y * scalar;
    return out;
  }
}

/**********************************************************************************/
/*                                  Dimensions3D                                  */
/**********************************************************************************/

export interface Dimensions3D extends Dimensions2D {
  depth: number;
}

export namespace Dimensions3D {
  export function normalize(dimensions: Dimensions3D, out = { width: 0, height: 0, depth: 0 }) {
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

  export function offset(bitmap: Bitmap, x: number, y: number): number {
    return y * bitmap.width + x;
  }

  export function contains(bitmap: Bitmap, x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < bitmap.width && y < bitmap.height;
  }

  export function get(bitmap: Bitmap, x: number, y: number): number {
    return bitmap.data[offset(bitmap, x, y)];
  }

  export function set(bitmap: Bitmap, x: number, y: number, index: number): void {
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
      const colour = bitmap.data[i] === EMPTY ? undefined : palette[bitmap.data[i]];
      const target = i << 2;

      out.data[target + 0] = colour?.r ?? 0;
      out.data[target + 1] = colour?.g ?? 0;
      out.data[target + 2] = colour?.b ?? 0;
      out.data[target + 3] = colour === undefined ? 0 : colour.a;
    }

    return out;
  }
}
