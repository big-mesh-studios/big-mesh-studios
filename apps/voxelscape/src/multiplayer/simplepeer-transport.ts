// The default WebRTC transport factory: wraps simple-peer's self-contained
// browser bundle (see `simplepeer.d.ts`). Lives in its own module so nothing
// else imports the bundle — the mesh only ever sees the `PeerTransport`
// interface, and the harness test can run without touching WebRTC at all.
import SimplePeer from "simple-peer/simplepeer.min.js";
import type { PeerFactory, PeerSignalData, PeerTransport } from "./transport";

/** Free public STUN servers, so most NATs can be traversed without a TURN relay. */
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

export const createSimplePeerTransport: PeerFactory = (opts) => {
  const peer = new SimplePeer({
    initiator: opts.initiator,
    trickle: false,
    config: { iceServers: DEFAULT_ICE_SERVERS },
  });
  return {
    on(event, listener) {
      peer.on(event, listener as never);
      return this;
    },
    signal(data: PeerSignalData): void {
      peer.signal(data);
    },
    send(data: string): void {
      peer.send(data);
    },
    destroy(): void {
      peer.destroy();
    },
  } as PeerTransport;
};
