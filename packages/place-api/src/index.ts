/**
 * The renderer-independent visual effects shared by place scripts in both engines.
 *
 * These are the wire-facing options accepted by `createBeam` and `createParticle`.
 * Each host validates the incoming payload and renders it with its own world and renderer.
 */

export type PlaceVec3 = [number, number, number];
export type PlaceColor = [number, number, number];

/** A screen-space value bar shared by both place engines. */
export interface CreateHudMeterOptions {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly max: number;
}

/** A HUD meter can be updated in place or removed. */
export interface HudMeterHandle {
  readonly id: string;
  setValue(value: number): void;
  setLabel(label: string): void;
  remove(): void;
}

/** A line of screen-space text shared by both place engines. */
export interface CreateHudLabelOptions {
  readonly id: string;
  readonly text: string;
}

/** A HUD label can be updated in place or removed. */
export interface HudLabelHandle {
  readonly id: string;
  setText(text: string): void;
  remove(): void;
}

/** A labelled progress panel drawn on a world-space quad. */
export interface CreateHudPanelOptions {
  readonly id: string;
  /** If set, position and yaw are relative to this entity; otherwise they are world-space. */
  readonly entityId?: string;
  readonly position: PlaceVec3;
  /** Local turn when attached, or world turn when free, in radians. */
  readonly yaw?: number;
  /** Panel dimensions in world units. */
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly value: number;
  readonly max: number;
}

/** A world-space panel; update it or remove it by handle. */
export interface HudPanelHandle {
  readonly id: string;
  setValue(value: number): void;
  setLabel(label: string): void;
  remove(): void;
}

/** A light created by a place; removing the handle turns it off. */
export interface PlaceLightHandle {
  readonly id: string;
  remove(): void;
}

/** Playback settings shared by both place engines. */
export interface PlaySoundOptions {
  /** Optional id for stopping this playback later; required when looping. */
  readonly id?: string;
  /** Playback volume from zero to one. */
  readonly volume?: number;
  /** Playback rate from 0.25 to four. */
  readonly pitch?: number;
  /** Keep playing until the returned handle is stopped. */
  readonly loop?: boolean;
}

/** A sound playback that can be stopped. One-shot sounds have an empty id. */
export interface SoundHandle {
  readonly id: string;
  stop(): void;
}

export type ParticleKind = "spark" | "flame" | "smoke" | "dust";

export interface ParticleStyle {
  readonly additive: boolean;
  readonly upward: boolean;
  readonly color: PlaceColor;
  readonly size: number;
  readonly spread: number;
  readonly lifeMs: number;
}

/** The common baseline look for each portable particle kind. */
export const PARTICLE_STYLES: Readonly<Record<ParticleKind, ParticleStyle>> = {
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

export interface ParticlePose extends ParticleStyle {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly loop: boolean;
  readonly at: number;
}

export interface BeamPose {
  readonly id: string;
  readonly ax: number;
  readonly ay: number;
  readonly az: number;
  readonly bx: number;
  readonly by: number;
  readonly bz: number;
  readonly color: PlaceColor;
  readonly width: number;
}

export interface CreateParticleOptions {
  readonly id: string;
  readonly kind?: ParticleKind;
  /** Hangs the emitter over this entity; when set, position fields are ignored. */
  readonly entityId?: string;
  /** World position when the emitter is not attached to an entity. */
  readonly x?: number;
  readonly y?: number;
  readonly z?: number;
  /** Linear RGB channels from zero to one. */
  readonly color?: PlaceColor;
  readonly size?: number;
  readonly spread?: number;
  readonly lifeMs?: number;
  /** Continue emitting until the handle is removed. */
  readonly loop?: boolean;
}

export interface ParticleHandle {
  readonly id: string;
  remove(): void;
}

export interface CreateBeamOptions {
  readonly id: string;
  readonly color?: PlaceColor;
  readonly width?: number;
  /** Exactly one of the entity or point fields is required by the host. */
  readonly fromEntity?: string;
  readonly from?: PlaceVec3;
  /** Exactly one of the entity or point fields is required by the host. */
  readonly toEntity?: string;
  readonly to?: PlaceVec3;
}

export interface BeamHandle {
  readonly id: string;
  remove(): void;
}
