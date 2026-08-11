import { Setter } from "@solidjs/signals";
import { Component, createEffect, createMemo, createRoot, createSignal, For } from "solid-js";
import { ColourPicker } from "./ColorPicker";
import { ColourTab, createPopover } from "./components/components";
import { RGBA } from "./maths";
import styles from "./Palette.module.css";

const Palette: Component<{
  palette: Array<RGBA>;
  onSelect: (colour: RGBA) => void;
  setPalette: Setter<Array<RGBA>>;
  selectedColour: RGBA | undefined;
  class?: string;
}> = props => {
  const ColourPickerPopover = createPopover();
  const [activeColour, setActiveColour] = createSignal<number | undefined>();

  return (
    <div class={[styles.palette, props.class]}>
      <ColourPickerPopover.PopOver
        class={styles.colourPickerPopover}
        style={{ "position-anchor": `--colour-${activeColour()}` }}
      >
        <ColourPicker
          colour={activeColour() ? props.palette[activeColour()!] : undefined}
          onColour={colour => {
            const _activeColour = activeColour();
            if (!_activeColour) {
              return;
            }
            props.setPalette(palette => {
              palette[_activeColour] = colour;
              return [...palette];
            });
          }}
        />
      </ColourPickerPopover.PopOver>
      <For each={props.palette}>
        {(colour, index) => {
          const isActive = createMemo(
            () => props.selectedColour && RGBA.equals(colour, props.selectedColour),
          );

          return (
            <ColourTab
              style={{
                "anchor-name": `--colour-${index()}`,
              }}
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
                console.log("set active colour", index(), activeColour());
                if (index() === activeColour()) {
                  setActiveColour(undefined);
                  return;
                }
                setActiveColour(index());
                ColourPickerPopover.show();
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
