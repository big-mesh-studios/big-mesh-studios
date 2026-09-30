// One-off generator for the stand-in model files the built-in "Cube Cavern"
// demo wears: the yellow dungeon's bestiary, its ninja boss, and the props the
// caverns and the hub stand — chests, coins, keys, torches, the crafting
// table, the life plant, a hat, and a sign. Written in the same indexed-png
// format `make-baldi-models.ts` uses — one png per side and a one-row palette
// png, cells naming palette indices rather than colours. Run with
// `node --experimental-transform-types tools/make-cube-cavern-models.ts` from
// this app; it writes into `public/models/`.
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
const YELLOW: RGB = [235, 205, 60];
const YELLOW_DARK: RGB = [170, 140, 25];
const ORANGE: RGB = [225, 150, 45];
const RED: RGB = [190, 55, 50];
const RED_DARK: RGB = [130, 30, 28];
const GREEN: RGB = [90, 165, 70];
const GREEN_DARK: RGB = [55, 110, 45];
const BROWN: RGB = [120, 80, 45];
const BROWN_DARK: RGB = [80, 52, 28];
const BRASS: RGB = [215, 175, 70];
const GOLD: RGB = [245, 200, 60];
const STEEL: RGB = [120, 126, 132];
const STEEL_DARK: RGB = [70, 74, 80];
const WHITE: RGB = [235, 235, 230];
const SKIN: RGB = [225, 190, 150];

