// The world's edit-chunk sync, and the console's view of who is signed in.
// Being signed in is the session's own business; this holds one and adds what
// the world does with it — uploading and fetching `app.bms.voxelscape.edit`
// records, with the pure record logic in `edits.ts`. A plain domain object: it
// knows about the network and the edit overlay, not about renderers or a
// console.
import type { Did } from "@atcute/lexicons";
import {
  createIdentityLookup,
  type IdentityLookup,
} from "@big-mesh-studios/atproto/identity";
import { listAllRecords } from "@big-mesh-studios/atproto/repo-client";
import type {
  AtprotoBlobClient,
  AtprotoRepoClient,
} from "@big-mesh-studios/atproto/repo-client";
import {
  createAtprotoSession,
  type AtprotoSession,
  type SessionStatus,
} from "@big-mesh-studios/atproto/session";
import { createBrowserSessionStore } from "@big-mesh-studios/atproto/session-store";
import type { EditLayer } from "../world/edit-layer";
import {
  EDIT_COLLECTION,
  groupEditsByChunk,
  makeRkey,
  mergeIntoLayer,
  recordsToEntries,
  type EditChunkRecord,
} from "./edits";
import * as oauth from "./oauth";

/** How often the automatic edit sync runs while signed in, ms. */
const SYNC_INTERVAL_MS = 60_000;

export type AtpStatus = SessionStatus;

/**
 * Wraps the edit-chunk sync onto a player's atproto repo. A single shared
 * overlay is both the source for uploads and the destination for merges, so a
 * `/account:sync` round-trip ends with the local world reflecting everyone's
 * edits. Remote edits land in the overlay only; the caller (wired via `onMerged` in
 * `App.tsx`) is what re-applies them to the ring's blocks and rebuilds their
 * mesh, keeping this object ignorant of renderers.
 */
export class AtprotoController {
  private readonly layer: EditLayer;
  private readonly seed: number | null;
  private readonly onMerged: (changed: number) => void;
  private readonly handleInput: () => string;
  private readonly identity: IdentityLookup;
  private readonly session: AtprotoSession;
  private lastUploadAt = 0;
  private syncTimer: ReturnType<typeof setInterval> | undefined;
  private syncInFlight = false;

  constructor(params: {
    layer: EditLayer;
    seed: number | null;
    /** Supplies the login handle when `/account:login` has no argument. */
    getHandle: () => string;
    /**
     * Called with the number of voxels whose id changed once an
     * `/account:sync` merge has updated the overlay, so the caller can
     * re-apply it to live blocks and rebuild the affected meshes.
     */
    onMerged?: (changed: number) => void;
    /**
     * Called once a session is adopted — at startup from a restored session,
     * or when `/account:login` finishes — so the caller can start the
     * subsystems that only exist while signed in, like the multiplayer mesh.
     */
    onConnected?: (did: Did) => void;
    /** Called after `/account:logout` drops the session. */
    onSignedOut?: () => void;
  }) {
    this.layer = params.layer;
    this.seed = params.seed;
    this.handleInput = params.getHandle;
    this.onMerged = params.onMerged ?? (() => {});
    this.identity = createIdentityLookup();
    this.session = createAtprotoSession({
      oauth,
      identity: this.identity,
      store: createBrowserSessionStore(),
      onConnected: (did) => params.onConnected?.(did as Did),
      onSignedOut: () => {
        this.stopSyncLoop();
        params.onSignedOut?.();
      },
    });
    try {
      const saved = Number(localStorage.getItem("bms.atproto.lastUploadAt"));
      if (Number.isFinite(saved)) {
        this.lastUploadAt = saved;
      }
    } catch {
      this.lastUploadAt = 0;
    }
  }

  get status(): AtpStatus {
    return this.session.state.status;
  }

  /** The authenticated account's DID, or null when signed out. */
  get did(): string | null {
    return this.session.state.did;
  }

  /** Whether a signed-in, ready-to-sync client is available. */
  get ready(): boolean {
    return this.session.repoClient !== undefined;
  }

  /**
   * The signed-in account's record client, for the subsystems that read and
   * write their own collections (the multiplayer mesh's presence and signal
   * records, a place's publish). Undefined while anonymous.
   */
  get repoClient(): (AtprotoRepoClient & AtprotoBlobClient) | undefined {
    return this.session.repoClient;
  }

  /** The handle to show for `did`, or the identifier itself when there is none. */
  resolveHandle(did: string): Promise<string | null> {
    return this.identity.handle(did);
  }

  /** The bytes of the picture an account shows for itself, or null when it shows none. */
  resolvePicture(did: string): Promise<Blob | null> {
    return this.identity.picture(did);
  }

