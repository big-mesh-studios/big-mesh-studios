// The multiplayer mesh controller: publishes the player's coarse presence to
// their own atproto repo, discovers every repo that holds a presence record
// (via the public relay's `listReposByCollection`), selects the handful of
// nearest peers worth a WebRTC connection, and owns the connection lifecycle
// for those peers (`MeshPeer`) plus the rendered remote avatars
// (`RemotePlayers`). A plain domain object: it knows about atproto, the
// roster and the player; it knows nothing about renderers or a console, and
// hands its avatars over as a group rather than reaching into a scene.
import { Group } from "@random-mesh/rmsl/scene";
import type { PerspectiveCamera } from "@random-mesh/rmsl/scene";
import type { AtprotoRepoClient } from "../atproto/repo-client";
import { MeshPeer } from "./mesh-peer";
import type { EditItem, MonsterUpdate } from "./messages";
import type { Pose, PoseMessage } from "./pose";
import {
  PRESENCE_COLLECTION,
  PRESENCE_RKEY,
  isPresenceRecord,
  makePresence,
  type PresenceRecord,
} from "./presence";
import { RemotePlayers } from "./remote-players";
import {
  CLUSTER_DEFAULTS,
  rosterFromPresences,
  selectNeighbors,
  type ClusterOptions,
  type ClusterSelection,
  type RosterEntry,
} from "./roster";
import type {
  PeerTransport,
  SignalingFactory,
  SignalingRemote,
  SignalingTransport,
} from "./transport";

export type MultiplayerStatus = "off" | "online" | "error";

/** Result of fetching one repo's presence record during a discovery pass. */
export type PresenceFetchResult =
  | { did: string; ok: true; record: PresenceRecord }
  | { did: string; ok: false; error: string };

/** One row of the discovery telemetry `describeDebug` reports. */
export interface DiscoveryFetchEntry {
  did: string;
  ok: boolean;
  /** True when the DID was this player's own repo (skipped, never fetched). */
  self?: boolean;
  updatedAt?: number;
  error?: string;
}

/** What the last discovery pass saw, for `/multiplayer debug`. */
export interface DiscoveryTelemetry {
  at: number;
  /** The raw DIDs `listReposByCollection` returned from the relay. */
  relayDids: string[];
  fetched: DiscoveryFetchEntry[];
}

/** How often the player's coarse presence is re-published, ms. */
const PRESENCE_INTERVAL_MS = 20_000;
/** Never publish presence more often than this, even when moving, ms. */
const PRESENCE_MIN_REPUBLISH_MS = 2_000;
/** Horizontal move (world units) that marks the presence dirty and republishes. */
const PRESENCE_MOVE_EPS = 4;
/** How often the discovery poll re-scans the relay for presence repos, ms. */
const DISCOVER_INTERVAL_MS = 15_000;
/** Cap on repos pulled per discovery pass (protects the relay and our quota). */
const DISCOVER_MAX_REPOS = 200;
/** Public relay base URL; the one global view of every repo's public records. */
const DEFAULT_RELAY = "https://bsky.network";
/** Pose send interval while moving, and the idle heartbeat, ms. */
const POSE_INTERVAL_MOVING_MS = 150;
const POSE_INTERVAL_IDLE_MS = 2_000;
/** Horizontal move (world units) that counts as "moving" for the send rate. */
const POSE_MOVE_EPS = 1;
/** How long to wait before re-attempting a peer whose handshake failed, ms. */
const PEER_RETRY_COOLDOWN_MS = 30_000;

