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
import { For, type Component } from "solid-js";
import type { PlaceProject } from "../places/project";
import styles from "./PlaceEditor.module.css";

/** The kind of editor the code-mirror package hands to `onEditor`. */
export type EditorView = Parameters<
  NonNullable<CodeMirrorProps["onEditor"]>
>[0];

const PlaceEditorPanes: Component<{
  project: PlaceProject;
  /** The tab whose pane should be visible. */
  active: string;
  onEditor(name: string, view: EditorView): void;
  onInput(path: string, source: string): void;
}> = (props) => (
  <LSPProvider files={props.project.scripts}>
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

export default PlaceEditorPanes;
