// One-off generator for the stand-in roster models the built-in "Baldi's Basics
// in Education and Learning" demo wears: the broom, the jump-rope girl, the
// principal, the puppet, and the prize robot. Written in the same
// indexed-png format `make-dusty-models.ts` uses — one png per side and a
// one-row palette png. Run with
// `node --experimental-transform-types tools/make-baldi-models.ts` from this
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
const WOOD: RGB = [150, 110, 60];
const BRISTLE: RGB = [210, 180, 80];
const CAP: RGB = [60, 80, 160];
const DARK: RGB = [40, 40, 40];
const DRESS: RGB = [70, 100, 190];
const SKIN: RGB = [235, 190, 150];
const HAIR: RGB = [200, 120, 60];
const SHOE: RGB = [50, 40, 40];
const SUIT: RGB = [50, 50, 60];
const SHIRT: RGB = [235, 235, 235];
const TIE: RGB = [160, 40, 40];
const GREYHAIR: RGB = [60, 45, 35];
const NOSE: RGB = [200, 60, 50];
const BOW: RGB = [120, 40, 140];
const METAL: RGB = [150, 155, 165];
const VISOR: RGB = [60, 120, 180];
const RED: RGB = [200, 60, 50];
const YELLOW: RGB = [230, 200, 70];

const MODELS: Model[] = [
  // Gotta Sweep: a broom — bristles splayed at the foot of a slim handle,
  // topped by a cap.
  {
    name: "npc-sweep",
    size: [3, 12, 2],
    palette: [BLACK, WOOD, BRISTLE, CAP, DARK],
    front: (_x, y) => {
      if (y <= 2) return 2;
      if (y === 11) return 3;
      return 1;
    },
    top: 3,
    bottom: 2,
  },
  // Playtime: a girl in a dress, hair over a pale face.
  {
    name: "npc-playtime",
    size: [4, 10, 3],
    palette: [BLACK, DRESS, SKIN, HAIR, SHOE],
    front: (x, y) => {
      if (y === 0) return 4;
      if (y <= 5) return 1;
      if (y === 6) return 2;
      if (y >= 9) return 3;
      return x >= 1 && x <= 2 ? 2 : 3;
    },
    top: 3,
    bottom: 4,
  },
  // The Principal: a suit with a tie, greying hair.
  {
    name: "npc-principal",
    size: [4, 11, 3],
    palette: [BLACK, SUIT, SKIN, SHIRT, TIE, GREYHAIR, SHOE],
    front: (x, y) => {
      if (y === 0) return 6;
      if (y <= 5) {
        if (y >= 3 && x === 2) return 4;
        return 1;
      }
      if (y === 6) return 2;
      if (y >= 9) return 5;
      return x === 0 ? 5 : 2;
    },
    top: 5,
    bottom: 6,
  },
  // The Puppet: a wooden marionette with a red nose and a bow tie.
  {
    name: "npc-puppet",
    size: [4, 10, 3],
    palette: [BLACK, WOOD, NOSE, DARK, BOW],
    front: (x, y) => {
      if (y === 5) return 4;
      if (y >= 7) {
        if (y <= 8 && (x === 1 || x === 2)) return 3;
        if (y === 7 && x === 3) return 2;
        return 1;
      }
      return 1;
    },
    top: 1,
    bottom: 1,
  },
  // 1st Prize: a boxy robot on treads, with a visor band and a warning light.
  {
    name: "npc-prize",
    size: [5, 10, 4],
    palette: [BLACK, METAL, DARK, VISOR, RED, YELLOW],
    front: (x, y) => {
      if (y <= 1) return 2;
      if (y <= 8) {
        if (y === 7 && x === 2) return 4;
        if (y >= 5) return 3;
        return 1;
      }
      return 5;
    },
    top: 5,
    bottom: 2,
  },
];

for (const model of MODELS) {
  await writeModel(model);
}
