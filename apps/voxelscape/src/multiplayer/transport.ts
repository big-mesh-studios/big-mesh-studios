// The transport seam for the multiplayer mesh: the WebRTC peer connection is
// injected as a `PeerFactory`, so the mesh logic (signaling, lifecycle,
// pose flow) can run against the real simple-peer transport in the app and a
// deterministic in-process fake in the harness tests. The factory is told its
// role and the two DIDs, so a fake can wire peer pairs directly without
// needing to observe the signaling channel.
import type { SignalData } from "simple-peer";

/** The signaling payload shape both sides exchange (SDP offer/answer, ICE). */
export type PeerSignalData = SignalData;

export interface PeerFactoryOptions {
  /** Whether this side creates the SDP offer (the lexicographically lower DID). */
  initiator: boolean;
  selfDid: string;
  peerDid: string;
}

/**
 * A WebRTC data-channel peer, exposing only the surface `MeshPeer` uses.
 * `simple-peer`'s `Instance` satisfies it; the harness provides a fake.
 */
export interface PeerTransport {
  on(event: "signal", listener: (data: PeerSignalData) => void): this;
  on(event: "connect", listener: () => void): this;
  on(event: "data", listener: (chunk: unknown) => void): this;
  on(event: "close", listener: () => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  signal(data: PeerSignalData): void;
  send(data: string): void;
  destroy(): void;
}

export type PeerFactory = (opts: PeerFactoryOptions) => PeerTransport;
