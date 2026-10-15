/**
 * The floating controls for a wall being drawn: the length/angle readout and the buttons.
 *
 * ## Why the buttons are the same on a mouse and a finger
 *
 * **Because the flow is the same and only the aim differs.** A mouse hovers, so its aim is
 * continuous; a finger drags and the aim latches on release. Both then commit with **Next**,
 * take one back with **Undo point**, fork with **New line** and end with **Finish** — the same
 * four acts in the same four places, so a person who learned the flow on a laptop can draw on
 * a phone. On a mouse a left-click is a shortcut for Next.
 *
 * ## Why the readout is tappable
 *
 * **Because a finger cannot aim to the millimetre and a typed number can.** The length and the
 * angle are editable fields, so an exact wall is typed rather than dragged; editing either
 * re-derives the latched aim at that length or turn. Enter commits, wherever there is a
 * keyboard.
 *
 * ## Why the readout follows the aim rather than sitting in a corner
 *
 * **Because the number is about the point under the pointer.** A readout in a corner is a
 * number a person has to look away from the thing it describes to read; anchored to the aim it
 * is read in the same glance that places the point.
 */

import { For, Show, type Accessor } from "solid-js";

import { Button } from "../components/controls";
import type { AngleLock } from "./plane";
import type { DrawLinesController } from "./draw-lines-controller";
import styles from "./draw-lines.module.css";

/** The locks, and what each is called. Angle zero is the plane's own first axis. */
const LOCKS: readonly { readonly lock: AngleLock; readonly label: string }[] = [
  { lock: "none", label: "Free" },
  { lock: "a", label: "0°" },
  { lock: "b", label: "90°" },
  { lock: "continue", label: "Continue" },
];

const round = (value: number, places: number): number => {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
};

/** The length and angle fields, anchored to wherever the aim is on the canvas. */
const Readout = (props: {
  controller: Accessor<DrawLinesController | undefined>;
}) => {
  const state = () => props.controller()?.state();
  const screen = () => state()?.aimScreen;
  return (
    <Show when={screen()}>
      <div
        class={styles.readout}
        style={{
          left: `${(screen()?.x ?? 0) + 22}px`,
          top: `${(screen()?.y ?? 0) - 78}px`,
        }}
      >
        <label class={styles.field}>
          <span>Length</span>
          <input
            type="number"
            min={0}
            step={1}
            value={round(state()?.length ?? 0, 3)}
            aria-label="Segment length"
            onInput={(event) => {
              const next = Number.parseFloat(event.currentTarget.value);
              if (Number.isFinite(next)) props.controller()?.setLength(next);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") props.controller()?.commit();
            }}
          />
        </label>
        <label class={styles.field}>
          <span>Angle</span>
          <input
            type="number"
            step={1}
            value={round(state()?.angle ?? 0, 2)}
            aria-label="Segment angle"
            onInput={(event) => {
              const next = Number.parseFloat(event.currentTarget.value);
              if (Number.isFinite(next)) props.controller()?.setAngle(next);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") props.controller()?.commit();
            }}
          />
        </label>
      </div>
    </Show>
  );
};

/**
 * The draw controls, over the canvas.
 *
 * **Mounted only while the walls tool is active** (`app.tsx` decides that), so a controller
 * that is mid-draw and a tool that was switched away cannot both be on screen.
 */
export const DrawLinesUi = (props: {
  controller: Accessor<DrawLinesController | undefined>;
  onFinish: () => void;
  /** Whether a floor is being drawn rather than walls, for what Finish is waiting for. */
  floor?: boolean;
  /** Whether a shape is being edited rather than a new one drawn, for the Finish label. */
  editing?: boolean;
}) => {
  const state = () => props.controller()?.state();
  const floor = () => props.floor === true;

  /**
   * Whether Finish would make anything, which is a different question for each tool.
   *
   * **`canFinish` is the walls answer and the floor answer is `floorRefusal`.** A floor with
   * two points in one open chain satisfies "some chain has two points or more", so reading
   * `canFinish` for a floor would leave Finish enabled on a chain that is not a floor — a
   * button that does nothing when pressed, which is worse than a button that is visibly
   * unavailable. The refusal string is therefore both the message and the enablement.
   */
  const canFinish = (): boolean =>
    floor()
      ? state()?.floorRefusal === undefined && state()?.canFinish === true
      : state()?.canFinish === true;

  return (
    <div class={styles.root}>
      <Readout controller={props.controller} />

      <div class={styles.locks} role="group" aria-label="Direction lock">
        <For each={LOCKS}>
          {(entry) => (
            <Button
              label={entry.label}
              title={`Hold the next segment ${entry.label === "Free" ? "in no direction" : entry.label === "Continue" ? "in the last one's direction" : "along this plane direction"}`}
              selected={state()?.lock === entry.lock}
              onClick={() => props.controller()?.setLock(entry.lock)}
            />
          )}
        </For>
      </div>

      <div class={styles.cluster}>
        <Button
          label="Next"
          title="Place the segment you are aiming, and carry on from its end"
          disabled={state()?.canCommit !== true}
          onClick={() => props.controller()?.commit()}
        />
        <Button
          label="Undo point"
          title="Take back the last point you placed"
          disabled={state()?.canUndo !== true}
          onClick={() => props.controller()?.undoPoint()}
        />
        {/*
          **No `New line` for a floor**, and hiding it is better than disabling it. A second
          chain is how a floor's Finish is refused, so the button would be an offer the tool
          cannot honour — and a button that leads to "A floor is one outline" after being
          pressed is worse than one that was never there.
        */}
        <Show when={!floor()}>
          <Button
            label="New line"
            title="Start the next line somewhere else, not from this line's end"
            disabled={state()?.canNewLine !== true}
            onClick={() => props.controller()?.newLine()}
          />
        </Show>
        <Button
          label={
            props.editing === true
              ? floor()
                ? "Update floor"
                : "Update walls"
              : floor()
                ? "Finish"
                : "Finish"
          }
          title={
            props.editing === true
              ? floor()
                ? "Write the redrawn outline back over the floor you are editing"
                : "Write the redrawn lines back over the wall you are editing"
              : floor()
                ? "Lay a floor over the outline you have drawn"
                : "Make the walls from what you have drawn"
          }
          disabled={!canFinish()}
          onClick={props.onFinish}
        />
      </div>

      {/*
        **The refusal, in words, and only when there is one.**
         *
         * There are four reasons a floor's Finish is disabled — nothing drawn, two chains,
         * too short, self-crossing — and each calls for a different next press. A button that
         is greyed out with no explanation is a button a person presses twice and then stops
         using, so the reason is said here rather than left to be worked out from the shape
         of the drawing.
         */}
      <Show when={floor() && state()?.floorRefusal !== undefined}>
        <p class={styles.warn}>{state()?.floorRefusal}</p>
      </Show>
    </div>
  );
};
