import { createSignal, Show, useContext } from "solid-js";
import { useVoxelscape } from "../../voxelscape/voxelscape-context";
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

/** Import/export of the plan as JSON, the `onPlan` snippet a place runs, and
 * the one tap that carries the plan into the place editor. */
export function PlanJsonPanel() {
  const editor = useContext(LevelEditorContext);
  const voxelscape = useVoxelscape();
  const [text, setText] = createSignal("");
  // The panel's own textarea takes a lot of a short screen for something read
  // only when asked for, so on a narrow screen it waits for one of the buttons
  // that fills it rather than standing open.
  const [revealed, setRevealed] = createSignal(false);
  const [copied, setCopied] = createSignal(false);

  /** Puts `snippet` on the clipboard, saying so where the panel can be seen. */
  const copy = async (snippet: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
    } catch {
      setText(snippet);
      setRevealed(true);
      editor.setNotice(
        "this browser would not put it on the clipboard — it is below to select",
      );
    }
  };

  return (
    <div class={styles.panel}>
      <h2 class={styles.heading}>Plan</h2>
      <Bar>
        <Button
          onClick={() => {
            voxelscape.placeEditor.requestLevelPlan();
            voxelscape.placeEditor.setOpen(true);
            editor.setNotice("attached — Run in the place editor builds it");
          }}
        >
          Add to place
        </Button>
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
        <Button onClick={() => void copy(editor.script())}>Copy</Button>
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
      <Show when={editor.notice() || copied()}>
        <p class={styles.notice}>{editor.notice() ?? "copied"}</p>
      </Show>
    </div>
  );
}
