import type { Axis, Plane } from "@big-mesh-studios/stacker/volume";

/**
 * The channel each axis is drawn in the interface by. A plane is tinted with the
 * colour of the axis it does not vary along, and a voxel is outlined in the
 * colours of the axes it is on, so that where a point is can be read off the
 * outline without a number.
 */
export const AXIS_MASK = {
  x: 0b001,
  y: 0b010,
  z: 0b100,
} as const satisfies Record<Axis, number>;

/** The masks of the two axes a plane varies along, and of the one it does not. */
export const PLANE_MASK: Record<Plane, number> = {
  xy: AXIS_MASK.x | AXIS_MASK.y,
  yz: AXIS_MASK.y | AXIS_MASK.z,
  zx: AXIS_MASK.z | AXIS_MASK.x,
};

/** The planes, in the order the interface offers them. */
export const PLANE_KINDS: Plane[] = ["xy", "yz", "zx"];

/** The box a fresh model opens with, in voxels. */
export const INITIAL_DIMENSIONS = { width: 32, height: 32, depth: 32 };

/** The palette index a fresh model starts its brush on. */
export const INITIAL_PALETTE_INDEX = 5;
