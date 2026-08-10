import { Accessor } from "solid-js";
import * as THREE from "three";
import { Command } from "./Command";
import { Dimensions3D, Vector2D } from "./maths";
import { StackerStore } from "./stacker-store";

/**********************************************************************************/
/*                                       Misc                                     */
/**********************************************************************************/

export interface Vector3D extends Vector2D {
  z: number;
}

export interface Dimensions2D {
  width: number;
  height: number;
}

export type DimensionKind = keyof Dimensions3D;

/** One end of a model axis: `min` is its low-coordinate end, `max` its high one. */
export type DimensionEnd = "min" | "max";

/** Which end of each axis a resize is applied at. */
export type Alignment3D = Partial<Record<DimensionKind, DimensionEnd>>;

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type Axis = "x" | "y" | "z";

/**********************************************************************************/
/*                                       Mode                                     */
/**********************************************************************************/

export type ModeKind = "Draw" | "Erase" | "Fill" | "Idle" | "Eyedrop";

export type SidePositions = Record<keyof Sides, Vector2D>;

export interface ModeParams {
  mousePos: Accessor<THREE.Vector2 | undefined>;
  pointerDownCount: Accessor<number>;
  selectedColour: Accessor<string | undefined>;
  sidePositions: Accessor<SidePositions>;
  store: StackerStore;
  doCommand: (command: Command, pushUndo?: boolean, description?: string) => Command;
  pushUndo: (reverseCommand: Command, description: string) => void;
}

/**********************************************************************************/
/*                                      Sides                                     */
/**********************************************************************************/

export const sideKindSet = {
  front: true,
  left: true,
  right: true,
  back: true,
  top: true,
  bottom: true,
} as const;

export type SideKind = keyof typeof sideKindSet;

export type Sides = {
  [k in SideKind]: ImageData;
};

/**
 * How one of a panel's image axes maps onto a model axis. `flipped` marks an
 * image axis that runs against its dimension, because that panel looks at the
 * model from the opposite direction.
 */
export interface SideAxis {
  dimension: DimensionKind;
  flipped: boolean;
}

export type SideAxes = Record<SideKind, Record<keyof Vector2D, SideAxis>>;
