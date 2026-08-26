// The signaling seam for the multiplayer mesh. Signaling is handled by an
// external service (PeerJS's free cloud server in the app, an in-memory
// registry in the harness), so `MeshPeer` only ever sees a per-connection
// `PeerTransport` — the data channel — and the controller sees the shared
// `SignalingTransport` that owns this player's registration with that service.
// The invite/join code (the PeerJS id) is published in the player's atproto
// presence record; peers discover it there and connect by it.

/** One established (or establishing) WebRTC data channel. */
export interface PeerTransport {
  on(event: "connect", listener: () => void): this;
  on(event: "data", listener: (chunk: unknown) => void): this;
  on(event: "close", listener: () => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  send(data: string): void;
  destroy(): void;
}

/** Identifies who an incoming connection came from. */
export interface SignalingRemote {
  /** The remote's join code (their signaling-server id). */
  joinCode: string;
  /** The initiator's DID, sent as connection metadata so the receiver needn't map join codes. */
  did?: string;
}

/**
 * The shared per-player signaling connection. One of these per player: it
 * registers this player's join code with the signaling server and both
 * initiates outgoing connections and receives incoming ones.
 */
export interface SignalingTransport {
  /** Fires once this player's join code is registered with the signaling server. */
  onOpen(listener: (joinCode: string) => void): void;
  /** An incoming connection from a remote peer. */
  onConnection(
    listener: (remote: SignalingRemote, transport: PeerTransport) => void,
  ): void;
  onError(listener: (err: Error) => void): void;
  /** Initiates a connection to `remoteJoinCode`, passing `metadata` to the receiver. */
  connect(remoteJoinCode: string, metadata?: unknown): PeerTransport;
  destroy(): void;
}

export type SignalingFactory = (opts: {
  selfDid: string;
}) => SignalingTransport;
