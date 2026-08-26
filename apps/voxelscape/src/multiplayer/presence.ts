// Public presence records for multiplayer discovery. Each connected player
// upserts one `app.bms.voxelscape.presence` record (fixed rkey "latest", so
// the collection never grows) into their own repo at a low rate; any other
// player can discover who is nearby either by polling
// `com.atproto.sync.listReposByCollection` for every repo holding such a
// record or by watching the firehose for writes to this collection. Positions
// are coarse by design: they only drive peer selection for the WebRTC cluster,
// never the real-time pose stream.
export const PRESENCE_COLLECTION = "app.bms.voxelscape.presence";
/** Presence upserts to this rkey, so the collection never grows. */
export const PRESENCE_RKEY = "latest";

export interface PresenceRecord {
  $type: typeof PRESENCE_COLLECTION;
  /** Player cube centre, in integer world units (atproto records hold no floats). */
  x: number;
  y: number;
  z: number;
  /** Terrain seed the world was generated with; peers sanity-check they share the same world. */
  seed: number | null;
  /** Milliseconds since epoch. */
  updatedAt: number;
}

export const makePresence = (
  x: number,
  y: number,
  z: number,
  seed: number | null,
  updatedAt: number,
): PresenceRecord => ({
  $type: PRESENCE_COLLECTION,
  x: Math.round(x),
  y: Math.round(y),
  z: Math.round(z),
  seed,
  updatedAt,
});

export const isPresenceRecord = (v: unknown): v is PresenceRecord => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  return (
    r.$type === PRESENCE_COLLECTION &&
    typeof r.x === "number" &&
    typeof r.y === "number" &&
    typeof r.z === "number" &&
    (r.seed === null || typeof r.seed === "number") &&
    typeof r.updatedAt === "number"
  );
};

/** Horizontal (xz) distance between a record's position and a point. */
export const horizontalDistance = (
  p: PresenceRecord,
  x: number,
  z: number,
): number => Math.hypot(p.x - x, p.z - z);
