// Generates `public/models/zombie.zip`: the built-in zombie model saved in the
// rm-stacker format (six side PNGs drawn in palette colours, plus palette.png),
// so the game loads that look through the same model-zip path a hand-made
// replacement uses. Run with `node scripts/make-sample-zombie.js` after a
// change to `default-zombie-model.ts`; swap the file it writes for any model
// rm-stacker saved.
import { build } from "esbuild";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import os from "node:os";
import { encode } from "fast-png";
import JSZip from "jszip";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
/** An empty side cell, matching `Bitmap.EMPTY`. */
const EMPTY = 255;
const SIDES = ["front", "back", "left", "right", "top", "bottom"];

const bundle = await build({
  stdin: {
    contents:
      "export { buildDefaultZombieModel } from './src/voxel-model/default-zombie-model';",
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  write: false,
  logLevel: "silent",
});
const temp = join(os.tmpdir(), `sample-zombie-${Date.now()}.mjs`);
await writeFile(temp, bundle.outputFiles[0].text);
const { buildDefaultZombieModel } = await import(`file://${temp}`);
await rm(temp);

const model = buildDefaultZombieModel();
const zip = new JSZip();
for (const kind of SIDES) {
  const side = model.sides[kind];
  const data = new Uint8Array(side.width * side.height * 4);
  for (let i = 0; i < side.data.length; i++) {
    const index = side.data[i];
    const o = i * 4;
    if (index === EMPTY) {
      continue;
    }
    const colour = model.palette[index];
    data[o] = colour.r;
    data[o + 1] = colour.g;
    data[o + 2] = colour.b;
    data[o + 3] = 255;
  }
  zip.file(
    `${kind}.png`,
    encode({ width: side.width, height: side.height, data, channels: 4 }),
  );
}

const paletteData = new Uint8Array(32 * 4);
model.palette.forEach((colour, i) => {
  const o = i * 4;
  paletteData[o] = colour.r;
  paletteData[o + 1] = colour.g;
  paletteData[o + 2] = colour.b;
  paletteData[o + 3] = colour.a;
});
zip.file(
  "palette.png",
  encode({ width: 32, height: 1, data: paletteData, channels: 4 }),
);

const outDir = join(root, "public", "models");
await mkdir(outDir, { recursive: true });
const bytes = await zip.generateAsync({ type: "nodebuffer" });
await writeFile(join(outDir, "zombie.zip"), bytes);
console.log(`wrote ${join(outDir, "zombie.zip")} (${bytes.length} bytes)`);
