// One-off generator for the rm-stacker models the built-in "Don't Poop
// Yourself at School" demo wears: the lobby's soap pickup and the hazard sign
// on the second pad. Props are written in the indexed-png format
// `make-demo-models.ts` uses. Run with
// `node --experimental-transform-types tools/make-obby-models.ts` from this
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

/** The palette png is always this many texels; the ray marcher samples it at 32. */
const PALETTE_LENGTH = 32;

type Painter = (x: number, y: number) => number;

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
const SOAP: RGB = [120, 200, 235];
const SOAP_DARK: RGB = [70, 150, 195];
const YELLOW: RGB = [235, 200, 50];
const DARK_YELLOW: RGB = [180, 150, 30];
const WOOD: RGB = [140, 100, 65];
const DARK_WOOD: RGB = [100, 70, 45];
const PAPER: RGB = [235, 235, 225];
const PAPER_DARK: RGB = [190, 190, 180];

const MODELS: Model[] = [
  {
    name: "soap",
    size: [5, 3, 3],
    palette: [BLACK, SOAP, SOAP_DARK, [240, 245, 250]],
    front: (x, y) => (x === 0 || x === 4 ? 2 : y === 1 ? 3 : 1),
    top: 1,
    bottom: 2,
  },
  {
    name: "wet-floor",
    size: [8, 12, 4],
    palette: [BLACK, YELLOW, DARK_YELLOW, [40, 40, 46]],
    front: (x, y) =>
      x >= 2 && x <= 5 && y >= 4 && y <= 7 ? 3 : x % 2 === 0 ? 2 : 1,
    top: 1,
    bottom: 2,
  },
  {
    name: "platform",
    size: [12, 2, 12],
    palette: [BLACK, WOOD, DARK_WOOD, [180, 140, 90]],
    top: 3,
    bottom: 2,
  },
  {
    name: "toilet-roll",
    size: [6, 6, 6],
    palette: [BLACK, PAPER, PAPER_DARK, [150, 140, 120]],
    front: (x, y) => (x >= 2 && x <= 3 && y >= 2 && y <= 3 ? 3 : 1),
    top: 1,
    bottom: 1,
  },
];

for (const model of MODELS) {
  await writeModel(model);
}
