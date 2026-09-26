// A place as something a creator works on: the manifest that names the world,
// plus the script files it carries and the level plans its scripts build their
// terrain from, held together as one project. A place zip is the project's
// single artifact — a draft is saved, an opened place is read back, and a
// publish happens, all through the same manifest + scripts + levels shape — so
// nothing outside this module needs to know how the two relate.
import JSZip from "jszip";
import { readPlaceZip } from "./package.ts";
import {
  levelFileFor,
  levelSpecifierFor,
  PLACE_MANIFEST_FILE,
  PLACE_MIME_TYPE,
  type PlaceManifest,
} from "./place.ts";
import VOXELSCAPE_TYPES_SOURCE from "./voxelscape.d.ts?raw";
import EFFECTS_SOURCE from "./effects.ts?raw";
import CUTSCENE_SOURCE from "./cutscene.ts?raw";
import MOTION_SOURCE from "./motion.ts?raw";
import SANDBOX_SOURCE from "./sandbox.ts?raw";
import EVENTS_SOURCE from "./events.ts?raw";

/** The script file a freshly created place starts with. */
export const MAIN_SCRIPT_FILE = "main.ts";

/** The path the editor's checker carries {@link VOXELSCAPE_TYPES} under; never a project script or a sandbox load. */
export const VOXELSCAPE_TYPES_FILE = "voxelscape.d.ts";

/**
 * The `"voxelscape"` module's ambient types — the sandbox's host surface
 * (`dispatch`/`onTick`/`log`/`getHeightAt`/etc.) alongside `createNpc`/
 * `createProp` (ADR 0050) — fed to the editor's language worker once so
 * every script's checker sees the same API without repeating its shape in
 * each file. Read back from `voxelscape.d.ts`, the same file `tsc` checks the
 * app's own scripts against. `ModelsByName` starts empty here; a place's own
 * attached models augment it live (`model-dts.ts`'s generated `models.d.ts`),
 * the same declaration-merging seam a demo script's own checked-in
 * augmentation (e.g. `demo-scripts/models.d.ts`) uses.
 */
export const VOXELSCAPE_TYPES: string = VOXELSCAPE_TYPES_SOURCE;

/**
 * Every ambient file the editor's language worker needs alongside a
 * project's own scripts, never as one of them: `voxelscape.d.ts` itself,
 * plus every file its own imports of `effects.ts` (`dispatch`'s payload
 * type) and `events.ts` (`onTick`'s event type) need to resolve. Keyed by
 * the path each is served under; a creator's project can never carry a file
 * by these names.
 */
export const VOXELSCAPE_TYPE_FILES: Record<string, string> = {
  [VOXELSCAPE_TYPES_FILE]: VOXELSCAPE_TYPES,
  "effects.ts": EFFECTS_SOURCE,
  "cutscene.ts": CUTSCENE_SOURCE,
  "motion.ts": MOTION_SOURCE,
  "sandbox.ts": SANDBOX_SOURCE,
  "events.ts": EVENTS_SOURCE,
};

/** The source a new place begins editing from, typed the way a place script expects to be. */
export const STARTER_SCRIPT = `import { createNpc, dispatch, log, onTick } from "voxelscape";

let started = false;

onTick((clockMs, events) => {
  if (!started) {
    started = true;
    createNpc({ id: "guide", x: 8, z: 8, name: "Guide" });
    log("your place started");
  }
  for (const event of events) {
    if (event.kind === "npc-talk") {
      dispatch("toast", { player: event.producer, text: "Hello, traveller." });
    }
  }
});
`;

/**
 * One model a project carries, by the name its scripts attach it under.
 * `bytes` is always here — decoded to draw it, to generate its ambient types,
 * to spawn it — but a name attached from disk, or from an account other than
 * the signed-in one, carries no `ref`: publishing the place is what gives it
 * one, by publishing a copy of its own under the signed-in account. A name
 * attached from the signed-in account's own already-published models already
 * has a record to point at, so it carries its ref from the moment it is
 * attached.
 */
export interface AttachedModel {
  bytes: Uint8Array;
  ref?: { uri: string; cid: string };
}

