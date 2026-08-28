import { createEffect, createMemo, createSignal, For } from "solid-js";
import { HSVA, RGBA } from "@big-mesh-studios/maths";
import { pointer } from "@big-mesh-studios/utils/pointer";
import styles from "./ColorPicker.module.css";

const DEFAULT_HSVA: HSVA = { h: 0, s: 1, v: 1, a: 1 };
const CHANNELS = ["r", "g", "b", "a"] as const satisfies ReadonlyArray<
  keyof RGBA
>;
const CHANNEL_LABELS: Record<keyof RGBA, string> = {
  r: "Red",
  g: "Green",
  b: "Blue",
  a: "Alpha",
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

/** Fraction of the way across `element` that `event` sits, clamped to `0..1`. */
function fractionWithin(element: HTMLElement, event: PointerEvent) {
  const rect = element.getBoundingClientRect();
  return {
    x: clamp01((event.clientX - rect.left) / rect.width),
    y: clamp01((event.clientY - rect.top) / rect.height),
  };
}

export function ColourPicker(props: {
  class?: string;
  colour?: RGBA;
  onColour?: (colour: RGBA) => void;
}) {
  // A writable memo: dragging writes HSVA directly, and an incoming `colour`
  // prop overrides it on the next tick. `previous` doubles as the fallback that
  // `HSVA.fromRGBA` needs for hue and saturation, which have no definition at
  // greys and black.
  const [hsva, setHsva] = createSignal<HSVA>(
    (previous) => {
      const colour = props.colour;
      if (colour == undefined) {
        return previous ?? DEFAULT_HSVA;
      }
      // Already showing this colour, so leave hue and saturation alone rather
      // than recovering them from our own 8-bit output.
      if (previous != undefined && RGBA.equals(HSVA.toRGBA(previous), colour)) {
        return previous;
      }
      return HSVA.fromRGBA(colour, previous ?? DEFAULT_HSVA);
    },
    { equals: HSVA.equals },
  );

  const colour = createMemo(() => HSVA.toRGBA(hsva()));

  // Only one channel is ever mid-edit, so a single draft covers all four inputs.
  const [draft, setDraft] = createSignal<{
    channel: keyof RGBA;
    text: string;
  }>();

  createEffect(colour, (colour) => {
    if (props.colour && RGBA.equals(colour, props.colour)) {
      return;
    }
    props.onColour?.(colour);
  });

  function onChannelInput(channel: keyof RGBA, text: string) {
    setDraft({ channel, text });
    const value = Number.parseFloat(text);
    if (!Number.isFinite(value)) {
      return;
    }
    const clamped = Math.max(0, Math.min(255, Math.round(value)));
    setHsva((previous) =>
      HSVA.fromRGBA({ ...colour(), [channel]: clamped }, previous),
    );
  }

  async function drag(
    event: PointerEvent & { currentTarget: HTMLElement },
    update: (fraction: { x: number; y: number }, previous: HSVA) => HSVA,
  ) {
    const element = event.currentTarget;
    setDraft(undefined);
    await pointer(event, ({ event }) => {
      setHsva((previous) => update(fractionWithin(element, event), previous));
    });
  }

  return (
    <div class={[styles.colourPicker, props.class]}>
      <div
        class={styles.hueSaturation}
        style={{ "--darken": 1 - hsva().v }}
        onPointerDown={(event) =>
          drag(event, ({ x, y }, previous) => ({
            ...previous,
            h: x * 360,
            s: 1 - y,
          }))
        }
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
        style={{ "--full-value-colour": HSVA.toCSS({ ...hsva(), v: 1, a: 1 }) }}
        onPointerDown={(event) =>
          drag(event, ({ y }, previous) => ({ ...previous, v: 1 - y }))
        }
      >
        <div
          class={styles.sliderHandle}
          style={{ bottom: `${hsva().v * 100}%` }}
        />
      </div>
      <div
        class={styles.alpha}
        style={{ "--opaque-colour": HSVA.toCSS({ ...hsva(), a: 1 }) }}
        onPointerDown={(event) =>
          drag(event, ({ y }, previous) => ({ ...previous, a: 1 - y }))
        }
      >
        <div
          class={styles.sliderHandle}
          style={{ bottom: `${hsva().a * 100}%` }}
        />
      </div>
      <div class={styles.fields}>
        <For each={CHANNELS}>
          {(channel) => {
            const _draft = createMemo(() => {
              const value = draft();
              return value?.channel === channel ? value.text : undefined;
            });

            return (
              <>
                <label class={styles.label} for={`colourpicker-${channel}`}>
                  {CHANNEL_LABELS[channel]}:
                </label>
                <input
                  id={`colourpicker-${channel}`}
                  size="4"
                  value={_draft() ?? colour()[channel]}
                  onInput={(event) =>
                    onChannelInput(channel, event.currentTarget.value)
                  }
                  onBlur={() => setDraft(undefined)}
                />
              </>
            );
          }}
        </For>
      </div>
      <div class={styles.output} style={{ "--colour": RGBA.toCSS(colour()) }} />
    </div>
  );
}
