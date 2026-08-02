import { Accessor, Component, createRenderEffect, createStore, runWithOwner } from "solid-js";
import { DAWNBRINGER_32_PALETTE } from "./default_palette";

const Palette: Component<{
  ref?: (ctx: { selectedColour: Accessor<string>, }) => void,
}> = (props) => {
  const [ state, setState, ] = createStore<{
    selectedColour: string,
  }>({
    selectedColour: DAWNBRINGER_32_PALETTE[5],
  });
  createRenderEffect(
    () => props.ref,
    (ref) => {
      if (ref === undefined) {
        return;
      }
      runWithOwner(
        null,
        () => {
          ref({
            selectedColour: () => state.selectedColour,
          });
        },
      );
    },
  );
  return (
    <div style="height: 100%; overflow-y: scroll;">
      {DAWNBRINGER_32_PALETTE.map((colour) => (
        <div
          style={{
            "border": colour === state.selectedColour ? "4px solid green" : undefined,
            "padding": colour !== state.selectedColour ? "4px" : undefined,
          }}
        >
          <div
            class="size-[32px]"
            style={{
              "background-color": colour,
            }}
            onClick={() => {
              setState((s) => {
                s.selectedColour = colour;
              });
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default Palette;

