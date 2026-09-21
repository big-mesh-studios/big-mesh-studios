// The multiplayer wire envelope: every message that travels over a peer's
// data channel is one tagged JSON object, so the real-time pose stream and
// the optimistic edit stream share a single ordered, reliable channel without
// a framing layer. Poses keep the payload shape from `pose.ts`; edit messages
// carry batches of voxel edits. Decoding validates every field, because a
// peer's bytes are untrusted input that gets applied straight to the local
// edit overlay.
import { decodeScriptEvents, type ScriptEvent } from "../places/events";
import { round, type PoseMessage } from "./pose";

/** How far from the origin a broadcast edit may lie, in voxels (sanity bound). */
export const MAX_WORLD_VOXEL = 100_000;
/** Voxel ids live in a `Uint8Array` store, so 0..255 covers every id. */
export const MAX_VOXEL_ID = 255;
/** The largest edit batch a single message may carry. */
export const MAX_EDITS_PER_MESSAGE = 512;
/** The largest script-entity batch a single message may carry. */
export const MAX_SCRIPT_ENTITIES_PER_MESSAGE = 32;
/** The largest script-event batch a single message may carry. */
export const MAX_SCRIPT_EVENTS_PER_MESSAGE = 32;
/** Largest damage a single swing may claim to deal. */
export const MAX_DAMAGE = 100;
/** The longest a player-model file name a peer may wear. */
export const MAX_PLAYER_MODEL = 128;

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
 * One player-damage broadcast, sent to the peer whose player it hit so they
 * apply it: the receiver gates on its own DID, so the hit is applied exactly
 * once, on the client that owns the hurt player.
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

/**
 * One script-driven NPC's position, as its current owner computed it: a
 * place script's `nearestPlayer`-style comparison decides which peer moves an
 * entity "for real" from live sensing, and broadcasts the result so the rest
 * do not each compute their own, slightly different guess from the same
 * latency-skewed data.
 */
export interface ScriptEntityUpdate {
  id: string;
  x: number;
  y: number;
  z: number;
  /** Heading, in radians. */
  yaw: number;
}

/** A batched script-entity broadcast: the owner's live-tracked NPCs at a moment. */
export interface ScriptEntityWire {
  v: 1;
  type: "script-entity";
  seq: number;
  t: number;
  updates: ScriptEntityUpdate[];
}

/**
 * One or more facts a peer's own script authored — a talk, a use, a swing —
 * broadcast so every other peer's copy of the shared log gains them too and
 * folds its own script over the same set of facts.
 */
export interface ScriptEventWire {
  v: 1;
  type: "script-event";
  seq: number;
  t: number;
  events: ScriptEvent[];
}

/**
 * One player's worn model, as the player's own peer broadcast it: the place
 * model file the avatar wears, or "" for the plain cube. Every peer in the
 * place shares the attached models, so a file name resolves on the receiver.
 */
export interface PlayerModelWire {
  v: 1;
  type: "player-model";
  seq: number;
  t: number;
  /** The place model file the player wears, or "" for the plain cube. */
  model: string;
}

/**
 * One leg of a clock exchange: a ping naming the initiator's wall time, which
 * the receiver answers with the same value plus the wall time it received at.
 * The initiator then owns `rtt = t4 - t1` and `offset = t2 - (t1 + t4) / 2`,
 * stamping `t4` when the answer lands; the exchange needs no sequence number,
 * because each ping is paired by its own `t1`.
 */
export interface TimeWire {
  v: 1;
  type: "time";
  /** The initiator's wall-clock millisecond when the ping was sent. */
  t1: number;
  /** The responder's wall-clock millisecond when it received the ping. */
  t2?: number;
}

export type MeshMessage =
  | PoseWire
  | EditWire
  | PlayerDamageWire
  | ScriptEntityWire
  | ScriptEventWire
  | PlayerModelWire
  | TimeWire;

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

