// The palette a rig is drawn in before any model brings one of its own, and the
// hex reading the palette is written in.
import type { RGBA } from "@big-mesh-studios/maths";

/** The colour `#rrggbb` names, opaque. */
export function hexToRgba(hex: string): RGBA {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
    a: 255,
  };
}

/** DawnBringer 32, the palette the voxel models are usually drawn in. */
export const DEFAULT_PALETTE: RGBA[] = [
  "#000000",
  "#222034",
  "#45283c",
  "#663931",
  "#8f563b",
  "#df7126",
  "#f5ffe8",
  "#fbf236",
  "#99e550",
  "#6abe30",
  "#37946e",
  "#d9a066",
  "#eed671",
  "#eec39a",
  "#d95763",
  "#ac3232",
  "#76428a",
  "#5b6ee1",
  "#639bff",
  "#5fcde4",
  "#cbdbfc",
  "#ffffff",
  "#9badb7",
  "#847e87",
  "#306230",
  "#4b692f",
  "#323c39",
  "#3f3f74",
  "#30346d",
  "#44891a",
  "#a3a3a3",
  "#595652",
].map(hexToRgba);
