/**
 * The place editor's state: the project being worked on, which file is in front of the person,
 * and the four things that can happen to it — new, open, run, save.
 *
 * ## Why this is a module and not the panel's own signals
 *
 * **Because the draft has to outlive the panel.** The panel unmounts every time somebody closes it,
 * and `Console` keeps its own history in module state for the same reason (`console.tsx`, on one
 * view so one history). A place half-written when the panel closed would be gone by the time the
 * person came back, which is the fastest way to make an editor feel hostile.
 *
 * ## Every edit goes through `edit`
 *
 * **One function owns the project's shape, and the panel cannot write to it.** Adding a file,
 * removing one, typing in one and renaming the place are the same operation with different
 * arguments, and having four of them means four places where the manifest's `scripts` list can
 * drift from the files beside it — which `isPlaceProject` refuses and `writePlaceZip` would refuse
 * again. So `edit` rewrites the manifest's list from the project on every change, and the only way
 * a project becomes incoherent is to reach past this module.
 *
 * ## Autosave is a consequence of editing, not a thing anybody asks for
 *
 * **Because the alternative is a person who trusted the editor and lost their work.** A debounce
 * rather than a save button, since a button is something to remember to press before navigating,
 * and this repository's sibling editor uses the same shape (`apps/sdf-modeller`, ADR 0034).
 */

import { createSignal, type Accessor } from "solid-js";

import {
  emptyPlaceProject,
  isPlaceProject,
  STARTER_SCRIPT_FILE,
  type PlaceProject,
} from "../project";
import { isSafePathName, MAX_PLACE_FILES } from "../place-file";
import { available as draftStorageAvailable, saveDraft } from "./drafts";

/** How long editing stops before the draft is written, in milliseconds. */
export const AUTOSAVE_MS = 1000;

/** The seed a new place starts from when the caller does not say. */
export const DEFAULT_SEED = 20260901;

export interface PlaceEditorState {
  /** The place being worked on. Never incoherent — see the note above on `edit`. */
  readonly project: Accessor<PlaceProject>;
  /** The file in front of the person, as a key into `project.scripts`. */
  readonly active: Accessor<string>;
  /** Whether a draft has been written since the last change. */
  readonly saved: Accessor<boolean>;
  /** Whether there is anywhere to keep a draft. False means the header says so. */
  readonly canSave: Accessor<boolean>;

  setActive(name: string): void;
  /** Replaces one script's source, and nothing else. */
  write(name: string, source: string): void;
  /**
   * Puts a level into the place, or replaces the one already there under that name.
   *
   * **Refused when the name is already a script or a model** — one flat namespace per place,
   * and a collision would leave a project whose manifest and files disagree, which
   * `isPlaceProject` refuses, so the draft would quietly stop saving.
   */
  writeLevel(name: string, text: string): void;
  /** Renames the place. Refused when the new name is empty or over the limit. */
  setName(name: string): void;
  setSeed(seed: number): void;
  setSpawn(spawn: PlaceProject["manifest"]["spawn"]): void;

  /** Adds a script. Refused when it would pass `MAX_PLACE_FILES` or the name is taken. */
  addScript(name?: string): string | null;
  /** Removes a script, unless it is the entry and the only one. */
  removeScript(name: string): string | null;
  /** Makes a script the entry. */
  setEntry(name: string): void;

  /** Throws the current project away and starts a new place. */
  newProject(seed?: number): void;
  /** Adopts a project read from a zip or a repository, or refuses it and says why. */
  adopt(project: unknown): string | null;

  /** Writes the draft out now, rather than after the debounce. */
  flush(): Promise<void>;
  dispose(): void;
}

/**
 * The editor's state, over whatever it was handed.
 *
 * @param seed - the seed a new place starts from, so a session's places are reproducible
 */
