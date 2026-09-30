// One-off generator for the stand-in model files the built-in "Raise a Floppa"
// demo wears: the cats it is about (Floppa, Ms. Floppa, their kittens, the
// elder and the soldier), the raiders and the backrooms' Bingus, its helpers,
// and the props the house, the yard, the Interwebs and the time machine stand
// on. Written in the same indexed-png format `make-cube-cavern-models.ts`
// uses — one png per side and a one-row palette png, cells naming palette
// indices rather than colours. Run with
// `node --experimental-transform-types tools/make-raise-a-floppa-models.ts`
// from this app; it writes into `public/models/`.
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
  /** Index 0 is empty; every drawn cell names an index from 1 up. */
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

const BLACK: RGB = [20, 20, 20];
const WHITE: RGB = [242, 240, 233];
const SAND: RGB = [212, 172, 112];
const SAND_DARK: RGB = [168, 128, 76];
const CREAM: RGB = [240, 226, 194];
const PINK: RGB = [238, 150, 176];
const PINK_DARK: RGB = [198, 104, 132];
const GREY: RGB = [120, 122, 128];
const GREY_DARK: RGB = [70, 72, 80];
const STEEL: RGB = [140, 148, 158];
const STEEL_DARK: RGB = [76, 80, 88];
const SKIN: RGB = [226, 188, 150];
const SKIN_DARK: RGB = [168, 128, 92];
const GREEN: RGB = [92, 158, 72];
const GREEN_DARK: RGB = [56, 104, 48];
const PURPLE: RGB = [150, 96, 190];
const BROWN: RGB = [126, 84, 48];
const BROWN_DARK: RGB = [84, 54, 30];
const GOLD: RGB = [244, 200, 64];
const RED: RGB = [200, 62, 58];
const RED_DARK: RGB = [136, 34, 32];
const BLUE: RGB = [70, 128, 200];
const BLUE_DARK: RGB = [42, 82, 140];
const YELLOW: RGB = [232, 208, 92];
const YELLOW_DARK: RGB = [186, 158, 54];
const CYAN: RGB = [120, 226, 236];
const HELMET: RGB = [86, 110, 66];

/**
 * The caracal every Floppa variant is drawn from: tufted ears, a pale face and
 * belly, and stubby legs, in the palette above. Colours are palette indices,
 * so each variant passes the ones it wants (a bow, a helmet, a grey coat).
 */
const caracal =
  (
    w: number,
    h: number,
    coat: number,
    belly: number,
    opts: { bow?: number; helmet?: number; beard?: number } = {},
  ): Painter =>
  (x, y) => {
    const cx = Math.floor(w / 2);
    const top = h - 1;
    // Ears: two upright tufts at the head's corners.
    if (y === top) {
      if (x === 0 || x === w - 1) return 3;
      if (opts.helmet !== undefined) return opts.helmet;
      if (opts.bow !== undefined && (x === cx - 1 || x === cx)) {
        return opts.bow;
      }
      return coat;
    }
    if (y === top - 1) {
      if (x === 0 || x === w - 1) return coat;
      if (opts.bow !== undefined && (x === cx - 1 || x === cx)) {
        return opts.bow;
      }
      return opts.helmet ?? coat;
    }
    // Head: face, eyes, and a nose.
    if (y >= h - 4) {
      if (x === 1 || x === w - 2) {
        return y === h - 3 ? 3 : coat;
      }
      if (y === h - 3 && x === cx - 1) return 3;
      if (y === h - 3 && x === cx) return 3;
      if (y === h - 4 && (x === cx - 1 || x === cx)) return 4;
      return coat;
    }
    // A beard on the elder: pale fur under the chin.
    if (opts.beard !== undefined && y === h - 5 && x >= 1 && x <= w - 2) {
      return opts.beard;
    }
    // Body: coat with a pale belly.
    if (y >= 2) {
      if (x === 0 || x === w - 1) return coat;
      if (x >= cx - 2 && x <= cx + 1) return belly;
      return coat;
    }
    // Legs: two pairs of paws.
    if (x === 1 || x === 2 || x === w - 3 || x === w - 2) return coat;
    return 0;
  };

