/**
 * Generates the `.sdfmod` models the "Get a Snack at 4 AM" demo wears: its furniture, the small
 * items lying around, and its two characters. Mirrors
 * `apps/voxelscape/tools/make-demo-models.ts`, which writes the same demo's models in the
 * rm-stacker indexed-png format that engine reads.
 *
 *   node --experimental-transform-types tools/make-snack-models.ts
 *
 * ## What changed and what did not
 *
 * The source of truth for the shapes is the sibling's table — same names, same voxel extents,
 * same palettes — because this is a port and a fridge that is not the demo's fridge is a bug in
 * the port rather than a design decision. What changed is the format they are written in and the
 * units they are written in, and both of those are forced:
 *
 * - **Indexed pngs and a ray-marched voxel grid become signed distance operations.** A model
 *   here is a list of `Operation`s folded into a field and meshed once, and the colour is an
 *   operation's colour rather than a texel index. So each part below is a primitive with a
 *   colour, and a "palette" is only a local shorthand for choosing one.
 * - **Units are world units, not voxels.** See below, because this is the one place where
 *   copying the sibling's numbers verbatim would have produced a world the size of a doll's
 *   house.
 *
 * ## The scale, derived rather than chosen
 *
 * The sibling's models are voxel grids drawn at a world height the *demo* asked for — its
 * `createProp` takes a `height`, and the same 12-voxel-tall fridge is 6 units in the bedroom and
 * 30 in the kitchen. Here the model owns its size and the placement does not scale it, so each
 * entry below carries that canonical height and everything else follows from the voxel extents:
 *
 *     world units per voxel = height × LAYOUT_SCALE / voxel height
 *
 * `LAYOUT_SCALE` is 5 because that is the factor the demo's whole layout is rescaled by (see
 * `docs/snack-port-plan.md`, Phase 9) — gasa4's 28×26-unit room becomes 140×130 and its 4-unit
 * doorway becomes 20, against `DEFAULT_PLAYER_CONFIG`'s `halfSize: 5` and `collisionRadius: 3`.
 *
 * **So every number in the table is a gasa4 height, not an arbitrary one**, and the rule is
 * checkable: a fridge 15 world units tall against a player six units across is about two and a
 * half times their width, which is a fridge.
 *
 * ## Why every model comes out centred on its own origin
 *
 * **Because `figureDistance` treats a figure's origin as the centre of its box** — it takes the
 * bounds' half-extents and measures from the placement point, with no offset. The geometry, on
 * the other hand, is drawn in the operations' own frame. Those two agree only if a model's parts
 * are centred, and they are not centred by hand: the table is authored the readable way, with
 * every model's base on `y = 0`, and `centred()` shifts the whole thing afterwards.
 *
 * That is worth a paragraph because the alternative — authoring base-at-origin and teaching the
 * collision box about the offset — would have been twenty-six mistakes in the demo instead of one
 * invariant here, and the invariant is checked rather than hoped for.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

import {
  isProjectManifest,
  PROJECT_MANIFEST_FILE,
  PROJECT_MODEL_FILE,
  PROJECT_VERSION,
  serialiseOperations,
  type Operation,
  type OperationShape,
} from "@big-mesh-studios/csg";
import type { Quat, Vec3 } from "@big-mesh-studios/core";
import type { OperationShape as Shape } from "@big-mesh-studios/sdf";

import {
  MATERIAL_NAMES,
  requireMaterialId,
  type MaterialName,
} from "../src/render/material-names.ts";

/** Where the models go, and the same folder the demo's manifest fetches them from. */
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "public", "models");

/**
 * How many world units a gasa4 unit is worth, everywhere in this file.
 *
 * **5, and it is the demo's number rather than this file's.** A model authored at one unit per
 * voxel would put a person about a sixth the size of the fridge they open; at 5 the smallest
 * thing here — a coin, 1.5 units tall — is still a thing you can see lying on a floor from
 * standing height. It is asserted against the demo's own constant by
 * `make-snack-models.test.ts` rather than trusted here, because the two living in different
 * files is exactly how they would drift.
 */