  /**
   * Restores a stored session if this origin has one. Safe to call once at
   * startup. A popup login's own callback is finished by the callback page
   * rather than here, so a window running this is never mid-callback.
   */
  async init(): Promise<string> {
    await this.session.restore();
    const { status, did, error } = this.session.state;
    if (status === "error") {
      return `account error: ${error}`;
    }
    return did === null
      ? "not signed in"
      : `restored session for ${await this.identity.name(did)}`;
  }

  /**
   * Starts the OAuth popup login for `handle`. `handle` may be undefined, in
   * which case the configured handle getter supplies it.
   */
  async connect(handle?: string): Promise<string> {
    const target = (handle ?? this.handleInput()).trim();
    if (target === "") {
      return "provide a Bluesky handle (e.g. /account:login you.bsky.social)";
    }
    await this.session.signIn(target);
    const { status, did, error } = this.session.state;
    if (status !== "connected" || did === null) {
      return `account error: ${error}`;
    }
    return `signed in as ${await this.identity.name(did)}`;
  }

  /**
   * Uploads edits newer than the last sync as one record per 32³ chunk, then
   * fetches every edit record in the repo and merges it into the overlay
   * (last-write-wins by record timestamp). This is the authoritative, slower
   * path behind the WebRTC optimistic edits; it is guarded against concurrent
   * runs, since the automatic sync loop and `/account:sync` share it.
   */
  async sync(): Promise<string> {
    if (this.syncInFlight) {
      return "sync already running";
    }
    this.syncInFlight = true;
    try {
      return await this.runSync();
    } finally {
      this.syncInFlight = false;
    }
  }

  /**
   * Starts the automatic periodic sync (the slow source-of-truth path behind
   * the WebRTC optimistic edits). No-op once already running.
   */
  startSyncLoop(intervalMs = SYNC_INTERVAL_MS): void {
    if (this.syncTimer !== undefined) {
      return;
    }
    this.syncTimer = setInterval(() => {
      void this.sync();
    }, intervalMs);
  }

  /** Stops the automatic periodic sync. */
  stopSyncLoop(): void {
    if (this.syncTimer !== undefined) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  private async runSync(): Promise<string> {
    const client = this.session.repoClient;
    const repo = this.session.state.did;
    if (client === undefined || repo === null) {
      return "not connected — use /account:login first";
    }
    const messages: string[] = [];

    const groups = groupEditsByChunk(
      this.layer
        .snapshot()
        .filter(({ edit }) => edit.updatedAt > this.lastUploadAt),
      this.seed,
      new Date().toISOString(),
    );
    for (const record of groups.values()) {
      try {
        await client.putRecord({
          repo,
          collection: EDIT_COLLECTION,
          rkey: makeRkey(record.chunk),
          record,
        });
      } catch (err) {
        return `account error: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    if (groups.size > 0) {
      this.lastUploadAt = Date.now();
      try {
        localStorage.setItem(
          "bms.atproto.lastUploadAt",
          String(this.lastUploadAt),
        );
      } catch {
        // persistence is best-effort; a resync only re-uploads records
      }
      messages.push(`uploaded ${groups.size} edit chunk(s)`);
    }

    const fetched = (
      await listAllRecords(client, { repo, collection: EDIT_COLLECTION })
    )
      .map(({ value }) => value as EditChunkRecord)
      .filter((value) => value?.$type === EDIT_COLLECTION);
    const changed = mergeIntoLayer(this.layer, recordsToEntries(fetched));
    this.onMerged(changed);
    messages.push(
      `fetched ${fetched.length} remote record(s), ${changed} voxel(s) updated`,
    );
    return messages.join(", ");
  }

  async signOut(): Promise<string> {
    await this.session.signOut();
    return "signed out";
  }

  /**
   * One line for the console: the connection's state, whose account it is, and
   * the last error if the connection is in one. The account is named by its
   * handle once one has been resolved — signing in resolves it — and by its
   * account id until then, since resolving one has to be awaited and this
   * answers straight away.
   */
  describe(): string {
    const { status, did, error } = this.session.state;
    const named = did === null ? null : (this.identity.knownHandle(did) ?? did);
    return `account: ${status}${named !== null ? ` as ${named}` : ""}${
      status === "error" ? ` — ${error ?? "unknown error"}` : ""
    }`;
  }

  /**
   * Drops the session this controller holds. The stored session outlives it:
   * atcute's OAuth state is document-scoped module state, so a later
   * controller in the same page restores the same account through `init`.
   */
  dispose(): void {
    this.stopSyncLoop();
    this.session.dispose();
  }
}
