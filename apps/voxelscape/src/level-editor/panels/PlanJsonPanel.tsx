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

  return (
    <div class={styles.panel}>
      <h2 class={styles.heading}>Plan</h2>
      <Bar>
        <Button
          onClick={() => download("level-plan.json", editor.exportJson())}
        >
          Export
        </Button>
        <Button onClick={() => setText(editor.exportJson())}>Show JSON</Button>
        <Button onClick={() => setText(editor.script())}>Show script</Button>
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
      <textarea
        class={styles.textarea}
        value={text()}
        spellcheck="false"
        onInput={(event) => setText(event.currentTarget.value)}
      />
      <Show when={editor.notice()}>
        {(notice) => <p class={styles.notice}>{notice()}</p>}
      </Show>
    </div>
  );
}
