import { Component, createEffect, createSignal } from "solid-js";
import { DAWNBRINGER_32_PALETTE } from "./default_palette";
import { RGBA } from "./types";
import { areRGBAsEqual, hexToRgba } from "./utils";

const Palette: Component<{
  onSelect: (colour: RGBA) => void;
}> = props => {
  const [selectedColour, setSelectedColour] = createSignal(hexToRgba(DAWNBRINGER_32_PALETTE[5]));

  createEffect(selectedColour, colour => {
    props.onSelect(colour);
  });

  return (
    <div style="height: 100%; overflow-y: scroll;">
      {DAWNBRINGER_32_PALETTE.map(colour => (
        <div
          style={{
            border: areRGBAsEqual(hexToRgba(colour), selectedColour())
              ? "4px solid green"
              : undefined,
            padding: !areRGBAsEqual(hexToRgba(colour), selectedColour()) ? "4px" : undefined,
          }}
        >
          <div
            class="size-[32px]"
            style={{
              "background-color": colour,
            }}
            onClick={() => {
              setSelectedColour(hexToRgba(colour));
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default Palette;
