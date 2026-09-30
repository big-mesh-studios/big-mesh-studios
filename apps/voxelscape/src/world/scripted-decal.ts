// A flat mark a place script lays on the world, as the renderer draws it, and
// the fixed vocabulary of shapes a mark may name. Kept in the world area so the
// renderer and the place host share the record without the renderer reaching
// into the place area, the same split the blaze and blast records use.
export type DecalKind = "arrow" | "cross" | "ring" | "splat";

/** One mark as the renderer draws it: where it lies, its shape, and its colour. */
export interface DecalPose {
  id: string;
  x: number;
  y: number;
  z: number;
  kind: DecalKind;
  /** Linear RGB, 0 to 1 each. */
  color: [number, number, number];
  /** Drawn width, in world units. */
  size: number;
  /** Rotation about the vertical axis, in radians. */
  yaw: number;
}
