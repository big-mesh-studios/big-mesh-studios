// Builds the animated human model the world wears as its human avatar.
//
// The rig itself is authored, not written here: `public/animations/human.glb`
// carries the joint tree and four clips, `public/models/human.zip` carries ten
// boxes resting on those joints, and `scripts/make-models.mjs` drew the boxes
// from the same joint list at the same scale. This reads both, binds the parts
// to the bones their names carry, and bakes the three clips a walking figure
// needs into one model zip the world plays directly.
//
// A world picks a motion by the role it plays rather than by the name the
// animation happened to be published under — `Walking_A` says nothing to a
// script, `walk` says everything — so the clips are renamed on the way out.
// The names a world looks for are the ones in ROLES below, and they are the
// same three words every animated avatar uses.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadFigure } from "@big-mesh-studios/stacker/format";
import { importGlb } from "../src/animation/gltf-import";
import { writeAnimatedModel } from "../src/file/bake-motion";
import { figureParts } from "../src/rig/anchors";
import { guessBindings } from "../src/rig/rig";
import { DEFAULT_PALETTE } from "../src/rig/palette";
import type { BoneMotion } from "../src/skeleton/types";

/**
 * The application directory, from wherever the built script was started: the
 * build writes this file one level under the application, beside `scripts`.
 */
const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The rig the body is drawn on, and the rest-pose body drawn on it. */
const RIG = join(APP_DIR, "public", "animations", "human.glb");
const BODY = join(APP_DIR, "public", "models", "human.zip");

/** Where the world's copy of the model is written. */
const OUTPUT = join(
  APP_DIR,
  "..",
  "voxelscape",
  "public",
  "models",
  "player-human.zip",
);

/**
 * The clips a walking figure plays, each under the name its role is known by
 * rather than the name it was published under.
 */
const ROLES: ReadonlyArray<readonly [clip: string, role: string]> = [
  ["Idle", "idle"],
  ["Walking_A", "walk"],
  ["Running_A", "run"],
];

/** The bytes of `path`, copied so they are one typed array over one buffer. */
const read = (path: string): Uint8Array<ArrayBuffer> =>
  new Uint8Array(readFileSync(path));

const imported = await importGlb(read(RIG).buffer, { name: "human" });

/**
 * The rig's motions under the role names, or the reason the rig is not the one
 * this script was written for: a clip renamed upstream, or a trimmed file
 * missing one, leaves the world a figure that cannot walk. Naming the missing
 * clip is worth more than a motion saved under a name nothing looks for.
 */
const renamed: BoneMotion[] = [];
for (const [clip, role] of ROLES) {
  const held = imported.motions.find((motion) => motion.name === clip);
  if (held === undefined) {
    throw new Error(
      `${RIG} carries no clip named ${clip}; it has ` +
        imported.motions.map((motion) => motion.name).join(", "),
    );
  }
  renamed.push({ ...held, name: role });
}

const figure = await loadFigure(new Blob([read(BODY)]), DEFAULT_PALETTE);
const parts = figureParts(figure);
const bindings = guessBindings(parts, imported.skeleton);
const unbound = parts.filter(
  (part) => !bindings.some((binding) => binding.part === part.name),
);
if (unbound.length > 0) {
  throw new Error(
    `no bone matches ${unbound.map((part) => part.name).join(", ")}; the rig has ` +
      imported.skeleton.bones.map((bone) => bone.name).join(", "),
  );
}

const blob = await writeAnimatedModel(
  figure,
  imported.skeleton,
  bindings,
  renamed,
);
writeFileSync(OUTPUT, new Uint8Array(await blob.arrayBuffer()));

console.log(
  `wrote ${OUTPUT} — ${parts.length} parts, motions ` +
    `${renamed.map((motion) => motion.name).join(", ")}, ` +
    `${(blob.size / 1024).toFixed(0)} kB`,
);
