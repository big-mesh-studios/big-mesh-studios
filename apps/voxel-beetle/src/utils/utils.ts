import { Bitmap, RGBA, Vector2D } from "@big-mesh-studios/maths";

/**********************************************************************************/
/*                                      Misc                                      */
/**********************************************************************************/

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

export function rgbaToCSS({ r, g, b, a = 1 }: RGBA): `rgba(${string})` {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
