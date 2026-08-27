// atproto connection and edit-chunk sync. Owns the OAuth session (popup flow
// via `@atcute/oauth-browser-client` — see `oauth.ts`), the `@atcute/client`
// XRPC client built on that session, and the upload/fetch of
// `app.bms.voxelscape.edit` records — see `edits.ts` for the pure record
// logic. A plain domain object: it knows about the network and the edit
// overlay, not about renderers or a console.
import { Client, ok } from "@atcute/client";
import type { Did, Handle } from "@atcute/lexicons";
import { isActorIdentifier } from "@atcute/lexicons/syntax";
import {
  deleteStoredSession,
  getSession,
  listStoredSessions,
  OAuthUserAgent,
} from "@atcute/oauth-browser-client";
import type { EditLayer } from "../world/edit-layer";
import {
  EDIT_COLLECTION,
  groupEditsByChunk,
  makeRkey,
  mergeIntoLayer,
  recordsToEntries,
  type EditChunkRecord,
} from "./edits";
import { confirmHandle } from "./handles";
import {
  createDidDocumentResolver,
  createHandleResolver,
  type DidDocument,
} from "./identity";
import { configureOAuthClient, signInPopup } from "./oauth";
import {
  pictureBlobCid,
  pictureBlobUrl,
  PROFILE_COLLECTION,
  PROFILE_RKEY,
} from "./profile";
import { createAtprotoRepoClient, type AtprotoRepoClient } from "./repo-client";

/** How often the automatic edit sync runs while signed in, ms. */
const SYNC_INTERVAL_MS = 60_000;

export interface AtpControllerOptions {
  /**
   * When set, client metadata is loaded from this hosted `client-metadata.json`
   * URL (production). When absent, a loopback client is built for the current
   * origin, which works for localhost development without a server.
   */
  clientId?: string;
}

