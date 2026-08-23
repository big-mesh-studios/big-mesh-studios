import { RGBA } from "../../maths";

/** Packs a palette into the RGBA8 bytes a palette texture uploads. */
export function paletteToBytes(palette: RGBA[]): Uint8Array {
  const data = new Uint8Array(palette.length * 4);
  palette.forEach(({ r, g, b, a }, i) => {
    const offset = i << 2;
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = a;
  });
  return data;
}
