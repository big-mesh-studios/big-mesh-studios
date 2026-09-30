// A rift a place script stands in the world, as the renderer draws it: a flat,
// translucent, animated sheet whose colour churns across it — the surface of a
// portal. Kept in the world area so the renderer and the place host share the
// record without the renderer reaching into the place area, the same split the
// storm and decal records use. A script says where it stands, how large it is,
// how it is turned, and how it reads; it never names what the churn is made of.
export interface RiftPose {
  id: string;
  /** The rift's centre, in world units. */
  x: number;
  y: number;
  z: number;
  /** Drawn width across the sheet, in world units. */
  width: number;
  /** Drawn height of the sheet, in world units. */
  height: number;
  /** Rotation about the vertical axis, in radians; the sheet faces this way. */
  yaw: number;
  /** Linear RGB, 0 to 1 each. */
  color: [number, number, number];
  /** How strongly the rift reads, 0 (barely there) to 1 (dense). */
  intensity: number;
  /** How fast the sheet churns, in turns per second. */
  spin: number;
}

/** The violet a rift takes when a script names no colour. */
export const RIFT_COLOR: [number, number, number] = [0.55, 0.16, 0.9];
