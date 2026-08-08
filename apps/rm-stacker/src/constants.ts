import { Side } from "three";
import { SideKind } from "./types";

export const OPPOSING_SIDE = {
  front: "back",
  back: "front",
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
} satisfies Record<SideKind, SideKind>;

export const SIDE_MASK = {
  front: 0b001,
  back: 0b001,
  left: 0b010,
  right: 0b010,
  top: 0b100,
  bottom: 0b100,
} satisfies Record<SideKind, number>;
