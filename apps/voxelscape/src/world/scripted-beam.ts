// A straight glowing line a place script draws between two points, as the
// renderer draws it. Kept in the world area so the renderer and the place host
// share the record without the renderer reaching into the place area, the same
// split the blaze and blast records use. Either end is a fixed world point or
// a figure it follows, resolved by the host into the two endpoints below.
export interface BeamPose {
  id: string;
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
  /** Linear RGB, 0 to 1 each. */
  color: [number, number, number];
  /** How wide the line is drawn, in world units. */
  width: number;
}