export type AtpStatus =
  | "pending" // init not run yet
  | "anonymous"
  | "connecting"
  | "connected"
  | "error";

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
  private readonly options: AtpControllerOptions;
  private readonly onMerged: (changed: number) => void;
  private readonly onConnected: (did: Did) => void;
  private readonly onSignedOut: () => void;
  private agent: OAuthUserAgent | undefined;
  private client: Client | undefined;
  private repoClient_: AtprotoRepoClient | undefined;
  private did_: Did | null = null;
  private status_: AtpStatus = "pending";
  private lastError: string | null = null;
  private lastUploadAt = 0;
  private readonly handleInput: () => string;
  private syncTimer: ReturnType<typeof setInterval> | undefined;
  private syncInFlight = false;
  /** DID -> its resolved document, so signal polling doesn't re-resolve every pass. */
  private readonly documentCache = new Map<string, DidDocument>();
  /** DID -> its confirmed handle, or null when the account has none to show. */
  private readonly handleCache = new Map<string, string | null>();
  /** DID -> the bytes of its profile picture, or null when it shows none. */
  private readonly pictureCache = new Map<string, Blob | null>();
  private readonly didDocumentResolver = createDidDocumentResolver();
  private readonly handleResolver = createHandleResolver();

  constructor(params: {
    layer: EditLayer;
    seed: number | null;
    options: AtpControllerOptions;
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
    this.options = params.options;
    this.handleInput = params.getHandle;
    this.onMerged = params.onMerged ?? (() => {});
    this.onConnected = params.onConnected ?? (() => {});
    this.onSignedOut = params.onSignedOut ?? (() => {});
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
    return this.status_;
  }

  /** The authenticated account's DID, or null when signed out. */
  get did(): string | null {
    return this.did_;
  }

  /** Whether a signed-in, ready-to-sync client is available. */
  get ready(): boolean {
    return this.client !== undefined;
  }

  /**
   * The signed-in account's record client, for the subsystems that read and
   * write their own collections (the multiplayer mesh's presence and signal
   * records). Undefined while anonymous.
   */
  get repoClient(): AtprotoRepoClient | undefined {
    return this.repoClient_;
  }

  /**
   * Restores a stored session if this origin has one. Safe to call once at
   * startup. A popup login's own callback is finished by the callback page
   * rather than here, so a window running this is never mid-callback.
   */
  async init(): Promise<string> {
    try {
      this.status_ = "connecting";
      await configureOAuthClient(this.options.clientId);
      const [stored] = listStoredSessions();
      if (stored === undefined) {
        this.status_ = "anonymous";
        return "not signed in";
      }
      await this.adoptSession(stored);
      return `restored session for ${await this.nameFor(stored)}`;
    } catch (err) {
      return this.fail(err);
    }
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
    if (!isActorIdentifier(target)) {
      return `"${target}" is not a handle or an account id`;
    }
    try {
      this.status_ = "connecting";
      const did = await signInPopup({
        identifier: target,
        clientId: this.options.clientId,
      });
      await this.adoptSession(did);
      return `signed in as ${await this.nameFor(did)}`;
    } catch (err) {
      return this.fail(err);
    }
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
    const client = this.client;
    const repo = this.did_;
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
        await ok(
          client.post("com.atproto.repo.putRecord", {
            input: {
              repo,
              collection: EDIT_COLLECTION,
              rkey: makeRkey(record.chunk),
              record,
            },
          }),
        );
      } catch (err) {
        return this.fail(err);
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

    const fetched = await this.fetchAllRecords(client, repo);
    const changed = mergeIntoLayer(this.layer, recordsToEntries(fetched));
    this.onMerged(changed);
    messages.push(
      `fetched ${fetched.length} remote record(s), ${changed} voxel(s) updated`,
    );
    return messages.join(", ");
  }

  async signOut(): Promise<string> {
    const agent = this.agent;
    const did = this.did_;
    try {
      if (agent !== undefined) {
        await agent.signOut();
      }
    } catch {
      // A failed revoke (offline, or a token the server already dropped) still
      // has to sign this browser out, and only `signOut` clears the store.
      if (did !== null) {
        deleteStoredSession(did);
      }
    }
    this.agent = undefined;
    this.client = undefined;
    this.repoClient_ = undefined;
    this.did_ = null;
    this.status_ = "anonymous";
    this.stopSyncLoop();
    this.onSignedOut();
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
    const named =
      this.did_ === null
        ? null
        : (this.handleCache.get(this.did_) ?? this.did_);
    return `account: ${this.status_}${named !== null ? ` as ${named}` : ""}${
      this.status_ === "error" ? ` — ${this.lastError ?? "unknown error"}` : ""
    }`;
  }

  /**
   * Drops the session this controller holds. The stored session outlives it:
   * atcute's OAuth state is document-scoped module state, so a later
   * controller in the same page restores the same account through `init`.
   */
  dispose(): void {
    this.stopSyncLoop();
    this.agent = undefined;
    this.client = undefined;
    this.repoClient_ = undefined;
  }

  private async adoptSession(did: Did): Promise<void> {
    // `allowStale` accepts an expired access token rather than blocking
    // startup on a refresh; the agent refreshes on the first request that
    // needs it.
    const agent = new OAuthUserAgent(
      await getSession(did, { allowStale: true }),
    );
    this.agent = agent;
    this.client = new Client({ handler: agent });
    this.repoClient_ = createAtprotoRepoClient({
      client: this.client,
      selfDid: agent.sub,
      resolveService: (target) => this.resolveService(target),
    });
    this.did_ = agent.sub;
    this.status_ = "connected";
    this.lastError = null;
    this.onConnected(this.did_);
    this.startSyncLoop();
  }

  /**
   * Resolves a DID to its `#atproto` PDS service endpoint, for reading a
   * peer's public records (presence, signal mailbox) from the PDS that
   * actually hosts them rather than from this account's own.
   */
  private async resolveService(did: string): Promise<string> {
    const document = await this.resolveDocument(did);
    // Newer DID documents name the PDS service `#atproto_pds`; older ones
    // use `#atproto`. Accept either, falling back to a type match.
    const service =
      document.service?.find(
        (s) => s.id === "#atproto" || s.id === "#atproto_pds",
      ) ??
      document.service?.find((s) => {
        const type = Array.isArray(s.type) ? s.type : [s.type];
        return type.includes("AtprotoPersonalDataServer");
      });
    const endpoint =
      typeof service?.serviceEndpoint === "string"
        ? service.serviceEndpoint.replace(/\/+$/, "")
        : undefined;
    if (endpoint === undefined) {
      throw new Error(`no #atproto PDS service in DID document for ${did}`);
    }
    return endpoint;
  }

  /**
   * What to call `did` in a line the player reads: the handle the account
   * claims and its own server confirms, falling back to the account id when
   * it claims none or the lookup fails.
   */
  private async nameFor(did: string): Promise<string> {
    try {
      return (await this.resolveHandle(did)) ?? did;
    } catch {
      return did;
    }
  }

  /**
   * The handle to show for `did` — a peer's name over their avatar in the
   * multiplayer mesh — or null when the account has none that can be
   * confirmed, in which case the caller keeps showing the DID. Both the
   * confirmed handle and the absence of one are cached for the session, so
   * asking for the same peer's name again costs nothing.
   */
  async resolveHandle(did: string): Promise<string | null> {
    const cached = this.handleCache.get(did);
    if (cached !== undefined) {
      return cached;
    }
    const handle = await confirmHandle({
      did,
      document: await this.resolveDocument(did),
      resolveDid: (candidate) =>
        this.handleResolver.resolve(candidate as Handle),
    });
    this.handleCache.set(did, handle);
    return handle;
  }

  /**
   * The picture an account shows for itself, as the bytes an image decoder
   * takes, or null when it shows none. The record naming the picture and the
   * bytes themselves both come from the server hosting that account, so a
   * player's face is served by the same place their world edits are. Fetched
   * once per account per session, absence included.
   */
  async resolvePicture(did: string): Promise<Blob | null> {
    const cached = this.pictureCache.get(did);
    if (cached !== undefined) {
      return cached;
    }
    const picture = await this.fetchPicture(did);
    this.pictureCache.set(did, picture);
    return picture;
  }

  private async fetchPicture(did: string): Promise<Blob | null> {
    const repoClient = this.repoClient_;
    if (repoClient === undefined) {
      return null;
    }
    let record: unknown;
    try {
      record = (
        await repoClient.getRecord({
          repo: did,
          collection: PROFILE_COLLECTION,
          rkey: PROFILE_RKEY,
        })
      ).value;
    } catch {
      // An account with no profile record at all: no picture, not an error.
      return null;
    }
    const cid = pictureBlobCid(record);
    if (cid === null) {
      return null;
    }
    const service = await this.resolveService(did);
    const response = await fetch(pictureBlobUrl(service, did, cid));
    if (!response.ok) {
      return null;
    }
    return response.blob();
  }

  /** Fetches a DID's document from the PLC directory or its own domain, once per session. */
  private async resolveDocument(did: string): Promise<DidDocument> {
    const cached = this.documentCache.get(did);
    if (cached !== undefined) {
      return cached;
    }
    const document = await this.didDocumentResolver.resolve(
      did as Did<"plc" | "web">,
    );
    this.documentCache.set(did, document);
    return document;
  }

  private async fetchAllRecords(
    client: Client,
    repo: Did,
  ): Promise<EditChunkRecord[]> {
    const out: EditChunkRecord[] = [];
    let cursor: string | undefined;
    do {
      const page = await ok(
        client.get("com.atproto.repo.listRecords", {
          params: { repo, collection: EDIT_COLLECTION, cursor, limit: 100 },
        }),
      );
      cursor = page.cursor;
      for (const rec of page.records) {
        const value = rec.value as EditChunkRecord;
        if (value?.$type === EDIT_COLLECTION) {
          out.push(value);
        }
      }
    } while (cursor !== undefined);
    return out;
  }

  private fail(err: unknown): string {
    this.status_ = "error";
    this.lastError = err instanceof Error ? err.message : String(err);
    return `account error: ${this.lastError}`;
  }
}
