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

/**
 * A cut across one of a part's axes: which axis it divides, and how far along
 * that axis it stands, in voxels from the low end of it.
 */
export interface Cut {
  axis: DimensionKind;
  at: number;
}

/**********************************************************************************/
/*                                       Mode                                     */
/**********************************************************************************/

export type ModeKind =
  "Draw" | "Fill" | "Idle" | "Eyedrop" | "Rectangle" | "CutDown" | "CutAcross";

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

/**
 * Which handles stand at the part being drawn on, there being one set of them
 * at a time: the arrows that move it, the rings that turn it, the arms that
 * size it, or none at all.
 */
export type HandleKind = "none" | "move" | "turn" | "size";

/**
 * Which axes the handles standing at a part lie along: the part's own, turned
 * as the part is turned, or the figure's, which every part shares.
 */
export type HandleAxes = "part" | "figure";

export type PreviewState = {
  unlit: boolean;
  autorotate: boolean;
  handles: HandleKind;
  handleAxes: HandleAxes;
  /** Whether the preview resizes the figure to fit the view on every change to it. */
  autoframe: boolean;
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
