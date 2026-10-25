import { createEffect, For, onCleanup, Show, type Component } from "solid-js";
import type { JSX } from "@solidjs/web/jsx-runtime";

import type {
  Dialog,
  Ending,
  HostImage,
  HostHudLabel,
  HostHudMeter,
} from "../host";

import "./place-overlay.css";

/**
 * Where a HUD image sits, as a CSS inset.
 *
 * **A percentage rather than a fixed margin**, because a monitor in the corner should stay in the
 * corner when the window resizes and two percent of a wide window and two percent of a narrow one
 * are the same visual edge. The margin is on the side the corner names and nothing else, so an
 * image in the bottom-left is not also pushed down from the top.
 */
const imageStyle = (image: HostImage): JSX.CSSProperties => {
  const style: JSX.CSSProperties = {
    position: "absolute",
    width: `${image.width}px`,
    height: `${image.height}px`,
  };
  const inset = "2%";
  if (image.corner === "top-left" || image.corner === "bottom-left") {
    style.left = inset;
  } else {
    style.right = inset;
  }
  if (image.corner === "top-left" || image.corner === "top-right") {
    style.top = inset;
  } else {
    style.bottom = inset;
  }
  return style;
};

/**
 * The three things a place says rather than builds.
 *
 * **A narration, a dialog and an ending, and nothing else.** A HUD reports the player's own
 * state; everything here is a place talking to the one player this build runs, and keeping the
 * two apart is what lets a place say anything at all without the engine having an opinion about
 * what it is allowed to say.
 *
 * ## It draws, and it decides nothing
 *
 * **Every piece of state arrives as a prop and every answer leaves as a callback.** There is no
 * timer in here and no copy: how long a narration lasts belongs to whoever decided to say it —
 * `app.tsx` owns that beside the toast, because the toast is the same kind of thing and there
 * should be one answer to "how long does a line from a place stay on screen", not two. This
 * component is what those three things look like, and nothing else.
 *
 * ## The pointer lock, taken as a reader
 *
 * **Because a locked pointer swallows every click and every keystroke aimed anywhere but the
 * crosshair**, so a panel nobody can click is a panel that does not exist (ADR 0010). The
 * suspension is a prop rather than the input controller for the reason `PlaceDocs` takes one: a
 * component that reaches for the controller cannot be rendered without a player.
 */

/** A line somebody said, as the panel draws it. */
export interface Narration {
  readonly who: string;
  readonly text: string;
}

export interface PlaceOverlayProps {
  /** The line on screen, or `undefined`. */
  readonly narration: () => Narration | undefined;
  /** The dialog to draw, or `undefined`. Read off the host. */
  readonly dialog: () => Dialog | undefined;
  /** The ending to draw, or `undefined`. */
  readonly ending: () => Ending | undefined;
  /**
   * The pictures a place has put in a corner.
   *
   * **Ids, sources and sizes rather than pixels.** The pixels are a canvas the application owns —
   * a photo's own canvas, or a HUD feed read back from the GPU — and a component that held them
   * would be a second owner of a buffer that changes every frame.
   */
  readonly images: () => readonly HostImage[];
  /** The value bars a place has put in a corner. */
  readonly hudMeters?: () => readonly HostHudMeter[];
  /** The text labels a place has put in its HUD. */
  readonly hudLabels?: () => readonly HostHudLabel[];
  /** Bumped when a picture's pixels arrive, so the canvases below redraw. */
  readonly revision: () => number;
  /** Copies the current pixels of `image` into the overlay's own canvas. */
  readonly drawImage: (image: HostImage, canvas: HTMLCanvasElement) => void;
  /** The player chose an option. Counted from zero, as `npc-choose` reports it. */
  readonly onChoose: (entityId: string, option: number) => void;
  /** Start the place again from the beginning. */
  readonly onRestart: () => void;
  /**
   * Releases the pointer lock while something here needs the cursor, and takes it back after.
   *
   * **Called and its release called back**, which is the contract `PlaceDocs` already uses, so
   * there is one way to do this rather than one per panel.
   */
  readonly suspendPointerLock: () => () => void;
}