export interface MultiplayerParams {
  /** The signed-in record client, or undefined while anonymous (never captured, always asked). */
  getRepoClient: () => AtprotoRepoClient | undefined;
  /** The signed-in DID, or null. */
  getDid: () => string | null;
  /** Terrain seed, written into presence records so peers sanity-check the world. */
  seed: number | null;
  /** The player's current pose, asked each publish/selection/send pass. */
  getPose: () => Pose;
  /**
   * The signaling factory; the app supplies PeerJS's cloud signaling, a
   * harness an in-memory registry. Created once per `start`, owned here.
   */
  createSignaling: SignalingFactory;
  /** Camera the avatar labels billboard toward (omitted in headless harness runs). */
  camera?: PerspectiveCamera;
  /** Public relay base URL for global collection discovery (defaults to the main relay). */
  relay?: string;
  /**
   * In-process discovery directory, used by the harness in place of the
   * relay's `listReposByCollection` fetch. Defaults to the public relay.
   */
  fetchDirectory?: (collection: string) => Promise<string[]>;
  /**
   * Resolves a peer's DID to the handle to write on their avatar, or to null
   * when their account has no confirmed handle. Omitted in headless harness
   * runs and while nothing can resolve handles, leaving avatars labelled by
   * DID.
   */
  resolveHandle?: (did: string) => Promise<string | null>;
  /**
   * Resolves a peer's DID to the bytes of the picture their account shows for
   * itself, or to null when it shows none. Omitted in headless harness runs,
   * leaving cubes their assigned colour.
   */
  resolvePicture?: (did: string) => Promise<Blob | null>;
  /** Receives every pose a peer sends, for headless verification of the mesh. */
  onRemotePose?: (did: string, pose: PoseMessage) => void;
  /**
   * Receives every optimistic edit broadcast a peer sends, for headless
   * verification and (in the app) for applying straight to the edit overlay.
   */
  onRemoteEdits?: (did: string, edits: EditItem[]) => void;
  /**
   * Receives every monster-state broadcast a peer sends, for headless
   * verification and (in the app) for handing to the monster controller.
   */
  onRemoteMonsters?: (did: string, updates: MonsterUpdate[]) => void;
  /** Overrides for the cluster-selection tuning (tests use this to disable hysteresis). */
  clusterOptions?: Partial<ClusterOptions>;
}

export class MultiplayerController {
  private readonly getRepoClient: () => AtprotoRepoClient | undefined;
  private readonly getDid: () => string | null;
  private readonly seed: number | null;
  private readonly getPose: () => Pose;
  private readonly createSignaling: SignalingFactory;
  private readonly relay: string;
  private readonly fetchDirectory: (collection: string) => Promise<string[]>;
  private readonly resolveHandle:
    ((did: string) => Promise<string | null>) | undefined;
  private readonly resolvePicture:
    ((did: string) => Promise<Blob | null>) | undefined;
  private readonly onRemotePose: (did: string, pose: PoseMessage) => void;
  private readonly onRemoteEdits: (did: string, edits: EditItem[]) => void;
  private readonly onRemoteMonsters: (
    did: string,
    updates: MonsterUpdate[],
  ) => void;
  private readonly clusterOptions: Partial<ClusterOptions>;
  /**
   * Every connected peer's avatar, for the scene to place in its draw order.
   * Stays empty in headless runs, which have no camera to billboard labels at.
   */
  readonly avatars: Group;
  private readonly remotePlayers: RemotePlayers | undefined;

  private running = false;
  private status_: MultiplayerStatus = "off";
  private lastError: string | null = null;

  private signaling: SignalingTransport | undefined;
  private joinCode: string | undefined;

  private roster: RosterEntry[] = [];
  private selection: ClusterSelection | undefined;
  private lastDiscovery: DiscoveryTelemetry | undefined;
  private readonly peers = new Map<string, MeshPeer>();
  /**
   * Incoming connections awaiting selection confirmation, so a connection from
   *  a peer whose selection ran ahead of ours isn't dropped — but also doesn't
   *  count toward the degree bound until we confirm we want it.
   */
  private readonly pendingConnections = new Map<
    string,
    { transport: PeerTransport; since: number }
  >();
  private readonly failedAt = new Map<string, number>();
  private peerCount = 0;
  private poseSeq = 0;
  private editSeq = 0;
  private monsterSeq = 0;
  private editsSent = 0;
  private editsReceived = 0;
  private monstersSent = 0;
  private monstersReceived = 0;

