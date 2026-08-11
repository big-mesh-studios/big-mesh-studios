import { Dimensions3D, Vector2D } from "./maths";

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
export type AlignmentKind = "min" | "max";

/** Which end of each axis a resize is applied at. */
export type Alignment3D = Partial<Record<DimensionKind, AlignmentKind>>;

export type Axis = "x" | "y" | "z";

/**********************************************************************************/
/*                                       Mode                                     */
/**********************************************************************************/

export type ModeKind = "Draw" | "Erase" | "Fill" | "Idle" | "Eyedrop";

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
