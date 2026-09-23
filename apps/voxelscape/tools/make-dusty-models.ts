// One-off generator for `gas-pump.zip`, the rm-stacker model the built-in
// "A Dusty Trip" demo stands at its petrol stations. Written in the same
// indexed-png format `make-demo-models.ts` uses — one png per side and a
// one-row palette png. Run with
// `node --experimental-transform-types tools/make-dusty-models.ts` from this
// app; it writes into `public/models/`.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encode } from "fast-png";
import JSZip from "jszip";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "public", "models");
mkdirSync(out, { recursive: true });

type RGB = [number, number, number];
type Painter = (x: number, y: number) => number;

/** The palette png is always this many texels; the ray marcher samples it at 32. */
const PALETTE_LENGTH = 32;

interface Model {
  name: string;
  /** Voxel extents, in the order width (x), height (y), depth (z). */
  size: [number, number, number];
  /** Index 0 is unused; every drawn cell names an index from 1 up. */
  palette: RGB[];
  /** Paint the front side; other sides use index 1 unless `top`/`bottom` say. */
  front?: Painter;
  top?: number;
  bottom?: number;
}

const sideBitmap = (
  width: number,
  height: number,
  index: number,
  paint?: Painter,
) => {
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data[y * width + x] = paint?.(x, y) ?? index;
    }
  }
  return { width, height, data };
};

const palettePng = (palette: RGB[]): Uint8Array => {
  const data = new Uint8Array(PALETTE_LENGTH * 4);
  for (let i = 0; i < PALETTE_LENGTH; i++) {
    const [r, g, b] = palette[i] ?? [0, 0, 0];
    const at = i << 2;
    data[at] = r;
    data[at + 1] = g;
    data[at + 2] = b;
    data[at + 3] = 255;
  }
  return encode({
    width: PALETTE_LENGTH,
    height: 1,
    data,
    channels: 4,
    depth: 8,
  });
};

const writeModel = async (model: Model): Promise<void> => {
  const [w, h, d] = model.size;
  const top = model.top ?? 1;
  const bottom = model.bottom ?? 1;
  const zip = new JSZip();
  const sides = {
    front: sideBitmap(w, h, 1, model.front),
    back: sideBitmap(w, h, 1),
    left: sideBitmap(d, h, 1),
    right: sideBitmap(d, h, 1),
    top: sideBitmap(w, d, top),
    bottom: sideBitmap(w, d, bottom),
  };
  for (const [kind, bitmap] of Object.entries(sides)) {
    zip.file(
      `${kind}.png`,
      encode({
        width: bitmap.width,
        height: bitmap.height,
        data: bitmap.data,
        channels: 1,
        depth: 8,
      }),
    );
  }
  zip.file("palette.png", palettePng(model.palette));
  writeFileSync(
    join(out, `${model.name}.zip`),
    await zip.generateAsync({ type: "uint8array" }),
  );
  console.log(`wrote ${model.name}.zip`);
};

const BLACK: RGB = [0, 0, 0];
const STEEL: RGB = [120, 126, 132];
const STEEL_DARK: RGB = [70, 74, 80];
const RED: RGB = [190, 55, 50];
const RED_DARK: RGB = [140, 35, 32];
const GLASS: RGB = [200, 225, 235];
const BRASS: RGB = [220, 180, 70];

const MODELS: Model[] = [
  // A pump: a red-capped steel cabinet standing on a darker base, with a pale
  // display and a hose down one side.
  {
    name: "gas-pump",
    size: [5, 9, 4],
    palette: [BLACK, STEEL, STEEL_DARK, GLASS, RED, RED_DARK, BRASS],
    front: (x, y) => {
      if (y === 0) return 2;
      if (x >= 1 && x <= 3 && y >= 5 && y <= 7) return 3;
      if (x === 3 && y >= 1 && y <= 4) return 6;
      if (y === 8) return 4;
      return 1;
    },
    top: 4,
    bottom: 2,
  },
];

for (const model of MODELS) {
  await writeModel(model);
}
