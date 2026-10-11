/**
 * The brush: how wide, how soft, what colour, and the two things that are not brush settings.
 *
 * ## Why this is a panel rather than more controls in the toolbar
 *
 * **Because the toolbar is a radio group and a brush has a dozen answers.** Width, softness,
 * colour, clear, rebake and the atlas readout are all things a person reaches for *while*
 * painting, and the one thing the toolbar is for is saying which tool is held. Putting a slider
 * beside three mutually exclusive buttons makes the row say two things at once.
 *
 * ## Why the width is in world units and not texels
 *
 * **Because world units are what a figure is measured in and texels are what an atlas happens to
 * be.** A brush that changed width when somebody moved the resolution slider would be a brush
 * that changed size for no reason, and the size on the model is the thing a person is aiming.
 * The conversion to texels happens in the recorder, where the atlas's own density is known.
 *
 * ## Why softness is reversed twice
 *
 * **Because the stored number is hardness and a slider labelled "Softness" whose value rose as
 * the edge got harder would be a lie twice over.** The panel's own value runs soft-to-hard the
 * other way from the label, so `1 -` goes in on the way to the control and on the way back.
 */
import { For, Show } from "solid-js";

import controls from "./controls.module.css";

import { rgbaToCss, type RGBA } from "@big-mesh-studios/core";

import type { AtlasInfo } from "../unwrapping/bake";
import type { Palette } from "./palette";
import styles from "./transform-panel.module.css";

/** How wide the brush is, in world units. */
export interface BrushState {
  readonly width: number;
  readonly hardness: number;
  readonly colour: RGBA;
}

/** The stops of the width slider, which are the ends of "how big a brush". */
export const WIDTHS: readonly number[] = [0.05, 0.1, 0.25, 0.5, 1, 2, 4];

/** A brush as it starts: a fifth of a unit across, a soft edge, and whatever the palette's first is. */
export const defaultBrush = (colour: RGBA): BrushState => ({
  width: 0.25,
  hardness: 0.5,
  colour,
});

export interface BrushPanelProps {
  readonly brush: BrushState;
  /** A width from {@link WIDTHS}. */
  readonly onWidth: (width: number) => void;
  /** A hardness from 0 (an airbrush) to 1 (a hard edge). */
  readonly onHardness: (hardness: number) => void;
  readonly onColour: (colour: RGBA) => void;
  readonly palette: Palette;
  /** What the atlas looks like, or undefined before the first bake. */
  readonly atlas: AtlasInfo | undefined;
  /** Wipes the atlas. One history entry, like a stroke. */
  readonly onClear: () => void;
  /**
   * How much of the texture replaces the part colour rather than tinting it.
   *
   * **Passed as a number because it is a number to everything downstream** — the material's
   * uniform, which is what it is. The two ends are named below, where a person reads them.
   */
  readonly blend: number;
  readonly onBlend: (blend: number) => void;
  /** Lays the coordinates out again, keeping the painting. */
  readonly onRebake: () => void;
  /** Whether a bake is running, which disables everything that would start another. */
  readonly busy: boolean;
}

export function BrushPanel(props: BrushPanelProps) {
  return (
    <div class={styles.panel}>
      <div class={styles.group}>
        {/*
          **The width slider's position is an index into `WIDTHS`,** for the reason the resolution
          slider is one: the values double, so a slider whose value were the size itself would run
          backwards — the tiniest brush on the right — and somebody would learn that by dragging
          it and watching the brush shrink.
        */}
        <label
          class={styles.axis}
          title="How wide the brush is, across the model"
        >
          <span class={styles.axisLabel}>size</span>
          <input
            type="range"
            min={0}
            max={WIDTHS.length - 1}
            step={1}
            value={Math.max(0, WIDTHS.indexOf(props.brush.width))}
            aria-valuetext={`${props.brush.width} world units across`}
            onInput={(event) => {
              const chosen = WIDTHS[event.currentTarget.valueAsNumber];
              if (chosen !== undefined) props.onWidth(chosen);
            }}
          />
          <span class={styles.number}>{props.brush.width}</span>
        </label>

        <label
          class={styles.axis}
          title="How hard the brush's edge is; hard is one end and soft the other"
        >
          <span class={styles.axisLabel}>soft</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round((1 - props.brush.hardness) * 100)}
            aria-valuetext={`${Math.round((1 - props.brush.hardness) * 100)}% soft`}
            onInput={(event) => {
              props.onHardness(1 - event.currentTarget.valueAsNumber / 100);
            }}
          />
          <span class={styles.number}>
            {Math.round((1 - props.brush.hardness) * 100)}
          </span>
        </label>
      </div>

      <div class={styles.group}>
        <span class={styles.groupLegend}>Colour</span>
        <div class={styles.colourRow}>
          {/*
            **The palette's own colours, as buttons rather than as swatches to look at.** A brush
            colour is not a part's colour — it does not go in the parts list and it does not undo
            with a part — but it is the same vocabulary, and a second palette for it would be two
            places to add a colour to.
          */}
          <For each={props.palette.colours()}>
            {(colour) => (
              <button
                type="button"
                class={styles.stepButton}
                aria-label={`Paint with rgb(${colour.r}, ${colour.g}, ${colour.b})`}
                aria-pressed={
                  colour.r === props.brush.colour.r &&
                  colour.g === props.brush.colour.g &&
                  colour.b === props.brush.colour.b
                    ? "true"
                    : "false"
                }
                style={{ "--swatch": rgbaToCss(colour) }}
                onClick={() => {
                  props.onColour(colour);
                }}
              />
            )}
          </For>
        </div>
      </div>

      <Show when={props.atlas}>
        {(atlas) => (
          <p class={styles.note}>
            {atlas().width}×{atlas().height} atlas · {atlas().chartCount} charts
            · {Math.round(atlas().utilization * 100)}% used
          </p>
        )}
      </Show>

      {/*
        **How the texture and a part's colour are combined, and nothing else in this panel is a
        choice between two things.**

        **Named by what they do rather than by how they are computed**, because "modulate" is a
        word about arithmetic and "tint" is a word about what a person sees. Tinting keeps each
        part's own colour — which is the point of the nearest-own-surface rule in ADR 0031, and
        throwing it away would make every part in a multi-coloured model the same shade. Replace
        is for painting a pattern across a whole figure, which tinting cannot do.

        **Disabled without a texture**, because the question is not meaningful until there is
        something on the other side of it.
      */}
      <div class={styles.booleans} role="radiogroup" aria-label="Texture over colour">
        {(
          [
            [0, "Tint", "Keeps each part's own colour, with the texture over it"],
            [1, "Replace", "The texture wins, and the part colour only shows through where the texture is clear"],
          ] as const
        ).map(([value, label, why]) => (
          <label class={styles.boolean}>
            <input
              type="radio"
              name="brush-blend"
              checked={props.blend === value}
              disabled={props.atlas === undefined}
              onChange={() => {
                props.onBlend(value);
              }}
            />
            <span title={why}>{label}</span>
          </label>
        ))}
      </div>

      <div class={styles.booleans}>
        <button
          type="button"
          class={controls.button}
          disabled={props.busy || props.atlas === undefined}
          onClick={() => {
            props.onClear();
          }}
        >
          Clear texture
        </button>
        <button
          type="button"
          class={controls.button}
          disabled={props.busy || props.atlas === undefined}
          title="Lay the coordinates out again, keeping what has been painted"
          onClick={() => {
            props.onRebake();
          }}
        >
          Rebake
        </button>
      </div>
    </div>
  );
}
