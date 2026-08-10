import { Component, createEffect, createMemo, createRoot, For } from "solid-js";
import { ColourTab } from "./components";
import styles from "./Palette.module.css";
import { RGBA } from "./types";
import { areRGBAsEqual } from "./utils";

const Palette: Component<{
  palette: Array<RGBA>;
  onSelect: (colour: RGBA) => void;
  selectedColour: RGBA | undefined;
  class?: string;
}> = props => {
  return (
    <div class={[styles.palette, props.class]}>
      <For each={props.palette}>
        {colour => {
          const isActive = createMemo(
            () => props.selectedColour && areRGBAsEqual(colour, props.selectedColour),
          );

          return (
            <ColourTab
              ref={element =>
                createRoot(() => {
                  createEffect(isActive, active => {
                    if (!active) {
                      return;
                    }
                    element.scrollIntoView({
                      block: "center",
                      inline: "center",
                      behavior: "instant",
                    });
                  });
                })
              }
              selected={isActive()}
              class={styles.item}
              onClick={() => {
                props.onSelect(colour);
              }}
              colour={colour}
            />
          );
        }}
      </For>
    </div>
  );
};

export default Palette;
