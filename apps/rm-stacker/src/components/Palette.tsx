import { RGBA } from "@big-mesh-studios/maths";
import { createPopover } from "@big-mesh-studios/utils/create-popover";
import { pointer } from "@big-mesh-studios/utils/pointer";
import { createEffect } from "@solidjs/signals";
import { createMemo, createSignal, For, useContext } from "solid-js";
import { StackerContext } from "../context";
import { ColourPicker } from "./ColorPicker";
import { colourTabStyle, popoverStyle, tabStyle } from "./components";
import styles from "./Palette.module.css";

function Palette(props: { class?: string }) {
  const {
    palette,
    setPalette,
    selectedColour,
    selectPaletteIndex,
    narrow,
    requestRender,
    requestAutoSave,
  } = useContext(StackerContext);
  const ColourPickerPopover = createPopover();
  let popover: HTMLDivElement = null!;

  const [openedColour, setOpenedColour] = createSignal<number | undefined>();

  createEffect(openedColour, (openedColour) => {
    if (openedColour === undefined) {
      ColourPickerPopover.close();
      return;
    }

    ColourPickerPopover.open();

    const controller = new AbortController();

    window.addEventListener(
      "pointerdown",
      (event) => {
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
    <>
      <ColourPickerPopover.PopOver
        class={[popoverStyle, styles.colourPickerPopover]}
        style={{
          "position-anchor": narrow()
            ? "--palette-popover"
            : `--colour-${openedColour()}`,
        }}
        popover="manual"
        ref={popover!}
      >
        <ColourPicker
          colour={
            openedColour() !== undefined
              ? palette()[openedColour()!]
              : undefined
          }
          onColour={(colour) => {
            const _openedColour = openedColour();
            if (_openedColour === undefined) {
              return;
            }
            setPalette((palette) => {
              palette[_openedColour] = colour;
              return [...palette];
            });
            requestRender();
            requestAutoSave();
          }}
        />
      </ColourPickerPopover.PopOver>
      <div class={[styles.palette, narrow() && styles.narrow, props.class]}>
        <For each={palette()}>
          {(colour, index) => {
            const isSelected = createMemo(() => {
              const selected = selectedColour();
              return selected !== undefined && RGBA.equals(colour, selected);
            });

            async function onPointerDown(
              event: PointerEvent & { currentTarget?: HTMLElement },
            ) {
              // If colour picker is already open
              if (ColourPickerPopover.isOpen()) {
                // close it if you click on the one currently active
                // else switch the colour picker to the other colour
                setOpenedColour((openedColour) =>
                  openedColour === index() ? undefined : index(),
                );
                return;
              }

              // if colour picker is not open we check for a longpress
              let longpress = false;

              const id = setTimeout(() => {
                setOpenedColour(index());
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
              selectPaletteIndex(index());
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
                onTouchStart={(event) => event.preventDefault()}
              >
                <div style={{ background: RGBA.toCSS(colour) }} />
              </button>
            );
          }}
        </For>
      </div>
    </>
  );
}

export default Palette;
