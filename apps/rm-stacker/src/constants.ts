import { SideAxes, SideKind } from "./types";

export const OPPOSING_SIDE = {
  front: "back",
  back: "front",
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
} satisfies Record<SideKind, SideKind>;

/**
 * How each panel's image axes map onto the model's axes — the same unfolding
 * the voxel solver raymarches along, laid out on the canvas as a net around the
 * front panel. A flipped axis runs against its dimension: the back panel is
 * seen from behind, so its leftmost column is the model's rightmost slice.
 */
export const SIDE_AXES = {
  front: { x: { dimension: "width", flipped: false }, y: { dimension: "height", flipped: true } },
  back: { x: { dimension: "width", flipped: true }, y: { dimension: "height", flipped: true } },
  left: { x: { dimension: "depth", flipped: false }, y: { dimension: "height", flipped: true } },
  right: { x: { dimension: "depth", flipped: true }, y: { dimension: "height", flipped: true } },
  top: { x: { dimension: "width", flipped: false }, y: { dimension: "depth", flipped: false } },
  bottom: { x: { dimension: "width", flipped: false }, y: { dimension: "depth", flipped: true } },
} satisfies SideAxes;

export const SIDE_MASK = {
  front: 0b001,
  back: 0b001,
  left: 0b010,
  right: 0b010,
  top: 0b100,
  bottom: 0b100,
} satisfies Record<SideKind, number>;
