import { createEffect, createSignal } from "solid-js";
import { pointer } from "@big-mesh-studios/utils/pointer";
import { Icon } from "../components/components";
import type { IconKind } from "../icon-kinds";
import styles from "./ActionButton.module.css";

interface ActionButtonProps {
  left: number;
  top: number;
  size: number;
  kind: IconKind;
  /** What the button does, said as far as a reader of a screen would want it. */
  title: string;
  onPressed(pressed: boolean): void;
}

/**
 * A round button for a thumb, reported held for as long as it is pressed down.
 */
export function ActionButton(props: ActionButtonProps) {
  const [pressed, setPressed] = createSignal(false);

  createEffect(pressed, (pressed) => props.onPressed(pressed));

  return (
    <button
      style={{
        left: `${props.left}px`,
        top: `${props.top}px`,
        width: `${props.size}px`,
        height: `${props.size}px`,
        // The glyph is a font, so the button's own text size is what sets how
        // large it is drawn.
        "font-size": `${0.5 * props.size}px`,
      }}
      data-pressed={pressed() || undefined}
      title={props.title}
      aria-label={props.title}
      onPointerDown={async (event) => {
        setPressed(true);
        await pointer(event);
        setPressed(false);
      }}
      onContextMenu={(event) => event.preventDefault()}
      class={styles.button}
    >
      <Icon kind={props.kind} />
    </button>
  );
}
