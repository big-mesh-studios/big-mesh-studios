// The `/place:editor` content: one CodeMirror tab per script file in the
// working place project, with the manifest's name, seed and spawn up top.
// The editor only owns the draft — running a script and publishing a place
// go through the world's script host and atproto publisher, so the draft is
// state the ui keeps, and the world stays what it was. This is rendered
// inside `Console`'s single panel once the place editor is open — it owns no
// overlay, scrim, or Escape handling of its own; `Console` owns those, since
// it owns the one surface both the terminal and this content share.
import {
  createSignal,
  For,
  lazy,
  Loading,
  onCleanup,
  onSettled,
  Show,
  type Component,
} from "solid-js";
import { useVoxelscape } from "../voxelscape/voxelscape-context";
import type { EditorView } from "./PlaceEditorPanes";
import { createDraftPersistence } from "../places/draft-persistence";
import {
  emptyPlaceProject,
  MAIN_SCRIPT_FILE,
  readPlaceProject,
  writePlaceZip,
  type PlaceProject,
} from "../places/project";
import { type PlaceManifest, type PublishedPlace } from "../places/place";
import styles from "./PlaceEditor.module.css";

/** One persistence handle for the whole app, so a debounced save outlives a close. */
const persist = createDraftPersistence();

/** The panel's CodeMirror tabs — the language-service bundle behind them is
 * its own lazy chunk, downloaded only once a project actually has a script
 * to show. */
const PlaceEditorPanes = lazy(() => import("./PlaceEditorPanes"));

/** What went wrong, in words a player reading the panel can act on. */
const describeError = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

/** The draft from this session, held in the module so a reopened panel is instant. */
let cachedProject: PlaceProject | null = null;

/** The first script a project should open on: the manifest's order, then the map's. */
const firstScript = (p: PlaceProject): string =>
  p.manifest.scripts?.[0] ?? Object.keys(p.scripts)[0] ?? MAIN_SCRIPT_FILE;

