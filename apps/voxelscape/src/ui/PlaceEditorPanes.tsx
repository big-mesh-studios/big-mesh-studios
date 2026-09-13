// The panel's CodeMirror tabs, split out from `PlaceEditor` so the heavy
// language-service bundle behind them is its own lazy chunk — the panel's
// own shell renders (and view-transitions in) immediately, with a `<Loading>`
// boundary standing in for only this part while it downloads.
import {
  CodeMirror,
  darkTheme,
  LSPProvider,
  type CodeMirrorProps,
} from "@big-mesh-studios/code-mirror";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  type Component,
} from "solid-js";
import { ENGINE_TYPE_FILES, type PlaceProject } from "../places/project";
import { generateProjectModelsDts } from "../places/model-dts";
import { SCRIPTED_FIGURES_DTS } from "../places/scripted-figures-dts";
import styles from "./PlaceEditor.module.css";

/** The kind of editor the code-mirror package hands to `onEditor`. */
export type EditorView = Parameters<
  NonNullable<CodeMirrorProps["onEditor"]>
>[0];

/** The non-tab file a place's attached models generate their ambient types into. */
const MODELS_DTS_FILE = "models.d.ts";
/** The non-tab file typing the always-available "scripted-figures" standard library. */
const SCRIPTED_FIGURES_DTS_FILE = "scripted-figures.d.ts";

const PlaceEditorPanes: Component<{
  project: PlaceProject;
  /** The tab whose pane should be visible. */
  active: string;
  onEditor(name: string, view: EditorView): void;
  onInput(path: string, source: string): void;
}> = (props) => {
  const [modelsDts, setModelsDts] = createSignal("");

  // Re-generates the ambient `.d.ts` whenever the place's attached models
  // change — not on every keystroke in a script tab, which only touches
  // `props.project.scripts`.
  createEffect(
    () => props.project.models,
    (models) => {
      let current = true;
      void generateProjectModelsDts(models).then((text) => {
        if (current) {
          setModelsDts(text);
        }
      });
      return () => {
        current = false;
      };
    },
  );

  const files = createMemo(() => ({
    ...props.project.scripts,
    ...ENGINE_TYPE_FILES,
    [MODELS_DTS_FILE]: modelsDts(),
    [SCRIPTED_FIGURES_DTS_FILE]: SCRIPTED_FIGURES_DTS,
  }));

  return (
    <LSPProvider files={files()}>
      <div class={styles.panes}>
        <For each={Object.keys(props.project.scripts)}>
          {(name) => (
            <div
              class={[
                styles.pane,
                props.active === name ? styles.paneActive : styles.paneHidden,
              ]}
            >
              <CodeMirror
                path={name}
                theme={darkTheme}
                onEditor={(view) => props.onEditor(name, view)}
                onInput={({ path, source }) => props.onInput(path, source)}
              />
            </div>
          )}
        </For>
      </div>
    </LSPProvider>
  );
};

export default PlaceEditorPanes;
