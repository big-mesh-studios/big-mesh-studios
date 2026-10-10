/**
 * A place as a thing that can be edited, saved, zipped and published: its manifest, the scripts
 * that make up its program, and the files attached to it.
 *
 * ## Why a project type at all
 *
 * **Because three of those already exist separately and disagreeing about what a place is is the
 * bug this prevents.** A zip reader produces `{ manifest, files, entry }`; the bundler takes a
 * `PlaceFiles`; an atproto record is JSON. This is the one shape all three are converted to and
 * back from, so "can this place round trip" is a question with a single answer rather than three.
 *
 * The reference implementation is `big-mesh-studios`'s `apps/voxelscape/src/places/project.ts`,
 * which holds the same three parts for the same reason. This one differs in that its `models` are
 * bytes rather than figures, and that nothing in the engine reads them yet — see `place-file.ts`
 * for why the manifest names them and `place-record.ts` for why the published record does not.
 */

import type { PlaceFiles } from "./bundle";
import type { LoadedPlace } from "./load-place";
import {
  isPlaceManifest,
  isSafePathName,
  PLACE_MANIFEST_FILE,
  type PlaceManifest,
} from "./place-file";
import {
  isPlaceRecord,
  PLACE_COLLECTION,
  PLACE_RECORD_VERSION,
  type PlaceRecord,
} from "./place-record";

/**
 * A place, whole: what it is called, what runs, and what travels with it.
 *
 * **`scripts` is exactly what the bundler takes**, so running a project needs no step between the
 * two — and `manifest.scripts` is redundant with its keys on purpose, because the manifest is what
 * a zip and a record carry and the redundancy is what `isPlaceProject` checks.
 *
 * **`models` is empty in every place this engine can currently load**, and it is here rather than
 * added later so that the editor, the zip and the record all have somewhere to put a binary
 * attachment from the first version that has one. Adding a field to a type is cheap; adding one to
 * three file formats and every test that reads them is not.
 */
export interface PlaceProject {
  readonly manifest: PlaceManifest;
  readonly scripts: PlaceFiles;
  /** Attachment files by the name the manifest gives them. */
  readonly models: Readonly<Record<string, Uint8Array>>;
  /**
   * Level documents by the name the manifest gives them, as the JSON text they are.
   *
   * **Text, so this is `isStringMap`'s half of the story rather than `isByteMap`'s.** A model
   * is binary the engine decodes; a level is a document, and reading it back as anything other
   * than the text it was written as would mean a conversion in the middle of a pipeline whose
   * whole value is that the file is the artefact.
   *
   * Where `models` is "carried, not read" (see `place-file.ts`), a level **is** read: the
   * engine puts it in the world before the script runs, and a script can ask for it by name.
   */
  readonly levels: Readonly<Record<string, string>>;
}

/**
 * Whether a value is a project this can save or run.
 *
 * **Written for the autosave path, which is why it exists at all.** IndexedDB hands back whatever
 * was stored under a key, across sessions and versions of this engine, so a draft read back has to
 * be checked the way a zip is checked — with `isPlaceManifest` gating the world fields rather than a
 * second set of rules about them.
 *
 * The checks `isPlaceManifest` cannot make are the ones about agreement: that every name the
 * manifest claims is actually present, and that nothing is present unclaimed. A project whose
 * manifest and contents disagree is the same defect the zip loader refuses, one level up.
 */
export const isPlaceProject = (value: unknown): value is PlaceProject => {
  if (typeof value !== "object" || value === null) return false;
  const project = value as Record<string, unknown>;

  if (!isPlaceManifest(project.manifest)) return false;
  if (!isStringMap(project.scripts)) return false;
  if (!isByteMap(project.models)) return false;
  if (!isStringMap(project.levels)) return false;

  const manifest = project.manifest;
  const scripts = project.scripts as Record<string, string>;
  const models = project.models as Record<string, Uint8Array>;
  const levels = project.levels as Record<string, string>;

  // **Both directions.** A manifest naming a file the project does not hold is a place that will
  // not open; a file the manifest does not name is a file the loader will refuse the zip for, and
  // which no editor would have written knowingly.
  for (const name of manifest.scripts) {
    if (!Object.hasOwn(scripts, name)) return false;
  }
  for (const name of manifest.models ?? []) {
    if (!Object.hasOwn(models, name)) return false;
  }
  for (const name of manifest.levels ?? []) {
    if (!Object.hasOwn(levels, name)) return false;
  }
  for (const name of Object.keys(scripts)) {
    if (!manifest.scripts.includes(name)) return false;
  }
  for (const name of Object.keys(models)) {
    if (!(manifest.models ?? []).includes(name)) return false;
  }
  for (const name of Object.keys(levels)) {
    if (!(manifest.levels ?? []).includes(name)) return false;
  }

  return true;
};

