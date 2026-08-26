// The multiplayer wire envelope: every message that travels over a peer's
// data channel is one tagged JSON object, so the real-time pose stream and
// the optimistic edit stream share a single ordered, reliable channel without
// a framing layer. Poses keep the payload shape from `pose.ts`; edit messages
// carry batches of voxel edits. Decoding validates every field, because a
// peer's bytes are untrusted input that gets applied straight to the local
// edit overlay.
import { round, type PoseMessage } from "./pose";

/** How far from the origin a broadcast edit may lie, in voxels (sanity bound). */
export const MAX_WORLD_VOXEL = 100_000;
/** Voxel ids live in a `Uint8Array` store, so 0..255 covers every id. */
export const MAX_VOXEL_ID = 255;
/** The largest edit batch a single message may carry. */
export const MAX_EDITS_PER_MESSAGE = 512;

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

export type MeshMessage = PoseWire | EditWire;

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

/** Serializes a message to its compact wire form. */
export const encodeMessage = (m: MeshMessage): string =>
  m.type === "pose"
    ? JSON.stringify({
        v: 1,
        type: "pose",
        seq: m.seq,
        t: Math.round(m.t),
        x: round(m.x, 2),
        y: round(m.y, 2),
        z: round(m.z, 2),
        yaw: round(m.yaw, 4),
        pitch: round(m.pitch, 4),
      })
    : JSON.stringify({
        v: 1,
        type: "edit",
        seq: m.seq,
        t: Math.round(m.t),
        edits: m.edits,
      });

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
  return null;
};
