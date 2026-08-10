import { SIDE_MASK } from "./constants";
import { Vector2D } from "./maths";
import { Origins, RGBA, Sides } from "./types";

export function tryCatch<T, U>(fn: () => T, onError: (error: unknown) => U) {
  try {
    return fn();
  } catch (error) {
    return onError(error);
  }
}

export function keysOf<T extends Record<string, any>>(object: T): Array<keyof T> {
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

export function byteTo2DigitHex(byte: number): string {
  let hex = byte.toString(16);
  if (hex.length === 1) {
    return `0${hex}`;
  }
  return hex;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  var binary = "";
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  var binary = atob(base64);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function hexToRgba(hex: string, alpha = 1): RGBA {
  const digits = hex.replace("#", "");

  // Expand shorthand notation: #rgb and #rgba.
  const expanded =
    digits.length > 4
      ? digits
      : digits
          .split("")
          .map(digit => digit + digit)
          .join("");

  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  const a = expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) : 255;

  const rgba = { r, g, b, a };

  return rgba;
}

export function areRGBAsEqual(a: RGBA, b: RGBA) {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

export function sideMaskToRGBA(mask: number, intensity = 1) {
  const r = SIDE_MASK.front & mask ? 255 * intensity : 0;
  const g = SIDE_MASK.left & mask ? 255 * intensity : 0;
  const b = SIDE_MASK.top & mask ? 255 * intensity : 0;
  return `rgba(${r}, ${g}, ${b}, 1)`;
}

export function findCollidingSide({
  origins,
  position,
  sides,
}: {
  origins: Origins;
  position: Vector2D;
  sides: Sides;
}) {
  for (const kind of keysOf(sides)) {
    const origin = origins[kind];
    const side = sides[kind];
    const relativePosition = Vector2D.sub(position, origin);

    if (
      relativePosition.x >= 0 &&
      relativePosition.y >= 0 &&
      relativePosition.x < side.width &&
      relativePosition.y < side.height
    ) {
      return { side, origin, kind, relativePosition };
    }
  }
}

export function getOffset({
  side,
  origin,
  position,
}: {
  side: ImageData;
  origin: Vector2D;
  position: Vector2D;
}) {
  const localPosition = Vector2D.sub(position, origin);
  const offset = (localPosition.y * side.width + localPosition.x) << 2;
  return offset;
}

export function getColourFromOffset({ side, offset }: { side: ImageData; offset: number }): RGBA {
  const r = side.data[offset + 0];
  const g = side.data[offset + 1];
  const b = side.data[offset + 2];
  const a = side.data[offset + 3];
  return { r, g, b, a };
}

export function findColour({
  origins,
  position,
  sides,
}: {
  position: Vector2D;
  sides: Sides;
  origins: Origins;
}) {
  const result = findCollidingSide({ position, sides, origins });

  if (!result) {
    return false;
  }

  const { origin, side } = result;

  const offset = getOffset({ side, origin, position: position });

  return getColourFromOffset({ side, offset });
}
