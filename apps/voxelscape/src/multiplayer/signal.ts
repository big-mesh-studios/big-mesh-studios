// WebRTC signaling mailboxes on atproto. Each player writes the SDP
// offers/answers and ICE candidates of a handshake into their OWN repo under
// `app.bms.voxelscape.signal`, keyed so the intended recipient can filter for
// them (`to`), and the peer polls those records via `listRecords` — the same
// putRecord/listRecords pattern the edit-chunk sync already uses. Handshake
// traffic is ephemeral and low-volume (non-trickle ICE batches candidates, so
// a full connection is a handful of records), so a public mailbox suffices;
// the `to`/`kind`/`seq`/`payload` shape is transport-agnostic and can be
// re-pointed at an atproto Space later without redesign.
export const SIGNAL_COLLECTION = "app.bms.voxelscape.signal";

export type SignalKind = "offer" | "answer" | "candidate";

export interface SignalRecord {
  $type: typeof SIGNAL_COLLECTION;
  /** The intended recipient's DID; every other reader ignores this record. */
  to: string;
  /** Monotonic per-recipient sequence number, for ordering and dedupe. */
  seq: number;
  kind: SignalKind;
  /** JSON-serializable WebRTC signaling payload (SDP or an ICE candidate). */
  payload: unknown;
  /** Milliseconds since epoch. */
  createdAt: number;
}

/** Stable short hash of a DID, for embedding in record keys. */
export const hashDid = (s: string): string => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
};

/**
 * A valid atproto record key for a signal: ordered by `seq`, distinct per
 * recipient, and free of characters the rkey grammar forbids.
 */
export const signalRkey = (to: string, seq: number): string =>
  `sig${seq}_${hashDid(to)}`;

export const makeSignal = (
  to: string,
  kind: SignalKind,
  payload: unknown,
  seq: number,
  createdAt: number,
): SignalRecord => ({
  $type: SIGNAL_COLLECTION,
  to,
  seq,
  kind,
  payload,
  createdAt,
});

export const isSignalRecord = (v: unknown): v is SignalRecord => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  return (
    r.$type === SIGNAL_COLLECTION &&
    typeof r.to === "string" &&
    typeof r.seq === "number" &&
    (r.kind === "offer" || r.kind === "answer" || r.kind === "candidate") &&
    typeof r.createdAt === "number"
  );
};

export interface ParsedSignal {
  seq: number;
  kind: SignalKind;
  payload: unknown;
  createdAt: number;
}

/**
 * Flattens raw `listRecords` values into the signals addressed to `selfDid`,
 * ascending by `seq`. Records for other recipients, malformed values, and
 * non-signal records are skipped.
 */
export const parseSignals = (
  records: unknown[],
  selfDid: string,
): ParsedSignal[] => {
  const out: ParsedSignal[] = [];
  for (const v of records) {
    if (!isSignalRecord(v) || v.to !== selfDid) {
      continue;
    }
    out.push({
      seq: v.seq,
      kind: v.kind,
      payload: v.payload,
      createdAt: v.createdAt,
    });
  }
  out.sort((a, b) => a.seq - b.seq);
  return out;
};
