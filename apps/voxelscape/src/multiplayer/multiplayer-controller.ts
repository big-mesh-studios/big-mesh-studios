// The multiplayer mesh controller: publishes the player's coarse presence to
// their own atproto repo, discovers every repo that holds a presence record
// (via the public relay's `listReposByCollection`), selects the handful of
// nearest peers worth a WebRTC connection, and owns the connection lifecycle
// for those peers (`MeshPeer`) plus the rendered remote avatars
// (`RemotePlayers`). A plain domain object: it knows about atproto, the
// roster, the scene, and the player; it knows nothing about renderers or a
// console.
import type { AtprotoRepoClient } from "../atproto/repo-client";
import type { Scene } from "@random-mesh/rmsl/scene";
import type { PerspectiveCamera } from "@random-mesh/rmsl/scene";
import { MeshPeer } from "./mesh-peer";
import {
  PRESENCE_COLLECTION,
  PRESENCE_RKEY,
  isPresenceRecord,
  makePresence,
  type PresenceRecord,
} from "./presence";
import type { Pose, PoseMessage } from "./pose";
import { RemotePlayers } from "./remote-players";
import {
  CLUSTER_DEFAULTS,
  rosterFromPresences,
  selectNeighbors,
  type ClusterOptions,
  type ClusterSelection,
  type RosterEntry,
} from "./roster";
import type { PeerFactory } from "./transport";

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
  /** The transport factory; the app supplies simple-peer, a harness a fake. */
  createPeer: PeerFactory;
  /** Scene the remote avatars are added to (omitted in headless harness runs). */
  scene?: Scene;
  /** Camera the avatar labels billboard toward (omitted in headless harness runs). */
  camera?: PerspectiveCamera;
  /** Public relay base URL for global collection discovery (defaults to the main relay). */
  relay?: string;
  /**
   * In-process discovery directory, used by the harness in place of the
   * relay's `listReposByCollection` fetch. Defaults to the public relay.
   */
  fetchDirectory?: (collection: string) => Promise<string[]>;
  /** Receives every pose a peer sends, for headless verification of the mesh. */
  onRemotePose?: (did: string, pose: PoseMessage) => void;
  /** Overrides for the cluster-selection tuning (tests use this to disable hysteresis). */
  clusterOptions?: Partial<ClusterOptions>;
}

export class MultiplayerController {
  private readonly getRepoClient: () => AtprotoRepoClient | undefined;
  private readonly getDid: () => string | null;
  private readonly seed: number | null;
  private readonly getPose: () => Pose;
  private readonly createPeer: PeerFactory;
  private readonly relay: string;
  private readonly fetchDirectory: (collection: string) => Promise<string[]>;
  private readonly onRemotePose: (did: string, pose: PoseMessage) => void;
  private readonly clusterOptions: Partial<ClusterOptions>;
  private readonly remotePlayers: RemotePlayers | undefined;

  private running = false;
  private status_: MultiplayerStatus = "off";
  private lastError: string | null = null;

  private roster: RosterEntry[] = [];
  private selection: ClusterSelection | undefined;
  private lastDiscovery: DiscoveryTelemetry | undefined;
  private readonly peers = new Map<string, MeshPeer>();
  private readonly failedAt = new Map<string, number>();
  private peerCount = 0;
  private poseSeq = 0;

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
    this.createPeer = params.createPeer;
    this.relay = params.relay ?? DEFAULT_RELAY;
    this.fetchDirectory = params.fetchDirectory ?? this.relayFetchDirectory;
    this.onRemotePose = params.onRemotePose ?? (() => {});
    this.clusterOptions = params.clusterOptions ?? {};
    this.remotePlayers =
      params.scene !== undefined && params.camera !== undefined
        ? new RemotePlayers({ scene: params.scene, camera: params.camera })
        : undefined;
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
    this.failedAt.clear();
    this.peerCount = 0;
    this.roster = [];
    this.selection = undefined;
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
  tick(dt: number, pose: Pose): void {
    if (!this.running) {
      return;
    }
    const now = Date.now();

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
      `did: ${this.getDid() ?? "none"}  relay: ${this.relay}  seed: ${
        this.seed ?? "none"
      }`,
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
  }

  private openPeer(did: string): void {
    const repoClient = this.getRepoClient();
    const selfDid = this.getDid();
    if (repoClient === undefined || selfDid === null) {
      return;
    }
    let opened = false;
    const peer = new MeshPeer({
      repoClient,
      selfDid,
      peerDid: did,
      createPeer: this.createPeer,
      onOpen: (d) => {
        opened = true;
        this.failedAt.delete(d);
        this.peerCount++;
      },
      onPose: (d, pose) => {
        this.remotePlayers?.update(d, pose);
        this.onRemotePose(d, pose);
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
    });
    this.peers.set(did, peer);
  }

  private fail(err: unknown): void {
    this.status_ = "error";
    this.lastError = err instanceof Error ? err.message : String(err);
  }
}

export { CLUSTER_DEFAULTS };
