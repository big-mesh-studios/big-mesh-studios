// The multiplayer wire envelope: every message that travels over a peer's
// data channel is one tagged JSON object, so the real-time pose stream and
// the optimistic edit stream share a single ordered, reliable channel without
// a framing layer. Poses keep the payload shape from `pose.ts`; edit messages
// carry batches of voxel edits. Decoding validates every field, because a
// peer's bytes are untrusted input that gets applied straight to the local
// edit overlay.
import type { MonsterKind, MonsterState } from "../monsters/monster";
import { round, type PoseMessage } from "./pose";

/** How far from the origin a broadcast edit may lie, in voxels (sanity bound). */
export const MAX_WORLD_VOXEL = 100_000;
/** Voxel ids live in a `Uint8Array` store, so 0..255 covers every id. */
export const MAX_VOXEL_ID = 255;
/** The largest edit batch a single message may carry. */
export const MAX_EDITS_PER_MESSAGE = 512;
/** The largest monster batch a single message may carry. */
export const MAX_MONSTERS_PER_MESSAGE = 32;
/** Fastest a broadcast monster may claim to move, in world units per second. */
const MAX_MONSTER_SPEED = 100;
/** Largest health a broadcast monster may report. */
const MAX_MONSTER_HP = 100;
/** Largest damage a single swing may claim to deal. */
export const MAX_DAMAGE = 100;

/** The only monster kinds and states that exist; everything else is rejected. */
const MONSTER_KINDS = new Set<MonsterKind>(["zombie"]);
const MONSTER_STATES = new Set<MonsterState>([
  "sleep",
  "wander",
  "chase",
  "attack",
]);
/** The id grammar: `m<seed>_<cx>_<cz>_<slot>` with a single-digit slot. */
const MONSTER_ID_RE = /^m-?\d+_-?\d+_-?\d+_[0-2]$/;

/**
 * One voxel edit broadcast to connected peers: the world voxel's new id and
 * the moment it was made, so a receiver can apply it to the shared overlay
 * with the same last-write-wins rule atproto sync uses.
 */
export interface EditItem {
  /** World voxel coordinate, in the LOD-0 grid. */
  x: number;
  y: number;
  z: number;
  /** Voxel id to place at the coordinate; 0 removes a block. */
  id: number;
  /** Milliseconds since epoch when the edit was made; drives last-write-wins. */
  ts: number;
}

/** A pose on the wire: a `PoseMessage` tagged as a pose message. */
export interface PoseWire extends PoseMessage {
  v: 1;
  type: "pose";
}

/** An optimistic edit broadcast: one or more edits made at roughly a moment. */
export interface EditWire {
  v: 1;
  type: "edit";
  /** Per-sender sequence number, for ordering and dedupe. */
  seq: number;
  /** Sender clock, milliseconds since epoch. */
  t: number;
  edits: EditItem[];
}

/**
 * One monster state broadcast to connected peers: the pose the owner's
 * simulation put it in, plus the health and state the receiver renders.
 */
export interface MonsterUpdate {
  id: string;
  kind: MonsterKind;
  /** Cube centre, in world units. */
  x: number;
  y: number;
  z: number;
  /** Heading, in radians. */
  yaw: number;
  /** Horizontal velocity in world units per second, for dead reckoning. */
  vx: number;
  vz: number;
  hp: number;
  state: MonsterState;
  /** Milliseconds since epoch when the owner last simulated it. */
  updatedAt: number;
}

/** A batched monster-state broadcast: the owner's owned monsters at a moment. */
export interface MonsterWire {
  v: 1;
  type: "monster";
  seq: number;
  t: number;
  updates: MonsterUpdate[];
}

/**
 * One sword swing's damage, sent to every peer so the monster's owner applies
 * it: the receiver gates on its own ownership, so a hit lands exactly once,
 * on the client that simulates the monster.
 */
export interface DamageWire {
  v: 1;
  type: "damage";
  seq: number;
  t: number;
  /** The id of the monster the swing hit. */
  id: string;
  /** Health the swing claims to take. */
  amount: number;
  /** The attacker's horizontal position, so the monster's owner can knock it back. */
  attackerX: number;
  attackerZ: number;
}

