import { RGBA } from "./rgba";

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
