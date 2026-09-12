// The shared clock for a place: the wall-clock moment every peer names the
// same way. A place script's timers and motions run off this clock (ADR 0036,
// 0039), so two peers that step the same script must read the same instant or
// their platforms and deadlines drift apart. A `PeerClock` measures each link
// it holds with a one-round-trip time exchange, keeps the best per-peer offset
// it has seen, and reports the offset-corrected time of the peer chosen as the
// timekeeper — the lowest DID among the players sharing the place — which is
// a DID every peer can agree on without any of them being told.
//
// A clock with no linked timekeeper (alone, offline, or one only the mesh has
// not measured) falls back to the local wall clock: the same value a peer
// would report with no clock at all, and the best one available until a
// measurement lands. The offset is a last-write-wins estimate, re-sampled on
// a cadence while a link is open (the controller owns that cadence), so a
// drifting peer is re-measured rather than remembered.
import type { RosterEntry } from "./roster";

/** How large an accepted offset may be, in milliseconds (one day). */
const MAX_OFFSET_MS = 24 * 60 * 60 * 1000;
/** How long an accepted round trip may take, in milliseconds. */
const MAX_RTT_MS = 10_000;
/** The best few samples kept per peer, so a single stalled exchange cannot win. */
const MAX_SAMPLES_PER_PEER = 8;

/** One measured clock offset: the round trip and the offset it implied. */
export interface ClockSample {
  /** The offset the sample measured: peer wall time minus local wall time. */
  offset: number;
  /** The round-trip time the sample was carried over, in milliseconds. */
  rtt: number;
}

export interface PeerClockParams {
  /** The local wall clock, injectable so tests can skew peers. */
  wallNow?: () => number;
}

/** Estimates one peer's clock offset over its link, with a place timekeeper. */
export class PeerClock {
  private readonly wallNow: () => number;
  private self: string | null = null;
  private readonly rosterDids = new Set<string>();
  private readonly samples = new Map<string, ClockSample[]>();

  constructor(params: PeerClockParams = {}) {
    this.wallNow = params.wallNow ?? (() => Date.now());
  }

  /** Names this player, the one whose own clock is the implicit fallback. */
  setSelf(did: string): void {
    this.self = did;
  }

  /** The other players sharing this place, so the timekeeper can be agreed. */
  setRoster(dids: string[]): void {
    this.rosterDids.clear();
    for (const did of dids) {
      this.rosterDids.add(did);
    }
  }

  /**
   * The peer whose clock the place is read against: the lowest DID among this
   * player and the roster, or null when this player itself is not named.
   */
  get referenceDid(): string | null {
    const self = this.self;
    if (self === null) {
      return null;
    }
    let least = self;
    for (const did of this.rosterDids) {
      if (did < least) {
        least = did;
      }
    }
    return least;
  }

  /**
   * Records one time exchange with `did`: the initiator sent at local time
   * `t1`, `did` received at its own wall time `t2`, and this peer received
   * the reply at local time `t4`. Both the offset and its round trip are kept.
   */
  observe(did: string, t1: number, t2: number, t4: number): void {
    const rtt = t4 - t1;
    if (
      !Number.isFinite(rtt) ||
      rtt < 0 ||
      rtt > MAX_RTT_MS ||
      !Number.isFinite(t2)
    ) {
      return;
    }
    const offset = t2 - (t1 + t4) / 2;
    if (!Number.isFinite(offset) || Math.abs(offset) > MAX_OFFSET_MS) {
      return;
    }
    const history = this.samples.get(did) ?? [];
    history.push({ offset, rtt });
    if (history.length > MAX_SAMPLES_PER_PEER) {
      history.shift();
    }
    this.samples.set(did, history);
  }

  /** The best measured offset to `did`, or null when nothing usable is known. */
  offsetTo(did: string): number | null {
    const history = this.samples.get(did);
    if (history === undefined || history.length === 0) {
      return null;
    }
    let best = history[0];
    for (const sample of history) {
      if (sample.rtt < best.rtt) {
        best = sample;
      }
    }
    return best.offset;
  }

  /** The offset the place clock is read against: the timekeeper's, or 0. */
  get offset(): number {
    const reference = this.referenceDid;
    if (reference === null) {
      return 0;
    }
    return this.offsetTo(reference) ?? 0;
  }

  /** The shared-clock moment, in milliseconds: local wall time plus offset. */
  now(): number {
    return this.wallNow() + this.offset;
  }

  /** Forgets everything measured with `did`, for when their link closes. */
  forget(did: string): void {
    this.samples.delete(did);
    this.rosterDids.delete(did);
  }

  /** Back to a bare local wall clock: no self, no roster, no measurements. */
  reset(): void {
    this.self = null;
    this.rosterDids.clear();
    this.samples.clear();
  }

  /** The measured peers and the offsets held for each, for a debug dump. */
  describe(): string {
    const reference = this.referenceDid;
    const estimates = [...this.samples.entries()]
      .map(
        ([did, history]) => `${did}=${history.map((s) => s.offset).join(",")}`,
      )
      .join(" ");
    return `reference=${reference ?? "none"} offset=${this.offset}ms ${estimates}`;
  }
}

/** The roster entries a place clock matters against: this place's other peers. */
export const clockRoster = (roster: RosterEntry[], scope: string): string[] =>
  roster.filter((e) => e.scope === scope).map((e) => e.did);