  private lastPresenceAt = 0;
  private lastPresenceX = 0;
  private lastPresenceZ = 0;
  private lastSendAt = 0;
  private lastSendX = 0;
  private lastSendZ = 0;
  private presenceTimer: ReturnType<typeof setInterval> | undefined;
  private discoverTimer: ReturnType<typeof setInterval> | undefined;

  constructor(params: MultiplayerParams) {
    this.getRepoClient = params.getRepoClient;
    this.getDid = params.getDid;
    this.seed = params.seed;
    this.getPose = params.getPose;
    this.createSignaling = params.createSignaling;
    this.relay = params.relay ?? DEFAULT_RELAY;
    this.fetchDirectory = params.fetchDirectory ?? this.relayFetchDirectory;
    this.resolveHandle = params.resolveHandle;
    this.resolvePicture = params.resolvePicture;
    this.onRemotePose = params.onRemotePose ?? (() => {});
    this.onRemoteEdits = params.onRemoteEdits ?? (() => {});
    this.onRemoteMonsters = params.onRemoteMonsters ?? (() => {});
    this.clusterOptions = params.clusterOptions ?? {};
    this.remotePlayers =
      params.camera !== undefined
        ? new RemotePlayers({ camera: params.camera })
        : undefined;
    this.avatars = this.remotePlayers?.avatars ?? new Group();
  }

  get status(): MultiplayerStatus {
    return this.status_;
  }

  /** The number of other players currently within reach of the selection window. */
  get rosterSize(): number {
    return this.roster.length;
  }

  /** The number of live peer connections. */
  get connections(): number {
    return this.peerCount;
  }

  /** The DIDs of the peers this player currently has an open link to. */
  connectedDids(): string[] {
    const out: string[] = [];
    for (const [did, peer] of this.peers) {
      if (peer.connected) {
        out.push(did);
      }
    }
    return out.sort();
  }

  /**
   * Every connected peer's live position, for callers that need to know where
   * the other players are (monsters chase and choose owners among them).
   */
  peerPositions(): Array<{ did: string; x: number; z: number }> {
    return this.remotePlayers?.positions() ?? [];
  }

  /**
   * Starts the mesh: publishes presence immediately, then keeps presence and
   * discovery ticking on their own timers. Requires a signed-in account.
   */
  async start(): Promise<string> {
    if (this.running) {
      return `multiplayer already online (${this.describeState()})`;
    }
    const repoClient = this.getRepoClient();
    const did = this.getDid();
    if (repoClient === undefined || did === null) {
      return "multiplayer requires atproto — use /connect first";
    }
    this.running = true;
    this.status_ = "online";
    this.lastError = null;

    // One signaling registration per session. Its join code goes into this
    // player's presence, so peers can find them; incoming connections are
    // accepted whether or not selection has gotten around to opening them.
    this.signaling = this.createSignaling({ selfDid: did });
    this.signaling.onOpen((joinCode) => {
      this.joinCode = joinCode;
      void this.publishPresenceTick();
    });
    this.signaling.onConnection((remote, transport) =>
      this.handleIncomingConnection(remote, transport),
    );
    this.signaling.onError((err) => this.fail(err));

    const now = Date.now();
    this.lastPresenceAt = 0; // force an immediate publish
    await this.publishPresence(repoClient, did, now);
    this.presenceTimer = setInterval(
      () => void this.publishPresenceTick(),
      PRESENCE_INTERVAL_MS,
    );
    await this.refreshDiscovery(now);
    this.discoverTimer = setInterval(
      () => void this.refreshDiscovery(Date.now()),
      DISCOVER_INTERVAL_MS,
    );
    return `multiplayer online — discovering nearby players`;
  }

