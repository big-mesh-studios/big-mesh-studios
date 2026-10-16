/**
 * The place editor panel: a place's manifest, its files, and the four buttons that can do
 * something to it.
 *
 * ## What it is docked into, and why
 *
 * **The console panel, growing.** `console.tsx:1-13` records that the sibling project's terminal
 * had a second size, a transition between the two, a scrim, a collapse chevron and a media query
 * taking the grown panel to the whole viewport — all of it removed here pending this, and all of it
 * answering one question: where does the room go when the editor wants it. The answer is that the
 * terminal shrinks rather than disappearing, so Run's output lands somewhere the person can read it
 * without closing the thing they are running it from.
 *
 * **Run is the point, and it is why the panel docks at all.** A person writes a line and wants the
 * world to change. That is a loop, and a loop needs the script and the world visible at once —
 * which is also why the panel takes the whole viewport on a phone, where there is no room for both.
 *
 * ## This panel is the lazy chunk
 *
 * **Whoever mounts it imports it dynamically**, because it reaches CodeMirror and a TypeScript
 * language worker over Comlink through `PlaceEditorPanes`, and a session that never opens the
 * editor should not pay for either. The import is here and not one level down so that the boundary
 * is one import: a `PlaceEditorPanes` of its own would put CodeMirror back in the main graph for
 * every session, which is the thing the boundary is for.
 */

import { Activity } from "@big-mesh-studios/ui/activity";
import { Show, For, createSignal, onCleanup, type Component } from "solid-js";

import { PlaceEditorPanes } from "./PlaceEditorPanes";
import type { PlaceEditorState } from "./create-place-editor";
import { MAX_PLACE_FILES } from "../place-file";
import { parseLevelPlan } from "../level/level-plan";
import type { PlaceProject } from "../project";

export interface PlaceEditorProps {
  readonly state: PlaceEditorState;
  /**
   * Runs the project in the live world.
   *
   * **Returns the line to print**, which is how the console's pending-line replacement works
   * (ADR 0020): a refusal from the bundler or the interpreter is a sentence about a place, and
   * discarding it in favour of "failed" would be the one message nobody can act on.
   */
  onRun(project: PlaceProject): Promise<string>;
  /**
   * Publishes the project to the signed-in account, or says why it could not.
   *
   * **Separate from `onRun` because it can fail for a reason Run cannot** — nobody signed in, or a
   * file that nothing can publish yet — and the line comes back the same way so the console shows
   * the account's own wording rather than a generic failure.
   */
  onPublish(): Promise<string>;
  /** Prints a line that did not come from a command — a refusal, or the editor's own news. */
  onStatus(line: string): void;
  /**
   * Attaches the level currently standing in the level editor, if there is one.
   *
   * **A callback rather than a `levelEditor` prop**, because the panel owns no world and the
   * level editor is created above the game branch in `app.tsx` (`levelEditor`, `app.tsx:923`).
   * Optional, because a caller with no level editor can still open and edit a place: the
   * "from the level editor" button is absent rather than broken when this is not supplied.
   */
  onAttachLevelFromEditor?(): void;
  /**
   * Closes the editor.
   *
   * **A button, because on a phone there is nothing else.** The panel takes the whole viewport
   * there, so the scrim behind it cannot be tapped and there is no Escape key — without this the
   * editor would be a page a person could enter and not leave. Optional so a caller that owns its
   * own close (a full-screen page, a test) can leave it off.
   */
  onClose?(): void;
}

/** One tab, plus whether it is the file that runs. */
function Tab(props: {
  name: string;
  active: boolean;
  entry: boolean;
  onSelect(): void;
  onRename(): void;
  onRemove(): void;
  removable: boolean;
}) {
  return (
    <div
      class={`place-tab${props.active ? " place-tab-active" : ""}${
        props.entry ? " place-tab-entry" : ""
      }`}
    >
      <button
        type="button"
        class="place-tab-name"
        role="tab"
        aria-selected={props.active ? "true" : "false"}
        aria-controls={`place-tabpanel-${props.name}`}
        id={`place-tab-${props.name}`}
        title="double-click to rename"
        onClick={props.onSelect}
        onDblClick={props.onRename}
      >
        {props.name}
      </button>
      <Show when={props.removable}>
        <button
          type="button"
          class="place-tab-remove"
          aria-label={`close ${props.name}`}
          onClick={props.onRemove}
        >
          ×
        </button>
      </Show>
    </div>
  );
}

