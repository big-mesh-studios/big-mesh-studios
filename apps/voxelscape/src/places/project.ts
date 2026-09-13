// A place as something a creator works on: the manifest that names the world,
// plus the script files it carries, held together as one project. A place zip
// is the project's single artifact — a draft is saved, an opened place is
// read back, and a publish happens, all through the same manifest + scripts
// shape — so nothing outside this module needs to know how the two relate.
import JSZip from "jszip";
import { readPlaceZip } from "./package.ts";
import {
  PLACE_MANIFEST_FILE,
  PLACE_MIME_TYPE,
  type PlaceManifest,
} from "./place.ts";
import VOXELSCAPE_TYPES_SOURCE from "./voxelscape.d.ts?raw";
import EFFECTS_SOURCE from "./effects.ts?raw";
import CUTSCENE_SOURCE from "./cutscene.ts?raw";
import MOTION_SOURCE from "./motion.ts?raw";
import SANDBOX_SOURCE from "./sandbox.ts?raw";

/** The script file a freshly created place starts with. */
export const MAIN_SCRIPT_FILE = "main.ts";

/** The path the editor's checker carries {@link VOXELSCAPE_TYPES} under; never a project script or a sandbox load. */
export const VOXELSCAPE_TYPES_FILE = "voxelscape.d.ts";

/**
 * The `"voxelscape"` module's ambient types — the sandbox's host surface
 * (`dispatch`/`onTick`/`log`/`heightAt`/etc.) alongside `createNpc`/
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
 * plus every file its own import of `effects.ts` needs to resolve — the
 * module `dispatch`'s payload type comes from. Keyed by the path each is
 * served under; a creator's project can never carry a file by these names.
 */
export const VOXELSCAPE_TYPE_FILES: Record<string, string> = {
  [VOXELSCAPE_TYPES_FILE]: VOXELSCAPE_TYPES,
  "effects.ts": EFFECTS_SOURCE,
  "cutscene.ts": CUTSCENE_SOURCE,
  "motion.ts": MOTION_SOURCE,
  "sandbox.ts": SANDBOX_SOURCE,
};

/** The source a new place begins editing from, typed the way a place script expects to be. */
export const STARTER_SCRIPT = `// Your place's script. Call engine.onTick with a function and the world will
// call it each step with the shared clock and the events since the last step.
// Call engine.onPlan too and the world calls it once, before generating
// terrain, to stamp roads and houses into the ground: it returns JSON shapes,
// and the block ids it may use are on engine.blocks. engine.endings() returns
// a JSON array of the ending titles this place has already reached. The
// TypeScript types are stripped when the script loads, so the panel's
// squiggles are the whole of the type-check; imports may only reach this
// place's own script files, or "voxelscape". Run /script:demo for a working
// sample.
import * as engine from "voxelscape";

let started = false;

engine.onTick(function tick(clockMs: number, eventsJson: string): void {
  if (!started) {
    started = true;
    engine.dispatch(
      "npc",
      { id: "guide", x: 8, z: 8, name: "Guide" },
    );
    engine.log("your place started");
  }
  const events = JSON.parse(
    eventsJson,
  ) as Array<{ kind: string; producer: string }>;
  for (const event of events) {
    if (event.kind === "npc-talk") {
      engine.dispatch(
        "toast",
        { player: event.producer, text: "Hello, traveller." },
      );
    }
  }
});
`;

/**
 * One working place: the manifest at the top of its zip, every script file it
 * names as text, and every rm-stacker model it carries as bytes, each keyed by
 * the manifest-relative path.
 */
export interface PlaceProject {
  manifest: PlaceManifest;
  scripts: Record<string, string>;
  models: Record<string, Uint8Array>;
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
  models: {},
});

/** The zip a project is published as: the manifest plus each script and model file. */
export const writePlaceZip = async (project: PlaceProject): Promise<Blob> => {
  const zip = new JSZip();
  const scriptNames = Object.keys(project.scripts);
  const modelNames = Object.keys(project.models);
  const manifest: PlaceManifest = {
    ...project.manifest,
    // The script list is derived from the file map, so the two can never drift
    // apart in the artifact a reader opens. A place with no models carries no
    // model list at all, so an older reader sees exactly the manifest it did.
    scripts: scriptNames,
  };
  if (modelNames.length > 0) {
    manifest.models = modelNames;
  }
  zip.file(PLACE_MANIFEST_FILE, JSON.stringify(manifest));
  for (const [name, source] of Object.entries(project.scripts)) {
    zip.file(name, source);
  }
  for (const [name, bytes] of Object.entries(project.models)) {
    zip.file(name, bytes);
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
  const models: Record<string, Uint8Array> = {};
  for (const name of manifest.models ?? []) {
    models[name] = new Uint8Array(
      await loaded.file(name)!.async("arraybuffer"),
    );
  }
  return { manifest, scripts, models };
};
