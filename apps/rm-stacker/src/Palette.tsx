import { Component, createEffect, createMemo, createRoot, For } from "solid-js";
import { RGBA } from "./types";
import { areRGBAsEqual } from "./utils";

const Palette: Component<{
  palette: Array<RGBA>;
  onSelect: (colour: RGBA) => void;
  selectedColour: RGBA | undefined;
}> = props => {
  return (
    <div style="height: 100%; overflow-y: scroll;">
      <For each={props.palette}>
        {colour => {
          const isActive = createMemo(
            () => props.selectedColour && areRGBAsEqual(colour, props.selectedColour),
          );

          return (
            <div
              ref={element =>
                createRoot(() => {
                  createEffect(isActive, active => {
                    if (!active) {
                      return;
                    }
                    element.scrollIntoView({
                      block: "start",
                      inline: "start",
                      behavior: "instant",
                    });
                  });
                })
              }
              style={{
                border: isActive() ? "4px solid green" : undefined,
                padding: !isActive() ? "4px" : undefined,
              }}
            >
              <div
                class="size-[32px]"
                style={{
                  "background-color": `rgba(${colour.r}, ${colour.g}, ${colour.b}, ${colour.a})`,
                }}
                onClick={() => {
                  props.onSelect(colour);
                }}
              />
            </div>
          );
        }}
      </For>
    </div>
  );
};

export default Palette;
