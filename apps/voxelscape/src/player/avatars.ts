// The avatars a player may be drawn as, and the one the page last chose.
//
// An avatar kind is a look, not a body: the cube stays the volume the physics,
// the camera and the collision all use whichever is drawn (ADR 0081), and a kind
// only says what stands there in its place and how tall it is drawn.
import { FIGURE_HEIGHT } from "../places/voxel-figures";
import type { FigureGaitMotions } from "../places/voxel-figures";
import { HUMAN_GAIT, type GaitTuning } from "./gait";

/** Which of the world's avatars a player is drawn as. */
export type AvatarKind = "cube" | "human";

/** One avatar the world can draw a player as. */
export interface AvatarType {
  kind: AvatarKind;
  /** The bundled model file it is drawn from, or "" for the player's own cube. */
  model: string;
  /** How tall it is drawn, in world units. */
  height: number;
  /** The locomotion motions its model carries, or absent when it cannot walk. */
  motions?: FigureGaitMotions;
  /** How its legs keep step with the ground, or absent when it has no legs. */
  gait?: GaitTuning;
}

/**
 * The role names the baked human carries, which are the same three words every
 * animated avatar is authored against.
 */
const WALKING: FigureGaitMotions = {
  idle: "idle",
  walk: "walk",
  run: "run",
};

export const AVATAR_TYPES: Record<AvatarKind, AvatarType> = {
  cube: {
    kind: "cube",
    model: "",
    height: FIGURE_HEIGHT,
  },
  human: {
    kind: "human",
    model: "player-human.zip",
    height: FIGURE_HEIGHT,
    motions: WALKING,
    gait: HUMAN_GAIT,
  },
};

/** The kind a player who has never chosen one is drawn as. */
export const DEFAULT_AVATAR: AvatarKind = "cube";

/** Every kind, in the order a picker offers them. */
export const AVATAR_KINDS: readonly AvatarKind[] = ["cube", "human"];

/**
 * The avatar drawn from the model file `model`, or undefined for a model the
 * world does not wear a player in — a place script's own, say. The lookup runs
 * off the file name rather than the kind, so a peer that was told which file to
 * draw resolves the same avatar the player who chose it did.
 */
export const avatarOfModel = (model: string): AvatarType | undefined =>
  AVATAR_KINDS.map((kind) => AVATAR_TYPES[kind]).find(
    (type) => type.model === model,
  );

const STORED = "bms-voxelscape:avatar";

/** Whether `value` names an avatar the world carries. */
export const isAvatarKind = (value: unknown): value is AvatarKind =>
  typeof value === "string" && value in AVATAR_TYPES;

/**
 * The kind the page last chose, or the default. Storage that refuses to read —
 * a private window, a full quota — leaves the player with the default avatar
 * rather than failing the run.
 */
export const readStoredAvatar = (): AvatarKind => {
  try {
    const held = localStorage.getItem(STORED);
    return isAvatarKind(held) ? held : DEFAULT_AVATAR;
  } catch {
    return DEFAULT_AVATAR;
  }
};

/** Remembers the chosen kind for the next visit. */
export const storeAvatar = (kind: AvatarKind): void => {
  try {
    localStorage.setItem(STORED, kind);
  } catch {
    // A player whose storage is full still plays; the choice just is not kept.
  }
};