export const PlaceEditor: Component<PlaceEditorProps> = (props) => {
  const [busy, setBusy] = createSignal(false);
  /**
   * Which pane is in front of the person: the code, or the models attached to the place.
   *
   * **One signal rather than the tabs being the only navigation**, because the models are not a
   * file and have no tab of their own in the script list. The script tabs switch this back to
   * `"script"` so opening a file always lands on it.
   */
  const [pane, setPane] = createSignal<"script" | "models" | "levels">(
    "script",
  );

  /** The models this place carries, by the name each is attached under. */
  const modelNames = (): string[] => Object.keys(props.state.project().models);

  /** The levels this place carries, by the name each is attached under. */
  const levelNames = (): string[] => Object.keys(props.state.project().levels);

  /** The hidden pickers `+ from a file` reaches. */
  let modelFileInput: HTMLInputElement | undefined;
  let levelFileInput: HTMLInputElement | undefined;

  /**
   * Reads the spawn field's text into a point, or leaves the manifest alone.
   *
   * **Parse-or-ignore rather than refuse, because a field being typed is not a field being
   * wrong.** `4, ` is somebody part-way through `4, 30, -8`, and rejecting it would fight the
   * caret; `setSpawn` is only called once three finite numbers are there. Clearing the field
   * removes the spawn, which is exactly what `undefined` means.
   */
  const onSpawn = (text: string): void => {
    if (text.trim() === "") {
      props.state.setSpawn(undefined);
      return;
    }
    const parts = text.split(/[,\s]+/).map(Number);
    if (parts.length === 3 && parts.every((axis) => Number.isFinite(axis))) {
      props.state.setSpawn([parts[0], parts[1], parts[2]] as const);
    }
  };

  /**
   * Renames a script through a prompt, the way the sibling editor does.
   *
   * **The prompt is not the gate** — a person can type anything, and a name becomes a module id
   * and a zip key — so the name is judged by `renameScript` and a refusal is printed rather
   * than silently doing nothing.
   */
  const renameScript = (name: string): void => {
    const next = window.prompt("rename the script file to:", name);
    if (next === null || next.trim() === "" || next === name) return;
    const refused = props.state.renameScript(name, next);
    if (refused !== null) props.onStatus(refused);
  };

  /**
   * One line describing a carried level: how much is in it, or that it will not read.
   *
   * **Parsed rather than trusted**, because a draft read back from storage can hold anything and
   * a list that said "0 items" about a corrupt level would be a lie the loader then corrects with
   * a refusal. `parseLevelPlan` is the same judge the loader uses.
   */
  const describeLevel = (text: string): string => {
    const parsed = parseLevelPlan(text);
    if ("refusal" in parsed) return "unreadable";
    const count = parsed.plan.items.length;
    return `${count} item${count === 1 ? "" : "s"}`;
  };

  /**
   * Reads the picked level files and attaches each under its own file name.
   *
   * **Judged before it is written**, so a file that is not a level is a refusal now rather than a
   * place that fails to open later — `parseLevelPlan` is the gate the loader would apply anyway,
   * reached earlier and with the person still looking at the file.
   */
  const addLevelFromFile = async (files: FileList | null): Promise<void> => {
    if (files === null || files.length === 0) return;
    for (const file of files) {
      const text = await file.text();
      const parsed = parseLevelPlan(text);
      if ("refusal" in parsed) {
        const { where, why } = parsed.refusal;
        props.onStatus(
          `"${file.name}" is not a level: ${where === "" ? why : `${where} ${why}`}`,
        );
        continue;
      }
      const refused = props.state.writeLevel(file.name, text);
      props.onStatus(refused ?? `attached ${file.name}`);
    }
  };

  /**
   * Reads the picked `.sdfmod` files and attaches each under its own file name.
   *
   * **Every refusal is said rather than swallowed**, because `attachModel` is the gate that keeps
   * the draft coherent — an unsafe name, a collision, one over the byte limit — and a person who
   * picked a file and saw nothing happen has no way to tell which it was.
   */
  const addModels = async (files: FileList | null): Promise<void> => {
    if (files === null || files.length === 0) return;
    let attached = 0;
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const refused = props.state.attachModel(file.name, bytes);
      if (refused === null) attached += 1;
      else props.onStatus(refused);
    }
    if (attached > 0) {
      props.onStatus(`attached ${attached} model${attached === 1 ? "" : "s"}`);
    }
  };

  const run = async (): Promise<void> => {
    setBusy(true);
    try {
      props.onStatus(await props.onRun(props.state.project()));
    } finally {
      setBusy(false);
    }
  };

  const publish = async (): Promise<void> => {
    setBusy(true);
    try {
      props.onStatus(await props.onPublish());
    } finally {
      setBusy(false);
    }
  };

  const save = (): void => {
    // **A download rather than a file handle**, because the save path has to work in a browser
    // that refuses one — and `writePlaceZip` is the only exporter, which is why it is imported
    // here rather than at the top: it is in the `jszip` chunk ADR 0021 keeps out of first paint.
    void import("../project").then(async ({ writePlaceZip }) => {
      const blob = await writePlaceZip(props.state.project());
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${slug(props.state.project().manifest.name)}.zip`;
      anchor.click();
      // **Revoked immediately after the click**, which is the only moment it is read; a URL left
      // alive holds the whole zip in memory for as long as the document does.
      URL.revokeObjectURL(url);
      props.onStatus(`saved ${anchor.download}`);
    });
  };

  onCleanup(() => {
    // **Anything typed in the last second is written before the page goes.** The debounce is a
    // nicety for typing and a loss at unload.
    void props.state.flush();
  });

  return (
    <div class="place-editor">
      <header class="place-header">
        <div class="place-fields">
          <label class="place-field">
            <span>name</span>
            <input
              type="text"
              value={props.state.project().manifest.name}
              onInput={(event) => props.state.setName(event.currentTarget.value)}
            />
          </label>
          <label class="place-field">
            <span>seed</span>
            <input
              type="number"
              value={props.state.project().manifest.seed}
              onInput={(event) =>
                props.state.setSeed(event.currentTarget.valueAsNumber)
              }
            />
          </label>
          <label class="place-field">
            <span>spawn</span>
            <input
              type="text"
              placeholder="x, y, z"
              value={props.state.project().manifest.spawn?.join(", ") ?? ""}
              onInput={(event) => onSpawn(event.currentTarget.value)}
            />
          </label>
          {/*
            **A `<select>` and not another text box, because there are two answers and one of them
            is the absence.** The empty option is the world this place has not chosen — a sphere —
            and it is the option a manifest with no `world` is read back as, so the control shows
            what the file says rather than what the engine would assume.
          */}
          <label class="place-field">
            <span>world</span>
            {/*
              **Short labels, because a `<select>` shows the chosen option and a phone gives this
              one a fifth of the row.** The full meaning is the title, which a pointer can read
              and a phone, where it would be clipped anyway, was never showing.
            */}
            <select
              title="sphere is the default; flat means y is always up"
              value={props.state.project().manifest.world ?? ""}
              onInput={(event) =>
                props.state.setWorld(
                  event.currentTarget.value === ""
                    ? undefined
                    : (event.currentTarget
                        .value as PlaceProject["manifest"]["world"]),
                )
              }
            >
              <option value="">sphere</option>
              <option value="flat">flat</option>
            </select>
          </label>
        </div>
        <div class="place-actions">
          {/* **Said rather than not shown.** A person who is relying on a draft surviving a
              reload needs to know it is being kept, and needs to know when it is not. */}
          <span class="place-draft">
            {props.state.canSave()
              ? props.state.saved()
                ? "draft saved"
                : "saving…"
              : "not saving — this browser has no storage"}
          </span>
          <button type="button" onClick={() => props.state.newProject()}>
            new
          </button>
          <button type="button" onClick={save}>
            save
          </button>
          {/* **Publish and not "share"**, because the address it hands back is a real one a
              person can paste to somebody — and the line the console prints carries it. */}
          <button
            type="button"
            class="place-publish"
            disabled={busy()}
            onClick={() => void publish()}
          >
            publish
          </button>
          <button
            type="button"
            class="place-run"
            disabled={busy()}
            onClick={() => void run()}
          >
            {busy() ? "working…" : "run"}
          </button>
          <Show when={props.onClose}>
            <button
              type="button"
              class="place-close"
              onClick={() => props.onClose?.()}
            >
              close
            </button>
          </Show>
        </div>
      </header>

      <div class="place-tabs" role="tablist" aria-label="a place's files">
        {props.state.project().manifest.scripts.map((name) => (
          <Tab
            name={name}
            active={pane() === "script" && props.state.active() === name}
            entry={props.state.project().manifest.entry === name}
            removable={props.state.project().manifest.scripts.length > 1}
            onSelect={() => {
              setPane("script");
              props.state.setActive(name);
            }}
            onRename={() => renameScript(name)}
            onRemove={() => {
              const refused = props.state.removeScript(name);
              // **Said, because a refusal with no reason is the thing this panel is worst at.**
              if (refused === null) {
                props.onStatus("a place keeps at least one file");
              }
            }}
          />
        ))}
        <button
          type="button"
          class="place-tab-add"
          aria-label="add a file"
          disabled={
            props.state.project().manifest.scripts.length >= MAX_PLACE_FILES
          }
          onClick={() => {
            const added = props.state.addScript();
            if (added === null) props.onStatus("cannot add another file");
            // **Opened, because adding a file is asking to write in it.** The new file is the
            // active one, so leaving the models pane in front would hide the thing just made.
            else setPane("script");
          }}
        >
          + script
        </button>
        {/* **A toggle rather than a tab of the file list**, because a model is not a script: it
            has no entry, cannot be removed by closing its tab, and lives only in the manifest. */}
        <button
          type="button"
          class={`place-tab-mode${pane() === "models" ? " place-tab-active" : ""}`}
          role="tab"
          id="place-tab-models"
          aria-selected={pane() === "models" ? "true" : "false"}
          aria-controls="place-tabpanel-models"
          onClick={() => setPane("models")}
        >
          models
          <Show when={modelNames().length > 0}> ({modelNames().length})</Show>
        </button>
        <button
          type="button"
          class={`place-tab-mode${pane() === "levels" ? " place-tab-active" : ""}`}
          role="tab"
          id="place-tab-levels"
          aria-selected={pane() === "levels" ? "true" : "false"}
          aria-controls="place-tabpanel-levels"
          onClick={() => setPane("levels")}
        >
          levels
          <Show when={levelNames().length > 0}> ({levelNames().length})</Show>
        </button>
      </div>

      {/* **Hidden rather than unmounted**, so switching to the models and back does not rebuild
          every CodeMirror and lose the caret, the scroll and the undo history — the same reason
          `PlaceEditorPanes` uses `Activity` for a tab nobody is looking at. */}
      <Activity when={pane() === "script"}>
        <PlaceEditorPanes
          files={props.state.project().scripts}
          active={props.state.active()}
          onActive={(name) => props.state.setActive(name)}
          onInput={(name, source) => props.state.write(name, source)}
        />
      </Activity>

      <Activity when={pane() === "models"}>
        <div
          class="place-models"
          role="tabpanel"
          id="place-tabpanel-models"
          aria-labelledby="place-tab-models"
        >
          <div class="place-models-header">
            <h3>attached to this place</h3>
            {/*
              **No `accept` filter, and that is deliberate rather than an omission.** `.sdfmod`
              is not a media type, so a picker told to show one greys the model out and on a
              phone opens an empty dialog — the same finding `apps/sdf-modeller` records and the
              same one `level-editor/panels/LevelIoPanel` acts on. `ModelLibrary` is the
              validation: a file that is not a model is a notice at load, not a reason to hide
              every model a device has not classified.
            */}
            <input
              ref={(element) => {
                modelFileInput = element;
              }}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                void addModels(event.currentTarget.files);
                event.currentTarget.value = "";
              }}
            />
            <button
              type="button"
              class="place-model-add"
              onClick={() => modelFileInput?.click()}
            >
              + from a file
            </button>
          </div>
          <Show
            when={modelNames().length > 0}
            fallback={<p class="place-models-empty">nothing attached yet</p>}
          >
            <ul class="place-models-list">
              <For each={modelNames()}>
                {(name) => (
                  <li class="place-model">
                    <span class="place-model-name" title={name}>
                      {name}
                    </span>
                    <button
                      type="button"
                      class="place-model-remove"
                      aria-label={`remove ${name}`}
                      onClick={() => {
                        const refused = props.state.removeModel(name);
                        if (refused !== null) props.onStatus(refused);
                      }}
                    >
                      remove
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </Show>
          {/*
            **Said, because a person attaching a model expects it to travel.** The engine reads
            these now — a level places them and a script stands them — but they travel by zip:
            publishing refuses a place that carries one (`makePlaceRecord`). Saying so here is the
            difference between a limitation and a mystery.
          */}
          <p class="place-model-note">
            A model is a <code>.sdfmod</code> from sdf-modeller, placed by a script or a level
            using the name it is attached under. Saving writes it into the place's zip; publishing
            refuses a place that carries one.
          </p>
        </div>
      </Activity>

      <Activity when={pane() === "levels"}>
        <div
          class="place-levels"
          role="tabpanel"
          id="place-tabpanel-levels"
          aria-labelledby="place-tab-levels"
        >
          <div class="place-levels-header">
            <h3>levels this place carries</h3>
            {/*
              **No `accept` filter, for the reason the models picker has none** — a picker that
              filters makes a file the device has not classified un-findable, and `parseLevelPlan`
              is the judge either way.
            */}
            <input
              ref={(element) => {
                levelFileInput = element;
              }}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                void addLevelFromFile(event.currentTarget.files);
                event.currentTarget.value = "";
              }}
            />
            <button
              type="button"
              class="place-level-add"
              onClick={() => levelFileInput?.click()}
            >
              + from a file
            </button>
            <Show when={props.onAttachLevelFromEditor}>
              <button
                type="button"
                class="place-level-add"
                onClick={() => props.onAttachLevelFromEditor?.()}
              >
                + from the level editor
              </button>
            </Show>
          </div>
          <Show
            when={levelNames().length > 0}
            fallback={
              <p class="place-levels-empty">
                no levels yet — add one, or draw one in the level editor
              </p>
            }
          >
            <ul class="place-levels-list">
              <For each={levelNames()}>
                {(name) => (
                  <li class="place-level">
                    <span class="place-level-name" title={name}>
                      {name}
                    </span>
                    <span class="place-level-counts">
                      {describeLevel(props.state.project().levels[name] ?? "")}
                    </span>
                    <button
                      type="button"
                      class="place-level-remove"
                      aria-label={`remove ${name}`}
                      onClick={() => {
                        const refused = props.state.removeLevel(name);
                        if (refused !== null) props.onStatus(refused);
                      }}
                    >
                      remove
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </Show>
          {/*
            **Said, because a level is the one attachment the engine reads as content.** It is
            applied to the world before the script runs (`host.ts`), and it travels by zip for
            the same reason a model does.
          */}
          <p class="place-level-note">
            A level is the plan the level editor draws. The place applies it to the world before
            the script runs, and a script can read it back by name with <code>level()</code>.
            Saving writes it into the place's zip; publishing refuses a place that carries one.
          </p>
        </div>
      </Activity>

    </div>
  );
};

/**
 * A name turned into something a file system will accept.
 *
 * **The same normalisation as `placeRkey`, arrived at separately** — a download named
 * `The Harbour.zip` is refused or mangled by some systems and quietly renamed by others, and the
 * name a person sees afterwards should not be one nobody chose. A name with nothing usable in it
 * becomes `place`.
 */
const slug = (name: string): string => {
  const key = name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_~]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 64);
  return key === "" ? "place" : key;
};