export const PlaceEditorContent: Component<{
  /** The content's own root element, so `Console` can tell a click or an
   * Escape inside it (CodeMirror, a manifest field) apart from one in the
   * terminal docked below it, which lives outside this element. */
  ref?(element: HTMLDivElement): void;
  /** Where Run/Publish/etc. feedback goes — the terminal's own scrollback,
   * so the editor doesn't need a status strip of its own and its CodeMirror
   * pane can reach all the way to the bottom of the space it's given. */
  onStatus(line: string): void;
}> = (props) => {
  const voxelscape = useVoxelscape();

  const [project, setProject] = createSignal<PlaceProject | null>(
    cachedProject,
  );
  const [active, setActive] = createSignal<string>(MAIN_SCRIPT_FILE);
  const [busy, setBusy] = createSignal(false);
  const [candidates, setCandidates] = createSignal<PublishedPlace[]>([]);
  // Each tab's editor view, so switching tabs can ask the now-visible one to
  // measure itself after its pane changes from display:none to display:block.
  const views = new Map<string, EditorView>();

  /** Replaces the draft, caches it for the next open, and schedules a save. */
  const commit = (next: PlaceProject | null): void => {
    cachedProject = next;
    setProject(next);
    if (next !== null) {
      persist.scheduleSave(next);
    }
  };

  // The first open loads the last working draft, starting a fresh project when
  // none exists; later opens reuse the cached one straight away.
  onSettled(() => {
    if (cachedProject !== null) {
      return;
    }
    void persist.load().then((saved) => {
      const loaded =
        saved ?? emptyPlaceProject(voxelscape.placeEditor.defaultSeed);
      cachedProject = loaded;
      setProject(loaded);
      setActive(firstScript(loaded));
      if (saved === null) {
        void persist.saveNow(loaded);
      }
    });
  });

  // The panel can be closed by the console command before a debounced save has
  // fired, so the last draft is written on the way out either way.
  onCleanup(() => {
    const p = project();
    if (p !== null) {
      void persist.saveNow(p);
    }
  });

  const scriptFiles = (): string[] => {
    const p = project();
    return p === null ? [] : Object.keys(p.scripts);
  };

  const selectFile = (name: string): void => {
    setActive(name);
    views.get(name)?.requestMeasure();
  };

  const patchManifest = (patch: Partial<PlaceManifest>): void => {
    const p = project();
    if (p === null) {
      return;
    }
    commit({ ...p, manifest: { ...p.manifest, ...patch } });
  };

  const onSpawn = (text: string): void => {
    const parts = text.split(/[,\s]+/).map(Number);
    if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
      patchManifest({ spawn: [parts[0], parts[1], parts[2]] });
    }
  };

  const updateScript = (path: string, source: string): void => {
    const p = project();
    if (p === null) {
      return;
    }
    commit({ ...p, scripts: { ...p.scripts, [path]: source } });
  };

  const addScript = (): void => {
    const p = project();
    if (p === null) {
      return;
    }
    let name = "script.js";
    for (let i = 2; p.scripts[name] !== undefined; i++) {
      name = `script${i}.js`;
    }
    commit({
      ...p,
      manifest: {
        ...p.manifest,
        scripts: [...(p.manifest.scripts ?? []), name],
      },
      scripts: { ...p.scripts, [name]: "" },
    });
    setActive(name);
  };

  const removeScript = (name: string): void => {
    const p = project();
    if (p === null) {
      return;
    }
    const scripts = { ...p.scripts };
    delete scripts[name];
    const files = Object.keys(scripts);
    commit({
      ...p,
      manifest: { ...p.manifest, scripts: files },
      scripts,
    });
    if (active() === name) {
      setActive(files[0] ?? "");
    }
  };

  const renameScript = (name: string): void => {
    const p = project();
    if (p === null) {
      return;
    }
    const nextName = window.prompt("rename the script file to:", name);
    if (nextName === null || nextName.trim() === "" || nextName === name) {
      return;
    }
    if (/[/\\]|\.\./.test(nextName)) {
      props.onStatus(`"${nextName}" cannot be a script file name`);
      return;
    }
    if (p.scripts[nextName] !== undefined) {
      props.onStatus(`"${nextName}" is already a script file`);
      return;
    }
    const scripts = { ...p.scripts };
    scripts[nextName] = scripts[name] ?? "";
    delete scripts[name];
    commit({
      ...p,
      manifest: {
        ...p.manifest,
        scripts: (p.manifest.scripts ?? Object.keys(p.scripts)).map((file) =>
          file === name ? nextName : file,
        ),
      },
      scripts,
    });
    if (active() === name) {
      setActive(nextName);
    }
  };

  const modelNames = (): string[] => Object.keys(project()?.models ?? {});

  /** Adds picked rm-stacker model files to the draft, refusing unsafe names. */
  const addModels = async (picked: FileList | null): Promise<void> => {
    const p = project();
    if (p === null || picked === null) {
      return;
    }
    const models = { ...p.models };
    const refused: string[] = [];
    for (const file of Array.from(picked)) {
      if (/[/\\]|\.\./.test(file.name)) {
        refused.push(file.name);
        continue;
      }
      models[file.name] = new Uint8Array(await file.arrayBuffer());
    }
    const names = Object.keys(models);
    commit({
      ...p,
      manifest: {
        ...p.manifest,
        models: names.length > 0 ? names : undefined,
      },
      models,
    });
    props.onStatus(
      refused.length === 0
        ? `added ${Object.keys(models).length} model(s)`
        : `refused ${refused.join(", ")} — a model name cannot hold a path`,
    );
  };

  const removeModel = (name: string): void => {
    const p = project();
    if (p === null) {
      return;
    }
    const models = { ...p.models };
    delete models[name];
    const names = Object.keys(models);
    commit({
      ...p,
      manifest: {
        ...p.manifest,
        models: names.length > 0 ? names : undefined,
      },
      models,
    });
  };

  const newProject = (): void => {
    commit(emptyPlaceProject(voxelscape.placeEditor.defaultSeed));
    setActive(MAIN_SCRIPT_FILE);
    setCandidates([]);
    props.onStatus(
      "new place started — name it, write its script, then publish",
    );
  };

  const listMine = async (): Promise<void> => {
    const did = voxelscape.placeEditor.accountDid;
    if (did === null) {
      props.onStatus("not signed in — use /account:login first");
      return;
    }
    setBusy(true);
    try {
      const published = await voxelscape.placeEditor.places.list(did);
      setCandidates(published);
      props.onStatus(
        published.length === 0
          ? "you have published no places yet"
          : "pick one of your places to open and edit",
      );
    } catch (err) {
      props.onStatus(`could not list your places — ${describeError(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const openPlace = async (place: PublishedPlace): Promise<void> => {
    setBusy(true);
    try {
      const opened = await readPlaceProject(
        await voxelscape.placeEditor.places.file(place),
      );
      commit(opened);
      setActive(firstScript(opened));
      setCandidates([]);
      props.onStatus(
        `opened "${opened.manifest.name}" — publishing again under the same name updates the place`,
      );
    } catch (err) {
      props.onStatus(`could not open that place — ${describeError(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const runActive = async (): Promise<void> => {
    const p = project();
    if (p === null) {
      return;
    }
    const entry = p.manifest.scripts?.[0];
    if (entry === undefined || p.scripts[entry] === undefined) {
      props.onStatus("name a first script in the manifest to run it");
      return;
    }
    setBusy(true);
    try {
      const line = await voxelscape.placeEditor.runScript(
        p.scripts,
        entry,
        p.manifest.seed,
        p.models,
      );
      props.onStatus(line);
    } catch (err) {
      props.onStatus(`run failed — ${describeError(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const publish = async (): Promise<void> => {
    const p = project();
    if (p === null) {
      return;
    }
    if (p.manifest.name.trim() === "") {
      props.onStatus("name the place before publishing");
      return;
    }
    setBusy(true);
    try {
      const atUri = await voxelscape.placeEditor.publisher.publish(
        await writePlaceZip(p),
      );
      setCandidates([]);
      props.onStatus(`published — ${atUri}`);
    } catch (err) {
      props.onStatus(`publish failed — ${describeError(err)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class={styles.content} ref={(element) => props.ref?.(element)}>
      <Show
        when={project()}
        fallback={<div class={styles.loading}>loading draft…</div>}
      >
        <header class={styles.header}>
          <div class={styles.fields}>
            <label class={styles.field}>
              name
              <input
                class={styles.text}
                value={project()!.manifest.name}
                onInput={(e) => patchManifest({ name: e.currentTarget.value })}
              />
            </label>
            <label class={styles.field}>
              seed
              <input
                class={styles.number}
                type="number"
                value={project()!.manifest.seed}
                onInput={(e) => {
                  const seed = Number(e.currentTarget.value);
                  if (Number.isFinite(seed)) {
                    patchManifest({ seed });
                  }
                }}
              />
            </label>
            <label class={styles.field}>
              spawn
              <input
                class={styles.text}
                value={project()!.manifest.spawn.join(", ")}
                onInput={(e) => onSpawn(e.currentTarget.value)}
              />
            </label>
          </div>
          <div class={styles.actions}>
            <button class={styles.button} onClick={() => newProject()}>
              New
            </button>
            <Show
              when={candidates().length === 0}
              fallback={
                <select
                  class={styles.pick}
                  onChange={(e) => {
                    const place = candidates()[Number(e.currentTarget.value)];
                    if (place !== undefined) {
                      void openPlace(place);
                    }
                  }}
                >
                  <option value="" disabled selected>
                    pick a place…
                  </option>
                  <For each={candidates()}>
                    {(place, index) => (
                      <option value={index()}>{place.record.name}</option>
                    )}
                  </For>
                </select>
              }
            >
              <button
                class={styles.button}
                disabled={busy()}
                onClick={() => void listMine()}
              >
                Open…
              </button>
            </Show>
            <button
              class={[styles.button, styles.primary]}
              disabled={busy() || scriptFiles().length === 0}
              onClick={() => void runActive()}
            >
              Run
            </button>
            <button
              class={[styles.button, styles.primary]}
              disabled={busy()}
              onClick={() => void publish()}
            >
              Publish
            </button>
            <button
              class={styles.button}
              onClick={() => voxelscape.placeEditor.setOpen(false)}
            >
              Close
            </button>
          </div>
        </header>

        <nav class={styles.tabs}>
          <For each={scriptFiles()}>
            {(name) => (
              <div class={[styles.tab, active() === name && styles.tabActive]}>
                <button
                  class={styles.tabMain}
                  title="double-click to rename"
                  onClick={() => selectFile(name)}
                  onDblClick={() => renameScript(name)}
                >
                  {name}
                </button>
                <button
                  class={styles.tabRemove}
                  title={`remove ${name}`}
                  onClick={() => removeScript(name)}
                >
                  ✕
                </button>
              </div>
            )}
          </For>
          <button class={styles.add} onClick={() => addScript()}>
            + script
          </button>
        </nav>

        <nav class={styles.tabs}>
          <span class={styles.tabMain}>models</span>
          <For each={modelNames()}>
            {(name) => (
              <div class={styles.tab}>
                <button class={styles.tabMain} title={name}>
                  {name}
                </button>
                <button
                  class={styles.tabRemove}
                  title={`remove ${name}`}
                  onClick={() => removeModel(name)}
                >
                  ✕
                </button>
              </div>
            )}
          </For>
          <label class={styles.add} title="add rm-stacker model files">
            + model
            <input
              type="file"
              accept=".zip,application/zip"
              multiple
              hidden
              onChange={(e) => {
                void addModels(e.currentTarget.files);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </nav>

        <Show when={scriptFiles().length > 0}>
          <Loading fallback={<div class={styles.loading}>loading editor…</div>}>
            <PlaceEditorPanes
              project={project()!}
              active={active()}
              onEditor={(name, view) => views.set(name, view)}
              onInput={updateScript}
            />
          </Loading>
        </Show>
      </Show>
    </div>
  );
};

export default PlaceEditorContent;
