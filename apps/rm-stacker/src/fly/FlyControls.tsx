import { Component, createSignal, onCleanup } from "solid-js";
import { Dimensions2D } from "@big-mesh-studios/maths";
import type { FlyInputController } from "../fly-input";
import { ActionButton } from "./ActionButton";
import { Joystick } from "./Joystick";
import styles from "./FlyControls.module.css";

/** How wide and tall the area a thumb lands on is, in pixels. */
const STICK = 150;

/** How wide and tall the place button is, in pixels. It is the one held down. */
const PLACE = 110;

/** How wide and tall the remove button is, in pixels. */
const REMOVE = 84;

/** How wide and tall a step back through the changes is, in pixels. */
const STEP = 64;

/** How far in from the window's edge the controls sit, in pixels. */
const MARGIN = 24;

/** How far apart the buttons sit, in pixels. */
const GAP = 14;

/**
 * The touch controls a camera in flight is flown and edited with: a stick to
 * fly on, and the two buttons that put a voxel down and take one away.
 *
 * A touch on the canvas itself only turns the view, so that a thumb which rests
 * on the figure before it drags never puts a voxel down where it did not mean
 * to. Everything that acts on the model is a button.
 */
const FlyControls: Component<{
  input: FlyInputController;
  /** Takes the last change back, and puts it back again. */
  undo(): void;
  redo(): void;
}> = (props) => {
  const [view, setView] = createSignal<Dimensions2D>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const abort = new AbortController();
  window.addEventListener(
    "resize",
    () => setView({ width: window.innerWidth, height: window.innerHeight }),
    { signal: abort.signal },
  );
  onCleanup(() => abort.abort());

  const bottom = () => view().height - MARGIN;
  const right = () => view().width - MARGIN;
  const removeLeft = () => right() - REMOVE;
  const removeTop = () => bottom() - PLACE - GAP - REMOVE;
  const stepTop = () => removeTop() - GAP - STEP;

  return (
    <div
      class={styles.overlay}
      style={{ "-webkit-tap-highlight-color": "transparent" }}
    >
      <div class={styles.control}>
        <Joystick
          left={MARGIN}
          top={view().height - MARGIN - STICK}
          hitAreaSize={STICK}
          outerRingSize={0.8 * STICK}
          knobSize={70}
          onValue={(value) => props.input.setTouchMove(value.x, value.y)}
        />
      </div>

      <div class={styles.control}>
        <ActionButton
          left={right() - PLACE}
          top={bottom() - PLACE}
          size={PLACE}
          kind="cube"
          title="Put a voxel against the face under the crosshair"
          onPressed={(pressed) => props.input.setTouchPlace(pressed)}
        />
      </div>

      <div class={styles.control}>
        <ActionButton
          left={removeLeft()}
          top={removeTop()}
          size={REMOVE}
          kind="eraser"
          title="Take away the voxel under the crosshair"
          onPressed={(pressed) => props.input.setTouchRemove(pressed)}
        />
      </div>

      {/* The keyboard a mouse needs is a key the thumb has not got, so the
          history is walked with buttons of its own here. */}
      <div class={styles.control}>
        <ActionButton
          left={removeLeft() - GAP - STEP}
          top={stepTop()}
          size={STEP}
          kind="arrow-rotate-left"
          title="Take the last change back"
          onPressed={() => props.undo()}
        />
      </div>

      <div class={styles.control}>
        <ActionButton
          left={removeLeft()}
          top={stepTop()}
          size={STEP}
          kind="arrow-rotate-right"
          title="Put the last change back again"
          onPressed={() => props.redo()}
        />
      </div>
    </div>
  );
};

export default FlyControls;