export const createPlaceEditor = (
  seed: number = DEFAULT_SEED,
): PlaceEditorState => {
  const [project, setProject] = createSignal<PlaceProject>(
    emptyPlaceProject(seed),
  );
  const [active, setActive] = createSignal(STARTER_SCRIPT_FILE);
  const [saved, setSaved] = createSignal(false);

  /**
   * Every change, in one place.
   *
   * **The manifest's script list is rebuilt from the files rather than patched.** That is the whole
   * reason this exists: a rename, an add and a type all have to leave the manifest agreeing with
   * what is beside it, and three code paths each doing that themselves is three ways for one of
   * them to forget.
   *
   * `models` is carried through untouched, so an editor edit never loses an attachment a place was
   * opened with.
   */
  const edit = (
    change: (project: PlaceProject) => PlaceProject | null,
    keepActive = true,
  ): void => {
    setProject((current) => {
      const next = change(current);
      if (next === null) return current;
      return {
        ...next,
        // **Both attachment lists re-derived, not just `scripts`.** Re-deriving the scripts and
        // carrying the rest was fine while nothing else could be edited from here; a level
        // written through `writeLevel` is, and a manifest that names a level the project does
        // not hold is exactly the disagreement `isPlaceProject` refuses.
        manifest: {
          ...next.manifest,
          scripts: Object.keys(next.scripts),
          ...(Object.keys(next.models).length > 0
            ? { models: Object.keys(next.models) }
            : {}),
          ...(Object.keys(next.levels).length > 0
            ? { levels: Object.keys(next.levels) }
            : {}),
        },
      };
    });
    if (!keepActive) return;
    // **The active file follows the manifest, not the other way round.** Removing the file
    // somebody is looking at and leaving the tab open would leave the editor showing something
    // that is no longer there.
    if (!(active() in project().scripts)) {
      setActive(project().manifest.entry);
    }
    schedule();
  };

  let timer: ReturnType<typeof setTimeout> | undefined;

  /** Clears any pending write and marks the draft as out of date. */
  const schedule = (): void => {
    setSaved(false);
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      void saveDraft(project());
    }, AUTOSAVE_MS);
  };

  const flush = async (): Promise<void> => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    await saveDraft(project());
    setSaved(true);
  };

  return {
    project,
    active,
    saved,
    canSave: draftStorageAvailable,

    setActive: (name) => setActive(name),

    write: (name, source) =>
      edit((current) =>
        name in current.scripts
          ? { ...current, scripts: { ...current.scripts, [name]: source } }
          : null,
      ),

    /**
     * Puts a level into the place, or takes the one that is there away.
     *
     * **One name and one slot**, because a level is a level: the editor's output is one
     * document, and `writeLevel(LEVEL_NAME, text)` replacing whatever was there is the behaviour
     * somebody expects from a Save. A place that grew a second, differently-shaped level is a
     * format nobody has designed yet.
     *
     * **Writing is refused when the name is already a script or a model.** One flat namespace
     * per place (`place-file.ts`), and a collision would be a project whose manifest and files
     * disagree — which `isPlaceProject` refuses, so the draft would stop saving and say nothing
     * about why.
     */
    writeLevel: (name, text) =>
      edit((current) => {
        if (name in current.scripts || name in current.models) return null;
        return { ...current, levels: { ...current.levels, [name]: text } };
      }),

    setName: (name) =>
      edit((current) =>
        name.length === 0
          ? null
          : {
              ...current,
              manifest: { ...current.manifest, name },
            },
      ),

    setSeed: (next) =>
      edit((current) =>
        Number.isFinite(next)
          ? { ...current, manifest: { ...current.manifest, seed: next } }
          : null,
      ),

    setSpawn: (spawn) =>
      edit((current) => {
        const manifest = { ...current.manifest };
        if (spawn === undefined) delete manifest.spawn;
        else manifest.spawn = spawn;
        return { ...current, manifest };
      }),

    addScript: (name) => {
      let chosen: string | null = null;

      // **Every read happens inside the updater**, because a setter's value lands after a flush
      // and `project()` therefore still answers with the previous one until then. The updater is
      // handed the signal's own current value, so this is the only place the new file count and
      // the taken names can be trusted — reading them outside is how this became an infinite loop
      // that added the same name two hundred times.
      edit((current) => {
        const taken = current.manifest.scripts;
        if (taken.length >= MAX_PLACE_FILES) return null;

        const pick = firstFreeName(taken, name);
        if (pick === null) return null;
        chosen = pick;

        return { ...current, scripts: { ...current.scripts, [pick]: "" } };
      }, false);

      if (chosen === null) return null;
      setActive(chosen);
      return chosen;
    },

    removeScript: (name) => {
      let removed: string | null = null;
      let nextActive: string | null = null;

      edit((current) => {
        // **The last file cannot be removed, because then the place has no entry.** A place with
        // no program is not a place, and the alternative — silently making another file the entry
        // — changes what runs without anybody asking.
        if (
          current.manifest.entry === name &&
          Object.keys(current.scripts).length === 1
        ) {
          return null;
        }

        const scripts = Object.fromEntries(
          Object.entries(current.scripts).filter(([file]) => file !== name),
        );
        if (!(name in current.scripts)) return null;

        const entry =
          current.manifest.entry === name
            ? Object.keys(scripts)[0]
            : current.manifest.entry;
        if (entry === undefined) return null;

        removed = name;
        nextActive = name === active() ? entry : null;

        return {
          ...current,
          scripts,
          manifest: { ...current.manifest, entry },
        };
      }, false);

      if (removed === null) return null;
      // **And says which file it moved to by opening it**, so the person is not left looking at a
      // file that is no longer there. Null means the file they were on is still there.
      if (nextActive !== null) setActive(nextActive);
      return removed;
    },

    setEntry: (name) =>
      edit((current) =>
        name in current.scripts
          ? { ...current, manifest: { ...current.manifest, entry: name } }
          : null,
      ),

    newProject: (next = seed) => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      setProject(emptyPlaceProject(next));
      setActive(STARTER_SCRIPT_FILE);
      setSaved(false);
    },

    adopt: (candidate) => {
      if (!isPlaceProject(candidate)) {
        return "that is not a place this editor can open";
      }
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      setProject(candidate);
      setActive(candidate.manifest.entry);
      setSaved(false);
      return null;
    },

    flush,

    dispose: () => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
    },
  };
};

/**
 * The name a new file gets: the one asked for if it is usable, otherwise the first `untitled-N.ts`
 * that is not taken.
 *
 * **Asked-for names are checked rather than trusted**, because a name becomes a key in a zip and
 * a module id in the bundler, and `isSafePathName` is the whole of the traversal defence
 * (ADR 0021). A rejected name is not an error here — the person gets `untitled-2.ts` instead,
 * because the alternative is a dialog about a file name they have not typed yet.
 */
const firstFreeName = (
  taken: readonly string[],
  asked?: string,
): string | null => {
  if (asked !== undefined) {
    if (!isSafePathName(asked) || !asked.endsWith(".ts")) return null;
    return taken.includes(asked) ? null : asked;
  }
  for (let index = 1; ; index++) {
    const name = `untitled-${index}.ts`;
    if (!taken.includes(name)) return name;
  }
};