export const LAYOUT_SCALE = 5;

/** An RGB triple, which is what a colour is until it becomes a byte triple. */
type RGB = readonly [number, number, number];

/**
 * The date every entry in every archive is stamped with: the zip format's own epoch.
 *
 * **Because otherwise regenerating the models produces a diff in all forty of them.** A zip
 * entry carries a last-modified time, `jszip` fills it in with the clock, and the bytes come out
 * different every run — so a `git status` after an unrelated change to the table would show
 * every model modified, and a real change to one model would be lost in forty that only moved
 * their timestamps.
 *
 * It was found by the test that compares two builds of the same model and found them different
 * in four bytes. Those bytes are the DOS date and time in the local file header, and the two
 * builds had crossed a second boundary.
 *
 * **`Date.UTC`, not the bare constructor, and that is the second half of the same bug.** The
 * four-argument form reads as *local* midnight, which is a different instant in every timezone —
 * and `jszip` writes the DOS fields from the UTC getters, so in any zone east of Greenwich local
 * midnight is the *previous* UTC day, `1979 - 1980 = -1` underflows the seven-bit year field, and
 * every model comes out stamped `2107-12-31 14:00`. The committed files carried exactly that,
 * which is how this was found a second time: the same assertion failed in CI and passed on the
 * machine that wrote them. Building the instant in UTC makes the bytes identical from Auckland
 * to Los Angeles, which is the property the first paragraph was after in the first place.
 */
const ZIP_EPOCH = new Date(Date.UTC(1980, 0, 1, 0, 0, 0));

/** The identity rotation: every part below is axis-aligned and says so by saying nothing. */
const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 };

/**
 * One part of a model, in **voxels**.
 *
 * **`at` is the centre and `size` is the full extent**, which is the pair a person thinks in when
 * they are placing a box on a table; both primitives this file uses most take a *half*-extent,
 * and that conversion happens in exactly one place (`toWorld`) rather than in forty models.
 */
export interface VoxelPart {
  /** Where the part sits, in voxels from the model's near-bottom-left-back corner. */
  readonly at: Vec3;
  readonly shape: VoxelShape;
  readonly colour: RGB;
  /** A material by name, resolved against the renderer's table when the file is written. */
  readonly material?: MaterialName;
  /**
   * How this part joins the ones before it. `Add` unions and `Subtract` cuts.
   *
   * **`Add` unless a part is written to say otherwise**, and the reason that is worth spelling
   * out is that the default here is the *safe* one. A subtraction is order-dependent — the fold
   * runs front to back — so a `Subtract` above a part that was meant to survive it removes that
   * part instead of cutting a hole in front of it, and the model comes out inside-out with no
   * error anywhere. Four parts in the table below subtract, and each one is a recess that a
   * bitmap could express by not drawing a cell: a bathtub's basin, the vending machine's glass,
   * the breakfast machine's window, the toilet's bowl.
   */
  readonly combine?: "Add" | "Subtract";
}

/** A primitive, in voxel units. Half-extents, except where the shape says otherwise. */
export type VoxelShape =
  | { readonly type: "Box"; readonly half: Vec3 }
  /** `half` excludes the corner radius, which is what `RoundBox` means by `len`. */
  | { readonly type: "RoundBox"; readonly half: Vec3; readonly radius: number }
  | { readonly type: "Ellipsoid"; readonly radius: Vec3 }
  | { readonly type: "Capsule"; readonly len: number; readonly radius: number }
  | { readonly type: "Cylinder"; readonly len: number; readonly radius: number }
  | { readonly type: "Sphere"; readonly radius: number };

