// The style vocabulary is part of the shared places API: both hosts use the
// same bounded kinds and defaults, while their renderers remain independent.
export {
  PARTICLE_STYLES,
  type ParticleKind,
  type ParticleStyle,
} from "@big-mesh-studios/place-api";
import type { ParticleStyle } from "@big-mesh-studios/place-api";

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
