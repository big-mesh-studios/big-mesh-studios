// One WebRTC data-channel link between this player and another, established
// through the shared signaling connection (the PeerJS cloud in the app, an
// in-memory registry in the harness). Roles stay deterministic by DID — the
// lexicographically lower DID initiates the connection and the other waits
// for it — but the handshake itself is the signaling server's job, so this
// class only wires up the data channel that results. The initiator owns its
// transport from the start; the responder starts "waiting" and receives it
// via `attach` when the incoming connection arrives.
import {
  decodeMessage,
  encodeMessage,
  type EditItem,
  type PlayerDamageWire,
  type ScriptEntityUpdate,
} from "./messages";
import type { ScriptEvent } from "../places/events";
import type { Pose, PoseMessage } from "./pose";
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
  /** One optimistic edit broadcast from the peer; applied LWW by edit time. */
  onEdits: (did: string, edits: EditItem[]) => void;
  /** One script-entity broadcast from the peer, for the NPCs it owns. */
  onScriptEntities: (did: string, updates: ScriptEntityUpdate[]) => void;
  /** One batch of a peer's own script facts, for this client's script to fold in too. */
  onScriptEvents: (did: string, events: ScriptEvent[]) => void;
  /** One swing's damage from the peer, for the hit player to apply. */
  onPlayerDamage: (did: string, damage: PlayerDamageWire) => void;
  /**
   * One clock-exchange answer from the peer: `t1`-`t2` names the leg that
   * came back, so the receiver can pair it with its own send and account the
   * round trip.
   */
  onTime: (did: string, t1: number, t2: number) => void;
  onClose: (did: string) => void;
  /** Reports a fatal failure; `code` is the transport's `ERR_*` when there is one. */
  onError: (did: string, message: string, code?: string) => void;
  /**
   * The local wall clock, injected by the harness so one peer can be skewed
   * against another; the shared mesh timestamps stay on the real clock.
   */
  wallNow?: () => number;
}

export class MeshPeer {
  private readonly did: string;
  private readonly selfDid: string;
  private readonly onOpen: (did: string) => void;
  private readonly onPose: (did: string, pose: PoseMessage) => void;
  private readonly onEdits: (did: string, edits: EditItem[]) => void;
  private readonly onScriptEntities: (
    did: string,
    updates: ScriptEntityUpdate[],
  ) => void;
  private readonly onScriptEvents: (did: string, events: ScriptEvent[]) => void;
  private readonly onPlayerDamage: (
    did: string,
    damage: PlayerDamageWire,
  ) => void;
  private readonly onTime: (did: string, t1: number, t2: number) => void;
  private readonly onClose: (did: string) => void;
  private readonly onError: (
    did: string,
    message: string,
    code?: string,
  ) => void;
  private readonly wallNow: () => number;
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
    this.onEdits = params.onEdits;
    this.onScriptEntities = params.onScriptEntities;
    this.onScriptEvents = params.onScriptEvents;
    this.onPlayerDamage = params.onPlayerDamage;
    this.onTime = params.onTime;
    this.onClose = params.onClose;
    this.onError = params.onError;
    this.wallNow = params.wallNow ?? (() => Date.now());
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
      this.transport?.send(
        encodeMessage({ v: 1, type: "pose", seq, t: Date.now(), ...pose }),
      );
    } catch (err) {
      this.fail(err instanceof Error ? err.message : String(err));
    }
  }

  /** Sends an optimistic edit broadcast to the peer (no-op until open). */
  sendEdits(edits: EditItem[], seq: number): void {
    if (this.destroyed || this.phase !== "open") {
      return;
    }
    try {
      this.transport?.send(
        encodeMessage({ v: 1, type: "edit", seq, t: Date.now(), edits }),
      );
    } catch (err) {
      this.fail(err instanceof Error ? err.message : String(err));
    }
  }

  /** Sends the live-tracked script entities' state to the peer (no-op until open). */
  sendScriptEntities(updates: ScriptEntityUpdate[], seq: number): void {
    if (this.destroyed || this.phase !== "open" || updates.length === 0) {
      return;
    }
    try {
      this.transport?.send(
        encodeMessage({
          v: 1,
          type: "script-entity",
          seq,
          t: Date.now(),
          updates,
        }),
      );
    } catch (err) {
      this.fail(err instanceof Error ? err.message : String(err));
    }
  }

  /** Sends a batch of this player's own script facts to the peer (no-op until open). */
  sendScriptEvents(events: ScriptEvent[], seq: number): void {
    if (this.destroyed || this.phase !== "open" || events.length === 0) {
      return;
    }
    try {
      this.transport?.send(
        encodeMessage({
          v: 1,
          type: "script-event",
          seq,
          t: Date.now(),
          events,
        }),
      );
    } catch (err) {
      this.fail(err instanceof Error ? err.message : String(err));
    }
  }

  /** Sends a swing's damage to the peer (no-op until open). */
  sendPlayerDamage(damage: PlayerDamageWire): void {
    if (this.destroyed || this.phase !== "open") {
      return;
    }
    try {
      this.transport?.send(encodeMessage(damage));
    } catch (err) {
      this.fail(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Sends one clock exchange leg: a ping naming `t1` (local wall time when
   * sent), or an answer that also carries `t2`, the wall time the ping was
   * answered at. No-op until the data channel is open.
   */
  sendTime(t1: number, t2?: number): void {
    if (this.destroyed || this.phase !== "open") {
      return;
    }
    try {
      this.transport?.send(
        encodeMessage({
          v: 1,
          type: "time",
          t1,
          ...(t2 !== undefined ? { t2 } : {}),
        }),
      );
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

  /** A one-line snapshot of this link's state, for `/multiplayer:debug`. */
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
    const message = decodeMessage(chunk);
    if (message === null) {
      return;
    }
    if (message.type === "pose") {
      this.onPose(this.did, message);
    } else if (message.type === "edit") {
      this.onEdits(this.did, message.edits);
    } else if (message.type === "player-damage") {
      this.onPlayerDamage(this.did, message);
    } else if (message.type === "script-entity") {
      this.onScriptEntities(this.did, message.updates);
    } else if (message.type === "time") {
      if (message.t2 === undefined) {
        // A ping asks the receiver's wall time at receipt; answer in kind.
        this.sendTime(message.t1, this.wallNow());
      } else {
        this.onTime(this.did, message.t1, message.t2);
      }
    } else {
      this.onScriptEvents(this.did, message.events);
    }
  }

  private fail(message: string, code?: string): void {
    this.lastError = code !== undefined ? `${code}: ${message}` : message;
    this.onError(this.did, message, code);
    this.close(message);
  }
}
