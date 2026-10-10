/**
 * Getting a level out, and putting one in.
 *
 * ## Why a file rather than script
 *
 * Because a level is **data** and a script is a program, and the whole point of this
 * editor is that somebody should be able to build one without writing either. A `.json`
 * level is readable, diffable, and the thing a place carries — see `docs/level-editor-plan.md`.
 *
 * ## Why importing is itself undoable
 *
 * **Because it is an edit.** A person who opens the wrong file should be able to take it
 * back with the same button that takes back a misplaced wall, and not a second mechanism
 * that only knows about files.
 *
 * ## Why the JSON is shown
 *
 * Not as a debug affordance — as the artefact. `Show JSON` is how somebody reads what the
 * editor built, and how they paste in a level somebody else made when the file picker is
 * not to hand.
 */

import { createSignal, Show } from "solid-js";

import { Bar, Button, Notice } from "../components/controls";
import { MAX_LEVEL_ITEMS } from "../../places/level/level-plan";
import { LEVEL_PLACE } from "../../places/level/types";
import type { LevelEditor } from "../level-editor-store";
import styles from "./panels.module.css";

export const LevelIoPanel = (props: {
  editor: LevelEditor;
  /** Puts the level into the place's project, once a place can carry one. */
  onAttach?: () => void;
  canAttach: boolean;
}) => {
  const [showJson, setShowJson] = createSignal(false);
  const [importing, setImporting] = createSignal(false);

  const download = (): void => {
    const blob = new Blob([props.editor.exportJson()], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${LEVEL_PLACE}.json`;
    anchor.click();
    // Revoked rather than left to the collector: a blob URL that outlives its download is
    // a small leak, and two downloads in a session is two live ones.
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Bar label="level">
        <Button label="Export" onClick={download} />
        <Button
          label="Show JSON"
          selected={showJson()}
          onClick={() => setShowJson(!showJson())}
        />
        <Button
          label={importing() ? "Choose a file…" : "Import"}
          onClick={() => setImporting(true)}
        />
        <Show when={props.canAttach}>
          <Button
            label="Add to place"
            title="Keep the level in the place's project"
            onClick={() => props.onAttach?.()}
          />
        </Show>
      </Bar>

      <input
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (event) => {
          const file = event.currentTarget.files?.[0];
          setImporting(false);
          event.currentTarget.value = "";
          if (file === undefined) return;
          props.editor.importJson(await file.text());
        }}
      />

      <Show when={showJson()}>
        <textarea
          class={styles.json}
          readonly
          spellcheck={false}
          rows={12}
          aria-label="The level as JSON"
          value={props.editor.exportJson()}
        />
      </Show>

      <Bar label={`${props.editor.items().length} of ${MAX_LEVEL_ITEMS}`}>
        <Button
          label="Clear"
          title="Take everything out — undoable"
          disabled={props.editor.items().length === 0}
          onClick={() => props.editor.importJson('{"version":1,"items":[]}')}
        />
      </Bar>

      <Notice text={props.editor.notice()} />
    </div>
  );
};
