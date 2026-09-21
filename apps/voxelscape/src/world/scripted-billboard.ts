// A world-space label a place script shows, as the renderer draws it: a
// concrete world position and what it says. Kept in the world area so the
// renderer that draws it and the place host that produces it can share the
// record without the renderer reaching into the place area, the same split the
// blaze and blast records use.
export interface BillboardPose {
  id: string;
  x: number;
  y: number;
  z: number;
  text: string;
  /** Linear RGB, 0 to 1 each. */
  color: [number, number, number];
  /** Drawn height, in world units. */
  scale: number;
}
