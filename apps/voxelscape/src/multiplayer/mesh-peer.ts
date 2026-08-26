// One WebRTC data-channel link between this player and another, established
// through the shared signaling connection (the PeerJS cloud in the app, an
// in-memory registry in the harness). Roles stay deterministic by DID — the
// lexicographically lower DID initiates the connection and the other waits
// for it — but the handshake itself is the signaling server's job, so this
// class only wires up the data channel that results. The initiator owns its
// transport from the start; the responder starts "waiting" and receives it
// via `attach` when the incoming connection arrives.
import { decodePose, encodePose, type Pose, type PoseMessage } from "./pose";
import type { PeerTransport } from "./transport";

/** How long a responder waits for the initiator's connection before giving up. */
const INCOMING_TIMEOUT_MS = 20_000;
/** How long an established-looking connection may stay connecting before giving up. */
const CONNECTING_TIMEOUT_MS = 20_000;

type Phase = "waiting" | "connecting" | "open" | "closed";

export interface MeshPeerParams {
  did: string;
  selfDid: string;
  /**
   * The data channel. Initiators have it immediately (they created it); a
   * responder gets it later, via `attach`, when the shared signaling receives
   * the incoming connection.
   */
  transport?: PeerTransport;
  onOpen: (did: string) => void;
  onPose: (did: string, pose: PoseMessage) => void;
  onClose: (did: string) => void;
  /** Reports a fatal failure; `code` is the transport's `ERR_*` when there is one. */
  onError: (did: string, message: string, code?: string) => void;
}

export class MeshPeer {
  private readonly did: string;
  private readonly selfDid: string;
  private readonly onOpen: (did: string) => void;
  private readonly onPose: (did: string, pose: PoseMessage) => void;
  private readonly onClose: (did: string) => void;
  private readonly onError: (
    did: string,
    message: string,
    code?: string,
  ) => void;
  private readonly role: "initiator" | "responder";

  private transport: PeerTransport | undefined;
  private phase: Phase = "waiting";
  private destroyed = false;
  private startedAt = Date.now();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private lastError: string | null = null;

  constructor(params: MeshPeerParams) {
    this.did = params.did;
    this.selfDid = params.selfDid;
    this.onOpen = params.onOpen;
    this.onPose = params.onPose;
    this.onClose = params.onClose;
    this.onError = params.onError;
    this.role = this.selfDid < this.did ? "initiator" : "responder";

    if (params.transport !== undefined) {
      this.attach(params.transport);
    } else {
      this.armTimer(INCOMING_TIMEOUT_MS, () =>
        this.fail("no incoming connection"),
      );
    }
  }

  get connected(): boolean {
    return this.phase === "open";
  }

  /** Whether this responder can still accept an incoming connection. */
  canAttach(): boolean {
    return !this.destroyed && this.phase === "waiting";
  }

  /** Wires a data channel onto this peer; valid only for a waiting responder. */
  attach(transport: PeerTransport): void {
    if (!this.canAttach()) {
      transport.destroy();
      return;
    }
    this.clearTimer();
    this.transport = transport;
    this.wire();
  }

  /** Sends a pose to the peer (no-op until the data channel is open). */
  sendPose(pose: Pose, seq: number): void {
    if (this.destroyed || this.phase !== "open") {
      return;
    }
    try {
      this.transport?.send(encodePose({ seq, t: Date.now(), ...pose }));
    } catch (err) {
      this.fail(err instanceof Error ? err.message : String(err));
    }
  }

  /** Tears the connection down and releases its resources. */
  close(reason = "closed"): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.phase = "closed";
    this.clearTimer();
    try {
      this.transport?.destroy();
    } catch {
      // destroying an already-closed transport throws; nothing left to clean
    }
    void reason;
    this.onClose(this.did);
  }

  /** A one-line snapshot of this link's state, for `/multiplayer debug`. */
  describe(): string {
    const up = Math.round((Date.now() - this.startedAt) / 1000);
    return `role=${this.role} phase=${this.phase} up=${up}s${
      this.lastError !== null ? ` lastError=${this.lastError}` : ""
    }`;
  }

  private wire(): void {
    this.phase = "connecting";
    this.transport?.on("connect", () => this.handleOpen());
    this.transport?.on("data", (chunk) => this.handleData(chunk));
    this.transport?.on("close", () => this.close("peer closed"));
    this.transport?.on("error", (err) =>
      this.fail(err.message, (err as Error & { code?: string }).code),
    );
    // A connection that never opens (an unreachable or stale join code, say)
    // must fail rather than hold the slot open forever.
    this.armTimer(CONNECTING_TIMEOUT_MS, () =>
      this.fail("connection did not open"),
    );
  }

  private handleOpen(): void {
    if (this.destroyed) {
      return;
    }
    this.phase = "open";
    this.clearTimer();
    this.onOpen(this.did);
  }

  private armTimer(ms: number, action: () => void): void {
    this.clearTimer();
    this.timer = setTimeout(action, ms);
  }

  private clearTimer(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private handleData(chunk: unknown): void {
    if (this.destroyed) {
      return;
    }
    const pose = decodePose(chunk);
    if (pose !== null) {
      this.onPose(this.did, pose);
    }
  }

  private fail(message: string, code?: string): void {
    this.lastError = code !== undefined ? `${code}: ${message}` : message;
    this.onError(this.did, message, code);
    this.close(message);
  }
}