/** One model, in voxels, with the world height the demo wants it at. */
export interface SnackModel {
  readonly name: string;
  /**
   * The model's height in gasa4 units, which is where `LAYOUT_SCALE` is applied.
   *
   * **The canonical size, and a placement does not override it.** This is the one departure from
   * the sibling worth stating: there, `createProp({height})` rescaled the model per instance, so
   * two shelves in the same room could be different sizes. Here the model is the model, and a
   * place that wants a different size asks for a differently-sized model.
   *
   * **And it is the only size there is.** The table does not also declare the model's extents,
   * because those are the parts' own and restating them is how this table first shipped a
   * shelf twice the size it meant to be and a stove half as tall — both of which scaled every
   * other part of the model with them. One source of truth per fact.
   */
  readonly height: number;
  readonly parts: readonly VoxelPart[];
}

/** What the writer produced, for the test and for the log. */
export interface WrittenModel {
  readonly name: string;
  /** The model's world box, which the centring invariant is checked against. */
  readonly min: Vec3;
  readonly max: Vec3;
  readonly bytes: number;
}

/**
 * The box a model's parts occupy, in voxels.
 *
 * **Computed from the parts rather than taken from `size`.** `size` says how tall the model is
 * and therefore how big a voxel is; it does not say how deep the counter really is, and a box
 * from `size` would make the centring shift a model by half its declared extent rather than half
 * its actual one — which would put every part a little off and every model a different amount.
 */
const partsBox = (parts: readonly VoxelPart[]): { min: Vec3; max: Vec3 } => {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const part of parts) {
    const half = extentOf(part.shape);
    for (const axis of ["x", "y", "z"] as const) {
      min[axis] = Math.min(min[axis], part.at[axis] - half[axis]);
      max[axis] = Math.max(max[axis], part.at[axis] + half[axis]);
    }
  }
  return { min, max };
};

/**
 * A shape's half-extents, which is what centring and the writer both need.
 *
 * **Exported because a test has to measure the same thing the writer measured.** A second copy of
 * this switch in the test would agree with the writer by luck and disagree the first time a
 * shape was added — which is the only way this switch will ever be wrong.
 */
export const extentOf = (shape: VoxelShape): Vec3 => {
  switch (shape.type) {
    case "Box":
      return { ...shape.half };
    case "RoundBox":
      // The corner is *outside* `half`, which is what `primitives.ts` means by `len`.
      return {
        x: shape.half.x + shape.radius,
        y: shape.half.y + shape.radius,
        z: shape.half.z + shape.radius,
      };
    case "Ellipsoid":
      return { ...shape.radius };
    case "Capsule":
      return {
        x: shape.radius,
        y: shape.len / 2 + shape.radius,
        z: shape.radius,
      };
    case "Cylinder":
      return { x: shape.radius, y: shape.len / 2, z: shape.radius };
    case "Sphere":
      return { x: shape.radius, y: shape.radius, z: shape.radius };
  }
};

/**
 * The model's own height in voxels, which is what the scale is derived from.
 *
 * **Measured from the parts rather than declared, and that is the fix rather than a
 * convenience.** Every model in this table is a list of boxes and spheres in voxels, and its
 * height is a fact about that list. Declaring the height as well gives two answers to the same
 * question, and the table had them disagreeing on a dozen models — a sphere's radius is its
 * half-height, so a burger modelled as a bun came out 40% tall and every other part of it was
 * scaled to match.
 */
export const voxelHeight = (model: SnackModel): number => {
  const box = partsBox(model.parts);
  return box.max.y - box.min.y;
};

/**
 * One voxel in world units, for a model that wants to be `height` tall.
 *
 * **So the model comes out at exactly the height the demo asked for**, whatever its parts
 * happened to measure, and a part that is one voxel too big makes the model very slightly
 * narrower rather than noticeably taller.
 */
export const unitsPerVoxel = (model: SnackModel): number =>
  (model.height * LAYOUT_SCALE) / voxelHeight(model);

