/**
 * What this application adds to the model file format, and what it merely re-exports.
 *
 * ## The format itself is not here
 *
 * **`manifest.json` and its rules live in `@big-mesh-studios/csg`**, because `apps/spacescape`
 * now reads these files too — a place attaches its props and NPCs as `.sdfmod` models, and a
 * second copy of the rules would be a second thing to keep in step with the first. Everything
 * below that is a re-export exists so that the rest of this application does not have to know
 * where the format went; `save-file.ts`, `project.ts` and `app.tsx` all name this module and
 * none of them should have to change because a second application started reading the files.
 *
 * ## What is genuinely still this application's
 *
 * **Three things, and all three are the same kind: a narrowing the shared format cannot make.**
 *
 * - `ProjectView` narrows `mode` and `resolution` to what this application's viewport offers.
 *   The shared validator checks that `mode` is a name and `resolution` a positive number,
 *   because that package does not know what a mesher is. The list belongs here, where the
 *   meshers are.
 * - `isSaveableProject` is the check that turns "a manifest this build wrote" into "a model
 *   this build will open", and it is the only place the two vocabularies meet.
 *
 * ## Why the bounds are re-checked rather than trusted
 *
 * **`MAX_MANIFEST_PARTS` and `MAX_MANIFEST_COLOURS` are written down in `@big-mesh-studios/csg`
 * rather than imported from this application**, because the shared module cannot import a
 * model store or a palette panel to read a number — the first drags in the meshing package and
 * the second a stylesheet, and a validator for a file's contents is not the place to pull in
 * either. That makes duplication the only option, and duplication is only safe while something
 * checks it. The test at the bottom of this file is that something.
 */

import { PROJECT_VERSION, isProjectManifest } from "@big-mesh-studios/csg";
import type { ProjectManifest } from "@big-mesh-studios/csg";

import { MESH_MODES, RESOLUTIONS } from "../model/mesh-model";

export {
  MAX_MANIFEST_COLOURS,
  MAX_MANIFEST_PARTS,
  MAX_PART_ID,
  PROJECT_EXTENSION,
  PROJECT_MANIFEST_FILE,
  PROJECT_MIME_TYPE,
  PROJECT_MODEL_FILE,
  PROJECT_VERSION,
  isProjectManifest,
  projectName,
} from "@big-mesh-studios/csg";

/** The mesher modes this application offers, and therefore the only ones it will open. */
const MODES: readonly string[] = MESH_MODES.map((mode) => mode.value);

/**
 * How this application was looking at the model, which is a narrower thing than the
 * manifest's `view`.
 *
 * **A subtype of the format's rather than a replacement for it.** A manifest read off disk has
 * already been checked for shape by `isProjectManifest`; this is what says whether the shape
 * it found is one this application can act on, and a file that fails that is a file whose
 * `mode` names a mesher this build does not have.
 */
export interface ProjectView {
  readonly mode: (typeof MESH_MODES)[number]["value"];
  readonly resolution: number;
}

/** A manifest this build wrote and will open, rather than merely one it could parse. */
export type SaveableProjectManifest = ProjectManifest & {
  readonly view: ProjectView;
};

/**
 * Whether a manifest names a mesher and a resolution this application offers.
 *
 * **A second check rather than a stricter first one**, because the shared validator is a
 * *file format* check — "is this well formed" — and this is an *application* check — "is this
 * mine". Merging them would mean the shared module grew a mesher vocabulary it has no business
 * having, and every other application that read these files would have to agree with this one.
 */
export const isSaveableProject = (
  value: unknown,
): value is SaveableProjectManifest => {
  if (!isProjectManifest(value)) return false;
  const view = value.view;
  if (!MODES.includes(view.mode)) return false;
  return (RESOLUTIONS as readonly number[]).includes(view.resolution);
};

/**
 * A manifest this build wrote, for a document this application holds.
 *
 * **Not a cast dressed as a constructor.** It refuses what `isSaveableProject` refuses, so a
 * caller building a manifest by hand gets the same answer here as a caller reading one off
 * disk — which is the only way two paths into the same writer cannot drift apart.
 *
 * **Every field has a value before `overrides` is applied.** A manifest with no `palette` is
 * not a manifest with an empty palette; it is a manifest missing a required field, and the
 * constructor would have thrown for the omission rather than for the one thing the caller
 * actually got wrong. So the defaults below are the shape of an empty model and `overrides`
 * replaces fields, rather than the caller's fields landing on top of nothing.
 */
export const projectManifest = (
  view: ProjectView,
  overrides: Partial<Omit<ProjectManifest, "version" | "view">> = {},
): SaveableProjectManifest => {
  const manifest = {
    ids: [],
    coloured: [],
    palette: [],
    ...overrides,
    version: PROJECT_VERSION,
    view,
  };
  if (!isSaveableProject(manifest)) {
    throw new Error(
      `a manifest this application cannot open: mode "${String(view.mode)}" at ${String(view.resolution)}`,
    );
  }
  return manifest;
};