/** A round, four-legged animal prop (a bed, a bowl) drawn as a short cylinder. */
const disc =
  (w: number, h: number, rim: number, fill: number, edge = 0): Painter =>
  (x, y) => {
    const cx = (w - 1) / 2;
    const dist = Math.abs(x - cx);
    if (y === h - 1) return dist >= cx - 0.5 ? rim : fill;
    if (y === h - 2 && dist <= cx - 1) return fill;
    if (y === 0) return edge;
    return rim;
  };

const MODELS: Model[] = [
  // Floppa: the caracal the whole game is about. Palette: 1 sand coat, 2 pale
  // belly, 3 black ear tips, 4 pink nose.
  {
    name: "floppa",
    size: [8, 11, 6],
    palette: [BLACK, SAND, CREAM, BLACK, PINK],
    front: caracal(8, 11, 1, 2),
    top: 1,
    bottom: 2,
  },
  // Ms. Floppa: the same cat wearing a pink bow. Palette: 1 coat, 2 belly,
  // 3 bow, 4 nose.
  {
    name: "ms-floppa",
    size: [8, 11, 6],
    palette: [BLACK, SAND_DARK, CREAM, BLACK, PINK_DARK, PINK],
    front: caracal(8, 11, 1, 2, { bow: 5 }),
    top: 1,
    bottom: 2,
  },
  // A kitten: a smaller, paler caracal. Palette: 1 coat, 2 belly, 3 black.
  {
    name: "baby-floppa",
    size: [5, 7, 4],
    palette: [BLACK, SAND, CREAM, BLACK],
    front: caracal(5, 7, 1, 2),
    top: 1,
    bottom: 2,
  },
  // The elder Floppa of Eternity: a grey, bearded caracal. Palette: 1 grey
  // coat, 2 white belly, 3 black, 4 white beard.
  {
    name: "elder-floppa",
    size: [8, 11, 6],
    palette: [BLACK, GREY, WHITE, BLACK, PINK, WHITE],
    front: caracal(8, 11, 1, 2, { beard: 5 }),
    top: 1,
    bottom: 2,
  },
  // The future's Soldier Floppa, in a drab helmet. Palette: 1 coat, 2 belly,
  // 3 helmet, 4 black.
  {
    name: "soldier-floppa",
    size: [8, 11, 6],
    palette: [BLACK, SAND, CREAM, BLACK, PINK, HELMET],
    front: caracal(8, 11, 1, 2, { helmet: 5 }),
    top: 3,
    bottom: 2,
  },
  // A bandit: a hooded raider with a money sack. Palette: 1 dark cloak, 2
  // black hood, 3 skin, 4 sack, 5 gold.
  {
    name: "bandit",
    size: [8, 12, 6],
    palette: [BLACK, GREY_DARK, BLACK, SKIN, BROWN, GOLD],
    front: (x, y) => {
      if (y >= 9) {
        if (y === 11 && (x === 0 || x === 7)) return 2;
        if (y >= 9 && x >= 1 && x <= 6) return 1;
        if (y === 9 && (x === 2 || x === 5)) return 2;
        return 1;
      }
      if (y === 8 && x >= 2 && x <= 5) return 3;
      if (x === 0 || x === 7) return 2;
      if (y >= 2 && y <= 4 && x >= 5 && x <= 7) return 4;
      if (y === 3 && (x === 6 || x === 2)) return 5;
      return 1;
    },
    top: 2,
    bottom: 2,
  },
  // Bingus: the rival's big white cat, the backrooms' own terror. Palette: 1
  // white coat, 2 grey, 3 pink, 4 black, 5 dark grey.
  {
    name: "bingus",
    size: [10, 14, 8],
    palette: [BLACK, WHITE, GREY, PINK, BLACK, GREY_DARK],
    front: (x, y) => {
      const cx = 4.5;
      if (y === 13) {
        if (x === 0 || x === 9) return 4;
        return 1;
      }
      if (y === 12) {
        if (x === 0 || x === 1 || x === 8 || x === 9) return 1;
        return 3;
      }
      if (y >= 9) {
        if (x === 2 || x === 7) {
          return y === 10 ? 4 : 1;
        }
        if (y === 10 && (x === 4 || x === 5)) return 4;
        if (y === 9 && Math.abs(x - cx) <= 1) return 3;
        return 1;
      }
      if (x === 0 || x === 9) return 2;
      if (x >= cx - 2 && x <= cx + 2) return 1;
      return 1;
    },
    top: 1,
    bottom: 1,
  },
  // The Neko Maid: a cat-eared helper in a dark dress and white apron.
  // Palette: 1 dress, 2 white apron, 3 skin, 4 black hair, 5 pink ears.
  {
    name: "neko-maid",
    size: [8, 12, 6],
    palette: [BLACK, GREY_DARK, WHITE, SKIN, BLACK, PINK],
    front: (x, y) => {
      if (y === 11 && (x === 0 || x === 7)) return 5;
      if (y >= 9) {
        if (x >= 1 && x <= 6) return 4;
        return 4;
      }
      if (y === 8 && x >= 2 && x <= 5) return 3;
      if (y >= 7 && y <= 8 && (x === 2 || x === 5)) return 3;
      if (y <= 2) return 1;
      if (x >= 2 && x <= 5) return 2;
      return 1;
    },
    top: 4,
    bottom: 1,
  },
  // Ooga, the past's host: a tribal villager. Palette: 1 skin, 2 hair, 3 leaf
  // skirt, 4 bone, 5 red.
  {
    name: "ooga",
    size: [8, 12, 6],
    palette: [BLACK, SKIN_DARK, BROWN_DARK, GREEN, WHITE, RED],
    front: (x, y) => {
      if (y >= 9) {
        if (x >= 1 && x <= 6) return 2;
        return 2;
      }
      if (y === 8 && x >= 2 && x <= 5) return 1;
      if (y >= 4 && y <= 7) {
        if (x === 4) return 4;
        return 1;
      }
      if (y >= 1 && y <= 3) return 3;
      return 1;
    },
    top: 2,
    bottom: 3,
  },
  // A food bowl. Palette: 1 bowl, 2 dark bowl, 3 kibble.
  {
    name: "food-bowl",
    size: [6, 3, 6],
    palette: [BLACK, RED, RED_DARK, BROWN],
    front: (x, y) => {
      if (y === 2) return x === 0 || x === 5 ? 2 : 3;
      return x === 0 || x === 5 ? 2 : 1;
    },
    top: 3,
    bottom: 2,
  },
  // The litter box. Palette: 1 box, 2 dark box, 3 litter.
  {
    name: "litter-box",
    size: [8, 4, 8],
    palette: [BLACK, BLUE, BLUE_DARK, CREAM],
    front: (x, y) => {
      if (y === 3 && (x === 0 || x === 7)) return 1;
      if (y >= 1) return x === 0 || x === 7 ? 2 : 3;
      return x === 0 || x === 7 ? 2 : 1;
    },
    top: 3,
    bottom: 2,
  },
  // The Interwebs computer: a desk under a bright terminal. Palette: 1 desk,
  // 2 dark desk, 3 case, 4 screen, 5 keys.
  {
    name: "computer",
    size: [10, 9, 8],
    palette: [BLACK, BROWN, BROWN_DARK, GREY_DARK, CYAN, STEEL],
    front: (x, y) => {
      if (y <= 2) return x === 0 || x === 9 ? 2 : 1;
      if (y === 3) return 5;
      if (y >= 4) {
        if (x >= 2 && x <= 7) {
          if (y >= 5 && y <= 7) return 4;
          return 3;
        }
        return 0;
      }
      return 0;
    },
    top: 1,
    bottom: 2,
  },
  // A cat bed. Palette: 1 cushion, 2 dark cushion, 3 cream.
  {
    name: "cat-bed",
    size: [8, 3, 8],
    palette: [BLACK, RED, RED_DARK, CREAM],
    front: disc(8, 3, 2, 3),
    top: 3,
    bottom: 2,
  },
  // A scratching post. Palette: 1 post, 2 dark post, 3 carpet.
  {
    name: "scratching-post",
    size: [4, 10, 4],
    palette: [BLACK, BROWN, BROWN_DARK, SAND],
    front: (x, y) => {
      if (y === 9) return 3;
      if (x === 0 || x === 3) return 2;
      return 1;
    },
    top: 3,
    bottom: 2,
  },
  // A catnip plant. Palette: 1 leaf, 2 dark leaf, 3 flower, 4 stem.
  {
    name: "catnip-plant",
    size: [5, 7, 5],
    palette: [BLACK, GREEN, GREEN_DARK, PURPLE, BROWN],
    front: (x, y) => {
      if (y === 6 && x === 2) return 3;
      if (y === 5 && (x === 1 || x === 3)) return 3;
      if (y >= 3) return x === 2 ? 4 : 1;
      if (y >= 1) return 2;
      return 1;
    },
    top: 3,
    bottom: 2,
  },
  // A money bag the Floppa drops. Palette: 1 sack, 2 dark sack, 3 gold, 4 tie.
  {
    name: "money-bag",
    size: [5, 6, 5],
    palette: [BLACK, SAND, SAND_DARK, GOLD, BROWN_DARK],
    front: (x, y) => {
      if (y === 5) return x >= 2 && x <= 2 ? 4 : 0;
      if (y === 4) return x >= 1 && x <= 3 ? 4 : 0;
      if (y === 3 && x === 2) return 3;
      if (x === 0 || x === 4) return 2;
      return 1;
    },
    top: 4,
    bottom: 2,
  },
  // A dropping. Palette: 1 brown, 2 dark brown, 3 green stink.
  {
    name: "poop",
    size: [4, 3, 4],
    palette: [BLACK, BROWN, BROWN_DARK, GREEN],
    front: (x, y) => {
      if (y === 2 && x === 1) return 3;
      if (y <= 1) return 2;
      return 1;
    },
    top: 2,
    bottom: 2,
  },
  // The faith altar. Palette: 1 stone, 2 dark stone, 3 gold, 4 glow.
  {
    name: "altar",
    size: [8, 4, 8],
    palette: [BLACK, GREY, GREY_DARK, GOLD, PURPLE],
    front: (x, y) => {
      if (y === 3) return x === 0 || x === 7 ? 2 : 4;
      if (y === 2 && x >= 3 && x <= 4) return 3;
      if (x === 0 || x === 7) return 2;
      return 1;
    },
    top: 3,
    bottom: 2,
  },
  // The time machine. Palette: 1 steel, 2 dark steel, 3 portal, 4 brass.
  {
    name: "time-machine",
    size: [8, 11, 8],
    palette: [BLACK, STEEL, STEEL, STEEL_DARK, CYAN],
    front: (x, y) => {
      const steel = 1;
      if (y === 10) return 4;
      if (y >= 5 && y <= 9) {
        if (x === 1 || x === 6) return 1;
        if (x >= 2 && x <= 5 && y >= 6 && y <= 8) return 4;
        return 3;
      }
      if (x === 1 || x === 6) return 2;
      if (y >= 2 && y <= 4 && x === 3) return 4;
      return steel;
    },
    top: 4,
    bottom: 2,
  },
  // The Dark Web's stall. Palette: 1 canopy, 2 dark canopy, 3 wood, 4 dark
  // wood, 5 screen.
  {
    name: "dark-web-stall",
    size: [10, 9, 8],
    palette: [BLACK, RED, RED_DARK, BROWN, BROWN_DARK, BLACK],
    front: (x, y) => {
      if (y >= 7) {
        if (x === 0 || x === 9) return 2;
        return 1;
      }
      if (y === 6) return 3;
      if (y >= 2 && y <= 5 && x >= 2 && x <= 7) return 5;
      if (x === 1 || x === 8) return 4;
      return 3;
    },
    top: 1,
    bottom: 4,
  },
  // A door left ajar in the yellow backrooms. Palette: 1 yellow, 2 dark
  // yellow, 3 glowing seam, 4 handle.
  {
    name: "backroom-door",
    size: [6, 10, 3],
    palette: [BLACK, YELLOW, YELLOW_DARK, WHITE, GREY_DARK],
    front: (x, y) => {
      if (x === 0 || x === 5 || y === 9 || y === 0) return 2;
      if (x === 4) return 3;
      if (x === 2 && y === 5) return 4;
      return 1;
    },
    top: 2,
    bottom: 2,
  },
];

for (const model of MODELS) {
  await writeModel(model);
}