/** A part's shape in world units, with the voxel half-extents resolved into primitive units. */
const toWorld = (shape: VoxelShape, scale: number): OperationShape => {
  const world = (v: Vec3): Vec3 => ({
    x: v.x * scale,
    y: v.y * scale,
    z: v.z * scale,
  });
  switch (shape.type) {
    case "Box":
      return { type: "Box", len: world(shape.half) } as Shape;
    case "RoundBox":
      return {
        type: "RoundBox",
        len: world(shape.half),
        radius: shape.radius * scale,
      } as Shape;
    case "Ellipsoid":
      return { type: "Ellipsoid", radius: world(shape.radius) } as Shape;
    case "Capsule":
      return {
        type: "Capsule",
        len: shape.len * scale,
        radius: shape.radius * scale,
      } as Shape;
    case "Cylinder":
      return {
        type: "Cylinder",
        len: shape.len * scale,
        radius: shape.radius * scale,
      } as Shape;
    case "Sphere":
      return { type: "Sphere", radius: shape.radius * scale } as Shape;
  }
};

/**
 * A model as the operations that are written.
 *
 * **The order is the table's, and for a union it does not matter** — `Part` says so in the
 * modeller's own documentation, and every model here is mostly a union. The parts that are not
 * are the four subtracts, and each of those is last-in-its-model by construction because the
 * table writes it after the solid it cuts. What is load-bearing either way is the id, which the
 * manifest carries beside the operations by position, so a person opening the file in the
 * modeller sees a name and not `part-2`.
 */
export const operationsFor = (model: SnackModel): readonly Operation[] => {
  const scale = unitsPerVoxel(model);
  const box = partsBox(model.parts);
  const centre = {
    x: (box.min.x + box.max.x) / 2,
    y: (box.min.y + box.max.y) / 2,
    z: (box.min.z + box.max.z) / 2,
  };

  return model.parts.map((part, index) => ({
    index,
    origin: {
      x: (part.at.x - centre.x) * scale,
      y: (part.at.y - centre.y) * scale,
      z: (part.at.z - centre.z) * scale,
    },
    orientation: IDENTITY,
    shape: toWorld(part.shape, scale),
    softness: 0,
    combine: part.combine ?? "Add",
    colour: { r: part.colour[0], g: part.colour[1], b: part.colour[2] },
    opacity: 1,
    // **Absent rather than zero**, for the reason `writeProject` gives: the serialiser writes a
    // zero byte either way and reads it back as absent, so an explicit `0` would be a
    // different file that meant the same thing.
    ...(part.material === undefined || requireMaterialId(part.material) === 0
      ? {}
      : { material: requireMaterialId(part.material) }),
  }));
};

/** The colours a model uses, most-used first, which is the order the modeller's panel shows. */
const paletteFor = (
  parts: readonly VoxelPart[],
): readonly { r: number; g: number; b: number; a: number }[] => {
  const seen = new Map<
    string,
    { r: number; g: number; b: number; a: number }
  >();
  for (const part of parts) {
    const key = part.colour.join(",");
    if (!seen.has(key)) {
      const [r, g, b] = part.colour;
      seen.set(key, { r, g, b, a: 255 });
    }
  }
  return [...seen.values()];
};

/**
 * The manifest, built here rather than through the modeller's constructor.
 *
 **The modeller's `projectManifest` is not reachable** — it lives in another application and
 * importing an app from an app is the coupling this tool exists to avoid. What is *not* avoided
 * is the check: `isProjectManifest` is the format's own validator and it runs on every model
 * before anything is written, so this tool cannot produce a file the world application would
 * refuse to open. That is the property that matters and it is one line.
 */
const manifestFor = (model: SnackModel): Record<string, unknown> => ({
  ids: model.parts.map((_, index) => `${model.name}-${index}`),
  coloured: model.parts.map((_, index) => index),
  palette: paletteFor(model.parts),
  version: PROJECT_VERSION,
  view: { mode: "marching-cubes", resolution: 0.25 },
});

