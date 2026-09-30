// A point light a place script has lit, as the renderer draws it: a concrete
// world position and how it burns. Kept in the world area so the renderer that
// draws it and the place host that produces it can share the record without
// the renderer reaching into the place area, the same split the blaze and
// blast records use.
export interface LightPose {
  id: string;
  x: number;
  y: number;
  z: number;
  /** Linear RGB, 0 to 1 each. */
  color: [number, number, number];
  /** How far it reaches, in world units. */
  range: number;
  intensity: number;
}
