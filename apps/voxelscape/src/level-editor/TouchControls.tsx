import type { Accessor } from "solid-js";
import { createSignal } from "solid-js";
import { PlaceIcon, SelectIcon, SwapIcon } from "../ui/icons";
import type { ToolKind } from "./types";
import styles from "./TouchControls.module.css";

/**
 * The level editor's touch action cluster: the large button applies the active
 * tool at the crosshair, and the smaller one trades between placing and
 * selecting. It exists so a finger never places a shape by tapping the canvas
 * to turn the camera.
 */
export function LevelEditorTouchControls(props: {
  tool: Accessor<ToolKind>;
  setTool(tool: ToolKind): void;
  apply(): void;
}) {
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
      <div class={styles.crosshair}>
        <div class={styles["vertical-stroke"]} />
        <div class={styles["horizontal-stroke"]} />
      </div>
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