/**
 * A model as the bytes of a `.sdfmod`, and the box it declares.
 *
 * **Separate from `writeModel` so that a test can ask for the bytes without asking for the
 * side effect.** A test that regenerates the repository's models in order to compare them is a
 * test that fails if it is interrupted halfway and rewrites files it was supposed to be reading;
 * this way the determinism check is two calls and a comparison, with the disk untouched.
 */
export const modelBytes = async (
  model: SnackModel,
): Promise<{
  readonly bytes: Uint8Array;
  readonly box: { min: Vec3; max: Vec3 };
}> => {
  const manifest = manifestFor(model);
  if (!isProjectManifest(manifest)) {
    // **A throw rather than a warning**, because this is a generator: a model whose manifest
    // this build cannot open is a bug in the table it came from, and the alternative is forty
    // files in the repository that the world application lists as forty problems.
    throw new Error(`${model.name}: a manifest this build cannot open`);
  }

  const zip = new JSZip();
  const add = (path: string, data: string | ArrayBuffer) =>
    zip.file(path, data, { createFolders: false, date: ZIP_EPOCH });
  // **The manifest first**, for the reason `writeProject` gives: an archive that buries the file
  // describing it is one some tools will not find.
  add(PROJECT_MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`);
  add(PROJECT_MODEL_FILE, serialiseOperations(operationsFor(model)));

  const scale = unitsPerVoxel(model);
  const box = partsBox(model.parts);
  const centre = {
    x: (box.min.x + box.max.x) / 2,
    y: (box.min.y + box.max.y) / 2,
    z: (box.min.z + box.max.z) / 2,
  };
  return {
    bytes: await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
    }),
    box: {
      min: {
        x: (box.min.x - centre.x) * scale,
        y: (box.min.y - centre.y) * scale,
        z: (box.min.z - centre.z) * scale,
      },
      max: {
        x: (box.max.x - centre.x) * scale,
        y: (box.max.y - centre.y) * scale,
        z: (box.max.z - centre.z) * scale,
      },
    },
  };
};

/** Writes one model, and returns what it wrote so the caller can check it. */
export const writeModel = async (model: SnackModel): Promise<WrittenModel> => {
  const { bytes, box } = await modelBytes(model);
  writeFileSync(join(out, `${model.name}.sdfmod`), bytes);
  return {
    name: model.name,
    min: box.min,
    max: box.max,
    bytes: bytes.byteLength,
  };
};

/**
 * Writes every model in the table, and returns what it wrote.
 *
 * **Exported as a named function and not run on import**, which is the only reason
 * `make-snack-models.test.ts` can check the table against the files on disk without the check
 * rewriting them. `tools/run.ts` is what calls it.
 */
export const run = async (): Promise<readonly WrittenModel[]> => {
  const { SNACK_MODELS } = await import("./snack-model-table.ts");
  mkdirSync(out, { recursive: true });

  const written: WrittenModel[] = [];
  for (const model of SNACK_MODELS) {
    const result = await writeModel(model);
    written.push(result);
    // **The three extents and the height, not the box.** A model comes out centred on its own
    // origin, so its box runs from `-h/2` to `+h/2` and printing that would show every model's
    // height twice and half of it. The number worth reading is how big the thing is.
    console.log(
      `wrote ${model.name}.sdfmod  ${oneDecimal(span(result.max.x, result.min.x))} x ` +
        `${oneDecimal(span(result.max.y, result.min.y))} x ` +
        `${oneDecimal(span(result.max.z, result.min.z))}, ${result.bytes} bytes`,
    );
  }
  console.log(
    `${written.length} models, ${MATERIAL_NAMES.length} materials they may name`,
  );
  return written;
};

/** One decimal place, with the trailing `.0` dropped, which is all a console line wants. */
const oneDecimal = (n: number): string => n.toFixed(1).replace(/\.0$/, "");

/** How far apart two ends of a box are. */
const span = (max: number, min: number): number => max - min;
