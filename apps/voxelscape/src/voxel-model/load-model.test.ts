// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { encode } from "fast-png";
import JSZip from "jszip";
import { loadModel } from "./load-model";

const SIDES = ["front", "back", "left", "right", "top", "bottom"] as const;

const PALETTE_RGBA: number[][] = Array.from({ length: 32 }, (_, i) => [
  i,
  i,
  i,
  255,
]);

const palettePng = (): Uint8Array => {
  const data = new Uint8Array(32 * 4);
  for (let i = 0; i < 32; i++) {
    data[i * 4] = i;
    data[i * 4 + 1] = i;
    data[i * 4 + 2] = i;
    data[i * 4 + 3] = 255;
  }
  return encode({ width: 32, height: 1, data, channels: 4 });
};

const zipWith = async (sides: Uint8Array[]): Promise<Blob> => {
  const zip = new JSZip();
  SIDES.forEach((kind, i) => zip.file(`${kind}.png`, sides[i]));
  zip.file("palette.png", palettePng());
  return zip.generateAsync({ type: "blob" });
};

describe("loadModel", () => {
  it("reads index-drawn side PNGs and the palette from a model zip", async () => {
    const side = encode({
      width: 3,
      height: 3,
      data: new Uint8Array(9).fill(1),
      channels: 1,
      palette: PALETTE_RGBA,
    });
    const model = await loadModel(await zipWith(SIDES.map(() => side)));

    expect(model.dimensions).toEqual({ width: 3, height: 3, depth: 3 });
    expect(model.sides.front.width).toBe(3);
    expect([...model.sides.front.data]).toEqual(new Array(9).fill(1));
    expect([...model.sides.back.data]).toEqual(new Array(9).fill(1));
    expect(model.palette).toHaveLength(32);
    expect(model.palette[1]).toEqual({ r: 1, g: 1, b: 1, a: 255 });
  });

  it("migrates colour-drawn side PNGs onto the palette", async () => {
    // every pixel is colour (1,1,1), which occupies palette slot 1
    const colour = new Uint8Array(3 * 3 * 4);
    for (let p = 0; p < 9; p++) {
      colour[p * 4] = 1;
      colour[p * 4 + 1] = 1;
      colour[p * 4 + 2] = 1;
      colour[p * 4 + 3] = 255;
    }
    const side = encode({ width: 3, height: 3, data: colour, channels: 4 });
    const model = await loadModel(await zipWith(SIDES.map(() => side)));

    expect(model.dimensions).toEqual({ width: 3, height: 3, depth: 3 });
    expect([...model.sides.front.data]).toEqual(new Array(9).fill(1));
  });
});
