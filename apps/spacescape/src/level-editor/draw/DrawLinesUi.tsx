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

import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Show,
  type Accessor,
} from "solid-js";

import { Button } from "../components/controls";
import type { AngleLock } from "./plane";
import type { DrawLinesController } from "./draw-lines-controller";
import styles from "./draw-lines.module.css";

/**
 * The locks, and what each is called. Angle zero is the plane's own first axis.
 *
 * **One `0/90°` button rather than a `0°` and a `90°`**, because which axis a person wants is
 * almost always whichever one the wall is already nearer to — asking them to decide it twice is
 * asking them to do the tool's arithmetic. The `nearest` lock infers it from where the free aim
 * is, so the button follows the hand.
 */
const LOCKS: readonly { readonly lock: AngleLock; readonly label: string }[] = [
  { lock: "none", label: "Free" },
  { lock: "nearest", label: "0/90°" },
  { lock: "continue", label: "Continue" },
];

const round = (value: number, places: number): number => {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
};

/** The two editable fields, in the order Tab moves between them. */
type ReadoutField = "length" | "angle";

/** The length and angle fields, anchored to wherever the aim is on the canvas. */
const Readout = (props: {
  controller: Accessor<DrawLinesController | undefined>;
}) => {
  const state = () => props.controller()?.state();
  const screen = () => state()?.aimScreen;
  /**
   * Which field has focus, held in a signal rather than left to the DOM.
   *
   * **Because a desktop wants to type a length while the mouse keeps aiming.** The field the
   * person tabbed into remembers that it is the one being typed into, and on every pointer move
   * its text is selected again so the next keystroke replaces it rather than appending to a
   * number that has since changed. Tab switches the signal between the two, so the keyboard never
   * has to leave the readout.
   */
  const [focused, setFocused] = createSignal<ReadoutField | undefined>();
  let lengthInput: HTMLInputElement | undefined;
  let angleInput: HTMLInputElement | undefined;

  const inputFor = (field: ReadoutField): HTMLInputElement | undefined =>
    field === "length" ? lengthInput : angleInput;

  /**
   * A number that changes on a pointer move and on nothing else.
   *
   * **A memo, so a plain snapshot read does not re-run the effect below on every publish.** The
   * controller's state signal is `equals: false`, so reading `state()` directly would re-run on a
   * keystroke too — and re-selecting the field on each character typed would make it impossible to
   * type more than one. `aimTick` is the move and only the move; the memo filters the rest out.
   */
  const aimTick = createMemo(() => state()?.aimTick);

  // **The compute tracks; the effect acts**, the split Solid 2 makes explicit. It watches which
  // field is focused and the pointer's own tick — so a typed edit, which changes neither, does
  // not re-select the field being typed into — and moves focus and selection in the effect arm.
  createEffect(
    () => ({ field: focused(), tick: aimTick() }),
    ({ field }) => {
      if (field === undefined) return;
      const input = inputFor(field);
      if (input === undefined) return;
      input.focus();
      input.select();
    },
  );

  /** Clears the focus signal only when focus has left both fields. */
  const onBlur = (event: FocusEvent): void => {
    const next = event.relatedTarget as Node | null;
    if (next === lengthInput || next === angleInput) return;
    setFocused(undefined);
  };

  const onKeyDown = (event: KeyboardEvent, field: ReadoutField): void => {
    if (event.key === "Tab") {
      event.preventDefault();
      setFocused(field === "length" ? "angle" : "length");
      return;
    }
    if (event.key === "Enter") props.controller()?.commit();
  };

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
            ref={lengthInput}
            type="number"
            min={0}
            step={1}
            value={round(state()?.length ?? 0, 3)}
            aria-label="Segment length"
            onFocus={() => setFocused("length")}
            onBlur={onBlur}
            onInput={(event) => {
              const next = Number.parseFloat(event.currentTarget.value);
              if (Number.isFinite(next)) props.controller()?.setLength(next);
            }}
            onKeyDown={(event) => onKeyDown(event, "length")}
          />
        </label>
        <label class={styles.field}>
          <span>Angle</span>
          <input
            ref={angleInput}
            type="number"
            step={1}
            value={round(state()?.angle ?? 0, 2)}
            aria-label="Segment angle"
            onFocus={() => setFocused("angle")}
            onBlur={onBlur}
            onInput={(event) => {
              const next = Number.parseFloat(event.currentTarget.value);
              if (Number.isFinite(next)) props.controller()?.setAngle(next);
            }}
            onKeyDown={(event) => onKeyDown(event, "angle")}
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
  /**
   * Whether the Walls tool is in its select-segment sub-mode, as an accessor so the panel
   * follows the signal rather than taking a snapshot of it at mount.
   */
  segmentSelect?: Accessor<boolean>;
  /** Turns the segment sub-mode on or off. Absent only where there is no Walls tool. */
  onToggleSegmentSelect?: () => void;
  /** Whether a segment is picked, so Delete can be enabled. */
  segmentPicked?: boolean;
  /** Deletes the picked segment. */
  onDeleteSegment?: () => void;
}) => {
  const state = () => props.controller()?.state();
  const floor = () => props.floor === true;
  /** Whether the segment sub-mode is on. Walls only; a floor has no segments to pick. */
  const selecting = () => props.segmentSelect?.() === true;

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
      {/*
        **The readout and the locks go while picking.** They describe the next segment, and in
        the sub-mode there is no next segment — leaving them up would be a length and an angle
        for a wall that is not being drawn.
      */}
      <Show when={!selecting()}>
        <Readout controller={props.controller} />

        <div class={styles.locks} role="group" aria-label="Direction lock">
          <For each={LOCKS}>
            {(entry) => (
              <Button
                label={entry.label}
                title={`Hold the next segment ${
                  entry.lock === "none"
                    ? "in no direction"
                    : entry.lock === "continue"
                      ? "in the last one's direction"
                      : "along whichever of the two plane directions it is nearer to"
                }`}
                selected={state()?.lock === entry.lock}
                onClick={() => props.controller()?.setLock(entry.lock)}
              />
            )}
          </For>
        </div>
      </Show>

      <div class={styles.cluster}>
        {/*
          **No segment picking for a floor**, which is one closed outline rather than a list of
          runs; hiding the button is better than offering a mode a floor cannot use.
        */}
        <Show when={!floor()}>
          <Button
            label="Select segment"
            title="Pick a wall segment in the world, then delete it"
            selected={selecting()}
            onClick={() => props.onToggleSegmentSelect?.()}
          />
        </Show>
        <Show when={!selecting()}>
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
          {/*
            **The floor's node editor, beside its drawing controls.** A picked corner can be
            dragged in the world, or have a new one added on either side of it; the buttons are
            greyed out until a corner is picked, and the hint below says which one is.
          */}
          <Show when={floor() && props.editing === true}>
            <Button
              label="Add before"
              title="Insert a corner before the picked one"
              disabled={state()?.picked === undefined}
              onClick={() => props.controller()?.insertPicked("before")}
            />
            <Button
              label="Add after"
              title="Insert a corner after the picked one"
              disabled={state()?.picked === undefined}
              onClick={() => props.controller()?.insertPicked("after")}
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
        </Show>
        <Show when={selecting()}>
          <Button
            label="Delete segment"
            title="Remove the picked wall segment (a middle one splits the wall in two)"
            disabled={props.segmentPicked !== true}
            onClick={() => props.onDeleteSegment?.()}
          />
        </Show>
      </div>

      {/*
       **The refusal, in words, and only when there is one.**
       *
       * There are four reasons a floor's Finish is disabled — nothing drawn, two chains,
       * too short, self-crossing — and each calls for a different next press. A button that
       * is greyed out with no explanation is a button a person presses twice and then stops
       * using, so the reason is said here rather than left to be worked out from the shape
       * of the drawing.
       */}
      <Show
        when={!selecting() && floor() && state()?.floorRefusal !== undefined}
      >
        <p class={styles.warn}>{state()?.floorRefusal}</p>
      </Show>

      {/*
        **Which corner the node editor has picked.** Every ring looks alike, so naming the picked
        one is what tells a person that the Add buttons act on the corner they touched rather than
        on some other one.
      */}
      <Show
        when={
          !selecting() &&
          floor() &&
          props.editing === true &&
          state()?.picked !== undefined
        }
      >
        <p class={styles.warn}>
          Corner {(state()?.picked?.point ?? 0) + 1} picked — drag it, or add
          beside it.
        </p>
      </Show>

      {/*
        **What the delete keyword is waiting for.** In the sub-mode nothing happens until a
        segment is picked, and a Delete button with no explanation of why it is greyed out is
        the button a person presses twice.
      */}
      <Show when={selecting()}>
        <p class={styles.warn}>
          {props.segmentPicked === true
            ? "Picked. Delete removes that segment; a middle one splits the wall in two."
            : "Tap a wall segment in the world to pick it."}
        </p>
      </Show>
    </div>
  );
};