/**
 * One zombie swing's damage, sent to every peer so the player it hit applies
 * it: the receiver gates on its own DID, so the hit is applied exactly once,
 * on the client that owns the hurt player.
 */
export interface PlayerDamageWire {
  v: 1;
  type: "player-damage";
  seq: number;
  t: number;
  /** The DID of the player the swing hit; only that receiver applies it. */
  target: string;
  /** Health the swing claims to take. */
  amount: number;
}

export type MeshMessage =
  PoseWire | EditWire | MonsterWire | DamageWire | PlayerDamageWire;

const isPoseWire = (r: object): r is PoseWire => {
  const v = r as Record<string, unknown>;
  return (
    v.type === "pose" &&
    v.v === 1 &&
    typeof v.seq === "number" &&
    typeof v.t === "number" &&
    typeof v.x === "number" &&
    typeof v.y === "number" &&
    typeof v.z === "number" &&
    typeof v.yaw === "number" &&
    typeof v.pitch === "number"
  );
};

const isEditItem = (e: unknown): e is EditItem => {
  if (typeof e !== "object" || e === null) {
    return false;
  }
  const r = e as Record<string, unknown>;
  return (
    Number.isInteger(r.x) &&
    Number.isInteger(r.y) &&
    Number.isInteger(r.z) &&
    Math.abs(r.x as number) <= MAX_WORLD_VOXEL &&
    Math.abs(r.y as number) <= MAX_WORLD_VOXEL &&
    Math.abs(r.z as number) <= MAX_WORLD_VOXEL &&
    Number.isInteger(r.id) &&
    (r.id as number) >= 0 &&
    (r.id as number) <= MAX_VOXEL_ID &&
    typeof r.ts === "number" &&
    Number.isFinite(r.ts) &&
    (r.ts as number) >= 0
  );
};

const isEditWire = (r: object): r is EditWire => {
  const v = r as Record<string, unknown>;
  if (
    v.type !== "edit" ||
    v.v !== 1 ||
    typeof v.seq !== "number" ||
    typeof v.t !== "number"
  ) {
    return false;
  }
  return (
    Array.isArray(v.edits) &&
    v.edits.length <= MAX_EDITS_PER_MESSAGE &&
    v.edits.every(isEditItem)
  );
};

const isMonsterUpdate = (u: unknown): u is MonsterUpdate => {
  if (typeof u !== "object" || u === null) {
    return false;
  }
  const r = u as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    r.id.length <= 64 &&
    MONSTER_ID_RE.test(r.id) &&
    typeof r.kind === "string" &&
    MONSTER_KINDS.has(r.kind as MonsterKind) &&
    typeof r.x === "number" &&
    Math.abs(r.x) <= MAX_WORLD_VOXEL &&
    typeof r.y === "number" &&
    Math.abs(r.y) <= MAX_WORLD_VOXEL &&
    typeof r.z === "number" &&
    Math.abs(r.z) <= MAX_WORLD_VOXEL &&
    typeof r.yaw === "number" &&
    Number.isFinite(r.yaw) &&
    typeof r.vx === "number" &&
    Math.abs(r.vx) <= MAX_MONSTER_SPEED &&
    typeof r.vz === "number" &&
    Math.abs(r.vz) <= MAX_MONSTER_SPEED &&
    Number.isInteger(r.hp) &&
    (r.hp as number) >= 0 &&
    (r.hp as number) <= MAX_MONSTER_HP &&
    typeof r.state === "string" &&
    MONSTER_STATES.has(r.state as MonsterState) &&
    typeof r.updatedAt === "number" &&
    Number.isFinite(r.updatedAt) &&
    (r.updatedAt as number) >= 0
  );
};

