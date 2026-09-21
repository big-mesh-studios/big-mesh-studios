// A particle emitter a place script runs, as the renderer draws it, and the
// fixed vocabulary of looks an emitter may name. Kept in the world area so the
// renderer and the place host share the record without the renderer reaching
// into the place area, the same split the blaze and blast records use. An
// emitter names one of the kinds below; a script overrides a kind's colour,
// size, spread, or life only, never its whole look, so a place cannot smuggle
// an arbitrary shader through the boundary.
export type ParticleKind = "spark" | "flame" | "smoke" | "dust";

/** How one kind of particle looks and moves. */
export interface ParticleStyle {
  /** Whether the particles add light rather than sit in it. */
  additive: boolean;
  /** Whether particles drift upward rather than outward. */
  upward: boolean;
  /** Linear RGB, 0 to 1 each. */
  color: [number, number, number];
  /** Drawn size of one particle, in world units. */
  size: number;
  /** How far particles travel from the emitter, in world units. */
  spread: number;
  /** How long one particle lives, in milliseconds. */
  lifeMs: number;
}

/** Every particle kind, with the look a script gets by naming it. */
export const PARTICLE_STYLES: Record<ParticleKind, ParticleStyle> = {
  spark: {
    additive: true,
    upward: false,
    color: [1, 0.75, 0.3],
    size: 0.18,
    spread: 3,
    lifeMs: 700,
  },
  flame: {
    additive: true,
    upward: true,
    color: [1, 0.5, 0.12],
    size: 0.3,
    spread: 2,
    lifeMs: 900,
  },
  smoke: {
    additive: false,
    upward: true,
    color: [0.35, 0.35, 0.38],
    size: 0.7,
    spread: 2.5,
    lifeMs: 1600,
  },
  dust: {
    additive: false,
    upward: false,
    color: [0.6, 0.52, 0.4],
    size: 0.5,
    spread: 3,
    lifeMs: 1100,
  },
};

/** One emitter as the renderer draws it: a concrete world position and its look. */
export interface ParticlePose extends ParticleStyle {
  id: string;
  x: number;
  y: number;
  z: number;
  /** Whether it keeps emitting until removed, rather than burning out. */
  loop: boolean;
  /** The shared-clock moment it was last started, so a re-dispatch lights it afresh. */
  at: number;
}
