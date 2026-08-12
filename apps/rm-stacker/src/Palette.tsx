import { createEffect, Setter } from "@solidjs/signals";
import { createMemo, createSignal, For } from "solid-js";
import { ColourPicker } from "./components/ColorPicker";
import { colourTabStyle, createPopover, tabStyle } from "./components/components";
import { RGBA } from "./maths";
import styles from "./Palette.module.css";
import { pointer } from "./utils";

function Palette(props: {
  palette: Array<RGBA>;
  onSelect: (colour: RGBA) => void;
  setPalette: Setter<Array<RGBA>>;
  selectedColour: RGBA | undefined;
  class?: string;
}) {
  const ColourPickerPopover = createPopover();
  const [openedColour, setOpenedColour] = createSignal<number | undefined>();

  let popover: HTMLDivElement = null!;

  createEffect(openedColour, openedColour => {
    if (!openedColour) {
      ColourPickerPopover.close();
      return;
    }

    ColourPickerPopover.open();

    const controller = new AbortController();

    window.addEventListener(
      "pointerdown",
      event => {
        if (
          !event.target ||
          !(event.target instanceof Element) ||
          popover === event.target ||
          popover.contains(event.target) ||
          event.target.classList.contains(styles.tab)
        ) {
          return;
        }

        setOpenedColour(undefined);
        controller.abort();
      },
      controller,
    );

    return () => controller.abort();
  });

  return (
    <div class={[styles.palette, props.class]}>
      <ColourPickerPopover.PopOver
        class={styles.colourPickerPopover}
        style={{ "position-anchor": `--colour-${openedColour()}` }}
        popover="manual"
        ref={popover!}
      >
        <ColourPicker
          colour={openedColour() ? props.palette[openedColour()!] : undefined}
          onColour={colour => {
            const _activeColour = openedColour();
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
          const isSelected = createMemo(
            () => props.selectedColour && RGBA.equals(colour, props.selectedColour),
          );

          async function onPointerDown(event: PointerEvent & { currentTarget?: HTMLElement }) {
            // If colour picker is already open
            if (ColourPickerPopover.isOpen()) {
              // close it if you click on the one currently active
              // else switch the colour picker to the other colour
              setOpenedColour(openedColour => (openedColour === index() ? undefined : index()));
              return;
            }

            // if colour picker is not open we check for a longpress
            let longpress = false;

            const id = setTimeout(() => {
              const _index = index();
              setOpenedColour(_index);
              longpress = true;
            }, 250);

            await pointer(event, undefined);

            if (longpress) {
              return;
            }

            clearTimeout(id);

            // close colour picker
            setOpenedColour(undefined);
            // update with new colour
            props.onSelect(props.palette[index()]);
          }

          return (
            <button
              class={[colourTabStyle, tabStyle, styles.tab]}
              style={{
                "anchor-name": `--colour-${index()}`,
              }}
              aria-selected={isSelected() ? "true" : "false"}
              aria-opened={openedColour() === index() ? "true" : "false"}
              onPointerDown={onPointerDown}
            >
              <div style={{ background: RGBA.toCSS(colour) }} />
            </button>
          );
        }}
      </For>
    </div>
  );
}

export default Palette;