const isMonsterWire = (r: object): r is MonsterWire => {
  const v = r as Record<string, unknown>;
  if (
    v.type !== "monster" ||
    v.v !== 1 ||
    typeof v.seq !== "number" ||
    typeof v.t !== "number"
  ) {
    return false;
  }
  return (
    Array.isArray(v.updates) &&
    v.updates.length <= MAX_MONSTERS_PER_MESSAGE &&
    v.updates.every(isMonsterUpdate)
  );
};

const isDamageWire = (r: object): r is DamageWire => {
  const v = r as Record<string, unknown>;
  return (
    v.type === "damage" &&
    v.v === 1 &&
    typeof v.seq === "number" &&
    typeof v.t === "number" &&
    typeof v.id === "string" &&
    v.id.length <= 64 &&
    MONSTER_ID_RE.test(v.id) &&
    Number.isInteger(v.amount) &&
    (v.amount as number) >= 1 &&
    (v.amount as number) <= MAX_DAMAGE &&
    typeof v.attackerX === "number" &&
    Number.isFinite(v.attackerX) &&
    Math.abs(v.attackerX) <= MAX_WORLD_VOXEL &&
    typeof v.attackerZ === "number" &&
    Number.isFinite(v.attackerZ) &&
    Math.abs(v.attackerZ) <= MAX_WORLD_VOXEL
  );
};

const isPlayerDamageWire = (r: object): r is PlayerDamageWire => {
  const v = r as Record<string, unknown>;
  return (
    v.type === "player-damage" &&
    v.v === 1 &&
    typeof v.seq === "number" &&
    typeof v.t === "number" &&
    typeof v.target === "string" &&
    v.target.length >= 1 &&
    v.target.length <= 256 &&
    Number.isInteger(v.amount) &&
    (v.amount as number) >= 1 &&
    (v.amount as number) <= MAX_DAMAGE
  );
};

/** Serializes a message to its compact wire form. */
export const encodeMessage = (m: MeshMessage): string => {
  if (m.type === "pose") {
    return JSON.stringify({
      v: 1,
      type: "pose",
      seq: m.seq,
      t: Math.round(m.t),
      x: round(m.x, 2),
      y: round(m.y, 2),
      z: round(m.z, 2),
      yaw: round(m.yaw, 4),
      pitch: round(m.pitch, 4),
    });
  }
  if (m.type === "edit") {
    return JSON.stringify({
      v: 1,
      type: "edit",
      seq: m.seq,
      t: Math.round(m.t),
      edits: m.edits,
    });
  }
  if (m.type === "damage") {
    return JSON.stringify({
      v: 1,
      type: "damage",
      seq: m.seq,
      t: Math.round(m.t),
      id: m.id,
      amount: m.amount,
      attackerX: round(m.attackerX, 2),
      attackerZ: round(m.attackerZ, 2),
    });
  }
  if (m.type === "player-damage") {
    return JSON.stringify({
      v: 1,
      type: "player-damage",
      seq: m.seq,
      t: Math.round(m.t),
      target: m.target,
      amount: m.amount,
    });
  }
  return JSON.stringify({
    v: 1,
    type: "monster",
    seq: m.seq,
    t: Math.round(m.t),
    updates: m.updates.map((u) => ({
      id: u.id,
      kind: u.kind,
      x: round(u.x, 2),
      y: round(u.y, 2),
      z: round(u.z, 2),
      yaw: round(u.yaw, 4),
      vx: round(u.vx, 3),
      vz: round(u.vz, 3),
      hp: u.hp,
      state: u.state,
      updatedAt: Math.round(u.updatedAt),
    })),
  });
};

/** Parses a data-channel chunk back into a message, or null when malformed. */
export const decodeMessage = (chunk: unknown): MeshMessage | null => {
  if (typeof chunk !== "string" && !(chunk instanceof Uint8Array)) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk),
    );
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }
  const r = parsed as Record<string, unknown>;
  if (isPoseWire(r)) {
    return r;
  }
  if (isEditWire(r)) {
    return r;
  }
  if (isMonsterWire(r)) {
    return r;
  }
  if (isDamageWire(r)) {
    return r;
  }
  if (isPlayerDamageWire(r)) {
    return r;
  }
  return null;
};
