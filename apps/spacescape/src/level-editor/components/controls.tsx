/**
 * The small controls every panel is made of.
 *
 * ## Why these are here and not in `@big-mesh-studios/ui`
 *
 * That package holds the things that are about *how the app behaves* — a media query as a
 * signal, a pointer gesture, a way to keep a subtree alive across a tab. These are about
 * *what a panel looks like*, and they are the vocabulary voxelscape's editor already speaks,
 * which is what makes the two editors read the same and makes a port reviewable as a diff.
 *
 * ## Why a number field is a field and not a bare `<input type=number>`
 *
 * **Because the value is not the only thing that matters, and a bare input hides the rest.**
 * A level is numbers, and a number field here has to say what a number *means*: a stepper
 * that will not go below a shape's minimum size, a label that says which axis, and a value
 * that clamps rather than silently accepting nonsense. voxelscape's `NumberField` is the
 * same shape for the same reason, and its stepper buttons are what make a level editable on
 * a touch screen at all.
 */

import { For, Show } from "solid-js";
import type { JSX } from "@solidjs/web/jsx-runtime";

import styles from "./controls.module.css";

/** A button. `selected` is for the toolbar's tools, which read as a radio group. */
export const Button = (props: {
  label: string;
  title?: string;
  disabled?: boolean;
  selected?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    class={[styles.button, { [styles.selected]: props.selected === true }]}
    disabled={props.disabled === true}
    title={props.title ?? props.label}
    aria-pressed={props.selected === true ? "true" : undefined}
    onClick={props.onClick}
  >
    {props.label}
  </button>
);

/**
 * A tab, for the panels that share a sheet on a narrow screen.
 *
 * `aria-selected` rather than a class alone, because the tab row is a `tablist` and the
 * panels it chooses between are what a screen reader navigates by.
 */
export const Tab = (props: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) => (
  <button
    type="button"
    role="tab"
    aria-selected={props.selected ? "true" : "false"}
    class={[styles.tab, { [styles.selected]: props.selected }]}
    onClick={props.onSelect}
  >
    {props.label}
  </button>
);

/** A row of controls, grouped so a panel reads as sections rather than as a wall. */
export const Bar = (props: { label?: string; children: JSX.Element }) => (
  <section class={styles.bar}>
    <Show when={props.label}>
      <h3 class={styles.barLabel}>{props.label}</h3>
    </Show>
    <div class={styles.barItems}>{props.children}</div>
  </section>
);

/**
 * One number, with a stepper either side of it.
 *
 * **The steppers clamp rather than wrap.** A shape's `radius` has a minimum; a stepper that
 * stepped past it would build a shape the mesher cannot render, and the only symptom would
 * be a hole in the world.
 *
 * **The text field is not clamped on every keystroke**, because clamping while somebody is
 * halfway through typing `12` into a field that holds `1` is hostile. It clamps on blur and
 * on the steppers, and it refuses anything that is not a number at all.
 */
export const NumberField = (props: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  /** What one press of a stepper changes by — different from the keyboard's arrow step. */
  bigStep?: number;
  onChange: (value: number) => void;
}) => {
  const clamp = (value: number): number => {
    let next = value;
    if (props.min !== undefined) next = Math.max(props.min, next);
    if (props.max !== undefined) next = Math.min(props.max, next);
    return next;
  };

  const nudge = (by: number): void => props.onChange(clamp(props.value + by));

  return (
    <label class={styles.number}>
      <span class={styles.numberLabel}>{props.label}</span>
      <input
        class={styles.numberInput}
        type="number"
        value={props.value}
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        onChange={(event) => {
          const next = Number(event.currentTarget.value);
          // `NaN` from an empty or half-typed field is not a value, so the field is left
          // as it was rather than being written `NaN` into a level.
          if (!Number.isFinite(next)) return;
          props.onChange(clamp(next));
        }}
      />
      <span class={styles.steppers}>
        <button
          type="button"
          class={styles.stepper}
          aria-label={`${props.label} down`}
          disabled={props.min !== undefined && props.value <= props.min}
          onClick={() => nudge(-(props.step ?? 1))}
        >
          −
        </button>
        <button
          type="button"
          class={styles.stepper}
          aria-label={`${props.label} up`}
          disabled={props.max !== undefined && props.value >= props.max}
          onClick={() => nudge(props.bigStep ?? props.step ?? 1)}
        >
          +
        </button>
      </span>
    </label>
  );
};

