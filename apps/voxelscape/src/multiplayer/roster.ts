// Spatial cluster selection for the multiplayer mesh. From every player's
// coarse public presence, pick the handful of peers worth a real WebRTC
// connection — the nearest by horizontal world distance, capped at `k`, with
// hysteresis so a peer hovering around the cutoff doesn't flap connections on
// and off, and a distance cap so two players on opposite sides of the
// (unbounded) world never link up just because they are alone. This is the
// spatial analogue of a k-nearest-neighbour overlay (the "connect to your
// nearest few players" pattern); it is a pure function over a roster, so the
// selection rule is unit-testable.
import type { PresenceRecord } from "./presence";

export interface RosterEntry {
  did: string;
  /** Player cube centre, in world units. */
  x: number;
  y: number;
  z: number;
  /** Milliseconds since epoch. */
  updatedAt: number;
}

/** Converts raw presence records into roster entries for the selector. */
export const rosterFromPresences = (
  entries: Array<{ did: string; record: PresenceRecord }>,
): RosterEntry[] =>
  entries.map(({ did, record }) => ({
    did,
    x: record.x,
    y: record.y,
    z: record.z,
    updatedAt: record.updatedAt,
  }));

export interface ClusterOptions {
  /** Maximum simultaneous neighbor connections. */
  k: number;
  /** Presence older than this (ms) is ignored entirely. */
  ttlMs: number;
  /** Peers beyond this distance (world units) are never selected. */
  maxDistance: number;
  /** Extra candidates beyond `k` that stay eligible for hysteresis. */
  buffer: number;
  /** Grace window (ms) before an out-of-set neighbor is disconnected. */
  hysteresisMs: number;
}

export const CLUSTER_DEFAULTS: ClusterOptions = {
  k: 6,
  ttlMs: 60_000,
  maxDistance: 160,
  buffer: 2,
  hysteresisMs: 2_500,
};

export interface ClusterInput {
  selfDid: string;
  selfX: number;
  selfZ: number;
  roster: RosterEntry[];
  /** Milliseconds since epoch. */
  nowMs: number;
  /**
   * Link state from the previous pass: DID -> the moment it left the
   * candidate set (or -1 while still connected). Feed `selection.links` back
   * in here on the next pass; an empty map starts cold.
   */
  previous: Map<string, number>;
  options?: Partial<ClusterOptions>;
}

export interface ClusterSelection {
  /** The full set of DIDs to maintain connections to after this pass. */
  target: string[];
  /** The k+buffer candidate DIDs (selected plus hysteresis buffer) — who may offer us a connection. */
  candidates: string[];
  /** DIDs not previously connected that should get a new link. */
  connect: string[];
  /** DIDs to tear down (left the set and the hysteresis window elapsed). */
  disconnect: string[];
  /** New link state to feed back in as `previous` next pass. */
  links: Map<string, number>;
  /** True when more candidates existed than `k`. */
  truncated: boolean;
}

export const selectNeighbors = (input: ClusterInput): ClusterSelection => {
  const opts: ClusterOptions = { ...CLUSTER_DEFAULTS, ...input.options };
  const { selfDid, selfX, selfZ, roster, nowMs, previous } = input;

  const ranked = roster
    .filter((e) => e.did !== selfDid && nowMs - e.updatedAt <= opts.ttlMs)
    .map((e) => ({ e, dist2: (e.x - selfX) ** 2 + (e.z - selfZ) ** 2 }))
    .filter(({ dist2 }) => dist2 <= opts.maxDistance ** 2)
    .sort(
      (a, b) =>
        a.dist2 - b.dist2 ||
        (a.e.did < b.e.did ? -1 : a.e.did > b.e.did ? 1 : 0),
    );

  const truncated = ranked.length > opts.k;
  const selected = new Set(ranked.slice(0, opts.k).map(({ e }) => e.did));
  const withinHysteresis = new Set(
    ranked.slice(0, opts.k + opts.buffer).map(({ e }) => e.did),
  );

  const links = new Map<string, number>();
  const disconnect: string[] = [];
  for (const [did, leftAt] of previous) {
    if (selected.has(did) || withinHysteresis.has(did)) {
      // Still in reach: keep connected, clear any leave clock.
      links.set(did, -1);
      continue;
    }
    const started = leftAt >= 0 ? leftAt : nowMs;
    if (nowMs - started >= opts.hysteresisMs) {
      disconnect.push(did);
    } else {
      // Within the grace window: keep the link, keep counting.
      links.set(did, started);
    }
  }
  // Newly selected candidates start connected.
  for (const did of selected) {
    if (!links.has(did)) {
      links.set(did, -1);
    }
  }

  const target = [...links.keys()].sort();
  const connect = target.filter((did) => !previous.has(did));
  const candidates = [...withinHysteresis].sort();

  return { target, candidates, connect, disconnect, links, truncated };
};
