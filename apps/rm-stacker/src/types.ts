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

/**********************************************************************************/
/*                                      Mirror                                    */
/**********************************************************************************/

/**
 * How a stroke is reflected, so that a mark made on one side of a middle is made
 * on the other side of it as well. Every reflection switched on is applied to
 * what the others reached, so two together also reach the corner they share.
 */
export interface Mirror {
  /**
   * Image axes a mark is reflected along within the panel it was drawn on, and
   * no further: `x` across the panel's vertical middle, `y` across its
   * horizontal middle.
   */
  panel: Record<keyof Vector2D, boolean>;
  /**
   * Whether a mark is also made on the panel opposite the one drawn on, where
   * that panel's own axes put it: the front panel's marks appear on the back,
   * the top's on the bottom, the left's on the right, and each the other way
   * about.
   */
  opposing: boolean;
}

/**
 * What the preview turns about and holds in the middle of the view: the
 * figure's own root, which stays put however its parts are moved, or the pivot
 * of the part being drawn on.
 */
export type FocusKind = "root" | "part";

export type PreviewState = {
  unlit: boolean;
  autorotate: boolean;
  axesVisible: boolean;
  focus: FocusKind;
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
