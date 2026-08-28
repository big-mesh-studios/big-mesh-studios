import { Dimensions3D, Vector2D } from "@big-mesh-studios/maths";
import type { SideKind } from "@big-mesh-studios/stacker/renderer";

/**********************************************************************************/
/*                                       Misc                                     */
/**********************************************************************************/

export type DimensionKind = keyof Dimensions3D;

/** One end of a model axis: `min` is its low-coordinate end, `max` its high one. */
export type AlignmentKind = "min" | "max";

/** Which end of each axis a resize is applied at. */
export type Alignment3D = Partial<Record<DimensionKind, AlignmentKind>>;

/**********************************************************************************/
/*                                       Mode                                     */
/**********************************************************************************/

export type ModeKind =
  "Draw" | "Erase" | "Fill" | "Idle" | "Eyedrop" | "Rectangle";

export type PreviewState = {
  unlit: boolean;
  autorotate: boolean;
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
