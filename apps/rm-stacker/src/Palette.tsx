import { Component } from "solid-js";
import { RGBA } from "./types";
import { areRGBAsEqual } from "./utils";

const Palette: Component<{
  palette: Array<RGBA>;
  onSelect: (colour: RGBA) => void;
  selectedColour: RGBA | undefined;
}> = props => {
  return (
    <div style="height: 100%; overflow-y: scroll;">
      {props.palette.map(colour => (
        <div
          style={{
            border:
              props.selectedColour && areRGBAsEqual(colour, props.selectedColour)
                ? "4px solid green"
                : undefined,
            padding:
              props.selectedColour === undefined || !areRGBAsEqual(colour, props.selectedColour)
                ? "4px"
                : undefined,
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
      ))}
    </div>
  );
};

export default Palette;
