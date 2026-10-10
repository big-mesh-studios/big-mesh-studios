/**
 * The selected part's transform: where it is and which way it points.
 *
 * ## Why both are here, and why they are not the same control
 *
 * **Because they are two independent facts about a part and the primitives are axis
 * aligned.** Every axial primitive in the table runs along Y (ADR 0025), so a capsule is
 * a standing limb until something rotates it — which makes `orientation` not a refinement
 * of the position but the only way to express a horizontal one at all. A panel with a
 * position and no rotation could not build a figure lying down.
 *
 * ## Why the numbers are read out of the quaternion rather than kept beside it
 *
 **Because the alternative stores Euler angles and builds a quaternion from them, and then
 * the two representations disagree.** Any sequence of rotations that does not commute —
 * which is every sequence a person performs — leaves the angle in the panel no longer being
 * the angle in the model. Here the model holds the quaternion, the panel asks it what the
 * angles are, and the number on screen is always the number in the model.
 *
 * ## Why the field is local while typing and the buttons commit at once
 *
 * **Because an edit per keystroke fills the undo history and puts half-typed numbers in the
 * model.** The store refuses an edit that changes nothing, but a field that committed on
 * `input` would write a transform for every character of `-12.5` and store `-1` and `-12`
 * along the way, so the value shown while somebody types is local and the store is written
 * once when the field loses focus. A stepper button is the opposite case — a press is already
 * a whole act — so it commits immediately, and the callers' own clamps still apply to it.
 */
import { createSignal, For, Show } from "solid-js";

import {
  MAX_SOFTNESS,
  rgbaToCss,
  rgbaToRgb,
  type RGBA,
} from "@big-mesh-studios/core";
import {
  dimensionGroups,
  withParameter,
  type DimensionField,
} from "@big-mesh-studios/sdf";

import { fromEuler, isAxial, toEuler, type Part } from "../model/part";
import type { ModelStore } from "../model/model-store";
import type { Palette } from "./palette";
import { PaletteRow } from "./palette";
import { ColourPicker } from "./colour-picker";
import styles from "./transform-panel.module.css";

/** One axis: a label, a text field, and a pair of buttons that step the value. */
const Axis = (props: {
  label: string;
  value: number;
  step: number;
  onCommit: (value: number) => void;
}) => {
  // **Local while typing, committed on release.** See the header.
  const [draft, setDraft] = createSignal<string | null>(null);

  /**
   * Steps the value by one `step` in `direction`.
   *
   * **A button commits at once, unlike the field**, because a press is already a complete act —
   * there is no caret halfway through a number to protect, so waiting for a blur would only
   * make the button feel late. Any draft the field was holding is dropped, so the number that
   * appears is the one that was just committed.
   *
   * **The clamping the callers do still applies**, because this goes through the same
   * `onCommit`: a dimension will not step below its minimum and softness will not step past its
   * maximum, exactly as typing would not have.
   */
  const step = (direction: 1 | -1): void => {
    setDraft(null);
    props.onCommit(props.value + direction * props.step);
  };

  return (
    <label class={styles.axis}>
      <span class={styles.axisLabel}>{props.label}</span>
      <span class={styles.stepper}>
        {/*
          **Text and not `number`, because a `number` field will not take a minus on a phone.**
          The numeric keypad a mobile browser raises for `type="number"` has no minus key, so a
          coordinate could be moved into the positive and never back out of it. `text` gets the
          ordinary keyboard, which has one — and the steppers are what make it need no keyboard
          at all for the common case.
        */}
        <input
          class={styles.number}
          type="text"
          value={draft() ?? props.value.toFixed(2)}
          onInput={(event) => {
            setDraft(event.currentTarget.value);
          }}
          onChange={(event) => {
            const value = Number(event.currentTarget.value);
            setDraft(null);
            if (Number.isFinite(value)) props.onCommit(value);
          }}
        />
        <button
          type="button"
          class={styles.stepButton}
          aria-label={`Decrease ${props.label}`}
          onClick={() => step(-1)}
        >
          −
        </button>
        <button
          type="button"
          class={styles.stepButton}
          aria-label={`Increase ${props.label}`}
          onClick={() => step(1)}
        >
          +
        </button>
      </span>
    </label>
  );
};

