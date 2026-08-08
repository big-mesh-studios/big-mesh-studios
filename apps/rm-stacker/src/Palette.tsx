import { Accessor, Component, createRenderEffect, createSignal, runWithOwner } from "solid-js";
import { DAWNBRINGER_32_PALETTE } from "./default_palette";
import { RGBA } from "./types";
import { areColoursEqual, hexToRgba } from "./utils";

const Palette: Component<{
  ref?: (ctx: { selectedColour: Accessor<RGBA> }) => void;
}> = props => {
  const [selectedColour, setSelectedColour] = createSignal(hexToRgba(DAWNBRINGER_32_PALETTE[5]));

  createRenderEffect(
    () => props.ref,
    ref => {
      if (ref === undefined) {
        return;
      }
      runWithOwner(null, () => {
        ref({
          selectedColour,
        });
      });
    },
  );
  return (
    <div style="height: 100%; overflow-y: scroll;">
      {DAWNBRINGER_32_PALETTE.map(colour => (
        <div
          style={{
            border: areColoursEqual(hexToRgba(colour), selectedColour())
              ? "4px solid green"
              : undefined,
            padding: !areColoursEqual(hexToRgba(colour), selectedColour()) ? "4px" : undefined,
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
