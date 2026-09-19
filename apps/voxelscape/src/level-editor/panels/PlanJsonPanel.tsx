import { createSignal, Show, useContext } from "solid-js";
import { Bar, Button } from "../components/components";
import { LevelEditorContext } from "../context";
import styles from "./panels.module.css";

const download = (name: string, text: string): void => {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
};

/** Import/export of the plan as JSON, and the `onPlan` snippet a place runs. */
export function PlanJsonPanel() {
  const editor = useContext(LevelEditorContext);
  const [text, setText] = createSignal("");
  // The panel's own textarea takes a lot of a short screen for something read
  // only when asked for, so on a narrow screen it waits for one of the buttons
  // that fills it rather than standing open.
  const [revealed, setRevealed] = createSignal(false);

  return (
    <div class={styles.panel}>
      <h2 class={styles.heading}>Plan</h2>
      <Bar>
        <Button
          onClick={() => download("level-plan.json", editor.exportJson())}
        >
          Export
        </Button>
        <Button
          onClick={() => {
            setText(editor.exportJson());
            setRevealed(true);
          }}
        >
          Show JSON
        </Button>
        <Button
          onClick={() => {
            setText(editor.script());
            setRevealed(true);
          }}
        >
          Show script
        </Button>
        <label class={styles.fileLabel}>
          Import
          <input
            type="file"
            accept=".json,application/json"
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0];
              if (file !== undefined) {
                editor.importJson(await file.text());
              }
              event.currentTarget.value = "";
            }}
          />
        </label>
      </Bar>
      <Show when={!editor.mobile() || revealed()}>
        <textarea
          class={styles.textarea}
          value={text()}
          spellcheck="false"
          onInput={(event) => setText(event.currentTarget.value)}
        />
      </Show>
      <Show when={editor.notice()}>
        {(notice) => <p class={styles.notice}>{notice()}</p>}
      </Show>
    </div>
  );
}
