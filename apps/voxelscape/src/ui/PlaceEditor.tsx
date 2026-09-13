// The `/place:editor` content: one CodeMirror tab per script file in the
// working place project, with the manifest's name, seed and spawn up top.
// The editor only owns the draft — running a script and publishing a place
// go through the world's script host and atproto publisher, so the draft is
// state the ui keeps, and the world stays what it was. This is rendered
// inside `Console`'s single panel once the place editor is open — it owns no
// overlay, scrim, or Escape handling of its own; `Console` owns those, since
// it owns the one surface both the terminal and this content share.
import {
  createEffect,
  createSignal,
  For,
  lazy,
  Loading,
  Show,
  type Accessor,
  type Component,
  type Setter,
} from "solid-js";
import { Activity } from "@big-mesh-studios/utils/activity";
import { createPopover } from "@big-mesh-studios/utils/create-popover";
import type { Voxelscape } from "../voxelscape/create-voxelscape";
import type { EditorView } from "./PlaceEditorPanes";
import {
  emptyPlaceProject,
  MAIN_SCRIPT_FILE,
  readPlaceProject,
  writePlaceZip,
  type PlaceProject,
} from "../places/project";
import { type PlaceManifest, type PublishedPlace } from "../places/place";
import type { PublishedModel } from "@big-mesh-studios/stacker/lexicon";
import styles from "./PlaceEditor.module.css";

/** The panel's CodeMirror tabs — the language-service bundle behind them is
 * its own lazy chunk, downloaded only once a project actually has a script
 * to show. */
const PlaceEditorPanes = lazy(() => import("./PlaceEditorPanes"));

/** What went wrong, in words a player reading the panel can act on. */
const describeError = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

/** The draft from this session, held in the module so a reopened panel is
 * instant — cleared on a full page reload; nothing here outlives the tab. */
let cachedProject: PlaceProject | null = null;
/** Which `Voxelscape` instance `cachedProject` was seeded for — a fresh
 * instance means a new world booted, so the draft is reseeded from it
 * instead of carrying over whatever the previous world's draft was. */