export function TransformPanel(props: {
  part: Part;
  store: ModelStore;
  palette: Palette;
}) {
  const angles = (): { yaw: number; pitch: number; roll: number } =>
    toEuler(props.part.orientation);

  /**
   * The part's colour as the picker speaks it: four channels, defaulting to opaque.
   *
   * **A part with no colour reads as white**, which is what the swatch shows and what the
   * picker opens on — so setting a colour for the first time starts from something visible
   * rather than from transparent.
   */
  const colourOf = (): RGBA => {
    const held = props.part.colour;
    return {
      r: held?.r ?? 255,
      g: held?.g ?? 255,
      b: held?.b ?? 255,
      a: Math.round((props.part.opacity ?? 1) * 255),
    };
  };

  /**
   * Applies a colour to the part. **This is all a drag on the picker does.**
   *
   * **It deliberately does not touch the palette.** The picker reports every pointer move,
   * so remembering here filled thirty-two slots from one swipe and pushed out the colours
   * that had actually been chosen. Keeping a colour is the add box's job.
   */
  const setColour = (next: RGBA): void => {
    props.store.transform(props.part.id, {
      colour: rgbaToRgb(next),
      opacity: next.a / 255,
    });
  };

  /** Commits one dimension, as a new shape rather than a mutated one. */
  const setDimension = (field: DimensionField, value: number): void => {
    props.store.transform(props.part.id, {
      shape: withParameter(props.part.shape, field.name, field.axis, value),
    });
  };

  return (
    <section class={styles.panel} aria-label="Transform">
      <h2 class={styles.heading}>
        {props.part.shape.type}
        <span class={styles.id}>{props.part.id}</span>
      </h2>

      <h3 class={styles.subheading}>Position</h3>
      <For each={["x", "y", "z"] as const}>
        {(axis) => (
          <Axis
            label={axis}
            value={props.part.origin[axis]}
            step={0.05}
            onCommit={(value) => {
              props.store.transform(props.part.id, {
                origin: { ...props.part.origin, [axis]: value },
              });
            }}
          />
        )}
      </For>

      {/*
        **The shape's own numbers, above colour and above the boolean.**

        Where it goes is an argument about what somebody is doing. A position and a size are
        the shape itself — they are what the part *is* — and the boolean, the softness and the
        paint are what is being done to it. So the panel reads outwards: here is the part, here
        is where it is, here is what it does to the model, here is what colour it is.
      */}
      <h3 class={styles.subheading}>Dimensions</h3>
      <For each={dimensionGroups(props.part.shape)}>
        {(group) => (
          <Show
            when={group.fields.length > 1}
            fallback={
              <Axis
                label={group.fields[0]?.label ?? group.label}
                value={group.fields[0]?.value ?? 0}
                step={group.fields[0]?.step ?? 0.01}
                onCommit={(value) => {
                  const field = group.fields[0];
                  if (field !== undefined) {
                    // **Floored at the table's `min`, which is a property of the geometry
                    // and not of this panel**: no primitive here has a negative size, and a
                    // negative radius is not a shape the field can describe. No ceiling,
                    // because how large a limb may be is a question about the mesh budget.
                    setDimension(field, Math.max(field.min, value));
                  }
                }}
              />
            }
          >
            <fieldset class={styles.group}>
              <legend class={styles.groupLegend}>{group.label}</legend>
              <For each={group.fields}>
                {(field) => (
                  <Axis
                    label={field.label}
                    value={field.value}
                    step={field.step}
                    onCommit={(value) => {
                      setDimension(field, Math.max(field.min, value));
                    }}
                  />
                )}
              </For>
            </fieldset>
          </Show>
        )}
      </For>

      <h3 class={styles.subheading}>Colour</h3>
      <div class={styles.colourRow}>
        <span
          class={styles.swatch}
          style={{ "--swatch": rgbaToCss(colourOf()) }}
        />
        <span class={styles.colourValue}>
          {props.part.colour === undefined
            ? "default"
            : `${props.part.colour.r}, ${props.part.colour.g}, ${props.part.colour.b}`}
        </span>
      </div>

      {/*
        **The picker and the palette live in the native `popover` element**, which is the
        same mechanism `console/console.tsx` already uses here for its suggestions. The
        alternative — a `createPopover` helper — is deliberately not in `packages/ui`
        (ADR 0026), so this is the in-repo pattern rather than a second one.
        *
        * A popover rather than an inline panel because the picker is 200px of chart plus
        * two sliders plus four fields: on a phone that is most of the screen, and a panel
        * that covered the model while somebody chose a colour would hide the thing the
        * colour applies to.
      */}
      <button
        type="button"
        class={styles.pickerButton}
        popovertarget="colour-picker"
        style={{ "anchor-name": "--colour-picker" }}
      >
        Choose colour…
      </button>

      <div
        id="colour-picker"
        popover="auto"
        class={styles.pickerPopover}
        style={{ "position-anchor": "--colour-picker" }}
      >
        <ColourPicker colour={colourOf()} onColour={setColour} />
        <PaletteRow
          palette={props.palette}
          colour={colourOf()}
          onPick={setColour}
          onAdd={(colour) => {
            props.palette.remember(colour);
          }}
        />
      </div>

      <PaletteRow
        palette={props.palette}
        colour={colourOf()}
        onPick={setColour}
        onAdd={(colour) => {
          props.palette.remember(colour);
        }}
      />

      <h3 class={styles.subheading}>Boolean</h3>
      {/*
        **Two radio buttons rather than a dropdown**, because there are two of them and a
        dropdown makes the common case — leaving it on union — a thing to open and close.
        The name is "Boolean" rather than "Combine" because `Combine` is the field's word
        and this is the shape's: what a person is choosing is whether the part joins the
        model or cuts into it.
      */}
      <div class={styles.booleans} role="radiogroup" aria-label="Boolean">
        {(
          [
            ["Add", "Union"],
            ["Subtract", "Difference"],
          ] as const
        ).map(([value, label]) => (
          <label class={styles.boolean}>
            <input
              type="radio"
              name={`boolean-${props.part.id}`}
              checked={props.part.combine === value}
              onChange={() => {
                props.store.transform(props.part.id, { combine: value });
              }}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <Axis
        label="soft"
        value={props.part.softness}
        step={0.01}
        onCommit={(value) => {
          props.store.transform(props.part.id, {
            softness: Math.max(0, Math.min(MAX_SOFTNESS, value)),
          });
        }}
      />

      {/*
        **What the softness is doing, in words, rather than a tooltip.** Above zero the
        boolean becomes a soft union or a soft difference, and which of those it is
        depends on the buttons above — so a single softness field silently changes two
        different operations depending on its neighbour, which is exactly the kind of
        state a person cannot hold in their head.
      */}
      <p class={styles.softnessNote}>
        {props.part.softness <= 0
          ? "hard edge"
          : `soft ${props.part.combine === "Add" ? "union" : "difference"}`}
      </p>

      <Show when={isAxial(props.part.shape.type)}>
        <h3 class={styles.subheading}>
          Rotation
          <span class={styles.note}>degrees</span>
        </h3>
        <For each={["yaw", "pitch", "roll"] as const}>
          {(axis) => (
            <Axis
              label={axis}
              value={angles()[axis]}
              step={1}
              onCommit={(value) => {
                // **Rebuilt from the other two current angles, not from the committed
                // ones.** A person setting yaw then roll expects the roll they see to be
                // the roll they get, and composing from the *displayed* values is what
                // makes that true; composing from the stored quaternion each time would
                // make the third field depend on the order the first two were typed in.
                const current = angles();
                props.store.transform(props.part.id, {
                  orientation: fromEuler(
                    (axis === "yaw" ? value : current.yaw) * (Math.PI / 180),
                    (axis === "pitch" ? value : current.pitch) *
                      (Math.PI / 180),
                    (axis === "roll" ? value : current.roll) * (Math.PI / 180),
                  ),
                });
              }}
            />
          )}
        </For>
      </Show>
    </section>
  );
}