  /** Stops the mesh: timers, presence record, roster, peers, and avatars all cleared. */
  async stop(): Promise<string> {
    if (!this.running) {
      return "multiplayer is off";
    }
    this.running = false;
    if (this.presenceTimer !== undefined) {
      clearInterval(this.presenceTimer);
      this.presenceTimer = undefined;
    }
    if (this.discoverTimer !== undefined) {
      clearInterval(this.discoverTimer);
      this.discoverTimer = undefined;
    }
    for (const peer of this.peers.values()) {
      peer.close("multiplayer stopped");
    }
    this.peers.clear();
    for (const pending of this.pendingConnections.values()) {
      pending.transport.destroy();
    }
    this.pendingConnections.clear();
    this.failedAt.clear();
    this.peerCount = 0;
    this.roster = [];
    this.selection = undefined;
    this.signaling?.destroy();
    this.signaling = undefined;
    this.joinCode = undefined;
    this.remotePlayers?.clear();
    this.status_ = "off";
    this.lastError = null;
    // Best-effort: delete the presence record so discovery stops listing us.
    const repoClient = this.getRepoClient();
    const did = this.getDid();
    if (repoClient !== undefined && did !== null) {
      try {
        await repoClient.deleteRecord({
          repo: did,
          collection: PRESENCE_COLLECTION,
          rkey: PRESENCE_RKEY,
        });
      } catch {
        // a leftover presence record is harmless; it ages out via the TTL
      }
    }
    return "multiplayer stopped";
  }

  /**
   * Called once per frame: keeps presence fresh on movement, broadcasts the
   * player's pose to open peers at a deliberately low rate, and eases the
   * remote avatars toward their received poses.
   */
  tick(dt: number): void {
    if (!this.running) {
      return;
    }
    const now = Date.now();
    const pose = this.getPose();

    const presenceMoved =
      (pose.x - this.lastPresenceX) ** 2 + (pose.z - this.lastPresenceZ) ** 2;
    if (
      presenceMoved >= PRESENCE_MOVE_EPS ** 2 &&
      now - this.lastPresenceAt >= PRESENCE_MIN_REPUBLISH_MS
    ) {
      this.lastPresenceX = pose.x;
      this.lastPresenceZ = pose.z;
      void this.publishPresenceTick(now);
    }

    const sendMoved =
      (pose.x - this.lastSendX) ** 2 + (pose.z - this.lastSendZ) ** 2;
    const interval =
      sendMoved >= POSE_MOVE_EPS ** 2
        ? POSE_INTERVAL_MOVING_MS
        : POSE_INTERVAL_IDLE_MS;
    if (now - this.lastSendAt >= interval) {
      this.lastSendAt = now;
      this.lastSendX = pose.x;
      this.lastSendZ = pose.z;
      const seq = ++this.poseSeq;
      for (const peer of this.peers.values()) {
        peer.sendPose(pose, seq);
      }
    }

    this.remotePlayers?.tick(dt);
  }

  /**
   * Broadcasts a batch of voxel edits to every open peer. The receiver applies
   * them to its edit overlay immediately (last-write-wins by edit time); this
   * is the optimistic path, and atproto sync remains the source of truth.
   * No-op while the mesh is offline.
   */
  broadcastEdits(edits: EditItem[]): void {
    if (!this.running || edits.length === 0) {
      return;
    }
    const seq = ++this.editSeq;
    this.editsSent += edits.length;
    for (const peer of this.peers.values()) {
      peer.sendEdits(edits, seq);
    }
  }

  /**
   * Broadcasts the monsters this player simulates to every open peer. The
   * receiver renders them optimistically, dead-reckoning between broadcasts;
   * atproto sync (a later phase) remains the source of truth. No-op while the
   * mesh is offline.
   */
  broadcastMonsters(updates: MonsterUpdate[]): void {
    if (!this.running || updates.length === 0) {
      return;
    }
    const seq = ++this.monsterSeq;
    this.monstersSent += updates.length;
    for (const peer of this.peers.values()) {
      peer.sendMonsters(updates, seq);
    }
  }