let cachedProjectVoxelscape: Voxelscape | null = null;

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
  /** The place actually running, read fresh on every call — this panel
   * outlives any one boot of it, surviving a reboot a clone's own publish
   * triggers rather than closing and losing its draft along with the world
   * that was showing when it opened. */
  voxelscape: Accessor<Voxelscape>;
}> = (props) => {
  const voxelscape = props.voxelscape;

  const [project, setProject] = createSignal<PlaceProject | null>(
    cachedProject,
  );
  const [active, setActive] = createSignal<string>(MAIN_SCRIPT_FILE);
  // Whether the tab area is showing the models pane instead of a script's
  // pane — kept apart from `active` so which script was last open is never
  // lost just by looking at models for a moment.
  const [showModels, setShowModels] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [candidates, setCandidates] = createSignal<PublishedPlace[]>([]);
  // Bumped only when the project is reseeded for a new world, never by an
  // edit — keys the editor panes so they remount and every CodeMirror
  // instance reads the new project's content fresh. CodeMirror only ever
  // reads a file's content once, at creation, so an in-place prop update
  // would leave an already-mounted editor showing the old place's text.
  //
  // Starts already truthy when a cached project survives from a previous
  // mount of this same component (closing and reopening the panel remounts
  // it — `project` above is seeded from that same cache) — the effect below
  // skips reseeding a world it already loaded, so nothing else would ever
  // bump this away from a fresh zero and the panes would stay hidden forever.
  const [projectGeneration, setProjectGeneration] = createSignal(
    cachedProject === null ? 0 : 1,
  );
  // Each tab's editor view, so switching tabs can ask the now-visible one to
  // measure itself after its pane changes from display:none to display:block.
  const views = new Map<string, EditorView>();

  /** Replaces the draft, and caches it for the next open within this tab. */
  const commit = (next: PlaceProject | null): void => {
    cachedProject = next;
    setProject(next);
  };

  /** The handle to show for the owner of a not-mine place, once resolved —
   * the did itself until then, or while there is no owner to resolve. */
  const [otherOwnerHandle, setOtherOwnerHandle] = createSignal<string | null>(
    null,
  );

  // Resolved fresh for whichever world is currently running, up front, so
  // the clone popover already has a handle to show by the time a player
  // actually opens it rather than resolving on first click. This panel is
  // mounted once, in `AppChrome`, above the router — a reboot replaces
  // `voxelscape()`'s instance without remounting this component, so this has
  // to be a real effect tracking that instance rather than one-time setup.
  createEffect(
    () => voxelscape(),
    (current) => {
      if (current.placeEditor.isMine) {
        setOtherOwnerHandle(null);
        return;
      }
      const owner = current.placeEditor.owner;
      if (owner === null) {
        setOtherOwnerHandle(null);
        return;
      }
      void current.placeEditor.resolveHandle(owner).then(setOtherOwnerHandle);
    },
  );

  // Loads whatever place is actually running — a demo, or a published
  // place — so the panel shows its real scripts rather than an unrelated
  // draft, the first time a world boots and again every time a later one
  // replaces it (a navigation, or the reboot a clone's own publish
  // triggers). Only a world with none to show (the fallback procedural
  // world) falls back to a fresh project. Reopening the panel on the same
  // world reuses the cached project straight away; nothing here outlives
  // the tab.
  createEffect(
    () => voxelscape(),
    (current) => {
      if (current === cachedProjectVoxelscape) {
        return;
      }
      const running = current.placeEditor.activeProject;
      const loaded =
        running ?? emptyPlaceProject(current.placeEditor.defaultSeed);
      cachedProject = loaded;
      cachedProjectVoxelscape = current;
      setProject(loaded);
      setActive(firstScript(loaded));
      setShowModels(false);
      setProjectGeneration((generation) => generation + 1);
    },
  );

  const scriptFiles = (): string[] => {
    const p = project();
    return p === null ? [] : Object.keys(p.scripts);
  };

  const selectFile = (name: string): void => {
    setShowModels(false);
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

  /** Replaces one model's bytes in the draft under `name`, adding it to the
   * manifest's list if it is new. Shared by attaching a file from disk and
   * attaching one found by browsing an account's published models. */
  const attachModel = (name: string, bytes: Uint8Array): void => {
    const p = project();
    if (p === null) {
      return;
    }
    const models = { ...p.models, [name]: bytes };
    commit({
      ...p,
      manifest: { ...p.manifest, models: Object.keys(models) },
      models,
    });
  };

  /** Adds picked rm-stacker model files to the draft, refusing unsafe names. */
  const addModels = async (picked: FileList | null): Promise<void> => {
    if (picked === null) {
      return;
    }
    const refused: string[] = [];
    let added = 0;
    for (const file of Array.from(picked)) {
      if (/[/\\]|\.\./.test(file.name)) {
        refused.push(file.name);
        continue;
      }
      attachModel(file.name, new Uint8Array(await file.arrayBuffer()));
      added++;
    }
    props.onStatus(
      refused.length === 0
        ? `added ${added} model(s)`
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

  const [browseHandle, setBrowseHandle] = createSignal("");
  const [browsed, setBrowsed] = createSignal<PublishedModel[]>([]);
  const [browsing, setBrowsing] = createSignal(false);
  // A thumbnail's address, by whatever key the card showing it is keyed
  // on — a browsed model's `repo/rkey`, or an attached one's own draft key,
  // so a model attached from a search result keeps the same picture. Reads
  // as an `<img src>`, so there is nothing here to release on cleanup.
  const [thumbnailUrls, setThumbnailUrls] = createSignal<
    Record<string, string>
  >({});
  const browseKey = (model: PublishedModel): string =>
    `${model.repo}/${model.rkey}`;

  /** Looks up and caches `model`'s thumbnail under `key`, quietly leaving it
   * unset on failure — a missing picture falls back to a placeholder, and
   * isn't worth surfacing as a status line of its own. */
  const loadThumbnail = async (
    key: string,
    model: PublishedModel,
  ): Promise<void> => {
    try {
      const url = await voxelscape().placeEditor.models.thumbnailUrl(model);
      if (url !== null) {
        setThumbnailUrls((urls) => ({ ...urls, [key]: url }));
      }
    } catch {
      // No picture is no worse than the placeholder it already shows.
    }
  };

  /** Lists what `account` (a handle or a did) has published, replacing the
   * current results — anyone's models are readable without signing in. */
  const browseModels = async (account: string): Promise<void> => {
    if (account.trim() === "") {
      return;
    }
    setBrowsing(true);
    try {
      const published = await voxelscape().placeEditor.models.list(
        account.trim(),
      );
      setBrowsed(published);
      for (const model of published) {
        void loadThumbnail(browseKey(model), model);
      }
    } catch (err) {
      setBrowsed([]);
      props.onStatus(
        `could not list ${account}'s models — ${describeError(err)}`,
      );
    } finally {
      setBrowsing(false);
    }
  };

  /** Browses the signed-in account's own models — the search box shows its
   * handle, the readable name a did is short for, rather than the did
   * itself; the lookup itself still goes by did, which needs no resolving. */
  const browseMine = async (did: string): Promise<void> => {
    setBrowseHandle(await voxelscape().placeEditor.resolveHandle(did));
    void browseModels(did);
  };

  /** Downloads `model`'s zip and attaches it under its published name. */
  const attachPublishedModel = async (model: PublishedModel): Promise<void> => {
    const name = `${model.rkey}.zip`;
    if (project()?.models[name] !== undefined) {
      props.onStatus(`"${model.record.name}" is already attached`);
      return;
    }
    setBusy(true);
    try {
      const bytes = new Uint8Array(
        await (await voxelscape().placeEditor.models.file(model)).arrayBuffer(),
      );
      attachModel(name, bytes);
      const thumbnail = thumbnailUrls()[browseKey(model)];
      if (thumbnail !== undefined) {
        setThumbnailUrls((urls) => ({ ...urls, [name]: thumbnail }));
      }
      props.onStatus(`attached "${model.record.name}"`);
    } catch (err) {
      props.onStatus(
        `could not attach "${model.record.name}" — ${describeError(err)}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const newProject = (): void => {
    commit(emptyPlaceProject(voxelscape().placeEditor.defaultSeed));
    setActive(MAIN_SCRIPT_FILE);
    setShowModels(false);
    setCandidates([]);
    props.onStatus(
      "new place started — name it, write its script, then publish",
    );
  };

  const listMine = async (): Promise<void> => {
    const did = voxelscape().placeEditor.accountDid;
    if (did === null) {
      props.onStatus("not signed in — use /account:login first");
      return;
    }
    setBusy(true);
    try {
      const published = await voxelscape().placeEditor.places.list(did);
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
        await voxelscape().placeEditor.places.file(place),
      );
      commit(opened);
      setActive(firstScript(opened));
      setShowModels(false);
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
      const line = await voxelscape().placeEditor.runScript(
        p.scripts,
        entry,
        p.manifest.seed,
        p.models,
        p.manifest.spawn,
      );
      props.onStatus(line);
    } catch (err) {
      props.onStatus(`run failed — ${describeError(err)}`);
    } finally {
      setBusy(false);
    }
  };

  /** What publishing decided: the place's own `at://` address, or the words
   * to show for why it didn't happen — the same words already handed to
   * `onStatus`. */
  type PublishResult =
    { ok: true; atUri: string } | { ok: false; error: string };

  /** Publishes the draft to the signed-in account under its own name. */
  const publish = async (): Promise<PublishResult> => {
    const p = project();
    if (p === null) {
      return { ok: false, error: "no draft to publish" };
    }
    if (p.manifest.name.trim() === "") {
      const error = "name the place before publishing";
      props.onStatus(error);
      return { ok: false, error };
    }
    setBusy(true);
    try {
      const atUri = await voxelscape().placeEditor.publisher.publish(
        await writePlaceZip(p),
      );
      setCandidates([]);
      props.onStatus(`published — ${atUri}`);
      return { ok: true, atUri };
    } catch (err) {
      const error = `publish failed — ${describeError(err)}`;
      props.onStatus(error);
      return { ok: false, error };
    } finally {
      setBusy(false);
    }
  };

  /** Whether the place actually running is a real published place owned by
   * the signed-in account — false for a demo, and for anyone else's place. */
  const isMine = (): boolean => voxelscape().placeEditor.isMine;

  const runPopover = createPopover();
  const publishPopover = createPopover();

  /** Milliseconds a clone popover's own inline confirmation stays up before
   * it closes itself — the same bare timeout `Toasts` dismisses itself with. */
  const CLONE_RESULT_MS = 1400;

  /** What a clone action just did, and the words to show for it in its own
   * popover — null before anything has happened there yet. */
  type CloneOutcome = { ok: boolean; text: string } | null;

  const [runOutcome, setRunOutcome] = createSignal<CloneOutcome>(null);
  const [publishOutcome, setPublishOutcome] = createSignal<CloneOutcome>(null);

  /** Publishes the draft under the signed-in account (the same publish a
   * place gets otherwise) and runs the clone locally, so Run on a place that
   * isn't the player's own gets a copy of its own to run instead of
   * reloading the console everyone else there is driven by. */
  const cloneAndRun = async (): Promise<void> => {
    setRunOutcome(null);
    const result = await publish();
    if (!result.ok) {
      setRunOutcome({ ok: false, text: result.error });
      return;
    }
    setRunOutcome({ ok: true, text: "Cloned — running your copy" });
    await runActive();
    await voxelscape().placeEditor.claim(result.atUri);
    setTimeout(() => {
      runPopover.close();
      setRunOutcome(null);
    }, CLONE_RESULT_MS);
  };

  /** Publishes the draft under the signed-in account, without also running
   * it — Publish's own clone action for a place that isn't the player's own. */
  const clonePublish = async (): Promise<void> => {
    setPublishOutcome(null);
    const result = await publish();
    if (!result.ok) {
      setPublishOutcome({ ok: false, text: result.error });
      return;
    }
    setPublishOutcome({ ok: true, text: "Cloned — published" });
    await voxelscape().placeEditor.claim(result.atUri);
    setTimeout(() => {
      publishPopover.close();
      setPublishOutcome(null);
    }, CLONE_RESULT_MS);
  };

  /** The English possessive suffix for `name`: a bare apostrophe when it
   * already ends in "s", the usual "'s" otherwise. */
  const possessiveSuffix = (name: string): string =>
    name.endsWith("s") ? "'" : "'s";

  /** The "this isn't yours" explanation and its confirm action, anchored to
   * whichever button (Run or Publish) opened `popover` — the one difference
   * between the two is what clicking through actually does. A demo has no
   * owner to name; anyone else's place is attributed to its owner's handle.
   * Once `onConfirm` has run, the explanation gives way to what it decided,
   * shown in the same popover rather than only in the terminal below. */
  const clonePopover = (
    popover: ReturnType<typeof createPopover>,
    verb: string,
    label: string,
    outcome: Accessor<CloneOutcome>,
    setOutcome: Setter<CloneOutcome>,
    onConfirm: () => void,
  ) => (
    <popover.PopOver
      popover="auto"
      class={styles.clonePopover}
      onToggle={(open) => {
        // A stale error from a previous attempt shouldn't greet the next
        // time this popover opens.
        if (!open) {
          setOutcome(null);
        }
      }}
    >
      <p
        class={[
          styles.clonePopoverText,
          outcome() !== null &&
            (outcome()!.ok ? styles.clonePopoverOk : styles.clonePopoverError),
        ]}
      >
        <Show
          when={outcome()}
          fallback={
            <Show
              when={voxelscape().placeEditor.owner}
              fallback={<>This is a demo — clone it to {verb} your own copy.</>}
            >
              {(owner) => (
                <>
                  This is <i>{otherOwnerHandle() ?? owner()}</i>
                  {possessiveSuffix(otherOwnerHandle() ?? owner())} place —
                  clone it to {verb} your own copy.
                </>
              )}
            </Show>
          }
        >
          {(result) => result().text}
        </Show>
      </p>
      <Show when={!outcome()?.ok}>
        <button
          class={[styles.button, styles.primary]}
          disabled={busy()}
          onClick={onConfirm}
        >
          {label}
        </button>
      </Show>
    </popover.PopOver>
  );

  /** The hidden file input "+ from a file" opens — kept mounted regardless of
   * ownership, so cloning can still open it once the draft is the player's own. */
  let fileInput: HTMLInputElement | undefined;
  const fromFilePopover = createPopover();
  const [fromFileOutcome, setFromFileOutcome] =
    createSignal<CloneOutcome>(null);

  /** Clones the draft, then opens the file picker "+ from a file" would have
   * opened directly on a place that was already the player's own. */
  const cloneThenPickFiles = async (): Promise<void> => {
    setFromFileOutcome(null);
    const result = await publish();
    if (!result.ok) {
      setFromFileOutcome({ ok: false, text: result.error });
      return;
    }
    setFromFileOutcome({ ok: true, text: "Cloned — choose files to attach" });
    await voxelscape().placeEditor.claim(result.atUri);
    setTimeout(() => {
      fromFilePopover.close();
      setFromFileOutcome(null);
      fileInput?.click();
    }, CLONE_RESULT_MS);
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
            <Show
              when={isMine()}
              fallback={
                <runPopover.Trigger
                  class={[styles.button, styles.primary]}
                  title="This place isn't yours — clone it to run your own copy"
                >
                  Run
                </runPopover.Trigger>
              }
            >
              <button
                class={[styles.button, styles.primary]}
                disabled={busy() || scriptFiles().length === 0}
                onClick={() => void runActive()}
              >
                Run
              </button>
            </Show>
            <Show
              when={isMine()}
              fallback={
                <publishPopover.Trigger
                  class={[styles.button, styles.primary]}
                  title="This place isn't yours — clone it to publish your own copy"
                >
                  Publish
                </publishPopover.Trigger>
              }
            >
              <button
                class={[styles.button, styles.primary]}
                disabled={busy()}
                onClick={() => void publish()}
              >
                Publish
              </button>
            </Show>
            <button
              class={styles.button}
              onClick={() => voxelscape().placeEditor.setOpen(false)}
            >
              Close
            </button>
          </div>
          {clonePopover(
            runPopover,
            "run",
            "Clone & Run",
            runOutcome,
            setRunOutcome,
            () => void cloneAndRun(),
          )}
          {clonePopover(
            publishPopover,
            "publish",
            "Clone & Publish",
            publishOutcome,
            setPublishOutcome,
            () => void clonePublish(),
          )}
        </header>

        <nav class={styles.tabs} role="tablist">
          <For each={scriptFiles()}>
            {(name) => (
              <div
                class={[
                  styles.tab,
                  !showModels() && active() === name && styles.tabActive,
                ]}
              >
                <button
                  class={styles.tabMain}
                  role="tab"
                  id={`tab-${name}`}
                  aria-selected={
                    !showModels() && active() === name ? "true" : "false"
                  }
                  aria-controls={`tabpanel-${name}`}
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
          <button
            class={[styles.modelsToggle, showModels() && styles.tabActive]}
            role="tab"
            id="tab-models"
            aria-selected={showModels() ? "true" : "false"}
            aria-controls="tabpanel-models"
            onClick={() => setShowModels(true)}
          >
            models
            <Show when={modelNames().length > 0}> ({modelNames().length})</Show>
          </button>
        </nav>

        {/* Each tab's panel stays mounted for as long as the editor is open —
            switching away and back leaves its state (a CodeMirror scroll
            position, the models panel's own state) untouched instead of
            tearing it down and remounting from scratch. */}
        <Activity when={!showModels()}>
          <Show when={scriptFiles().length > 0}>
            {/* Keyed on `projectGeneration` so a reseeded project remounts
                every CodeMirror instance instead of leaving one an edit
                would otherwise have kept alive showing stale content. */}
            <Show when={projectGeneration()} keyed>
              <Loading
                fallback={<div class={styles.loading}>loading editor…</div>}
              >
                <PlaceEditorPanes
                  project={project()!}
                  active={active()}
                  onEditor={(name, view) => views.set(name, view)}
                  onInput={updateScript}
                />
              </Loading>
            </Show>
          </Show>
        </Activity>

        <Activity when={showModels()}>
          <div
            class={styles.models}
            role="tabpanel"
            id="tabpanel-models"
            aria-labelledby="tab-models"
          >
            <section class={styles.modelsAttached}>
              <div class={styles.modelsAttachedHeader}>
                <h3 class={styles.modelsHeading}>attached to this place</h3>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".zip,application/zip"
                  multiple
                  hidden
                  onChange={(e) => {
                    void addModels(e.currentTarget.files);
                    e.currentTarget.value = "";
                  }}
                />
                <Show
                  when={isMine()}
                  fallback={
                    <>
                      <fromFilePopover.Trigger
                        class={styles.modelsFromFile}
                        title="this place isn't yours — clone it to attach your own files"
                      >
                        + from a file
                      </fromFilePopover.Trigger>
                      {clonePopover(
                        fromFilePopover,
                        "attach",
                        "Clone & Attach",
                        fromFileOutcome,
                        setFromFileOutcome,
                        () => void cloneThenPickFiles(),
                      )}
                    </>
                  }
                >
                  <button
                    type="button"
                    class={styles.modelsFromFile}
                    title="add rm-stacker model files"
                    onClick={() => fileInput?.click()}
                  >
                    + from a file
                  </button>
                </Show>
              </div>
              <Show
                when={modelNames().length > 0}
                fallback={
                  <p class={styles.modelsEmpty}>nothing attached yet</p>
                }
              >
                <ul class={styles.modelsCards}>
                  <For each={modelNames()}>
                    {(name) => {
                      const removePopover = createPopover();
                      const [removeOutcome, setRemoveOutcome] =
                        createSignal<CloneOutcome>(null);
                      const cloneAndRemove = async (): Promise<void> => {
                        setRemoveOutcome(null);
                        const result = await publish();
                        if (!result.ok) {
                          setRemoveOutcome({ ok: false, text: result.error });
                          return;
                        }
                        removeModel(name);
                        setRemoveOutcome({
                          ok: true,
                          text: "Cloned — removed",
                        });
                        await voxelscape().placeEditor.claim(result.atUri);
                        setTimeout(() => {
                          removePopover.close();
                          setRemoveOutcome(null);
                        }, CLONE_RESULT_MS);
                      };
                      return (
                        <li class={styles.modelsCard}>
                          <div class={styles.modelsCardPreview}>
                            <Show
                              when={thumbnailUrls()[name]}
                              fallback={
                                <span class={styles.modelsCardPlaceholder}>
                                  ▢
                                </span>
                              }
                            >
                              {(url) => (
                                <img
                                  class={styles.modelsCardThumbnail}
                                  src={url()}
                                  alt={name}
                                  loading="lazy"
                                />
                              )}
                            </Show>
                          </div>
                          <span class={styles.modelsCardName} title={name}>
                            {name}
                          </span>
                          <Show
                            when={isMine()}
                            fallback={
                              <>
                                <removePopover.Trigger
                                  class={styles.modelsCardAction}
                                  title={`this place isn't yours — clone it to remove ${name} from your own copy`}
                                >
                                  remove
                                </removePopover.Trigger>
                                {clonePopover(
                                  removePopover,
                                  "remove models from",
                                  "Clone & Remove",
                                  removeOutcome,
                                  setRemoveOutcome,
                                  () => void cloneAndRemove(),
                                )}
                              </>
                            }
                          >
                            <button
                              class={styles.modelsCardAction}
                              title={`remove ${name}`}
                              onClick={() => removeModel(name)}
                            >
                              remove
                            </button>
                          </Show>
                        </li>
                      );
                    }}
                  </For>
                </ul>
              </Show>
            </section>

            <section class={styles.modelsBrowse}>
              <h3 class={styles.modelsHeading}>browse published models</h3>
              <div class={styles.modelsSearch}>
                <input
                  class={styles.text}
                  placeholder="a handle, e.g. alice.bsky.social"
                  value={browseHandle()}
                  onInput={(e) => setBrowseHandle(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void browseModels(browseHandle());
                    }
                  }}
                />
                <button
                  class={styles.button}
                  disabled={browsing()}
                  onClick={() => void browseModels(browseHandle())}
                >
                  Search
                </button>
                <Show when={voxelscape().placeEditor.accountDid}>
                  {(did) => (
                    <button
                      class={styles.button}
                      disabled={browsing()}
                      onClick={() => void browseMine(did())}
                    >
                      mine
                    </button>
                  )}
                </Show>
              </div>
              <Show
                when={browsed().length > 0}
                fallback={
                  <p class={styles.modelsEmpty}>
                    {browsing() ? "searching…" : "no results yet"}
                  </p>
                }
              >
                <ul class={styles.modelsCards}>
                  <For each={browsed()}>
                    {(model) => {
                      const attachPopover = createPopover();
                      const [attachOutcome, setAttachOutcome] =
                        createSignal<CloneOutcome>(null);
                      const cloneAndAttach = async (): Promise<void> => {
                        setAttachOutcome(null);
                        const result = await publish();
                        if (!result.ok) {
                          setAttachOutcome({ ok: false, text: result.error });
                          return;
                        }
                        await attachPublishedModel(model);
                        setAttachOutcome({
                          ok: true,
                          text: "Cloned — attached",
                        });
                        await voxelscape().placeEditor.claim(result.atUri);
                        setTimeout(() => {
                          attachPopover.close();
                          setAttachOutcome(null);
                        }, CLONE_RESULT_MS);
                      };
                      return (
                        <li class={styles.modelsCard}>
                          <div class={styles.modelsCardPreview}>
                            <Show
                              when={thumbnailUrls()[browseKey(model)]}
                              fallback={
                                <span class={styles.modelsCardPlaceholder}>
                                  ▢
                                </span>
                              }
                            >
                              {(url) => (
                                <img
                                  class={styles.modelsCardThumbnail}
                                  src={url()}
                                  alt={model.record.name}
                                  loading="lazy"
                                />
                              )}
                            </Show>
                          </div>
                          <span
                            class={styles.modelsCardName}
                            title={model.record.name}
                          >
                            {model.record.name}
                          </span>
                          <span class={styles.modelsCardDims}>
                            {model.record.dimensions.width}×
                            {model.record.dimensions.height}×
                            {model.record.dimensions.depth}
                          </span>
                          <Show
                            when={isMine()}
                            fallback={
                              <>
                                <attachPopover.Trigger
                                  class={styles.modelsCardAction}
                                  title="this place isn't yours — clone it to attach models to your own copy"
                                >
                                  attach
                                </attachPopover.Trigger>
                                {clonePopover(
                                  attachPopover,
                                  "attach",
                                  "Clone & Attach",
                                  attachOutcome,
                                  setAttachOutcome,
                                  () => void cloneAndAttach(),
                                )}
                              </>
                            }
                          >
                            <button
                              class={styles.modelsCardAction}
                              disabled={busy()}
                              onClick={() => void attachPublishedModel(model)}
                            >
                              attach
                            </button>
                          </Show>
                        </li>
                      );
                    }}
                  </For>
                </ul>
              </Show>
            </section>
          </div>
        </Activity>
      </Show>
    </div>
  );
};

export default PlaceEditorContent;
