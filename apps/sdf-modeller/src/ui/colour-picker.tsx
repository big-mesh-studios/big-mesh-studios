/**
 * A colour picker: a hue/saturation chart, a brightness slider, an alpha slider and
 * four number fields.
 *
 * ## Ported from rm-stacker, and what changed
 *
 * The component is the sibling application's `ColorPicker.tsx` nearly as it stands there.
 * Four things differ, and each is because this repository is not that one:
 *
 * - **`pointer` comes from `@big-mesh-studios/ui`.** The sibling's lives in its
 *   `packages/utils`, and the two APIs agree on what a drag is — `(event, callback)` and a
 *   callback handed `{ event }` among other things — so the port is an import change.
 * - **`HSVA` and `RGBA` come from `@big-mesh-studios/core`,** beside the `Rgb8` they
 *   convert to. The arithmetic is unchanged.
 * - **`var(--margin)` is `var(--ui-margin)`** and the two text colours are defined here,
 *   because the baseline's tokens are this repository's and adding a foreground grey to it
 *   for one consumer would be the wrong direction.
 * - **The file is `colour-picker.tsx`,** because this repository spells colour that way
 *   everywhere else and a port is the one place a mixed spelling survives for years.
 *
 * ## Why the hue/saturation chart rather than three sliders
 *
 * **Because a slider cannot express hue and a picker must.** Hue is a circle: 0 and 360
 * are the same colour, and a track with two ends either wraps and is confusing at one end
 * or clamps and cannot reach every hue at all. The chart puts the wrap where it belongs —
 * on a track with no ends — and lets saturation and value fall out of where a finger is
 * put, which is the fastest interaction there is on a screen you can touch.
 *
 * ## Why the alpha slider is here at all
 *
 * **Because the packed vertex has four bytes and the third of them has always been the
 * alpha.** It was never written — `setColour` took three channels — so this picker would
 * have shipped a control that visibly did nothing. `setColour` now takes an alpha and
 * `Operation.opacity` reaches it, which is what makes the slider honest.
 *
 * ## Why the eyedropper is drawn and not always offered
 *
 * **Because it can only exist where the browser can answer the question.** The `EyeDropper` API
 * hands back a colour under the cursor from anywhere on screen, which is a shortcut no chart
 * and no pair of fields can match: a figure painted from a reference image, a colour somebody
 * else chose, a colour already on the page. Where it is missing there is no second-best
 * version of that shortcut worth a button, so rather than a disabled control that always
 * explains itself wrongly, the tool is not drawn at all — `Show` emits nothing, so there is no
 * hole in the layout and nothing in the tab order to find.
 */
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import {
  hsvaToRgba,
  rgbaEquals,
  rgbaToHsva,
  rgbaToCss,
  type HSVA,
  type RGBA,
} from "@big-mesh-studios/core";
import { pointer } from "@big-mesh-studios/ui/pointer";

import { EyeDropperIcon } from "./icons";
import styles from "./colour-picker.module.css";

const DEFAULT_HSVA: HSVA = { h: 0, s: 1, v: 1, a: 1 };

/** All the eyedropper resolves with: an opaque sRGB colour written `#rrggbb`. */
interface EyeDropperResult {
  readonly sRGBHex: string;
}

interface EyeDropperLike {
  open: (options?: { signal?: AbortSignal }) => Promise<EyeDropperResult>;
}

/**
 * **Declared here because TypeScript's DOM library has no `EyeDropper` at all** — not a partial
 * one, none — so this is a missing declaration rather than an override, and it is the same
 * reason `file/save-file.ts` declares the file system picker beside the code that calls it.
 * `options` and the `signal` on `open` are declared for the same reason: `remembersFiles`
 * spells its own type out fully, so a reader can see what the API takes.
 */
declare global {
  interface Window {
    EyeDropper?: new (options?: { signal?: AbortSignal }) => EyeDropperLike;
  }
}

/**
 * Whether the browser can hand this picker a colour from the screen.
 *
 * **A `typeof` check rather than `'EyeDropper' in window`,** matching `remembersFiles`, because
 * a member that exists but is not a constructor cannot be called and `in` would claim it can.
 */
export const picksFromScreen = (): boolean =>
  typeof window !== "undefined" && typeof window.EyeDropper === "function";

