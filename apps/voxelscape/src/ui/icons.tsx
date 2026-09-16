// The glyphs the touch buttons draw in their centres, as inline vector art so
// they take the button's own foreground colour and need no image request.
import type { JSX } from "@solidjs/web/jsx-runtime";

/** The shared stroke setup: a 24-unit grid, drawn in the button's colour. */
const stroke: JSX.SvgSVGAttributes<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
};

/** A shovel, for breaking the voxel under the crosshair. */
export function DigIcon() {
  return (
    <svg {...stroke}>
      <path d="M6 20l8-8" />
      <path d="M11 6l4-3 6 6-3 4z" />
    </svg>
  );
}

/** A cube, for placing a block against the face being looked at. */
export function PlaceIcon() {
  return (
    <svg {...stroke}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
    </svg>
  );
}

/** An arrow rising, for jumping. */
export function JumpIcon() {
  return (
    <svg {...stroke}>
      <path d="M12 20V5" />
      <path d="M6 11l6-6 6 6" />
    </svg>
  );
}

/** An open hand, for using whatever the crosshair is on or the held item. */
export function UseIcon() {
  return (
    <svg {...stroke}>
      <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M12 11V4.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M15 11V6.5a1.5 1.5 0 0 1 3 0V13" />
      <path d="M9 11l-1.2-1.2a1.5 1.5 0 0 0-2.1 2.1l3.3 3.9A5 5 0 0 0 13 19h1a6 6 0 0 0 6-6v-3a1.5 1.5 0 0 0-3 0" />
    </svg>
  );
}

/** An arrow cursor, for selecting the shape under the crosshair. */
export function SelectIcon() {
  return (
    <svg {...stroke}>
      <path d="M5 3l14 8-6 1.5L10 19z" />
    </svg>
  );
}

/** Two arrows trading places, for switching what the apply button does. */
export function SwapIcon() {
  return (
    <svg {...stroke}>
      <path d="M4 8h13" />
      <path d="M14 5l3 3-3 3" />
      <path d="M20 16H7" />
      <path d="M10 13l-3 3 3 3" />
    </svg>
  );
}
