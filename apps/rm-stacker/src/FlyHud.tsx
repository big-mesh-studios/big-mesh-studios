import { Show, useContext } from "solid-js";
import { StackerContext } from "./context";
import styles from "./FlyHud.module.css";

/** The crosshair's three states, which are three questions asked of a press. */
type Aim = "nothing" | "placeable" | "blocked";

/**
 * What a camera in flight is looking at, and how to fly it and edit with it.
 *
 * The crosshair stands where the ray out of the camera is going rather than
 * where the pointer is, because a camera in flight holds the pointer and there is
 * no pointer to see. It is drawn on, blocked or plain according to whether a
 * press would put a voxel down, because a crosshair that looks the same over a
 * face that can be built on and one at the edge of a part's box is a crosshair
 * that lies about half the time.
 */
export function FlyHud() {
  const { crosshair, handEdited, selectedPart, coarsePointer } =
    useContext(StackerContext);

  const aim = (): Aim => {
    const met = crosshair();

    if (met === undefined) {
      return "nothing";
    }

    return met.places ? "placeable" : "blocked";
  };

  const hint = (): string =>
    coarsePointer()
      ? "Left stick flies · drag looks · buttons place and take away"
      : "WASD flies · mouse looks · left click places · right click takes away · Ctrl+Z takes back · Esc leaves";

  return (
    <div class={styles.overlay}>
      <div class={styles.crosshair} data-aim={aim()} aria-hidden="true">
        <div class={styles.stem} />
        <div class={styles.stem} />
      </div>

      <div class={styles.readout}>
        <p class={styles.hint}>{hint()}</p>

        <Show when={handEdited().has(selectedPart().name)}>
          <p class={styles.note}>
            The panels do not show the voxels put in this part by hand
          </p>
        </Show>
      </div>
    </div>
  );
}
