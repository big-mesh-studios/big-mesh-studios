import { SIDE_MASK } from "../constants";
import { Bitmap, RGBA, Vector2D } from "@big-mesh-studios/maths";

/**********************************************************************************/
/*                                      Misc                                      */
/**********************************************************************************/

export function tryCatch<T, U>(fn: () => T): T | undefined;
export function tryCatch<T, U>(
  fn: () => T,
  onError: (error: unknown) => U,
): T | U;
export function tryCatch<T, U>(
  fn: () => T,
  onError?: (error: unknown) => U,
): T | U | undefined {
  try {
    return fn();
  } catch (error) {
    return onError?.(error);
  }
}

export function keysOf<T extends Record<string, any>>(
  object: T,
): Array<keyof T> {
  return Object.keys(object);
}

export function createEnqueue<T>() {
  let queue: Promise<unknown> = Promise.resolve();
  return function (task: () => Promise<T>): Promise<T> {
    const result = queue.then(task);
    queue = result;
    return result;
  };
}

export function screenToWorld(
  screenPosition: Vector2D,
  pan: Vector2D,
  scale: number,
  out = { ...screenPosition },
): Vector2D {
  Vector2D.multiplyScalar(screenPosition, 1.0 / scale, out);
  Vector2D.add(out, pan, out);
  return out;
}

/**********************************************************************************/
/*                                    Convert                                     */
/**********************************************************************************/

export function byteTo2DigitHex(byte: number): string {
  let hex = byte.toString(16);
  if (hex.length === 1) {
    return `0${hex}`;
  }
  return hex;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  var binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function hexToRgba(hex: string): RGBA {
  const digits = hex.replace("#", "");

  // Expand shorthand notation: #rgb and #rgba.
  const expanded =
    digits.length > 4
      ? digits
      : digits
          .split("")
          .map((digit) => digit + digit)
          .join("");

  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  const a = expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) : 255;

  const rgba = { r, g, b, a };

  return rgba;
}

/**********************************************************************************/
/*                                      RGBA                                      */
/**********************************************************************************/

const PASTEL = 150;
const INTENSITY = 0.75;

/** What a side's mask is drawn in, as three channels from 0 to 255. */
function sideMaskChannels(mask: number) {
  return {
    r: (SIDE_MASK.front & mask ? 255 : PASTEL) * INTENSITY,
    g: (SIDE_MASK.left & mask ? 255 : PASTEL) * INTENSITY,
    b: (SIDE_MASK.top & mask ? 255 : PASTEL) * INTENSITY,
  };
}

export function sideMaskToCSS(mask: number) {
  const { r, g, b } = sideMaskChannels(mask);
  return `rgb(${r}, ${g}, ${b})`;
}

/** The same colour as `sideMaskToCSS`, as the one number a material is given. */
export function sideMaskToHex(mask: number) {
  const { r, g, b } = sideMaskChannels(mask);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

export function rgbaToCSS({ r, g, b, a = 1 }: RGBA): `rgba(${string})` {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**********************************************************************************/
/*                                  Intersection                                  */
/**********************************************************************************/

export function intersectSide({
  position,
  side,
}: {
  position: Vector2D;
  side: Bitmap;
}) {
  // Round each axis down on its own. Rounding only the finished sum would let a
  // fraction on the vertical axis, multiplied by the width, spill into the
  // horizontal one and pick a cell further along the same row.
  const x = Math.floor(position.x);
  const y = Math.floor(position.y);

  if (!Bitmap.contains(side, x, y)) {
    return;
  }

  const offset = Bitmap.offset(side, x, y);

  return {
    position,
    side,
    offset,
    index: side.data[offset],
  };
}
