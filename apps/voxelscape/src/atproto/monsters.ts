// Monster-state records for atproto storage: each player writes the monsters
// it simulates into its own repo, one record per monster (rkey = the monster
// id, so the repo holds at most one record per monster). The union of every
// repo's records is the source of truth for monster positions; a merge
// reconciles them last-write-wins by the producing client's `updatedAt`, ties
// broken by the owner DID so any client resolves a conflict the same way.
// Positions are coarse integers, like presence records: this is the slow
// source-of-truth path behind the WebRTC optimistic broadcasts, so it carries
// where a monster is, not every step it takes.
import {
  kindMaxHp,
  type MonsterKind,
  type MonsterSnapshot,
  type MonsterState,
} from "../monsters/monster";

/** The atproto collection monster-state records live in. */
export const MONSTER_COLLECTION = "app.bms.voxelscape.monster";

export interface MonsterRecord {
  $type: typeof MONSTER_COLLECTION;
  id: string;
  kind: MonsterKind;
  /** DID of the player that simulates it, or null while it sleeps unowned. */
  owner: string | null;
  /** Terrain seed the world was generated with, to reject records from other worlds. */
  seed: number | null;
  /** Cube centre, in integer world units. */
  x: number;
  y: number;
  z: number;
  /** Heading, in integer degrees (0..359), coarse like the position. */
  yawDeg: number;
  hp: number;
  state: MonsterState;
  /** Milliseconds since epoch of the owner's simulation; drives last-write-wins. */
  updatedAt: number;
  createdAt: string;
}

const STATES = new Set<MonsterState>(["sleep", "wander", "chase", "attack"]);

export const isMonsterRecord = (v: unknown): v is MonsterRecord => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  return (
    r.$type === MONSTER_COLLECTION &&
    typeof r.id === "string" &&
    r.kind === "zombie" &&
    (r.owner === null || typeof r.owner === "string") &&
    (r.seed === null || typeof r.seed === "number") &&
    Number.isInteger(r.x) &&
    Number.isInteger(r.y) &&
    Number.isInteger(r.z) &&
    Number.isInteger(r.yawDeg) &&
    Number.isInteger(r.hp) &&
    typeof r.state === "string" &&
    STATES.has(r.state as MonsterState) &&
    typeof r.updatedAt === "number" &&
    Number.isFinite(r.updatedAt) &&
    typeof r.createdAt === "string"
  );
};

/** The record a snapshot's owner should persist. */
export const makeMonsterRecord = (
  m: MonsterSnapshot,
  seed: number | null,
  createdAt: string,
): MonsterRecord => ({
  $type: MONSTER_COLLECTION,
  id: m.id,
  kind: m.kind,
  owner: m.owner,
  seed,
  x: Math.round(m.pose.x),
  y: Math.round(m.pose.y),
  z: Math.round(m.pose.z),
  yawDeg: ((Math.round((m.pose.yaw * 180) / Math.PI) % 360) + 360) % 360,
  hp: m.hp,
  state: m.state,
  updatedAt: m.authoritativeAt,
  createdAt,
});

/**
 * The snapshot a record resolves to on the client that reads it. The record
 * carries no velocity (it is a coarse source of truth), and `updatedAt` is the
 * reader's arrival time so its dead-reckoning runs on the local clock; the
 * record's own `updatedAt` is kept as `authoritativeAt` for later merges.
 */
export const recordToSnapshot = (
  record: MonsterRecord,
  now: number,
): MonsterSnapshot => ({
  id: record.id,
  kind: record.kind,
  pose: {
    x: record.x,
    y: record.y,
    z: record.z,
    yaw: (record.yawDeg * Math.PI) / 180,
    vx: 0,
    vz: 0,
  },
  hp: record.hp,
  maxHp: kindMaxHp(record.kind),
  state: record.state,
  wanderLeft: 0,
  cooldown: 0,
  owner: record.owner,
  authoritativeAt: record.updatedAt,
  updatedAt: now,
});

/**
 * Whether `record` should replace `existing` in a merge: newer `updatedAt`
 * (the producing client's clock), ties broken by the owner DID so every
 * client picks the same winner regardless of fetch order.
 */
export const recordBeats = (
  existing: { authoritativeAt: number; owner: string | null },
  record: { updatedAt: number; owner: string | null },
): boolean =>
  record.updatedAt > existing.authoritativeAt ||
  (record.updatedAt === existing.authoritativeAt &&
    (record.owner ?? "") > (existing.owner ?? ""));
