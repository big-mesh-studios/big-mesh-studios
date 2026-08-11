import { createSignal, onCleanup } from "solid-js";
import { SIDE_MASK } from "./constants";
import { Vector2D } from "./maths";
import { RGBA, SidePositions, Sides } from "./types";

/**********************************************************************************/
/*                                      Misc                                      */
/**********************************************************************************/

export function tryCatch<T, U>(fn: () => T): T | undefined;
export function tryCatch<T, U>(fn: () => T, onError: (error: unknown) => U): T | U;
export function tryCatch<T, U>(fn: () => T, onError?: (error: unknown) => U): T | U | undefined {
  try {
    return fn();
  } catch (error) {
    return onError?.(error);
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

export function inertExceptFor(exempt: HTMLElement) {
  const queue: Array<Element> = [document.body];

  const inerted = new Set<HTMLElement>();

  let current;
  while ((current = queue.shift())) {
    if (current === exempt) {
      continue;
    }

    if (current instanceof HTMLElement && !current.contains(exempt) && !current.inert) {
      current.inert = true;
      inerted.add(current);
    }

    queue.push(...current.children);
  }

  return () =>
    inerted.forEach(element => {
      element.inert = false;
    });
}

export function createMediaQuery(query: string) {
  const mediaQuery = window.matchMedia(query);
  const controller = new AbortController();

  const [bool, setBool] = createSignal(handleDeviceChange(mediaQuery));

  function handleDeviceChange(event: MediaQueryList | MediaQueryListEvent) {
    if (event.matches) {
      return true;
    } else {
      return false;
    }
  }

  mediaQuery.addEventListener("change", event => setBool(handleDeviceChange(event)), {
    signal: controller.signal,
  });

  onCleanup(() => controller.abort());

  return bool;
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

/**********************************************************************************/
/*                                      RGBA                                      */
/**********************************************************************************/

export function areRGBAsEqual(a: RGBA, b: RGBA) {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

const PASTEL = 150;
const INTENSITY = 0.75;

export function sideMaskToCSS(mask: number) {
  const r = (SIDE_MASK.front & mask ? 255 : PASTEL) * INTENSITY;
  const g = (SIDE_MASK.left & mask ? 255 : PASTEL) * INTENSITY;
  const b = (SIDE_MASK.top & mask ? 255 : PASTEL) * INTENSITY;
  return `rgb(${r}, ${g}, ${b})`;
}

export function rgbaToCSS({ r, g, b, a = 1 }: RGBA): `rgba(${string})` {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**********************************************************************************/
/*                                  Intersection                                  */
/**********************************************************************************/

function getOffset(side: ImageData, position: Vector2D) {
  // Round each axis down on its own. Rounding only the finished sum would let a
  // fraction on the vertical axis, multiplied by the width, spill into the
  // horizontal one and pick a pixel further along the same row.
  return (Math.floor(position.y) * side.width + Math.floor(position.x)) << 2;
}

function getColourFromOffset(side: ImageData, offset: number): RGBA {
  const r = side.data[offset + 0];
  const g = side.data[offset + 1];
  const b = side.data[offset + 2];
  const a = side.data[offset + 3];
  return { r, g, b, a };
}

export function intersectSide({
  sidePosition,
  position,
  side,
}: {
  sidePosition: Vector2D;
  position: Vector2D;
  side: ImageData;
}) {
  const relativePosition = Vector2D.sub(position, sidePosition);
  if (
    relativePosition.x >= 0 &&
    relativePosition.y >= 0 &&
    relativePosition.x < side.width &&
    relativePosition.y < side.height
  ) {
    const offset = getOffset(side, relativePosition);
    const colour = getColourFromOffset(side, offset);

    return {
      relativePosition,
      side,
      offset,
      colour,
    };
  }
}

export function intersectSides({
  sidePositions,
  position,
  sides,
}: {
  sidePositions: SidePositions;
  position: Vector2D;
  sides: Sides;
}) {
  for (const kind of keysOf(sides)) {
    const sidePosition = sidePositions[kind];
    const side = sides[kind];
    const relativePosition = Vector2D.sub(position, sidePosition);

    if (
      relativePosition.x >= 0 &&
      relativePosition.y >= 0 &&
      relativePosition.x < side.width &&
      relativePosition.y < side.height
    ) {
      const offset = getOffset(side, relativePosition);
      const colour = getColourFromOffset(side, offset);

      return {
        kind,
        sidePosition,
        relativePosition,
        side,
        offset,
        colour,
      };
    }
  }
}
