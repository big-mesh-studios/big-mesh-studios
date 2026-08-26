// One WebRTC peer connection between this player and another, with the
// handshake carried over each player's atproto repo — a "signal mailbox".
// Roles are deterministic by DID (the lexicographically lower DID initiates),
// so exactly one side writes an SDP offer and the other the answer; non-trickle
// ICE gathers every candidate into that single offer/answer, so the whole
// handshake is two short records exchanged through a brief polling loop.
import type { AtprotoRepoClient } from "../atproto/repo-client";
import { decodePose, encodePose, type Pose, type PoseMessage } from "./pose";
import {
  SIGNAL_COLLECTION,
  makeSignal,
  parseSignals,
  signalRkey,
  type SignalKind,
} from "./signal";
import type { PeerFactory, PeerSignalData, PeerTransport } from "./transport";

/** How often the peer's repo is polled for the other half of the handshake. */
const SIGNAL_POLL_MS = 1_200;
/** Handshake fails (and the peer closes) if it isn't established in this long. */
const SIGNAL_TIMEOUT_MS = 20_000;

type Phase = "signaling" | "connecting" | "open" | "closed";

export interface MeshPeerParams {
  /** The signed-in record client, for reading the peer's repo and writing this player's. */
  repoClient: AtprotoRepoClient;
  selfDid: string;
  peerDid: string;
  /** The transport factory; the app supplies simple-peer, the harness a fake. */
  createPeer: PeerFactory;
  onOpen: (did: string) => void;
  onPose: (did: string, pose: PoseMessage) => void;
  onClose: (did: string) => void;
  /** Reports a fatal failure; `code` is simple-peer's `ERR_*` when there is one. */
  onError: (did: string, message: string, code?: string) => void;
}

export class MeshPeer {
  private readonly repoClient: AtprotoRepoClient;
  private readonly selfDid: string;
  private readonly peerDid: string;
  private readonly onOpen: (did: string) => void;
  private readonly onPose: (did: string, pose: PoseMessage) => void;
  private readonly onClose: (did: string) => void;
  private readonly onError: (
    did: string,
    message: string,
    code?: string,
  ) => void;
  private readonly role: "initiator" | "responder";

  private peer: PeerTransport;
  private phase: Phase = "signaling";
  private destroyed = false;
  private seq = 0;
  private lastSeq = 0;
  private startedAt = Date.now();
  private pollTimer: ReturnType<typeof setInterval> | undefined;
  private lastSignal: { kind: SignalKind; at: number } | null = null;
  private lastError: string | null = null;

  constructor(params: MeshPeerParams) {
    this.repoClient = params.repoClient;
    this.selfDid = params.selfDid;
    this.peerDid = params.peerDid;
    this.onOpen = params.onOpen;
    this.onPose = params.onPose;
    this.onClose = params.onClose;
    this.onError = params.onError;
    this.role = this.selfDid < this.peerDid ? "initiator" : "responder";

    this.peer = params.createPeer({
      initiator: this.role === "initiator",
      selfDid: this.selfDid,
      peerDid: this.peerDid,
    });
    this.peer.on("signal", (data) => void this.sendSignal(data));
    this.peer.on("connect", () => this.handleOpen());
    this.peer.on("data", (chunk) => this.handleData(chunk));
    this.peer.on("close", () => this.close("peer closed"));
    this.peer.on("error", (err) =>
      this.fail(err.message, (err as Error & { code?: string }).code),
    );

    this.pollTimer = setInterval(() => void this.poll(), SIGNAL_POLL_MS);
    void this.poll();
  }

  get connected(): boolean {
    return this.phase === "open";
  }

  /** Sends a pose to the peer (no-op until the data channel is open). */
  sendPose(pose: Pose, seq: number): void {
    if (this.destroyed || this.phase !== "open") {
      return;
    }
    try {
      this.peer.send(encodePose({ seq, t: Date.now(), ...pose }));
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
    if (this.pollTimer !== undefined) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    try {
      this.peer.destroy();
    } catch {
      // destroying an already-closed peer throws; nothing left to clean
    }
    void reason;
    this.onClose(this.peerDid);
  }

  /** A one-line snapshot of this peer's handshake state, for `/multiplayer debug`. */
  describe(): string {
    const up = Math.round((Date.now() - this.startedAt) / 1000);
    const signal =
      this.lastSignal !== null
        ? `${this.lastSignal.kind}@${Math.round((Date.now() - this.lastSignal.at) / 1000)}s ago`
        : "none";
    return `role=${this.role} phase=${this.phase} up=${up}s lastSignal=${signal}${
      this.lastError !== null ? ` lastError=${this.lastError}` : ""
    }`;
  }

  private kindOf(data: PeerSignalData): SignalKind {
    if (data.type === "offer") {
      return "offer";
    }
    if (data.type === "answer" || data.type === "pranswer") {
      return "answer";
    }
    return "candidate";
  }

  /** Writes one handshake message to this player's own repo, addressed to the peer. */
  private async sendSignal(payload: unknown): Promise<void> {
    if (this.destroyed || this.phase === "closed") {
      return;
    }
    const seq = ++this.seq;
    const kind = this.kindOf(payload as PeerSignalData);
    try {
      await this.repoClient.putRecord({
        repo: this.selfDid,
        collection: SIGNAL_COLLECTION,
        rkey: signalRkey(this.peerDid, seq),
        record: makeSignal(
          this.peerDid,
          kind,
          payload,
          seq,
          Date.now(),
        ) as unknown as {
          [_ in string]: unknown;
        },
      });
      this.lastSignal = { kind, at: Date.now() };
    } catch (err) {
      this.fail(err instanceof Error ? err.message : String(err));
    }
  }

  /** Polls the peer's repo for the other half of the handshake. */
  private async poll(): Promise<void> {
    if (this.destroyed || this.phase === "closed" || this.phase === "open") {
      return;
    }
    if (Date.now() - this.startedAt > SIGNAL_TIMEOUT_MS) {
      this.fail("handshake timed out");
      return;
    }
    try {
      const page = await this.repoClient.listRecords({
        repo: this.peerDid,
        collection: SIGNAL_COLLECTION,
        limit: 50,
      });
      const values = page.records.map((record) => record.value as unknown);
      for (const signal of parseSignals(values, this.selfDid)) {
        if (signal.seq <= this.lastSeq) {
          continue;
        }
        this.lastSeq = signal.seq;
        this.lastSignal = { kind: signal.kind, at: Date.now() };
        if (this.phase === "signaling") {
          this.phase = "connecting";
        }
        this.peer.signal(signal.payload as PeerSignalData);
      }
    } catch {
      // Transient poll failures (e.g. a peer repo not yet ready) are normal;
      // the next poll retries.
    }
  }

  private handleOpen(): void {
    if (this.destroyed) {
      return;
    }
    this.phase = "open";
    if (this.pollTimer !== undefined) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    this.onOpen(this.peerDid);
  }

  private handleData(chunk: unknown): void {
    if (this.destroyed) {
      return;
    }
    const pose = decodePose(chunk);
    if (pose !== null) {
      this.onPose(this.peerDid, pose);
    }
  }

  private fail(message: string, code?: string): void {
    this.lastError = code !== undefined ? `${code}: ${message}` : message;
    this.onError(this.peerDid, message, code);
    this.close(message);
  }
}
