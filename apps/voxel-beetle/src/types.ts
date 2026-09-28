import type { Dimensions3D } from "@big-mesh-studios/maths";
import type { Plane } from "@big-mesh-studios/stacker/volume";

export type { Plane };

/** One of the three extents of the box, as the volume's axes name them. */
export type DimensionKind = keyof Dimensions3D;

/** Which end of an extent a change is made at. */
export type AlignmentKind = "min" | "max";

/** Which end of each changed extent the change is made at, where it is changed. */
export type Alignment3D = Partial<Record<DimensionKind, AlignmentKind>>;

/**
 * The tools a slice can be drawn with. Every one of them but `Idle` puts voxels
 * in, and `Idle` is the only one that leaves a press free to move the view.
 */
export type ModeKind = "Idle" | "Draw" | "Fill" | "Rectangle" | "Pick";

/**
 * A stroke mirrored within the slice being drawn on, which is what the two
 * mirror toggles turn on. Both at once reaches the far corner of the slice.
 */
export interface Mirror {
  across: boolean;
  down: boolean;
}

export const NO_MIRROR: Mirror = Object.freeze({
  across: false,
  down: false,
});

/** How the model is drawn in the preview beside the slice being edited. */
export type PreviewState = {
  unlit: boolean;
  autorotate: boolean;
  autoframe: boolean;
  /** Whether the slice being edited stands in the model as a lit plane. */
  showSlice: boolean;
  /** Whether every voxel is drawn as a wireframe box. */
  showCells: boolean;
};

/** Which part of the box a plane is cut along, and how many voxels of it. */
export interface SliceSelection {
  plane: Plane;
  /** The voxel along the axis the plane does not vary along, from the low end. */
  at: number;
}
