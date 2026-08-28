import { createEffect, createMemo, createSignal } from "solid-js";
import { RGB } from "../utils/maths";
import { pointer } from "../utils/pointer";
import styles from "./ActionButton.module.css";

const RGB_WHITE = Object.freeze({ r: 255, g: 255, b: 255 });

interface ActionButtonProps {
  left: number;
  top: number;
  size: number;
  colour?: RGB | `0x${string}`;
  onPressed?(pressed: boolean): void;
}

export function ActionButton(props: ActionButtonProps) {
  const [pressed, setPressed] = createSignal(false);

  // fromHex writes into this instead of allocating per recompute; it must not
  // be RGB_WHITE, which is shared between buttons and frozen
  const decoded: RGB = { r: 0, g: 0, b: 0 };

  const colour = createMemo<RGB>(
    () => {
      const colour = props.colour;

      if (colour === undefined) {
        return RGB_WHITE;
      }

      if (typeof colour === "object") {
        return colour;
      }

      return RGB.fromHex(colour, decoded);
    },
    { equals: false },
  );

  const handlePointerDown = async (
    e: PointerEvent & { currentTarget: HTMLButtonElement },
  ) => {
    setPressed(true);
    await pointer(e);
    setPressed(false);
  };

  createEffect(pressed, (pressed) => props.onPressed?.(pressed));

  return (
    <button
      style={{
        left: `${props.left}px`,
        top: `${props.top}px`,
        width: `${props.size}px`,
        height: `${props.size}px`,
        "border-radius": `${0.5 * props.size}px`,
        "background-color": `rgba(${colour().r}, ${colour().g}, ${colour().b}, ${pressed() ? "0.8" : "0.5"})`,
      }}
      onPointerDown={handlePointerDown}
      onContextMenu={(e) => e.preventDefault()}
      class={styles["action-button"]}
    />
  );
}
