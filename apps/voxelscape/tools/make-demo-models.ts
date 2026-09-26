// One-off generator for the rm-stacker models the built-in "Get a Snack at 4 AM"
// demo wears: its furniture and the small items lying around. Each is written
// in the rm-stacker file format — one indexed png per side and a one-row
// palette png — so it is a real model the world loads and draws. Run with
// `node --experimental-transform-types tools/make-demo-models.ts` from this app;
// it writes into `public/models/`.
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

/**
 * The palette png is always this many texels. The ray marcher samples it at
 * `(index + 0.5) / 32`, so a palette shorter than 32 would put every colour
 * under the first texel and draw the model black.
 */
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

const MODELS: Model[] = [
  // --- furniture and fixtures (drawn to world size by the prop's height) ---
  {
    name: "bed",
    size: [12, 2, 20],
    palette: [BLACK, [200, 60, 70], [230, 235, 240], [120, 80, 50]],
    front: (_x, y) => (y === 0 ? 3 : 1),
    top: 2,
  },
  {
    name: "counter",
    size: [20, 6, 8],
    palette: [BLACK, [150, 105, 70], [90, 60, 40], [220, 220, 225]],
    top: 3,
  },
  {
    name: "stove",
    size: [10, 10, 10],
    palette: [BLACK, [90, 95, 100], [40, 42, 46], [30, 30, 32]],
    top: 3,
  },
  {
    name: "fridge",
    size: [6, 12, 6],
    palette: [BLACK, [208, 214, 220], [120, 128, 136], [70, 76, 84]],
    front: (x, y) => (x === 1 && y >= 5 && y <= 8 ? 2 : 1),
    top: 3,
    bottom: 3,
  },
  {
    name: "shelf",
    size: [10, 12, 3],
    palette: [BLACK, [120, 85, 55], [230, 200, 90], [90, 60, 40]],
    front: (_x, y) => (y % 4 === 0 ? 3 : 1),
    top: 3,
  },
  {
    name: "trash",
    size: [8, 10, 8],
    palette: [BLACK, [90, 95, 100], [60, 62, 66], [40, 42, 46]],
    top: 3,
  },
  {
    name: "sofa",
    size: [16, 5, 8],
    palette: [BLACK, [70, 120, 90], [50, 90, 70], [40, 60, 50]],
    top: 2,
  },
  {
    name: "tv",
    size: [16, 10, 3],
    palette: [BLACK, [30, 32, 36], [70, 75, 82], [180, 185, 190]],
    front: (x, y) => (x >= 2 && x <= 13 && y >= 2 && y <= 7 ? 3 : 1),
  },
  {
    name: "table",
    size: [15, 6, 9],
    palette: [BLACK, [140, 100, 65], [100, 70, 45], [80, 55, 35]],
    top: 2,
  },
  {
    name: "bench",
    size: [15, 4, 4],
    palette: [BLACK, [140, 100, 65], [100, 70, 45], [80, 55, 35]],
    top: 2,
  },
  {
    name: "bathtub",
    size: [15, 6, 9],
    palette: [BLACK, [235, 238, 240], [200, 205, 210], [170, 175, 180]],
    top: 3,
  },
  {
    name: "manhole",
    size: [10, 1, 10],
    palette: [BLACK, [110, 115, 120], [70, 74, 78], [50, 52, 56]],
    top: 2,
    bottom: 3,
  },
  {
    name: "plate",
    size: [8, 1, 8],
    palette: [BLACK, [235, 238, 240], [200, 205, 210], [170, 175, 180]],
    top: 1,
    bottom: 2,
  },
  {
    name: "register",
    size: [12, 8, 8],
    palette: [BLACK, [150, 155, 160], [70, 74, 78], [40, 42, 46]],
    front: (x, y) => (x >= 2 && x <= 9 && y >= 2 && y <= 5 ? 3 : 1),
  },
  {
    name: "vending",
    size: [8, 14, 5],
    palette: [
      BLACK,
      [40, 70, 150],
      [180, 40, 50],
      [230, 232, 236],
      [30, 34, 40],
    ],
    front: (x, y) => {
      if (y === 0) return 2;
      if (x >= 1 && x <= 6 && y >= 2 && y <= 9) return 3;
      if (x >= 2 && x <= 5 && y >= 11 && y <= 12) return 4;
      return 1;
    },
    top: 2,
    bottom: 4,
  },
  {
    name: "breakfastmachine",
    size: [12, 10, 8],
    palette: [BLACK, [225, 228, 232], [60, 64, 70], [90, 175, 95]],
    front: (x, y) => {
      if (y === 0) return 3; // the green lip
      if (x >= 2 && x <= 8 && y >= 2 && y <= 6) return 2; // the window
      if (x === 10 && y >= 3 && y <= 6) return 3; // the button
      return 1;
    },
    top: 3,
    bottom: 2,
  },
  {
    name: "freezer",
    size: [14, 8, 10],
    palette: [BLACK, [200, 210, 220], [90, 130, 170], [60, 70, 80]],
    front: (x, y) => {
      if (y >= 5) return 2; // the lid
      if (x >= 5 && x <= 8 && y >= 1 && y <= 3) return 3; // the out of order sticker
      return 1;
    },
    top: 2,
    bottom: 3,
  },
  {
    name: "car",
    size: [14, 7, 28],
    palette: [BLACK, [185, 60, 60], [140, 40, 40], [30, 34, 40]],
    front: (x, y) => {
      if (y <= 1) return 2; // the sill
      if (y >= 3 && x >= 2 && x <= 11) return 3; // the glass
      return 1;
    },
    top: 1,
    bottom: 2,
  },
  {
    name: "toilet",
    size: [8, 9, 10],
    palette: [BLACK, [238, 240, 242], [200, 205, 210], [170, 175, 180]],
    front: (_x, y) => (y <= 3 ? 2 : 1),
    top: 2,
    bottom: 3,
  },
  {
    name: "tree",
    size: [12, 20, 12],
    palette: [BLACK, [95, 70, 45], [60, 125, 55], [45, 100, 45]],
    front: (x, y) => {
      if (y >= 7 && (x === 1 || x === 2 || x === 9 || x === 10)) return 2;
      if (y <= 6 && x >= 4 && x <= 7) return 1;
      return 3;
    },
    top: 2,
    bottom: 1,
  },

  // --- small items lying around ---
  {
    name: "chips",
    size: [4, 6, 3],
    palette: [BLACK, [235, 200, 60], [200, 50, 50], [120, 40, 40]],
    front: (_x, y) => (y >= 3 && y <= 4 ? 2 : 1),
  },
  {
    name: "orange",
    size: [4, 4, 4],
    palette: [BLACK, [240, 140, 30], [200, 100, 20], [70, 130, 50]],
    top: 2,
    bottom: 2,
  },
  {
    name: "colgate",
    size: [3, 7, 3],
    palette: [BLACK, [240, 242, 245], [200, 40, 50], [50, 90, 180]],
    front: (_x, y) => (y <= 2 ? 2 : 1),
  },
  {
    name: "tix",
    size: [6, 4, 1],
    palette: [BLACK, [235, 200, 60], [180, 150, 40], [120, 100, 30]],
    front: (x, y) => (x === 0 || x === 5 || y === 0 || y === 3 ? 2 : 1),
  },
  {
    name: "robux",
    size: [5, 5, 1],
    palette: [BLACK, [90, 170, 90], [60, 130, 60], [40, 90, 40]],
    front: (x, y) => (x === 0 || x === 4 || y === 0 || y === 4 ? 2 : 1),
  },
  {
    name: "cola",
    size: [3, 7, 3],
    palette: [BLACK, [200, 40, 50], [240, 242, 245], [30, 30, 34]],
    front: (_x, y) => (y >= 2 && y <= 4 ? 2 : 1),
    top: 3,
  },
  {
    name: "egg",
    size: [4, 5, 4],
    palette: [BLACK, [240, 240, 230], [245, 210, 80], [200, 200, 190]],
    top: 1,
    bottom: 3,
  },
  {
    name: "juice",
    size: [4, 8, 4],
    palette: [BLACK, [240, 150, 40], [250, 220, 120], [200, 110, 20]],
    front: (_x, y) => (y >= 5 ? 3 : 1),
    top: 2,
  },
  {
    name: "milk",
    size: [4, 8, 4],
    palette: [BLACK, [240, 242, 245], [90, 150, 210], [200, 205, 210]],
    front: (_x, y) => (y >= 5 ? 2 : 1),
    top: 3,
  },
  {
    name: "witchbrew",
    size: [4, 8, 4],
    palette: [BLACK, [60, 40, 90], [120, 60, 190], [90, 60, 30]],
    front: (_x, y) => (y >= 5 ? 2 : 1),
    top: 3,
  },
  {
    name: "hotbrew",
    size: [4, 8, 4],
    palette: [BLACK, [110, 70, 40], [190, 130, 60], [90, 60, 30]],
    front: (_x, y) => (y >= 5 ? 2 : 1),
    top: 3,
  },
  {
    name: "icecream",
    size: [6, 6, 6],
    palette: [BLACK, [235, 235, 240], [255, 200, 210], [120, 90, 160]],
    front: (_x, y) => (y >= 4 ? 2 : 3),
    top: 2,
    bottom: 3,
  },
  {
    name: "candy",
    size: [6, 4, 3],
    palette: [BLACK, [240, 120, 40], [200, 80, 30], [250, 200, 80]],
    front: (x) => (x <= 1 || x >= 4 ? 3 : 1),
  },
  {
    name: "fuel",
    size: [7, 8, 4],
    palette: [BLACK, [190, 50, 45], [140, 35, 32], [40, 40, 44]],
    front: (x, y) => {
      if (y >= 6) return 2; // the cap
      if (x >= 1 && x <= 5 && y >= 1 && y <= 4) return 3; // the label
      return 1;
    },
    top: 2,
  },
  {
    name: "patty",
    size: [8, 6, 8],
    palette: [
      BLACK,
      [215, 160, 70],
      [120, 70, 40],
      [90, 150, 60],
      [240, 230, 200],
    ],
    front: (_x, y) => {
      if (y >= 4) return 1; // the top bun
      if (y === 3) return 3; // the lettuce
      if (y === 2) return 2; // the patty
      return 4; // the bottom bun
    },
    top: 1,
    bottom: 4,
  },
  {
    name: "sandvich",
    size: [8, 6, 8],
    palette: [BLACK, [235, 205, 140], [90, 140, 60], [200, 90, 60]],
    front: (_x, y) => {
      if (y >= 4) return 1; // the top slice
      if (y === 3) return 2; // the lettuce
      if (y === 2) return 3; // the tomato
      return 1; // the bottom slice
    },
    top: 1,
    bottom: 1,
  },
  {
    name: "sword",
    size: [3, 14, 1],
    palette: [
      BLACK,
      [200, 205, 215],
      [140, 145, 155],
      [110, 70, 40],
      [220, 190, 70],
    ],
    front: (x, y) => {
      if (y >= 3) return x === 1 ? 2 : 1; // the blade
      if (y === 2) return 4; // the guard
      return 3; // the grip
    },
  },
];

for (const model of MODELS) {
  await writeModel(model);
}
