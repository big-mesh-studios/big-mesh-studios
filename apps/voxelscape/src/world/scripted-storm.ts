// A dust storm a place script drives, as the renderer draws it, and the fixed
// vocabulary of shapes a storm may take. Kept in the world area so the renderer
// and the place host share the record without the renderer reaching into the
// place area, the same split the fire and particle records use. A storm names
// one of the shapes below; a script says where it stands, how it is turned, how
// large it is, and how thick its dust is, never what it is made of.
export type StormKind = "wall" | "funnel";

/** Every storm shape, with the draw a script gets by naming it. */
export const STORM_KINDS: readonly StormKind[] = ["wall", "funnel"];

/** The dust colour a storm takes when a script names none. */
export const STORM_DUST_COLOR: [number, number, number] = [0.72, 0.58, 0.4];

/** One storm as the renderer draws it: where it stands and how it is sized. */
export interface ScriptedStorm {
  id: string;
  /** One of the world's fixed storm shapes. */
  kind: StormKind;
  /** The storm's centre, in world units; its base sits at `y`. */
  x: number;
  y: number;
  z: number;
  /** Heading the storm travels toward, in radians; the wall faces this way. */
  yaw: number;
  /** A wall's half-width across the heading, or a funnel's base radius, in world units. */
  width: number;
  /** Drawn height of the storm, in world units. */
  height: number;
  /** How far a wall runs front to back, in world units. */
  depth: number;
  /** How thick the dust reads, 0 (clear) to 1 (opaque). */
  intensity: number;
  /** Linear RGB dust colour, 0 to 1 each. */
  color: [number, number, number];
  /** Turns per second a funnel spins about its axis. */
  spin: number;
}
