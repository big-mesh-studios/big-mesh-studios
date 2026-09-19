import type { Accessor } from "solid-js";
import { createSignal } from "solid-js";
import { Joystick } from "../ui/Joystick";
import { PlaceIcon, SelectIcon, SwapIcon } from "../ui/icons";
import { useVoxelscape } from "../voxelscape/voxelscape-context";
import type { ToolKind } from "./types";
import styles from "./TouchControls.module.css";

/** The side of the joystick's square hit area, in screen pixels. */
const JOYSTICK_HIT = 150;

/**
 * The crosshair a no-clip camera aims its tool through. It is separate from the
 * touch cluster so the mouse and the finger both place at the same point.
 */
export function LevelEditorCrosshair() {
  return (
    <div class={styles.crosshair}>
      <div class={styles["vertical-stroke"]} />
      <div class={styles["horizontal-stroke"]} />
    </div>
  );
}

/**
 * The level editor's touch action cluster: the large button applies the active
 * tool at the crosshair, and the smaller one trades between placing and
 * selecting. A no-clip camera also gets a joystick to fly with, since its
 * look-drag owns the rest of the canvas. It exists so a finger never places a
 * shape by tapping the canvas to turn the camera.
 */
export function LevelEditorTouchControls(props: {
  tool: Accessor<ToolKind>;
  setTool(tool: ToolKind): void;
  apply(): void;
  /** Whether the no-clip camera is active and needs a joystick to fly. */
  noClip: boolean;
}) {
  const { input } = useVoxelscape();
  const [lastPlacement, setLastPlacement] = createSignal<ToolKind>("box");

  const toggle = (): void => {
    const current = props.tool();
    if (current === "select") {
      props.setTool(lastPlacement());
    } else {
      setLastPlacement(current);
      props.setTool("select");
    }
  };

  return (
    <>
      {props.noClip ? (
        <div class={styles.joystick}>
          <Joystick
            left={0}
            top={0}
            hitAreaSize={JOYSTICK_HIT}
            outerRingSize={0.8 * JOYSTICK_HIT}
            knobSize={70}
            // The joystick's screen axes have +y down; the input snapshot has
            // +y forward, so the vertical sign flips.
            onValue={(value) => input.setTouchMove(value.x * 2, -value.y * 2)}
          />
        </div>
      ) : undefined}
      <div class={styles.cluster}>
        <button
          type="button"
          class={styles.toggle}
          aria-label="switch between placing and selecting"
          onPointerDown={(event) => {
            event.stopPropagation();
            toggle();
          }}
        >
          <SwapIcon />
        </button>
        <button
          type="button"
          class={styles.apply}
          aria-label={
            props.tool() === "select" ? "select the shape" : "place a shape"
          }
          onPointerDown={(event) => {
            event.stopPropagation();
            props.apply();
          }}
        >
          {props.tool() === "select" ? <SelectIcon /> : <PlaceIcon />}
        </button>
      </div>
    </>
  );
}
