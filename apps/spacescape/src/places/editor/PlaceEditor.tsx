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

import { Show, createSignal, onCleanup, type Component } from "solid-js";

import { PlaceEditorPanes } from "./PlaceEditorPanes";
import type { PlaceEditorState } from "./create-place-editor";
import { MAX_PLACE_FILES } from "../place-file";
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
}

/** One tab, plus whether it is the file that runs. */
function Tab(props: {
  name: string;
  active: boolean;
  entry: boolean;
  onSelect(): void;
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
        onClick={props.onSelect}
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
      <div class="place-header">
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
        <span class="place-draft">
          {/* **Said rather than not shown.** A person who is relying on a draft surviving a reload
              needs to know it is being kept, and needs to know when it is not. */}
          {props.state.canSave()
            ? props.state.saved()
              ? "draft saved"
              : "saving…"
            : "not saving — this browser has no storage"}
        </span>
      </div>

      <div class="place-tabs" role="tablist" aria-label="a place's files">
        {props.state.project().manifest.scripts.map((name) => (
          <Tab
            name={name}
            active={props.state.active() === name}
            entry={props.state.project().manifest.entry === name}
            removable={props.state.project().manifest.scripts.length > 1}
            onSelect={() => props.state.setActive(name)}
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
          }}
        >
          +
        </button>
      </div>

      <PlaceEditorPanes
        files={props.state.project().scripts}
        active={props.state.active()}
        onActive={(name) => props.state.setActive(name)}
        onInput={(name, source) => props.state.write(name, source)}
      />

      <Show when={Object.keys(props.state.project().models).length > 0}>
        <div class="place-models">
          <h3>attached</h3>
          <ul>
            {Object.keys(props.state.project().models).map((name) => (
              <li>
                {name}{" "}
                {/* **Stated rather than implied**, because nothing decodes these yet and a person
                    who attached one has every reason to think it is doing something. */}
                <span class="place-model-note">carried, not read</span>
              </li>
            ))}
          </ul>
        </div>
      </Show>

      <div class="place-actions">
        <button type="button" onClick={() => props.state.newProject()}>
          new
        </button>
        <button type="button" onClick={save}>
          save
        </button>
        {/* **Publish and not "share"**, because the address it hands back is a real one a person
            can paste to somebody — and the line the console prints carries it. */}
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
      </div>
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