/**
 * One working place: the manifest at the top of its zip, every script file it
 * names as text, every level plan its scripts build terrain from, and every
 * rm-stacker model it carries, each keyed by the manifest-relative path or the
 * bare name a script addresses it under.
 */
export interface PlaceProject {
  manifest: PlaceManifest;
  scripts: Record<string, string>;
  /**
   * The level plans a place carries, keyed by the bare name `plan` takes them
   * by. A level is a plan, not code: the text is exactly what an `onPlan`
   * handler would have returned, and it is validated by the same parser at the
   * moment the place's plan is compiled.
   */
  levels: Record<string, string>;
  models: Record<string, AttachedModel>;
}

/**
 * A new place project, seeded and starting from a one-file starter script. It
 * starts in `solo:edit` — a private build, safe to publish before deciding
 * whether to open it up to other players.
 */
export const emptyPlaceProject = (seed: number): PlaceProject => ({
  manifest: {
    name: "",
    seed,
    spawn: [0, 0, 0],
    scripts: [MAIN_SCRIPT_FILE],
    mode: "solo:edit",
  },
  scripts: { [MAIN_SCRIPT_FILE]: STARTER_SCRIPT },
  levels: {},
  models: {},
});

/** The zip a project is published as: the manifest plus each script, level, and model file. */
export const writePlaceZip = async (project: PlaceProject): Promise<Blob> => {
  const zip = new JSZip();
  const scriptNames = Object.keys(project.scripts);
  const levelNames = Object.keys(project.levels);
  const modelNames = Object.keys(project.models);
  const manifest: PlaceManifest = {
    ...project.manifest,
    // The script list is derived from the file map, so the two can never drift
    // apart in the artifact a reader opens. A place with no models carries no
    // model list at all, so an older reader sees exactly the manifest it did.
    scripts: scriptNames,
  };
  if (levelNames.length > 0) {
    manifest.levels = levelNames.map(levelFileFor);
  }
  if (modelNames.length > 0) {
    manifest.models = modelNames;
  }
  zip.file(PLACE_MANIFEST_FILE, JSON.stringify(manifest));
  for (const [name, source] of Object.entries(project.scripts)) {
    zip.file(name, source);
  }
  for (const [name, source] of Object.entries(project.levels)) {
    zip.file(levelFileFor(name), source);
  }
  for (const [name, model] of Object.entries(project.models)) {
    zip.file(name, model.bytes);
  }
  const generated = await zip.generateAsync({ type: "arraybuffer" });
  return new Blob([generated], { type: PLACE_MIME_TYPE });
};

/**
 * Reads a place zip back into an editable project. The manifest gate is
 * `readPlaceZip`, so a zip with no manifest, a malformed one, or one naming a
 * script it does not carry is refused before any file is read.
 */
export const readPlaceProject = async (zip: Blob): Promise<PlaceProject> => {
  const manifest = await readPlaceZip(zip);
  const loaded = await JSZip.loadAsync(await zip.arrayBuffer());
  const scripts: Record<string, string> = {};
  for (const name of manifest.scripts ?? []) {
    // readPlaceZip has already refused a zip missing a named file, so this
    // file is there to read.
    scripts[name] = await loaded.file(name)!.async("text");
  }
  const models: Record<string, AttachedModel> = {};
  for (const name of manifest.models ?? []) {
    // A zip read fresh off a device or a repository carries no record of
    // whether any of its models are already published anywhere — that's
    // resolved fresh the next time this project is published.
    models[name] = {
      bytes: new Uint8Array(await loaded.file(name)!.async("arraybuffer")),
    };
  }
  const levels: Record<string, string> = {};
  for (const file of manifest.levels ?? []) {
    // readPlaceZip has already refused a zip missing a named level, so this
    // file is there to read. Its plan is validated where the place's plan is
    // compiled, by the same parser that reads a handler's own return value.
    levels[levelSpecifierFor(file) ?? file] = await loaded
      .file(file)!
      .async("text");
  }
  return { manifest, scripts, levels, models };
};