  describe(): string {
    const state = this.describeState();
    return `multiplayer: ${state}${
      this.lastError !== null ? ` — ${this.lastError}` : ""
    }`;
  }

  /**
   * A multi-line dump of the mesh's internals, for `/multiplayer debug`: what
   * the relay actually returned for discovery, which of those fetches failed
   * and why, the roster with record ages, the current selection, and each
   * peer's handshake state. This is how a status line like "2 nearby, 0
   * connected" is decomposed into its causes.
   */
  describeDebug(): string {
    const lines: string[] = [];
    lines.push(`state: ${this.describeState()}`);
    lines.push(
      `did: ${this.getDid() ?? "none"}  joinCode: ${
        this.joinCode ?? "none"
      }  relay: ${this.relay}  seed: ${this.seed ?? "none"}`,
    );

    const discovery = this.lastDiscovery;
    if (discovery === undefined) {
      lines.push("discovery: no pass yet");
    } else {
      const age = Math.round((Date.now() - discovery.at) / 1000);
      lines.push(
        `discovery: ${age}s ago — relay returned ${discovery.relayDids.length} DID(s) for ${PRESENCE_COLLECTION}`,
      );
      for (const did of discovery.relayDids) {
        lines.push(`  relay listed: ${did}`);
      }
      for (const f of discovery.fetched) {
        if (f.self === true) {
          lines.push(`  fetch: ${f.did} (self, skipped)`);
        } else if (f.ok) {
          const recordAge =
            f.updatedAt !== undefined
              ? `${Math.round((Date.now() - f.updatedAt) / 1000)}s old`
              : "?";
          lines.push(`  fetch: ${f.did} ok, ${recordAge}`);
        } else {
          lines.push(`  fetch: ${f.did} FAILED — ${f.error ?? "unknown"}`);
        }
      }
    }

    lines.push(`roster (${this.roster.length} other player(s)):`);
    for (const e of this.roster) {
      lines.push(
        `  ${e.did} at (${e.x}, ${e.z}) ${Math.round(
          (Date.now() - e.updatedAt) / 1000,
        )}s old`,
      );
    }

    const selection = this.selection;
    if (selection === undefined) {
      lines.push("selection: none yet");
    } else {
      lines.push(
        `selection: target=[${selection.target.join(", ")}] candidates=[${selection.candidates.join(", ")}] connect=[${selection.connect.join(", ")}] disconnect=[${selection.disconnect.join(", ")}]`,
      );
    }

    lines.push(`peers (${this.peers.size}):`);
    for (const [did, peer] of this.peers) {
      lines.push(`  ${did}: ${peer.describe()}`);
    }
    lines.push(`edits: ${this.editsSent} sent, ${this.editsReceived} received`);
    lines.push(
      `monsters: ${this.monstersSent} sent, ${this.monstersReceived} received`,
    );
    lines.push(`lastError: ${this.lastError ?? "none"}`);
    return lines.join("\n");
  }

  dispose(): void {
    void this.stop();
  }

  private describeState(): string {
    if (!this.running) {
      return "off";
    }
    const selected = this.selection?.target.length ?? 0;
    const truncated = this.selection?.truncated ?? false;
    return `online, ${this.roster.length} player(s) nearby, ${selected} selected${
      truncated ? "+" : ""
    }, ${this.peerCount} connected`;
  }

  private async publishPresenceTick(now = Date.now()): Promise<void> {
    if (!this.running) {
      return;
    }
    const repoClient = this.getRepoClient();
    const did = this.getDid();
    if (repoClient === undefined || did === null) {
      return;
    }
    await this.publishPresence(repoClient, did, now);
  }