/**
 * `#rrggbb` as four bytes.
 *
 * **The alpha is forced to opaque rather than carried over from the picker.** A pixel off the
 * screen has no transparency to report — the format has no channel for it — so a colour taken
 * from a screenshot or another application is a colour that *is* fully opaque, and carrying the
 * slider's alpha across would show a colour the source never had. Somebody who wants it
 * translucent moves the alpha slider afterwards, which is visible; the other reading is a
 * silent lie about what was picked.
 *
 * **Sliced and parsed rather than validated,** because the specification promises that shape
 * and every implementation returns it. A `NaN` channel would only mean the browser broke its
 * own promise, and a picker that refused to show a colour over that would be worse than one
 * showing an odd one.
 */
const fromHex = (hex: string): RGBA => ({
  r: Number.parseInt(hex.slice(1, 3), 16),
  g: Number.parseInt(hex.slice(3, 5), 16),
  b: Number.parseInt(hex.slice(5, 7), 16),
  a: 255,
});

const CHANNELS = ["r", "g", "b", "a"] as const satisfies ReadonlyArray<
  keyof RGBA
>;

const CHANNEL_LABELS: Record<keyof RGBA, string> = {
  r: "R",
  g: "G",
  b: "B",
  a: "A",
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/** Where in its element an event sits, as a fraction, clamped to `0..1`. */
const fractionWithin = (
  element: HTMLElement,
  event: PointerEvent,
): { x: number; y: number } => {
  const rect = element.getBoundingClientRect();
  return {
    x: clamp01((event.clientX - rect.left) / rect.width),
    y: clamp01((event.clientY - rect.top) / rect.height),
  };
};

export function ColourPicker(props: {
  class?: string;
  /** The colour being shown. `undefined` leaves the picker where it is. */
  colour?: RGBA;
  onColour?: (colour: RGBA) => void;
}) {
  // **A writable signal seeded from a function of its previous value.** A drag writes
  // HSVA directly, because the hue and saturation of a colour the person chose must not be
  // recovered from an 8-bit round trip on every move — a fully saturated red comes back
  // from `rgbaToHsva` as a slightly different red, and a picker that did that would drift
  // under a stationary finger. An incoming `colour` prop still wins, and `previous` is the
  // fallback `rgbaToHsva` needs at the greys and at black, where hue and saturation have no
  // answer of their own.
  const [hsva, setHsva] = createSignal<HSVA>(
    (previous) => {
      const colour = props.colour;
      if (colour === undefined) return previous ?? DEFAULT_HSVA;
      // Already showing this colour, so leave hue and saturation alone.
      if (previous !== undefined && rgbaEquals(hsvaToRgba(previous), colour)) {
        return previous;
      }
      return rgbaToHsva(colour, previous ?? DEFAULT_HSVA);
    },
    {
      equals: (a, b) =>
        a.h === b.h && a.s === b.s && a.v === b.v && a.a === b.a,
    },
  );

  const colour = createMemo<RGBA>(() => hsvaToRgba(hsva()));

  // Only one channel is ever mid-edit, so a single draft covers all four inputs.
  const [draft, setDraft] = createSignal<
    { channel: keyof RGBA; text: string } | undefined
  >();

  createEffect(colour, (shown) => {
    if (props.colour !== undefined && rgbaEquals(shown, props.colour)) return;
    props.onColour?.(shown);
  });

  const onChannelInput = (channel: keyof RGBA, text: string): void => {
    setDraft({ channel, text });
    const value = Number.parseFloat(text);
    if (!Number.isFinite(value)) return;
    const clamped = Math.max(0, Math.min(255, Math.round(value)));
    setHsva((previous) =>
      rgbaToHsva({ ...colour(), [channel]: clamped }, previous),
    );
  };

  /**
   * Take a colour off the screen.
   *
   * **The rejection is swallowed rather than reported.** Escape is how this interaction ends —
   * the browser rejects the promise when the overlay is dismissed — so a rejection is an
   * ordinary outcome and not a fault, and a message about it would name a mistake somebody did
   * not make. Nothing has been written when it comes, so there is nothing to recover.
   *
   * **`setDraft(undefined)` for the reason `drag` clears it:** a gesture that changes the colour
   * abandons the half-typed channel, because the field and the swatch would otherwise disagree
   * and the next keystroke would overwrite one of them.
   *
   * **Written through `setHsva` and not to `props.onColour` directly**, so the `rgbaEquals` guard
   * above still decides whether the outside world hears about it.
   */
  const pickFromScreen = async (): Promise<void> => {
    const EyeDropper = window.EyeDropper;
    if (EyeDropper === undefined) return;
    setDraft(undefined);
    try {
      const { sRGBHex } = await new EyeDropper().open();
      setHsva((previous) => rgbaToHsva(fromHex(sRGBHex), previous));
    } catch {
      // Escape, or the browser refused. Nothing was picked and nothing changed.
    }
  };

  /**
   * Follows a drag on one of the tracks.
   *
   * **`element` is captured before the await**, because `event.currentTarget` is only
   * meaningful during dispatch — after the first `await` it is null, and measuring against
   * a null element throws on the first move of every drag.
   */
  const drag = async (
    event: PointerEvent & { currentTarget: HTMLElement },
    update: (fraction: { x: number; y: number }, previous: HSVA) => HSVA,
  ): Promise<void> => {
    const element = event.currentTarget;
    setDraft(undefined);
    await pointer(event, ({ event: moved }) => {
      setHsva((previous) => update(fractionWithin(element, moved), previous));
    });
  };

  return (
    <div class={[styles.colourPicker, props.class]}>
      <div
        class={styles.hueSaturation}
        style={{ "--darken": 1 - hsva().v }}
        onPointerDown={(event) => {
          void drag(event, ({ x, y }, previous) => ({
            ...previous,
            h: x * 360,
            s: 1 - y,
          }));
        }}
      >
        <div
          class={styles.chartHandle}
          style={{
            left: `${(hsva().h / 360) * 100}%`,
            top: `${(1 - hsva().s) * 100}%`,
          }}
        />
      </div>

      <div
        class={styles.brightness}
        style={{
          "--full-value-colour": rgbaToCss(
            hsvaToRgba({ ...hsva(), v: 1, a: 1 }),
          ),
        }}
        onPointerDown={(event) => {
          void drag(event, ({ y }, previous) => ({ ...previous, v: 1 - y }));
        }}
      >
        <div
          class={styles.sliderHandle}
          style={{ bottom: `${hsva().v * 100}%` }}
        />
      </div>

      <div
        class={styles.alpha}
        style={{
          "--opaque-colour": rgbaToCss(hsvaToRgba({ ...hsva(), a: 1 })),
        }}
        onPointerDown={(event) => {
          void drag(event, ({ y }, previous) => ({ ...previous, a: 1 - y }));
        }}
      >
        <div
          class={styles.sliderHandle}
          style={{ bottom: `${hsva().a * 100}%` }}
        />
      </div>

      <div class={styles.fields}>
        <For each={CHANNELS}>
          {(channel) => {
            const shown = createMemo(() => {
              const value = draft();
              return value?.channel === channel ? value.text : undefined;
            });
            return (
              <>
                <label class={styles.label} for={`colour-${channel}`}>
                  {CHANNEL_LABELS[channel]}
                </label>
                <input
                  id={`colour-${channel}`}
                  class={styles.channel}
                  type="number"
                  min="0"
                  max="255"
                  size="4"
                  value={shown() ?? colour()[channel]}
                  onInput={(event) => {
                    onChannelInput(channel, event.currentTarget.value);
                  }}
                  onBlur={() => {
                    setDraft(undefined);
                  }}
                />
              </>
            );
          }}
        </For>
      </div>

      {/*
        **The eyedropper beside the swatch it feeds, in one grid area rather than a fourth
        column.** A flex `gap` is only counted between children that were rendered, so on a
        browser without the API the two sit flush with nothing between them; a grid track would
        collect a gap on either side of itself whatever was in it, and leave a hole in the
        picker where the button had been.
      */}
      <div class={styles.outputRow}>
        <div
          class={styles.output}
          style={{ "--colour": rgbaToCss(colour()) }}
        />

        <Show when={picksFromScreen()}>
          <button
            type="button"
            class={styles.eyeDropper}
            aria-label="pick a colour off the screen"
            title="Pick a colour off the screen"
            onClick={() => {
              void pickFromScreen();
            }}
          >
            <EyeDropperIcon />
          </button>
        </Show>
      </div>
    </div>
  );
}