/** Whether a value is a map of names to source, as `scripts` is. */
const isStringMap = (value: unknown): value is Record<string, string> => {
  if (typeof value !== "object" || value === null) return false;
  return Object.values(value).every((entry) => typeof entry === "string");
};

/** Whether a value is a map of names to bytes, as `models` is. */
const isByteMap = (value: unknown): value is Record<string, Uint8Array> => {
  if (typeof value !== "object" || value === null) return false;
  return Object.values(value).every((entry) => entry instanceof Uint8Array);
};

/**
 * A place with one script in it, for a person to start from.
 *
 * **The seed is the caller's, and it is the only thing about the world this decides.** Everything
 * else the starter builds is relative to the origin, so a new place lands on whatever terrain the
 * seed produces without anything in the script having to know it.
 */
export const emptyPlaceProject = (seed: number): PlaceProject => ({
  manifest: {
    name: "untitled place",
    seed,
    entry: STARTER_SCRIPT_FILE,
    scripts: [STARTER_SCRIPT_FILE],
  },
  scripts: { [STARTER_SCRIPT_FILE]: STARTER_SCRIPT },
  models: {},
  levels: {},
});

/** The file a new place's starter program is written to. */
export const STARTER_SCRIPT_FILE = "main.ts";

/**
 * What a new place starts from.
 *
 * **Four things, and every one of them is a different kind of place fact**: a shape is geometry, a
 * light is a light, a zone is the only reactivity this engine has (ADR 0017 — there are no
 * entities), and the tick is where a script hears about it. A person who has never seen this
 * engine should be able to read it and know what it can do, and these are all of it that fits on
 * a screen.
 *
 * `len` is a half-extent, which is the thing a place author gets wrong first and so is commented
 * where it is used rather than left to the reference.
 */
export const STARTER_SCRIPT = `import { createLight, createShape, createZone, log, onTick } from "voxelscape";

// A shape is geometry: a box added to the terrain's own fold. \`len\` is a half-extent, so this
// one is 8 wide, not 4.
createShape({
  place: "starter",
  id: "plinth",
  at: [0, 34, 0],
  shape: { type: "Box", len: { x: 8, y: 4, z: 8 } },
  combine: "Add",
});

// A light is not a coloured box. It goes out when it is removed, and it is the brightest at the
// edge of its own radius, where \`intensity\` says.
createLight({
  id: "lamp",
  at: [0, 42, 0],
  colour: { r: 255, g: 214, b: 140 },
  radius: 90,
  intensity: 1,
});

// A zone is the whole of a place's reactivity in this build: a box, drawn where it is, that
// notices the player walking into it.
createZone({
  id: "centre",
  label: "the centre",
  box: [
    [-10, 34, -10],
    [10, 48, 10],
  ],
});

onTick((info) => {
  for (const event of info.events) {
    if (event.kind === "zone-entered") log(\`arrived at \${event.zoneId}\`);
    if (event.kind === "zone-left") log(\`left \${event.zoneId}\`);
  }
});
`;

/**
 * Writes a project out as the zip `readPlaceZip` opens.
 *
 * **The manifest written is the project's own, with both lists re-derived from what it actually
 * holds.** The alternative is trusting a manifest that may have been edited independently of the
 * files beside it, and a zip whose manifest and contents disagree is refused by the very loader
 * this is meant to feed — so the two are made to agree here rather than discovered there.
 *
 * **Every name is checked before a byte is written.** A project holding a path that walks out of
 * its own root is a bug in whatever produced it, and writing it would produce an archive that
 * cannot be opened by this engine and gives no reason why.
 *
 * @returns The zip's bytes. Read with `readPlaceZip`.
 */