  private async publishPresence(
    repoClient: AtprotoRepoClient,
    did: string,
    now: number,
  ): Promise<void> {
    const pose = this.getPose();
    this.lastPresenceAt = now;
    this.lastPresenceX = pose.x;
    this.lastPresenceZ = pose.z;
    try {
      await repoClient.putRecord({
        repo: did,
        collection: PRESENCE_COLLECTION,
        rkey: PRESENCE_RKEY,
        record: makePresence(
          pose.x,
          pose.y,
          pose.z,
          this.seed,
          now,
          this.joinCode,
        ) as unknown as {
          [_ in string]: unknown;
        },
      });
    } catch (err) {
      this.fail(err);
    }
  }

  /**
   * Re-scans the relay for every repo holding a presence record, fetches each
   * one's latest presence, and re-runs cluster selection. Fatal only to
   * discovery: presence publishing keeps going if the relay is unreachable.
   * The roster excludes this player's own repo, so "N player(s) nearby" counts
   * only other players.
   */
  private async refreshDiscovery(now: number): Promise<void> {
    if (!this.running) {
      return;
    }
    try {
      const dids = await this.fetchPresenceRepos();
      const selfDid = this.getDid();
      const fetched: DiscoveryFetchEntry[] = [];
      const entries: Array<{ did: string; record: PresenceRecord }> = [];
      for (const did of dids) {
        if (did === selfDid) {
          fetched.push({ did, ok: true, self: true });
          continue;
        }
        const result = await this.fetchPresence(did);
        if (result.ok) {
          fetched.push({ did, ok: true, updatedAt: result.record.updatedAt });
          entries.push({ did, record: result.record });
        } else {
          fetched.push({ did, ok: false, error: result.error });
        }
      }
      this.lastDiscovery = { at: now, relayDids: dids, fetched };
      this.roster = rosterFromPresences(entries);
      this.applySelection(now);
    } catch (err) {
      this.fail(err);
    }
  }

  private async fetchPresenceRepos(): Promise<string[]> {
    return this.fetchDirectory(PRESENCE_COLLECTION);
  }

