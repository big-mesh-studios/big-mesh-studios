// The in-process stand-in for the WebRTC transport: a deterministic fake that
// speaks the same `signal()`/`on("signal")` interface as simple-peer, so the
// mesh's signaling, lifecycle, and pose flow can be exercised without any
// real ICE/STUN. The two peers of a pair are wired together by their sorted
// DIDs when both have been created (which happens for every completed
// connection), after which `send` delivers straight to the partner's data
// handler; destroying one side emits `close` on the other, enabling fault
// injection.
import type { PeerFactory, PeerSignalData, PeerTransport } from "../transport";

export class FakePeer implements PeerTransport {
  readonly selfDid: string;
  readonly peerDid: string;
  private readonly initiator: boolean;
  private readonly listeners = new Map<string, (...args: any[]) => void>();
  private destroyed = false;

  constructor(selfDid: string, peerDid: string, initiator: boolean) {
    this.selfDid = selfDid;
    this.peerDid = peerDid;
    this.initiator = initiator;
    if (initiator) {
      queueMicrotask(() => this.emit("signal", { type: "offer", sdp: "fake" }));
    }
  }

  on(event: "signal", listener: (data: PeerSignalData) => void): this;
  on(event: "connect", listener: () => void): this;
  on(event: "data", listener: (chunk: unknown) => void): this;
  on(event: "close", listener: () => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  on(event: string, listener: (...args: any[]) => void): this {
    this.listeners.set(event, listener);
    return this;
  }

  signal(data: PeerSignalData): void {
    if (this.destroyed) {
      return;
    }
    if (this.initiator && data.type === "answer") {
      this.emit("connect");
    } else if (!this.initiator && data.type === "offer") {
      queueMicrotask(() => {
        if (this.destroyed) {
          return;
        }
        this.emit("signal", { type: "answer", sdp: "fake" });
        this.emit("connect");
      });
    }
  }

  send(data: string): void {
    if (this.destroyed) {
      return;
    }
    this.deliver(data);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    // the surviving peer observes the connection close, as real WebRTC would
    this.partner?.emitClose();
  }

  /** Delivery point wired by the harness when both peers of a pair exist. */
  partner: FakePeer | undefined;

  /** Fault injection: make this peer observe a connection close. */
  emitClose(): void {
    if (!this.destroyed) {
      this.emit("close");
    }
  }

  /** Fault injection: make this peer observe an error. */
  emitError(message: string): void {
    if (!this.destroyed) {
      this.emit("error", new Error(message));
    }
  }

  private receive(data: string): void {
    this.emit("data", data);
  }

  private deliver(data: string): void {
    this.partner?.receive(data);
  }

  private emit(event: string, ...args: unknown[]): void {
    if (this.destroyed) {
      return;
    }
    this.listeners.get(event)?.(...args);
  }
}

export class TransportHarness {
  /** pair-key (sorted DIDs) -> side-did -> the side's current FakePeer. */
  private readonly pairs = new Map<string, Map<string, FakePeer>>();

  /** The `PeerFactory` to hand every simulated player's controller. */
  readonly createPeer: PeerFactory = ({ initiator, selfDid, peerDid }) => {
    const key = [selfDid, peerDid].sort().join("↔");
    const peer = new FakePeer(selfDid, peerDid, initiator);
    let sides = this.pairs.get(key);
    if (sides === undefined) {
      sides = new Map();
      this.pairs.set(key, sides);
    }
    // Replace a stale endpoint on this side (e.g. after a reconnect) rather
    // than accumulate, so a pair is always exactly its two current endpoints.
    sides.set(selfDid, peer);
    if (sides.size === 2) {
      const [a, b] = [...sides.values()];
      a.partner = b;
      b.partner = a;
    }
    return peer;
  };

  /** The fake peer of one side of a pair, for fault injection and asserts. */
  peer(selfDid: string, peerDid: string): FakePeer | undefined {
    const key = [selfDid, peerDid].sort().join("↔");
    return this.pairs.get(key)?.get(selfDid);
  }

  /** Every pair registered so far, for diagnostics. */
  get pairCount(): number {
    return this.pairs.size;
  }
}