export const PlaceOverlay: Component<PlaceOverlayProps> = (props) => {
  // A dialog and an ending both need the cursor; a narration never does, and `pointer-events:
  // none` on the container means it cannot steal one even by accident.
  let release: (() => void) | undefined;
  // **An effect rather than a call at construction**, because "something modal is up" is a
  // state that changes while the panel is on screen — a dialog opens, the player answers it, it
  // closes — and a release taken once at construction would hold the pointer lock for as long as
  // the place was loaded.
  createEffect(
    () => (props.dialog() ?? props.ending()) !== undefined,
    (modal) => {
      release?.();
      release = modal ? props.suspendPointerLock() : undefined;
    },
  );
  onCleanup(() => release?.());

  return (
    <div class="place-overlay">
      {/* ---- The pictures a place put in a corner ----
       *
       * **A canvas per image, drawn from the application's own canvas.** The overlay cannot
       * sample a GL texture, so a live feed arrives as pixels the application has already read
       * back; a photo is already a canvas, so it is a `drawImage` and costs nothing. The effect
       * depends on `revision` because a feed's pixels change without its id, size or corner ever
       * changing — a dependency a Solid signal can express and a plain object cannot.
       */}
      <For each={props.images()}>
        {(image) => {
          let canvas: HTMLCanvasElement | undefined;
          // **Two arguments, because Solid 2 has no one-argument form.** The first reads the
          // dependency and the second does the work; a one-argument call throws
          // `MISSING_EFFECT_FN` at the next flush, which is what made taking a photo crash the
          // moment the shutter added the first HUD image.
          createEffect(
            // Read, not used: the counter is the whole dependency.
            () => props.revision(),
            () => {
              if (canvas !== undefined) props.drawImage(image, canvas);
            },
          );
          return (
            <canvas
              ref={(element) => (canvas = element)}
              class="place-overlay-image"
              width={image.width}
              height={image.height}
              style={imageStyle(image)}
            />
          );
        }}
      </For>
      <For each={props.hudMeters?.() ?? []}>
        {(meter) => {
          const style: JSX.CSSProperties = {
            position: "absolute",
            width: "220px",
            left: "2%",
          };
          const index = (props.hudMeters?.() ?? []).indexOf(meter);
          style.top = `${2 + index * 8}%`;
          return (
            <div
              class="place-overlay-meter"
              style={style}
              role="meter"
              aria-label={meter.label}
              aria-valuemin={0}
              aria-valuemax={meter.max}
              aria-valuenow={Math.min(meter.value, meter.max)}
            >
              <div class="place-overlay-meter-label">{meter.label}</div>
              <div class="place-overlay-meter-track">
                <div
                  class="place-overlay-meter-fill"
                  style={{
                    width: `${Math.max(0, Math.min(100, (meter.value / meter.max) * 100))}%`,
                  }}
                />
              </div>
            </div>
          );
        }}
      </For>
      <For each={props.hudLabels?.() ?? []}>
        {(label) => {
          const meters = props.hudMeters?.().length ?? 0;
          const index = (props.hudLabels?.() ?? []).indexOf(label);
          return (
            <div
              class="place-overlay-hud-label"
              style={{ top: `${2 + (meters + index) * 8}%` }}
              role="status"
              aria-live="polite"
            >
              {label.text}
            </div>
          );
        }}
      </For>
      <Show when={props.narration()}>
        {(current) => (
          <div class="place-overlay-line" role="status" aria-live="polite">
            <Show when={current().who !== ""}>
              <span class="place-overlay-who">{current().who}</span>
            </Show>
            {current().text}
          </div>
        )}
      </Show>

      <Show when={props.dialog()}>
        {(dialog) => (
          <>
            <div class="place-overlay-scrim" />
            <div
              class="place-overlay-dialog"
              role="dialog"
              aria-label={dialog().prompt}
            >
              <p class="place-overlay-prompt">{dialog().prompt}</p>
              {dialog().options.map((option, index) => (
                <button
                  type="button"
                  class="place-overlay-option"
                  onClick={() => props.onChoose(dialog().entityId, index)}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        )}
      </Show>

      <Show when={props.ending()}>
        {(ending) => (
          <div class="place-overlay-ending" role="dialog" aria-label="ending">
            <div class="place-overlay-card">
              <h1 class="place-overlay-title">{ending().title}</h1>
              <p class="place-overlay-text">{ending().text}</p>
              <button
                type="button"
                class="place-overlay-button"
                onClick={() => props.onRestart()}
              >
                Play again
              </button>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
};
