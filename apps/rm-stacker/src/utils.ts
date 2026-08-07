import { Coordinates, SideKind, Sides } from "./types";

export function tryCatch<T, U>(fn: () => T, onError: (error: unknown) => U) {
  try {
    return fn();
  } catch (error) {
    return onError(error);
  }
}

export const findCollidingSide = (
  position: { x: number; y: number },
  sides: Sides,
  coordinates: Coordinates,
) => {
  for (const kind in sides) {
    const coordinate = coordinates[kind as SideKind];
    const side = sides[kind as SideKind];
    if (
      coordinate.x <= position.x &&
      coordinate.y <= position.y &&
      coordinate.x + side.width > position.x &&
      coordinate.y + side.height > position.y
    ) {
      return { side, coordinate, kind: kind as SideKind };
    }
  }
};

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

