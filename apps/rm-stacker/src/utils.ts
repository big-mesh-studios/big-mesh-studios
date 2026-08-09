import { SIDE_MASK } from "./constants";
import { Coordinates, Dimensions3D, RGBA, Sides, Vector2D } from "./types";

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

export function areDimensions3DEqual(a: Dimensions3D, b: Dimensions3D) {
  return a.width === b.width && a.height === b.height && a.depth === b.depth;
}

export function sideMaskToRGBA(mask: number, intensity = 1) {
  const r = SIDE_MASK.front & mask ? 255 * intensity : 0;
  const g = SIDE_MASK.left & mask ? 255 * intensity : 0;
  const b = SIDE_MASK.top & mask ? 255 * intensity : 0;
  return `rgba(${r}, ${g}, ${b}, 1)`;
}

export function findRelativePosition(position: { x: number; y: number }, coordinate: Vector2D) {
  return {
    x: position.x - coordinate.x,
    y: position.y - coordinate.y,
  };
}

export function findCollidingSide({
  coordinates,
  position,
  sides,
}: {
  coordinates: Coordinates;
  position: Vector2D;
  sides: Sides;
}) {
  for (const kind of keysOf(sides)) {
    const coordinate = coordinates[kind];
    const side = sides[kind];
    const relativePosition = findRelativePosition(position, coordinate);

    if (
      relativePosition.x >= 0 &&
      relativePosition.y >= 0 &&
      relativePosition.x < side.width &&
      relativePosition.y < side.height
    ) {
      return { side, coordinate, kind, relativePosition };
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
  const localPosition = {
    x: position.x - origin.x,
    y: position.y - origin.y,
  };
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
  coordinates,
  position,
  sides,
}: {
  position: Vector2D;
  sides: Sides;
  coordinates: Coordinates;
}) {
  const result = findCollidingSide({ position, sides, coordinates });

  if (!result) {
    return false;
  }

  const { coordinate: origin, side } = result;

  const offset = getOffset({ side, origin, position: position });

  return getColourFromOffset({ side, offset });
}

export function roundVector2D(vector: Vector2D) {
  return {
    x: Math.round(vector.x - 0.5),
    y: Math.round(vector.y - 0.5),
  };
}
