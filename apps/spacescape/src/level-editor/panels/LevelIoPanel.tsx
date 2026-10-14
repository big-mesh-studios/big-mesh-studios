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
 *
 * ## How the picker is opened
 *
 * **By clicking the input, from inside the button's own click handler.** The file input is a
 * real element rather than something built at the moment of the click, because a picker
 * needs an input to be open *about* and a synthesised one gets refused on a phone.
 *
 * **That handler is the whole reason this works on a mobile browser.** Opening a file picker
 * is a privileged act and browsers only allow it from inside a user gesture; the click on
 * this button *is* that gesture, and a click that is deferred to a microtask, run from an
 * effect, or fired after `await` is not. So the call is synchronous and in the handler body,
 * with nothing between it and the press.
 *
 * **`click()` rather than `showInputPicker()`.** The newer method is for re-opening a picker
 * that was already dismissed, without a gesture, which is not a case this has. `click()` from
 * a real press works on iOS and Android as well as on a desktop, and works on an input that
 * is `hidden` — which `showInputPicker()` does not, on a browser that has it.
 *
 * ## Why the picker is not filtered
 *
 * **Because a filter is a claim about the device, and on a phone that claim is wrong.** See
 * the note on the input below.
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
  /**
   * Whether a picker is expected, which is only ever true between the button's press and
   * the picker answering.
   */
  const [importing, setImporting] = createSignal(false);
  /**
   * The file input, which the button presses rather than the panel owning a picker.
   *
   * **A `let` and not a signal**, because the button's handler reads it and a signal would
   * be read outside a tracking scope for no benefit — nothing here re-renders on it.
   */
  let file: HTMLInputElement | undefined;

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
          title="Open a level somebody else made — any file, and it will say if it is not one"
          selected={importing()}
          onClick={() => {
            setImporting(true);
            // **Synchronously, in the gesture.** See the header — this is the one line the
            // whole button exists for, and it was the one line missing.
            file?.click();
          }}
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
        /**
         * **No `accept`, and that is deliberate.**
         *
         * `accept` is a *filter*, and a browser's file picker implements it by greying out
         * everything it does not recognise — so `accept="application/json,.json"` is a
         * statement about how the *device* classifies a file, not about what a level is.
         * That classification is exactly what is unreliable on a phone: Android's file
         * managers report a `.json` variously as `application/json`, as `text/plain`, and as
         * nothing at all, and the browsers that grey things out take them at their word. The
         * result is a level that a person can plainly see on their phone, listed in the
         * picker, and unable to be tapped.
         *
         * A filter that is wrong is worse than no filter, because a missing file can be
         * found by picking something else and a greyed-out one cannot be found at all. So
         * every file is offered, `readLevelPlan` judges it, and a file that is not a level
         * is refused whole with the reason in the notice line — which is the rule the
         * reader has anyway (see `level-plan.ts`), reached rather than bypassed.
         */
        hidden
        ref={file}
        onChange={async (event) => {
          const chosen = event.currentTarget.files?.[0];
          setImporting(false);
          // Cleared before the read, so choosing the same file twice in a row is two imports
          // rather than the second one being swallowed as "no change".
          event.currentTarget.value = "";
          if (chosen === undefined) return;
          props.editor.importJson(await chosen.text());
        }}
        /**
         * A picker dismissed without a choice fires nothing else — no `change`, and no
         * error — so without this the button would stay reading "Choose a file…" for the
         * rest of the session after one cancelled import.
         */
        onCancel={() => setImporting(false)}
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
