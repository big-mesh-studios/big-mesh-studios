// Builds the NPC figures the world bundles, as rm-stacker models: each is a zip
// of six 24×24 RGBA face paintings (front/back/left/right/top/bottom.png) that
// the stacker format reads and its solver carves into a solid voxel volume.
// The solver starts from a full 24³ block and carves away any column a face
// leaves empty, so the model drawn here is a set of solid columns — heights[x]
// how high the column at x stands, constant across the depth window — and each
// face image is that face's outer view of the columns. These were authored here
// rather than in the editor so the repository owns its own characters; run
// `node scripts/make-npc-models.mjs` from apps/voxelscape to rebuild
// `public/models/npc-*.zip`.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { encode } from "fast-png";

const GRID = 24;
const Z0 = 8;
const Z1 = 16;

const blank = () =>
  Array.from({ length: GRID }, () => new Array(GRID).fill(null));

const png = (cells) => {
  const data = new Uint8Array(GRID * GRID * 4);
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const color = cells[y][x];
      if (color === null) continue;
      const o = (y * GRID + x) * 4;
      data[o] = color[0];
      data[o + 1] = color[1];
      data[o + 2] = color[2];
      data[o + 3] = 255;
    }
  }
  return encode({ width: GRID, height: GRID, data });
};

// heights[x] is how tall the column at x stands; each column is solid from the
// ground up over the whole depth window, so nothing is ever left unsupported.
const heightsOf = (parts) => {
  const heights = new Array(GRID).fill(0);
  for (const [x0, x1, height] of parts) {
    for (let x = x0; x <= x1; x++) {
      heights[x] = Math.max(heights[x], height);
    }
  }
  return heights;
};

// Colour of a column at height y: the first band it falls into.
const bandColor = (bands, y) => {
  for (const [above, color] of bands) {
    if (y < above) return color;
  }
  return bands[bands.length - 1][1];
};

// Sable, the trader: a teal robe and a pointed hood, with eyes on the face.
const SABLE = {
  file: "npc-sable.zip",
  heights: heightsOf([
    [7, 16, 13],
    [9, 14, 17],
    [10, 13, 21],
  ]),
  bands: [
    [5, [62, 47, 36]],
    [13, [25, 125, 113]],
    [17, [238, 200, 160]],
    [GRID, [46, 50, 66]],
  ],
  headX: 9,
  headY: 13,
  face: [
    { x: 11, y: 14, color: [30, 28, 28] },
    { x: 12, y: 14, color: [30, 28, 28] },
  ],
};

// Rook, the gatekeeper: steel armour, a blue surcoat and a red helm plume.
const ROOK = {
  file: "npc-rook.zip",
  heights: heightsOf([
    [7, 16, 14],
    [9, 14, 19],
    [10, 13, 22],
  ]),
  bands: [
    [4, [56, 60, 68]],
    [9, [150, 160, 175]],
    [15, [62, 102, 158]],
    [19, [238, 200, 160]],
    [GRID, [196, 54, 42]],
  ],
  headX: 9,
  headY: 15,
  face: [
    { x: 11, y: 16, color: [24, 22, 22] },
    { x: 12, y: 16, color: [24, 22, 22] },
  ],
};

// The colour a column shows at height y on its front: features first, then the
// skin of the head rows, then the body bands the column falls into.
const frontAt = (cfg, x, y) => {
  for (const spot of cfg.face) {
    if (spot.x === x && spot.y === y) return spot.color;
  }
  const headRows =
    y >= cfg.headY && y < cfg.headY + 4 && x >= cfg.headX && x <= cfg.headX + 5;
  return headRows ? [238, 200, 160] : bandColor(cfg.bands, y);
};

const makeSides = (cfg) => {
  const { heights } = cfg;
  const front = blank();
  const back = blank();
  const left = blank();
  const right = blank();
  const top = blank();
  const bottom = blank();

  for (let y = 0; y < GRID; y++) {
    for (let px = 0; px < GRID; px++) {
      if (heights[px] <= y) continue;
      // The front face of the column at x, and the back, mirrored in x.
      put(front, px, GRID - 1 - y, frontAt(cfg, px, y));
      put(back, GRID - 1 - px, GRID - 1 - y, bandColor(cfg.bands, y));
    }
    // A side silhouette is the whole depth window: whatever column reaches
    // this height fills it, and the head rows read as skin from the side too.
    if (!heights.some((h) => h > y)) continue;
    const sideColor =
      y >= cfg.headY && y < cfg.headY + 4
        ? [238, 200, 160]
        : bandColor(cfg.bands, y);
    for (let z = Z0; z < Z1; z++) {
      put(left, z, GRID - 1 - y, sideColor);
      put(right, z, GRID - 1 - y, sideColor);
    }
  }

  // The roof: cell (x, z) shows the colour of the top voxel of that column.
  for (let x = 0; x < GRID; x++) {
    if (heights[x] === 0) continue;
    for (let z = Z0; z < Z1; z++) {
      put(top, x, z, bandColor(cfg.bands, heights[x] - 1));
    }
  }

  // The floor: every column's base, only ever seen from underneath.
  for (let x = 0; x < GRID; x++) {
    if (heights[x] === 0) continue;
    for (let z = Z0; z < Z1; z++) {
      put(bottom, x, z, bandColor(cfg.bands, 0));
    }
  }

  const zip = new JSZip();
  zip.file("front.png", png(front));
  zip.file("back.png", png(back));
  zip.file("left.png", png(left));
  zip.file("right.png", png(right));
  zip.file("top.png", png(top));
  zip.file("bottom.png", png(bottom));
  return zip;
};

const put = (cells, px, py, color) => {
  cells[py][px] = color;
};

const outDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "models",
);
mkdirSync(outDir, { recursive: true });

for (const npc of [SABLE, ROOK]) {
  const bytes = await makeSides(npc).generateAsync({ type: "nodebuffer" });
  writeFileSync(join(outDir, npc.file), bytes);
  console.log(`wrote ${npc.file} (${bytes.length} bytes)`);
}
