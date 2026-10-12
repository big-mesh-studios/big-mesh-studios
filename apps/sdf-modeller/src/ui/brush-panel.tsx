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
import { Show } from "solid-js";

import controls from "./controls.module.css";

import { rgbaToCss, type RGBA } from "@big-mesh-studios/core";

import type { AtlasInfo } from "../unwrapping/bake";
import { PaletteRow } from "./palette";
import type { Palette } from "./palette";
import { ColourPicker } from "./colour-picker";
import { createPopover } from "./popover";
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
  /**
   * What the paint field is, or nothing when nothing has been painted.
   *
   * **A readout rather than a control**, because the field's resolution is a constant rather
   * than a packer's choice: there is nothing to offer a choice between.
   */
  readonly fieldDetail: string | undefined;
  /** Whether there is any painting to undo, clear, or blend over. */
  readonly hasPaint: boolean;
  /**
   * How many dabs the journal holds.
   *
   * **A readout, and it is there because the alternative is an inert tool.** A brush that
   * records nothing and shows nothing is indistinguishable from one that records nothing and
   * cannot show what it recorded, and that ambiguity cost two rounds of debugging. Whether this
   * number moves while somebody paints separates "the brush is not finding the surface" from
   * "the brush is painting and the picture is not updating" at a glance.
   */
  readonly dabs: number;
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
  /** Whether a bake is running, which disables everything that would start another. */
  readonly busy: boolean;
}

export function BrushPanel(props: BrushPanelProps) {
  // **The picker in a popover, for the reason `transform-panel.tsx:260-263` gives:** it is a
  // 200px chart plus two sliders plus four fields, and on a phone that is most of the screen.
  // A panel covering the model while somebody chose a colour would hide the thing the colour
  // applies to.
  const ColourPopover = createPopover();

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

        {/*
          **The current colour, as the trigger — which shows the colour rather than saying
          "choose colour".**

          **Because a brush's colour is the one setting whose current value matters at every
          moment, unlike a width or a softness where the slider position is itself the
          readout.** A person painting picks a colour, paints with it for a while, and needs to
          know what they are holding without opening anything; a button that reads "Choose
          colour…" makes them open it to find out.
        */}
        <ColourPopover.Trigger
          class={`${styles.pickerButton} ${styles.pickerButtonLeading}`}
          title="Pick the colour the brush paints with"
        >
          <span
            class={styles.swatchPreview}
            style={{ "--swatch": rgbaToCss(props.brush.colour) }}
            aria-hidden="true"
          />
          {rgbaToCss(props.brush.colour)}
        </ColourPopover.Trigger>

        <ColourPopover.Panel class={styles.pickerPopover}>
          <ColourPicker
            colour={props.brush.colour}
            onColour={(colour) => {
              props.onColour(colour);
            }}
          />
        </ColourPopover.Panel>

        {/*
          **The palette inline as well as in the picker, because it is the fast path.**

          A palette is one tap and no drag, and repainting a figure means cycling through a
          handful of colours repeatedly. Requiring the popover for that would put two taps and
          a dismissal between a person and the thing they do most while painting. The picker
          is for colours the palette has not got yet; `PaletteRow` carries its own add box, so
          a colour picked in the popover is one tap from being remembered.
        */}
        <PaletteRow
          palette={props.palette}
          colour={props.brush.colour}
          onPick={(colour) => {
            props.onColour(colour);
          }}
          onAdd={(colour) => {
            props.palette.remember(colour);
          }}
        />
      </div>

      <Show when={props.fieldDetail} fallback={undefined}>
        {(detail) => (
          <p class={styles.note}>
            {detail()} · {props.dabs} dab{props.dabs === 1 ? "" : "s"}
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
      <div
        class={styles.booleans}
        role="radiogroup"
        aria-label="Texture over colour"
      >
        {(
          [
            [
              0,
              "Tint",
              "Keeps each part's own colour, with the texture over it",
            ],
            [
              1,
              "Replace",
              "The texture wins, and the part colour only shows through where the texture is clear",
            ],
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
          disabled={props.busy || !props.hasPaint}
          onClick={() => {
            props.onClear();
          }}
        >
          Clear paint
        </button>
      </div>
    </div>
  );
}