export const writePlaceZip = async (project: PlaceProject): Promise<Blob> => {
  // **`jszip` imported here rather than at the top, which is the whole of ADR 0021's second half.**
  // This module is reachable from the application root — the editor holds a project, and its state
  // needs `emptyPlaceProject` — so a top-level import would put a zip writer in every session's
  // first frame for a feature that only one button uses. A Save that takes a moment to reach for
  // the archive is a button a person is watching; a 97 kB reader they never asked for is not.
  const { default: JSZip } = await import("jszip");

  // **Paths first, and before the coherence check**, because a name that walks out of its own root
  // is the more specific failure and `isPlaceManifest` refuses it too — under a message about the
  // manifest and the files disagreeing, which would be true and would not be the reason.
  for (const name of [
    ...project.manifest.scripts,
    ...(project.manifest.models ?? []),
    ...(project.manifest.levels ?? []),
  ]) {
    if (!isSafePathName(name)) {
      throw new Error(
        `the manifest names "${name}", which is not a path this can write`,
      );
    }
  }

  if (!isPlaceProject(project)) {
    throw new Error(
      "this project is not one a place can be written from — its manifest and its files disagree",
    );
  }

  // **Re-derived, and absent when empty** for each of the two lists — the rule `models` already
  // followed, and the reason a place with no attachments carries no key at all: an older reader
  // then sees the manifest it always saw rather than one with two empty lists in it.
  const manifest: PlaceManifest = {
    ...project.manifest,
    scripts: Object.keys(project.scripts),
    ...(Object.keys(project.models).length > 0
      ? { models: Object.keys(project.models) }
      : {}),
    ...(Object.keys(project.levels).length > 0
      ? { levels: Object.keys(project.levels) }
      : {}),
  };

  const zip = new JSZip();
  zip.file(PLACE_MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`);
  for (const [name, source] of Object.entries(project.scripts)) {
    zip.file(name, source);
  }
  for (const [name, bytes] of Object.entries(project.models)) {
    zip.file(name, bytes);
  }
  for (const [name, text] of Object.entries(project.levels)) {
    zip.file(name, text);
  }

  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
};

/**
 * The record a project becomes when its owner publishes it.
 *
 * **`models` and `levels` are not carried, and nothing here drops either silently.**
 *
 * A model is the harder half: a record is JSON, an attachment is bytes, and carrying one means
 * a blob upload, a URI and a CID, which needs a publisher this repository does not have. A level
 * is *text* and could go into a record as-is — but a record is a published artefact with a
 * committed NSID and a version field (ADR 0044), and changing its shape is a decision about the
 * published format rather than about this function. So a place carrying either refuses, and
 * `writePlaceZip` is how it travels until somebody decides otherwise.
 *
 * **Refused rather than dropped**, which is the whole of it: a place published without its level
 * would be a place that opens fine and is missing the room somebody built.
 */
export const makePlaceRecord = (
  project: PlaceProject,
  createdAt: string,
): PlaceRecord => {
  if (
    Object.keys(project.models).length > 0 ||
    Object.keys(project.levels).length > 0
  ) {
    throw new Error(
      "this place carries an attachment or a level nothing can publish yet — save it as a zip instead",
    );
  }

  const manifest = project.manifest;
  return {
    $type: PLACE_COLLECTION,
    version: PLACE_RECORD_VERSION,
    name: manifest.name,
    seed: manifest.seed,
    ...(manifest.spawn !== undefined ? { spawn: manifest.spawn } : {}),
    entry: manifest.entry,
    createdAt,
    scripts: Object.keys(project.scripts)
      .sort()
      .map((name) => ({ name, source: project.scripts[name] })),
  };
};

/**
 * The project a zip becomes.
 *
 * **Not a conversion — the same values under a different name.** `readPlaceZip` has already
 * validated the manifest and read every file it named, so there is nothing left to check that
 * `isPlaceProject` would not be checking twice. The function exists so the editor and the host
 * have one place to get a project from rather than assembling `{ manifest, files, models }` at
 * each call site, which is the shape this type exists to stop.
 */
export const projectFromZip = (loaded: LoadedPlace): PlaceProject => ({
  manifest: loaded.manifest,
  scripts: loaded.files,
  models: loaded.models,
  levels: loaded.levels,
});

/**
 * The project a published record becomes.
 *
 * **Checked twice, for two different questions.** A record came from somebody else's client, so it
 * is validated with `isPlaceRecord` first — and a record that passes every rule there still has to
 * produce a project that passes `isPlaceProject`, because the two ask different questions: one is
 * whether this is a place, the other whether it is a place whose files are all present.
 *
 * The scripts are sorted into name order because a record lists them in whatever order its
 * publisher walked them, and a project read back should not depend on that.
 */
export const projectFromRecord = (value: unknown): PlaceProject | null => {
  if (!isPlaceRecord(value)) return null;

  const scripts: Record<string, string> = {};
  for (const script of value.scripts) {
    scripts[script.name] = script.source;
  }

  const project: PlaceProject = {
    manifest: {
      name: value.name,
      seed: value.seed,
      ...(value.spawn !== undefined ? { spawn: value.spawn } : {}),
      entry: value.entry,
      scripts: Object.keys(scripts).sort(),
    },
    scripts,
    models: {},
    // **A record carries neither, and says so rather than inventing them.** `makePlaceRecord`
    // refuses a project that has either, so a record read back here is a project that never had
    // one; writing `levels: {}` is the honest reading rather than a default that hides a change.
    levels: {},
  };

  return isPlaceProject(project) ? project : null;
};
