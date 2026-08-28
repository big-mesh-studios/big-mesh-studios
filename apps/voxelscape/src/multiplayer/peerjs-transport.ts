// The app's signaling transport: PeerJS's free cloud signaling server
// (0.peerjs.com). Signaling runs over a WebSocket to the cloud; media and data
// flow peer-to-peer over WebRTC. The join code (the PeerJS id) is derived from
// the player's DID plus a session-random suffix — so two sessions of one
// account never collide on the server — and is published in the player's
// atproto presence record, which is how peers learn it.
//
// PeerJS reports "could not connect to peer <id>" on the Peer object, not on
// the DataConnection it would have been, so a connection to an unreachable or
// stale join code is routed back to the wrapped connection here — letting the
// mesh fail that peer instead of the whole session. Only genuinely fatal
// signaling errors (server unreachable, etc.) propagate to the mesh.
import Peer from "peerjs";
import type { DataConnection } from "peerjs";
import { hashDid } from "./presence";
import type {
  PeerTransport,
  SignalingFactory,
  SignalingRemote,
} from "./transport";

/** Free public STUN servers, so most NATs can be traversed without a TURN relay. */
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

/** Peer errors that are fatal to the whole signaling session. */
const FATAL_PEER_ERRORS = new Set([
  "server-error",
  "network",
  "ssl-unavailable",
  "browser-incompatible",
]);

/** A wrapped connection with an internal fail hook for peer-level errors. */
type WrappedConnection = PeerTransport & { fail: (message: string) => void };

const wrapConnection = (conn: DataConnection): WrappedConnection => {
  const errorListeners: Array<(err: Error) => void> = [];
  let opened = false;
  // Track opening so a late "connect" listener still hears about it: the
  // responder holds an incoming connection until selection confirms the peer,
  // by which point the channel may already be open.
  conn.on("open", () => {
    opened = true;
  });
  conn.on("error", (err) => {
    for (const listener of [...errorListeners]) {
      listener(err as Error);
    }
  });
  return {
    on(event, listener) {
      // PeerJS calls a ready data channel "open"; the mesh calls it "connect".
      if (event === "connect") {
        if (opened) {
          queueMicrotask(() => (listener as () => void)());
        } else {
          conn.on("open", listener as never);
        }
      } else if (event === "error") {
        errorListeners.push(listener as (err: Error) => void);
      } else {
        conn.on(event, listener as never);
      }
      return this;
    },
    send(data: string) {
      conn.send(data);
    },
    destroy() {
      conn.close();
    },
    fail(message: string) {
      for (const listener of [...errorListeners]) {
        listener(new Error(message));
      }
    },
  };
};

export const createPeerJSSignaling: SignalingFactory = ({ selfDid }) => {
  const openListeners: Array<(joinCode: string) => void> = [];
  const connectionListeners: Array<
    (remote: SignalingRemote, transport: PeerTransport) => void
  > = [];
  const errorListeners: Array<(err: Error) => void> = [];

  let peer: Peer | undefined;
  /** remoteJoinCode -> the wrapped connection, so peer-level failures can be routed. */
  const connections = new Map<string, WrappedConnection>();

  const makeJoinCode = (): string => {
    const random = Math.random().toString(36).slice(2, 6);
    return `bms-${hashDid(selfDid)}-${random}`;
  };

  const start = (joinCode: string): void => {
    peer?.destroy();
    peer = new Peer(joinCode, {
      debug: 0,
      config: { iceServers: DEFAULT_ICE_SERVERS },
    });
    peer.on("open", (id) => {
      for (const listener of openListeners) {
        listener(id);
      }
    });
    peer.on("connection", (conn) => {
      const metadata = conn.metadata as { did?: string } | undefined;
      for (const listener of connectionListeners) {
        listener(
          { joinCode: conn.peer, did: metadata?.did },
          wrapConnection(conn),
        );
      }
    });
    peer.on("error", (err) => {
      if (err.type === "unavailable-id") {
        // The join code was already taken (a concurrent session of this
        // account); re-register under a fresh one rather than failing the mesh.
        start(makeJoinCode());
        return;
      }
      if (err.type === "peer-unavailable") {
        // `peer.connect` to an id nobody holds errors here, not on the
        // connection — route it back so the affected peer fails and retries.
        const remote = err.message.match(/connect to peer (\S+)/)?.[1];
        const connection =
          remote !== undefined ? connections.get(remote) : undefined;
        if (connection !== undefined) {
          connection.fail(err.message);
        }
        return;
      }
      if (FATAL_PEER_ERRORS.has(err.type)) {
        for (const listener of errorListeners) {
          listener(err);
        }
      }
    });
  };

  start(makeJoinCode());

  return {
    onOpen(listener) {
      openListeners.push(listener);
    },
    onConnection(listener) {
      connectionListeners.push(listener);
    },
    onError(listener) {
      errorListeners.push(listener);
    },
    connect(remoteJoinCode, metadata) {
      if (peer === undefined) {
        throw new Error("signaling not started");
      }
      const conn = peer.connect(remoteJoinCode, { metadata });
      const wrapped = wrapConnection(conn);
      connections.set(remoteJoinCode, wrapped);
      return wrapped;
    },
    destroy() {
      connections.clear();
      peer?.destroy();
      peer = undefined;
    },
  };
};