const MODELS: Model[] = [
  // Yellowhand: a splayed yellow claw of a hand, three fingers above a palm,
  // with a single pale eye set in the heel. Palette: 1 yellow, 2 dark yellow,
  // 3 white, 4 dark red.
  {
    name: "cave-yellowhand",
    size: [6, 8, 4],
    palette: [BLACK, YELLOW, YELLOW_DARK, WHITE, RED_DARK],
    front: (x, y) => {
      if (y >= 5) {
        if (x === 0 || x === 5) return 0;
        if (y === 7) return 3;
        return x === 1 || x === 4 ? 2 : 1;
      }
      if (y === 4) return 2;
      if (y >= 2) return 1;
      if (y === 1 && x >= 2 && x <= 3) return 3;
      return y === 0 ? 2 : 1;
    },
    top: 2,
    bottom: 2,
  },
  // Wormle: a segmented green worm, banded darker toward the head. Palette:
  // 1 green, 2 dark green, 3 white.
  {
    name: "cave-wormle",
    size: [4, 8, 4],
    palette: [BLACK, GREEN, GREEN_DARK, WHITE],
    front: (x, y) => {
      if (y >= 6) return 3;
      if (y === 5) return x >= 1 && x <= 2 ? 0 : 2;
      return y % 2 === 0 ? 1 : 2;
    },
    top: 2,
    bottom: 2,
  },
  // Poopie: a squat brown mound with a telltale swirl. Palette: 1 brown,
  // 2 dark brown, 3 white.
  {
    name: "cave-poopie",
    size: [5, 6, 5],
    palette: [BLACK, BROWN, BROWN_DARK, WHITE],
    front: (x, y) => {
      if (y <= 1) return 2;
      if (y === 3 && x === 2) return 2;
      if (y === 4 && x >= 1 && x <= 3) return 2;
      return 1;
    },
    top: 2,
    bottom: 2,
  },
  // Chik: a yellow chick with a red comb and an orange beak. Palette: 1 yellow,
  // 2 red, 3 orange, 4 white.
  {
    name: "cave-chik",
    size: [5, 8, 4],
    palette: [BLACK, YELLOW, RED, ORANGE, WHITE],
    front: (x, y) => {
      if (y === 7) return 2;
      if (y === 6) return x >= 1 && x <= 3 ? 1 : 2;
      if (y === 5) return x === 1 ? 0 : 1;
      if (y === 4) return x === 1 ? 0 : x === 2 ? 3 : 1;
      if (y === 3) return x >= 1 && x <= 3 ? 3 : 1;
      return 1;
    },
    top: 2,
    bottom: 3,
  },
  // Megachik: the yellow dungeon's rare brute, a broad chick twice the bulk.
  // Palette: 1 yellow, 2 red, 3 orange, 4 white, 5 dark yellow.
  {
    name: "cave-megachik",
    size: [8, 12, 6],
    palette: [BLACK, YELLOW, RED, ORANGE, WHITE, YELLOW_DARK],
    front: (x, y) => {
      if (y === 11) return 2;
      if (y === 10) return x >= 2 && x <= 5 ? 1 : 2;
      if (y === 9) return x === 2 ? 0 : 1;
      if (y === 8) return x === 2 ? 0 : x >= 3 && x <= 4 ? 3 : 1;
      if (y === 7) return x >= 2 && x <= 5 ? 3 : 1;
      if (y <= 1) return 3;
      return 5;
    },
    top: 2,
    bottom: 3,
  },
  // Ninja: the boss, a tall dark figure with a red sash and a pale mask band.
  // Palette: 1 dark steel, 2 red, 3 white, 4 skin, 5 steel.
  {
    name: "cave-ninja",
    size: [10, 16, 6],
    palette: [BLACK, STEEL_DARK, RED, WHITE, SKIN, STEEL],
    front: (x, y) => {
      if (y >= 14) return 1;
      if (y === 13) return x >= 2 && x <= 7 ? 3 : 1;
      if (y === 12 && (x === 3 || x === 6)) return 1;
      if (y === 11 && x >= 5 && x <= 6) return 2;
      if (x === 0 || x === 9) return 1;
      if (y >= 7 && y <= 9) return 2;
      return 1;
    },
    top: 1,
    bottom: 1,
  },
  // A wooden chest, banded, with a brass latch. Palette: 1 brown, 2 dark
  // brown, 3 brass.
  {
    name: "cave-chest",
    size: [9, 7, 7],
    palette: [BLACK, BROWN, BROWN_DARK, BRASS],
    front: (x, y) => {
      if (y === 6 || y <= 1) return 2;
      if (x === 4 && y >= 2 && y <= 4) return 3;
      if (x === 0 || x === 8) return 2;
      return 1;
    },
    top: 2,
    bottom: 2,
  },
  // The boss chest: the same box in gold. Palette: 1 gold, 2 brass, 3 dark red.
  {
    name: "cave-boss-chest",
    size: [9, 7, 7],
    palette: [BLACK, GOLD, BRASS, RED_DARK],
    front: (x, y) => {
      if (y === 6 || y <= 1) return 2;
      if (x === 4 && y >= 2 && y <= 4) return 3;
      if (x === 0 || x === 8) return 2;
      return 1;
    },
    top: 2,
    bottom: 2,
  },
  // A coin lying flat: a thin gold disc. Palette: 1 gold, 2 brass.
  {
    name: "cave-coin",
    size: [7, 2, 7],
    palette: [BLACK, GOLD, BRASS],
    front: (x, y) => (x === 0 || x === 6 ? 2 : y === 0 ? 2 : 1),
    top: 1,
    bottom: 2,
  },
  // A brass key: a bow at the top, a shaft, and two teeth. Palette: 1 brass,
  // 2 gold.
  {
    name: "cave-key",
    size: [6, 9, 2],
    palette: [BLACK, BRASS, GOLD],
    front: (x, y) => {
      if (y >= 6) return x >= 1 && x <= 4 ? 1 : 0;
      if (x >= 2 && x <= 3) {
        if (y === 1) return 2;
        return 1;
      }
      return 0;
    },
    top: 1,
    bottom: 1,
  },
  // A torch: a dark handle topped with a bright flame. Palette: 1 dark brown,
  // 2 orange, 3 yellow.
  {
    name: "cave-torch",
    size: [3, 9, 3],
    palette: [BLACK, BROWN_DARK, ORANGE, YELLOW],
    front: (_x, y) => {
      if (y >= 7) return 3;
      if (y === 6) return 2;
      return 1;
    },
    top: 3,
    bottom: 1,
  },
  // The crafting table: a stout bench with a steel tool laid across it.
  // Palette: 1 brown, 2 dark brown, 3 steel.
  {
    name: "cave-craft",
    size: [9, 6, 9],
    palette: [BLACK, BROWN, BROWN_DARK, STEEL],
    front: (x, y) => {
      if (y === 5) return 1;
      if (y === 4 && x >= 2 && x <= 6) return 3;
      if (y <= 1) return 2;
      return 2;
    },
    top: 1,
    bottom: 2,
  },
  // The life plant: a green shoot over a small red heart. Palette: 1 green,
  // 2 dark green, 3 red, 4 white.
  {
    name: "cave-lifeplant",
    size: [5, 8, 5],
    palette: [BLACK, GREEN, GREEN_DARK, RED, WHITE],
    front: (x, y) => {
      if (y >= 5) {
        if (y === 7 && x === 2) return 3;
        if (y === 6 && (x === 1 || x === 3)) return 3;
        if (y === 5 && x >= 1 && x <= 3) return 3;
        return y >= 5 ? 2 : 1;
      }
      if (y >= 2 && x >= 1 && x <= 3) return 1;
      return 2;
    },
    top: 2,
    bottom: 2,
  },
  // A simple adventurer's cap. Palette: 1 red, 2 dark red, 3 brass.
  {
    name: "cave-hat",
    size: [9, 4, 9],
    palette: [BLACK, RED, RED_DARK, BRASS],
    front: (x, y) => {
      if (y === 3 || y === 0) return 2;
      if (x === 4) return 3;
      return 1;
    },
    top: 1,
    bottom: 2,
  },
  // A shop sign: a dark board on a post. Palette: 1 brown, 2 dark brown,
  // 3 brass.
  {
    name: "cave-sign",
    size: [9, 8, 2],
    palette: [BLACK, BROWN, BROWN_DARK, BRASS],
    front: (x, y) => {
      if (y <= 1) return x === 4 ? 2 : 0;
      if (y >= 7 || x === 0 || x === 8) return 2;
      if ((y === 5 || y === 3) && x >= 2 && x <= 6) return 3;
      return 1;
    },
    top: 2,
    bottom: 2,
  },
];

for (const model of MODELS) {
  await writeModel(model);
}