const isScriptEntityUpdate = (u: unknown): u is ScriptEntityUpdate => {
  if (typeof u !== "object" || u === null) {
    return false;
  }
  const r = u as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    r.id.length >= 1 &&
    r.id.length <= 64 &&
    typeof r.x === "number" &&
    Number.isFinite(r.x) &&
    Math.abs(r.x) <= MAX_WORLD_VOXEL &&
    typeof r.y === "number" &&
    Number.isFinite(r.y) &&
    Math.abs(r.y) <= MAX_WORLD_VOXEL &&
    typeof r.z === "number" &&
    Number.isFinite(r.z) &&
    Math.abs(r.z) <= MAX_WORLD_VOXEL &&
    typeof r.yaw === "number" &&
    Number.isFinite(r.yaw)
  );
};

const isScriptEntityWire = (r: object): r is ScriptEntityWire => {
  const v = r as Record<string, unknown>;
  if (
    v.type !== "script-entity" ||
    v.v !== 1 ||
    typeof v.seq !== "number" ||
    typeof v.t !== "number"
  ) {
    return false;
  }
  return (
    Array.isArray(v.updates) &&
    v.updates.length <= MAX_SCRIPT_ENTITIES_PER_MESSAGE &&
    v.updates.every(isScriptEntityUpdate)
  );
};

const isScriptEventWire = (candidate: object): candidate is ScriptEventWire => {
  const wire = candidate as Record<string, unknown>;
  if (
    wire.type !== "script-event" ||
    wire.v !== 1 ||
    typeof wire.seq !== "number" ||
    typeof wire.t !== "number" ||
    !Array.isArray(wire.events) ||
    wire.events.length > MAX_SCRIPT_EVENTS_PER_MESSAGE
  ) {
    return false;
  }
  return decodeScriptEvents(wire.events) !== null;
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

const isPlayerModelWire = (r: object): r is PlayerModelWire => {
  const v = r as Record<string, unknown>;
  return (
    v.type === "player-model" &&
    v.v === 1 &&
    typeof v.seq === "number" &&
    typeof v.t === "number" &&
    typeof v.model === "string" &&
    v.model.length <= MAX_PLAYER_MODEL
  );
};

/** Bound on a wall-clock millisecond a time exchange may carry, milliseconds. */
const TIME_MS_CEILING = 1e13;

const isWallMs = (n: unknown): boolean =>
  typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= TIME_MS_CEILING;

const isTimeWire = (r: object): r is TimeWire => {
  const v = r as Record<string, unknown>;
  return (
    v.type === "time" &&
    v.v === 1 &&
    isWallMs(v.t1) &&
    (v.t2 === undefined || isWallMs(v.t2))
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
  if (m.type === "script-entity") {
    return JSON.stringify({
      v: 1,
      type: "script-entity",
      seq: m.seq,
      t: Math.round(m.t),
      updates: m.updates.map((u) => ({
        id: u.id,
        x: round(u.x, 2),
        y: round(u.y, 2),
        z: round(u.z, 2),
        yaw: round(u.yaw, 4),
      })),
    });
  }
  if (m.type === "player-model") {
    return JSON.stringify({
      v: 1,
      type: "player-model",
      seq: m.seq,
      t: Math.round(m.t),
      model: m.model,
    });
  }
  if (m.type === "time") {
    return JSON.stringify({
      v: 1,
      type: "time",
      t1: Math.round(m.t1),
      ...(m.t2 !== undefined ? { t2: Math.round(m.t2) } : {}),
    });
  }
  return JSON.stringify({
    v: 1,
    type: "script-event",
    seq: m.seq,
    t: Math.round(m.t),
    events: m.events,
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
  if (isPlayerDamageWire(r)) {
    return r;
  }
  if (isScriptEntityWire(r)) {
    return r;
  }
  if (isScriptEventWire(r)) {
    return r;
  }
  if (isPlayerModelWire(r)) {
    return r;
  }
  if (isTimeWire(r)) {
    return r;
  }
  return null;
};
