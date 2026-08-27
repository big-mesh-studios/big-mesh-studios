import type { RGB } from "./types";

export function equals(a: RGB, b: RGB) {
  return a.r === b.r && a.g === b.g && a.b === b.b;
}

export function fromHex(
  hex: number | `0x${string}`,
  out = { r: 0, g: 0, b: 0 },
) {
  const value = typeof hex === "number" ? hex : Number(hex);

  if (!Number.isInteger(value) || value < 0 || value > 0xffffff) {
    throw new Error(`${hex} is not a valid 24-bit hex colour`);
  }

  out.r = (value >> 16) & 0xff;
  out.g = (value >> 8) & 0xff;
  out.b = value & 0xff;

  return out;
}

export function toCSS({ r, g, b }: RGB) {
  return `rgb(${r}, ${g}, ${b})`;
}
