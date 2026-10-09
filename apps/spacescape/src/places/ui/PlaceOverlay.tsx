import { createEffect, onCleanup, Show, type Component } from "solid-js";

import type { Dialog, Ending } from "../host";

import "./place-overlay.css";

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