/** Three numbers in a row, for a position. */
export const Vec3Field = (props: {
  label: string;
  value: readonly [number, number, number];
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: readonly [number, number, number]) => void;
}) => (
  <fieldset class={styles.vec3}>
    <legend class={styles.vec3Label}>{props.label}</legend>
    <div class={styles.vec3Row}>
      <For each={["x", "y", "z"] as const}>
        {(axis, index) => (
          <NumberField
            label={axis}
            value={props.value[index()]}
            min={props.min}
            max={props.max}
            step={props.step ?? 1}
            onChange={(next) => {
              const updated: [number, number, number] = [...props.value];
              updated[index()] = next;
              props.onChange(updated);
            }}
          />
        )}
      </For>
    </div>
  </fieldset>
);

/**
 * A list of choices, as a `<select>`.
 *
 * **Always renders the current value, even when it is not one of the options.** A level
 * naming a model its place does not carry yet is a real state — that is what the
 * "skipped, not fatal" rule in `apply-level.ts` is for — and a `<select>` whose value is
 * not in its list shows the *first option*, which would quietly change the value the first
 * time anybody touched the field.
 */
export const Choice = <T extends string>(props: {
  label: string;
  value: T;
  choices: readonly { readonly value: T; readonly label: string }[];
  onChange: (value: T) => void;
}) => (
  <label class={styles.choice}>
    <span class={styles.numberLabel}>{props.label}</span>
    <select
      class={styles.numberInput}
      value={props.value}
      onChange={(event) => props.onChange(event.currentTarget.value as T)}
    >
      <Show
        when={!props.choices.some((choice) => choice.value === props.value)}
      >
        <option value={props.value}>{props.value} — not attached</option>
      </Show>
      <For each={props.choices}>
        {(choice) => <option value={choice.value}>{choice.label}</option>}
      </For>
    </select>
  </label>
);

/** A checkbox with its label, for the two fields that are booleans. */
export const Checkbox = (props: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) => (
  <label class={styles.checkbox}>
    <input
      type="checkbox"
      checked={props.value}
      onChange={(event) => props.onChange(event.currentTarget.checked)}
    />
    <span>{props.label}</span>
  </label>
);

/** A colour, which only means anything on a `Paint`. */
export const ColourField = (props: {
  label: string;
  value:
    { readonly r: number; readonly g: number; readonly b: number } | undefined;
  onChange: (value: { r: number; g: number; b: number }) => void;
}) => {
  const hex = (): string => {
    const value = props.value ?? { r: 255, g: 255, b: 255 };
    return `#${[value.r, value.g, value.b]
      .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
      .join("")}`;
  };

  return (
    <label class={styles.choice}>
      <span class={styles.numberLabel}>{props.label}</span>
      <input
        class={styles.colour}
        type="color"
        value={hex()}
        onChange={(event) => {
          const raw = event.currentTarget.value;
          props.onChange({
            r: Number.parseInt(raw.slice(1, 3), 16),
            g: Number.parseInt(raw.slice(3, 5), 16),
            b: Number.parseInt(raw.slice(5, 7), 16),
          });
        }}
      />
    </label>
  );
};

/** The one line a panel says something in when it is not showing a list or a field. */
export const Empty = (props: { children: JSX.Element }) => (
  <p class={styles.empty}>{props.children}</p>
);

/** A line saying why something was refused. The only place a message is styled. */
export const Notice = (props: { text: string | undefined }) => (
  <Show when={props.text !== undefined}>
    <p class={styles.notice} role="status">
      {props.text}
    </p>
  </Show>
);
