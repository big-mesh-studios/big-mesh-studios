import type { RGBA } from "./types";

export function equals(a: RGBA, b: RGBA) {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

export function toCSS({ r, g, b, a }: RGBA) {
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
}
