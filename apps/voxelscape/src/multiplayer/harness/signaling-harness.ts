// The in-process stand-in for the signaling service (PeerJS cloud): a registry
// of join codes. `connect()` looks up the remote's signaling, delivers an
// incoming connection to it (the responder's `connection` event, carrying the
// initiator's DID as metadata), and returns a data-channel pair wired together
// — the same shape as the real cloud, with none of the network.
import { hashDid } from "../presence";
import type {
  PeerTransport,
  SignalingFactory,
  SignalingRemote,
  SignalingTransport,
} from "../transport";

export class FakePeer implements PeerTransport {
  readonly did: string;
  readonly joinCode: string;
  private readonly listeners = new Map<string, (...args: any[]) => void>();
  private destroyed = false;
  private opened = false;
  partner: FakePeer | undefined;

  constructor(did: string, joinCode: string) {
    this.did = did;
    this.joinCode = joinCode;
  }

  on(event: string, listener: (...args: any[]) => void): this {
    this.listeners.set(event, listener);
    // A connection held by the responder may already be open when the mesh
    // wires it; deliver the pending open to a late "connect" listener.
    if (event === "connect" && this.opened) {
      queueMicrotask(() => listener());
    }
    return this;
  }

  send(data: string): void {
    if (this.destroyed) {
      return;
    }
    this.partner?.deliver(data);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    // the surviving peer observes the connection close, as real WebRTC would
    this.partner?.emitClose();
  }

  /** Fault injection: make this peer observe a connection close. */
  emitClose(): void {
    if (!this.destroyed) {
      this.emit("close");
    }
  }

  /** Opens the data channel (fires the `connect` event). */
  open(): void {
    if (this.destroyed) {
      return;
    }
    this.opened = true;
    this.emit("connect");
  }

  /** Fault injection: make this peer observe an error. */
  emitError(message: string): void {
    if (!this.destroyed) {
      this.emit("error", new Error(message));
    }
  }

  private deliver(data: string): void {
    this.emit("data", data);
  }

  private emit(event: string, ...args: unknown[]): void {
    if (this.destroyed) {
      return;
    }
    this.listeners.get(event)?.(...args);
  }
}

class FakeSignaling implements SignalingTransport {
  private readonly openListeners: Array<(joinCode: string) => void> = [];
  private readonly connectionListeners: Array<
    (remote: SignalingRemote, transport: PeerTransport) => void
  > = [];
  private readonly errorListeners: Array<(err: Error) => void> = [];

  constructor(
    readonly selfDid: string,
    readonly joinCode: string,
    private readonly harness: SignalingHarness,
  ) {}

  onOpen(listener: (joinCode: string) => void): void {
    this.openListeners.push(listener);
  }

  onConnection(
    listener: (remote: SignalingRemote, transport: PeerTransport) => void,
  ): void {
    this.connectionListeners.push(listener);
  }

  onError(listener: (err: Error) => void): void {
    this.errorListeners.push(listener);
  }

  emitOpen(): void {
    for (const listener of [...this.openListeners]) {
      listener(this.joinCode);
    }
  }

  connect(remoteJoinCode: string, _metadata?: unknown): PeerTransport {
    const remote = this.harness.find(remoteJoinCode);
    if (remote === undefined) {
      // Mirror PeerJS: connecting to a join code nobody holds fails asynchronously.
      const dead = new FakePeer(this.selfDid, this.joinCode);
      queueMicrotask(() =>
        dead.emitError(`could not connect to ${remoteJoinCode}`),
      );
      return dead;
    }
    const initSide = new FakePeer(this.selfDid, this.joinCode);
    const remoteSide = new FakePeer(remote.selfDid, remote.joinCode);
    initSide.partner = remoteSide;
    remoteSide.partner = initSide;
    this.harness.registerPair(
      this.selfDid,
      remote.selfDid,
      initSide,
      remoteSide,
    );
    remote.emitConnection(this.joinCode, this.selfDid, remoteSide);
    // Both sides open once their controllers have wired the transports up.
    queueMicrotask(() => {
      initSide.open();
      remoteSide.open();
    });
    return initSide;
  }

  destroy(): void {
    this.errorListeners.length = 0;
    this.connectionListeners.length = 0;
    this.openListeners.length = 0;
  }

  emitConnection(
    remoteJoinCode: string,
    remoteDid: string,
    transport: PeerTransport,
  ): void {
    for (const listener of [...this.connectionListeners]) {
      listener({ joinCode: remoteJoinCode, did: remoteDid }, transport);
    }
  }
}

export class SignalingHarness {
  /** joinCode -> signaling, the cloud's view of who is registered. */
  private readonly signallings = new Map<string, FakeSignaling>();
  /** sorted-DID pair-key -> side-did -> the side's current FakePeer. */
  private readonly pairs = new Map<string, Record<string, FakePeer>>();

  /** The `SignalingFactory` to hand every simulated player's controller. */
  readonly createSignaling: SignalingFactory = ({ selfDid }) => {
    const joinCode = `sim-${hashDid(selfDid)}`;
    const signaling = new FakeSignaling(selfDid, joinCode, this);
    this.signallings.set(joinCode, signaling);
    // Registration completes asynchronously, like the cloud handshake.
    queueMicrotask(() => signaling.emitOpen());
    return signaling;
  };

  find(joinCode: string): FakeSignaling | undefined {
    return this.signallings.get(joinCode);
  }

  registerPair(
    didSelf: string,
    didRemote: string,
    initSide: FakePeer,
    remoteSide: FakePeer,
  ): void {
    const key = [didSelf, didRemote].sort().join("↔");
    this.pairs.set(key, { [didSelf]: initSide, [didRemote]: remoteSide });
  }

  /** The fake peer of one side of a pair, for fault injection and asserts. */
  peer(selfDid: string, peerDid: string): FakePeer | undefined {
    const key = [selfDid, peerDid].sort().join("↔");
    return this.pairs.get(key)?.[selfDid];
  }

  /** Every pair registered so far, for diagnostics. */
  get pairCount(): number {
    return this.pairs.size;
  }
}