  /** The public-relay implementation of `fetchDirectory`. */
  private readonly relayFetchDirectory = async (
    collection: string,
  ): Promise<string[]> => {
    const url = `${this.relay}/xrpc/com.atproto.sync.listReposByCollection`;
    const dids: string[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 10 && dids.length < DISCOVER_MAX_REPOS; page++) {
      const params = new URLSearchParams({
        collection,
        limit: "100",
      });
      if (cursor !== undefined) {
        params.set("cursor", cursor);
      }
      const res = await fetch(`${url}?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`discovery relay replied ${res.status}`);
      }
      const data = (await res.json()) as {
        repos?: Array<{ did: string }>;
        cursor?: string;
      };
      for (const repo of data.repos ?? []) {
        dids.push(repo.did);
      }
      cursor = data.cursor;
      if (cursor === undefined) {
        break;
      }
    }
    return dids;
  };

  /**
   * Fetches one repo's latest presence record. Reports the failure explicitly
   * rather than collapsing to null, so `describeDebug` can tell a repo the
   * relay never served apart from a fetch that failed.
   */
  private async fetchPresence(did: string): Promise<PresenceFetchResult> {
    const repoClient = this.getRepoClient();
    if (repoClient === undefined) {
      return { did, ok: false, error: "no signed-in record client" };
    }
    try {
      const record = await repoClient.getRecord({
        repo: did,
        collection: PRESENCE_COLLECTION,
        rkey: PRESENCE_RKEY,
      });
      const value = record.value as unknown;
      if (isPresenceRecord(value)) {
        return { did, ok: true, record: value };
      }
      return { did, ok: false, error: "record malformed" };
    } catch (err) {
      return {
        did,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Opens links for every wanted (selected or candidate) peer that isn't
   * already connected or on a retry cooldown, and tears down peers that left
   * the wanted set. Roles are deterministic inside `MeshPeer` (the lower DID
   * initiates), so a peer in our candidate buffer passively accepts an offer
   * we never sent.
   */
  private applySelection(now: number): void {
    const pose = this.getPose();
    const selection = selectNeighbors({
      selfDid: this.getDid() ?? "",
      selfX: pose.x,
      selfZ: pose.z,
      roster: this.roster,
      nowMs: now,
      previous: this.selection?.links ?? new Map(),
      options: this.clusterOptions,
    });
    this.selection = selection;

    const wanted = new Set([...selection.target, ...selection.candidates]);
    for (const did of wanted) {
      if (this.peers.has(did)) {
        continue;
      }
      const failedAt = this.failedAt.get(did);
      if (failedAt !== undefined && now - failedAt < PEER_RETRY_COOLDOWN_MS) {
        continue;
      }
      this.openPeer(did);
    }
    for (const did of [...this.peers.keys()]) {
      if (!wanted.has(did)) {
        this.peers.get(did)?.close("peer out of range");
      }
    }
    // Settle held incoming connections against this pass's selection: accept
    // the ones we now want, and drop the ones that were never wanted (they've
    // had a full discovery cycle to become one).
    for (const [did, pending] of this.pendingConnections) {
      if (wanted.has(did)) {
        this.pendingConnections.delete(did);
        this.acceptIncoming(did, pending.transport);
      } else if (now - pending.since >= DISCOVER_INTERVAL_MS) {
        this.pendingConnections.delete(did);
        pending.transport.destroy();
      }
    }
  }

  private openPeer(did: string): void {
    const selfDid = this.getDid();
    const signaling = this.signaling;
    if (selfDid === null || signaling === undefined) {
      return;
    }
    const initiator = selfDid < did;
    if (initiator) {
      // The lower DID initiates: connect to the peer's signaling join code,
      // which their presence record carried. Without one (their session
      // hasn't registered yet) this pass skips them; discovery retries.
      const joinCode = this.roster.find((e) => e.did === did)?.joinCode;
      if (joinCode === undefined) {
        return;
      }
      try {
        const transport = signaling.connect(joinCode, { did: selfDid });
        this.peers.set(
          did,
          new MeshPeer({
            did,
            selfDid,
            transport,
            ...this.peerHandlers(),
          }),
        );
      } catch (err) {
        this.lastError = `${err instanceof Error ? err.message : String(err)}`;
      }
    } else {
      // The higher DID waits: register the slot now so an incoming
      // connection for this peer has somewhere to attach.
      this.peers.set(
        did,
        new MeshPeer({ did, selfDid, ...this.peerHandlers() }),
      );
    }
  }

  /**
   * The shared MeshPeer callbacks, bound to this controller's bookkeeping.
   * `opened` is captured per peer so a failure before the channel ever opened
   * goes onto the retry cooldown while a clean teardown does not.
   */
  private peerHandlers(): {
    onOpen: (d: string) => void;
    onPose: (d: string, pose: PoseMessage) => void;
    onEdits: (d: string, edits: EditItem[]) => void;
    onMonsters: (d: string, updates: MonsterUpdate[]) => void;
    onClose: (d: string) => void;
    onError: (d: string, message: string, code?: string) => void;
  } {
    let opened = false;
    return {
      onOpen: (d) => {
        opened = true;
        this.failedAt.delete(d);
        this.peerCount++;
        void this.nameAvatar(d);
        void this.faceAvatar(d);
      },
      onPose: (d, pose) => {
        this.remotePlayers?.update(d, pose);
        this.onRemotePose(d, pose);
      },
      onEdits: (d, edits) => {
        this.editsReceived += edits.length;
        this.onRemoteEdits(d, edits);
      },
      onMonsters: (d, updates) => {
        this.monstersReceived += updates.length;
        this.onRemoteMonsters(d, updates);
      },
      onClose: (d) => {
        this.peerCount = Math.max(0, this.peerCount - 1);
        this.remotePlayers?.remove(d);
        this.peers.delete(d);
        if (!opened) {
          this.failedAt.set(d, Date.now());
        }
      },
      onError: (d, message, code) => {
        this.lastError = `${d}: ${message}${
          code !== undefined ? ` (${code})` : ""
        }`;
      },
    };
  }

  /**
   * Writes a newly connected peer's handle onto their avatar. Resolution is
   * a network round trip, so the avatar appears (labelled by DID) and takes
   * its name a moment later; an account whose handle cannot be confirmed, or
   * a lookup that fails outright, keeps the DID.
   */
  private async nameAvatar(did: string): Promise<void> {
    const resolveHandle = this.resolveHandle;
    const remotePlayers = this.remotePlayers;
    if (resolveHandle === undefined || remotePlayers === undefined) {
      return;
    }
    try {
      const handle = await resolveHandle(did);
      if (handle !== null) {
        remotePlayers.setHandle(did, handle);
      }
    } catch (err) {
      this.lastError = `${did}: handle lookup failed — ${
        err instanceof Error ? err.message : String(err)
      }`;
    }
  }

  /**
   * Paints a newly connected peer's profile picture onto their cube. Like the
   * handle, it lands a moment after the avatar itself; an account showing no
   * picture, or one whose server will not part with it, leaves the cube the
   * colour it was given.
   */
  private async faceAvatar(did: string): Promise<void> {
    const resolvePicture = this.resolvePicture;
    const remotePlayers = this.remotePlayers;
    if (resolvePicture === undefined || remotePlayers === undefined) {
      return;
    }
    try {
      const picture = await resolvePicture(did);
      if (picture !== null) {
        remotePlayers.setPicture(did, await createImageBitmap(picture));
      }
    } catch (err) {
      this.lastError = `${did}: picture lookup failed — ${
        err instanceof Error ? err.message : String(err)
      }`;
    }
  }

  /**
   * An incoming connection from the signaling server. The initiator's DID
   * rides along as connection metadata, so a responder accepts without having
   * to map the join code back through its roster. A peer already in the map
   * (a waiting responder slot) gets the transport attached; a peer in our
   * current selection gets a fresh link; anyone else is held — not dropped,
   * since the initiator's selection may simply have run ahead of ours — until
   * the next selection pass confirms or rejects them.
   */
  private handleIncomingConnection(
    remote: SignalingRemote,
    transport: PeerTransport,
  ): void {
    const did = remote.did;
    const selfDid = this.getDid();
    if (did === undefined || did === selfDid || selfDid === null) {
      transport.destroy();
      return;
    }
    const existing = this.peers.get(did);
    if (existing !== undefined) {
      if (existing.canAttach()) {
        existing.attach(transport);
      } else {
        transport.destroy();
      }
      return;
    }
    if (this.isWanted(did)) {
      this.acceptIncoming(did, transport);
      return;
    }
    const held = this.pendingConnections.get(did);
    if (held !== undefined) {
      transport.destroy();
    } else {
      this.pendingConnections.set(did, { transport, since: Date.now() });
    }
  }

  /** Whether `did` is currently a peer we maintain or buffer — the only peers
   *  whose connections count toward the degree bound. */
  private isWanted(did: string): boolean {
    const selection = this.selection;
    return (
      selection !== undefined &&
      (selection.target.includes(did) || selection.candidates.includes(did))
    );
  }

  /** Opens (or attaches to a waiting slot for) an incoming connection from a peer we now want. */
  private acceptIncoming(did: string, transport: PeerTransport): void {
    const selfDid = this.getDid();
    if (selfDid === null) {
      transport.destroy();
      return;
    }
    const existing = this.peers.get(did);
    if (existing !== undefined) {
      if (existing.canAttach()) {
        existing.attach(transport);
      } else {
        transport.destroy();
      }
      return;
    }
    this.peers.set(
      did,
      new MeshPeer({ did, selfDid, transport, ...this.peerHandlers() }),
    );
  }

  private fail(err: unknown): void {
    this.status_ = "error";
    this.lastError = err instanceof Error ? err.message : String(err);
  }
}

export { CLUSTER_DEFAULTS };
