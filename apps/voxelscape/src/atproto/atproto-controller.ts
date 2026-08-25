// atproto connection and edit-chunk sync. Owns the OAuth session
// (popup flow via `@atproto/oauth-client-browser`), the `AtpAgent` built on
// that session, and the upload/fetch of `app.bms.voxelscape.edit` records —
// see `edits.ts` for the pure record logic. A plain domain object: it knows
// about the network and the edit overlay, not about renderers or a console.
import { Agent } from "@atproto/api";
import { BrowserOAuthClient } from "@atproto/oauth-client-browser";
import type { EditLayer } from "../world/edit-layer";
import {
  EDIT_COLLECTION,
  groupEditsByChunk,
  makeRkey,
  mergeIntoLayer,
  recordsToEntries,
  type EditChunkRecord,
} from "./edits";

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

const LOOPBACK_SCOPE = "atproto transition:generic";

/**
 * A loopback client_id is self-describing: the auth server derives the
 * client's declared scope and redirect_uri from this URL's own query string
 * (see `@atproto/oauth-types`'s `parseAtprotoLoopbackClientId`), not from any
 * hosted or in-page metadata object. Encoding both here and loading via
 * `BrowserOAuthClient.load()` (which re-derives its metadata from this same
 * string) keeps client and server in agreement — building a separate
 * `clientMetadata` object by hand let the two drift apart. The redirect_uri's
 * host must be the loopback IP, not "localhost" (RFC 8252 disallows
 * "localhost" as a redirect_uri host); the dev server binds
 * `--host 127.0.0.1` so this matches regardless of how the page was loaded.
 */
const buildLoopbackClientId = (): string => {
  const port = window.location.port || "5173";
  const redirectUri = `http://127.0.0.1:${port}/oauth/callback`;
  const params = new URLSearchParams({
    redirect_uri: redirectUri,
    scope: LOOPBACK_SCOPE,
  });
  return `http://localhost?${params.toString()}`;
};

/**
 * The atproto public API endpoint used to resolve a sign-in handle to its DID
 * and PDS. The OAuth client requires either this or a custom identity
 * resolver; public.api.bsky.app resolves handles for the whole network.
 */
const HANDLE_RESOLVER = "https://public.api.bsky.app";

/**
 * Builds (loads) the OAuth client for the given options: a hosted
 * `client-metadata.json` when `clientId` is set, a loopback client for local
 * development, or the current origin's own `client-metadata.json` otherwise.
 * Standalone (not a method) so the minimal `/oauth/callback` page can
 * complete a popup login without constructing an `AtprotoController` — or
 * the rest of the app — at all.
 */
export const buildOAuthClient = async (
  options: AtpControllerOptions,
): Promise<BrowserOAuthClient> => {
  if (options.clientId !== undefined) {
    return BrowserOAuthClient.load({
      clientId: options.clientId,
      handleResolver: HANDLE_RESOLVER,
    });
  }
  if (isLoopbackEnvironment()) {
    return BrowserOAuthClient.load({
      clientId: buildLoopbackClientId(),
      handleResolver: HANDLE_RESOLVER,
    });
  }
  const metadataUrl = new URL("client-metadata.json", window.location.href)
    .href;
  return BrowserOAuthClient.load({
    clientId: metadataUrl,
    handleResolver: HANDLE_RESOLVER,
  });
};

/**
 * Wraps the edit-chunk sync onto a player's atproto repo. A single shared
 * overlay is both the source for uploads and the destination for merges, so a
 * `/sync` round-trip ends with the local world reflecting everyone's edits.
 */
export class AtprotoController {
  private readonly layer: EditLayer;
  private readonly seed: number | null;
  private readonly options: AtpControllerOptions;
  private oauth: BrowserOAuthClient | undefined;
  private agent: Agent | undefined;
  private did_: string | null = null;
  private status_: AtpStatus = "pending";
  private lastError: string | null = null;
  private lastUploadAt = 0;
  private readonly handleInput: () => string;

  constructor(params: {
    layer: EditLayer;
    seed: number | null;
    options: AtpControllerOptions;
    /** Supplies the login handle when `/connect` has no argument. */
    getHandle: () => string;
  }) {
    this.layer = params.layer;
    this.seed = params.seed;
    this.options = params.options;
    this.handleInput = params.getHandle;
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

  /** Whether a signed-in, ready-to-sync agent is available. */
  get ready(): boolean {
    return this.agent !== undefined;
  }

  /**
   * Restores any stored session, or completes a popup login callback if the
   * current URL carries OAuth parameters. Safe to call once at startup.
   */
  async init(): Promise<string> {
    try {
      this.status_ = "connecting";
      this.oauth = await this.buildClient();
      const result = await this.oauth.init();
      if (result === undefined) {
        this.status_ = "anonymous";
        return "not signed in";
      }
      // A popup is finished the moment its session is established; the parent
      // window carries on from its own `init`.
      if (typeof window !== "undefined" && window.opener) {
        window.close();
      }
      this.adoptSession(result.session);
      return `restored session for ${this.did_ ?? result.session.sub}`;
    } catch (err) {
      return this.fail(err);
    }
  }

  /**
   * Starts the OAuth popup login for `handle`. `handle` may be undefined, in
   * which case the configured handle getter supplies it.
   */
  async connect(handle?: string): Promise<string> {
    const target = handle ?? this.handleInput();
    if (target.trim() === "") {
      return "provide an atproto handle (e.g. /connect you.bsky.social)";
    }
    try {
      this.status_ = "connecting";
      this.oauth ??= await this.buildClient();
      const session = await this.oauth.signInPopup(target.trim());
      this.adoptSession(session);
      return `connected to atproto as ${this.did_}`;
    } catch (err) {
      return this.fail(err);
    }
  }

  /**
   * Uploads edits newer than the last sync as one record per 32³ chunk, then
   * fetches every edit record in the repo and merges it into the overlay
   * (last-write-wins by record timestamp).
   */
  async sync(): Promise<string> {
    if (this.agent === undefined) {
      return "not connected — use /connect first";
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
        await this.agent!.com.atproto.repo.putRecord({
          repo: this.did_!,
          collection: EDIT_COLLECTION,
          rkey: makeRkey(record.chunk),
          record: record as unknown as { [_ in string]: unknown },
        });
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

    const fetched = await this.fetchAllRecords();
    const changed = mergeIntoLayer(this.layer, recordsToEntries(fetched));
    messages.push(
      `fetched ${fetched.length} remote record(s), ${changed} voxel(s) updated`,
    );
    return messages.join(", ");
  }

  async signOut(): Promise<string> {
    try {
      if (this.oauth !== undefined && this.did_ !== null) {
        await this.oauth.revoke(this.did_);
      }
    } catch {
      // ignore — a failed revoke still drops the local session below
    }
    this.agent = undefined;
    this.did_ = null;
    this.status_ = "anonymous";
    return "signed out";
  }

  describe(): string {
    return `atproto: ${this.status_}${this.did_ !== null ? ` as ${this.did_}` : ""}${
      this.status_ === "error" ? ` — ${this.lastError ?? "unknown error"}` : ""
    }`;
  }

  dispose(): void {
    void this.oauth?.dispose();
    this.oauth = undefined;
  }

  private async buildClient(): Promise<BrowserOAuthClient> {
    return buildOAuthClient(this.options);
  }

  private adoptSession(session: {
    fetchHandler: (pathname: string, init: RequestInit) => Promise<Response>;
    sub: string;
  }): void {
    this.agent = new Agent({
      fetchHandler: (url: string, init: RequestInit) =>
        session.fetchHandler(url, init),
    });
    this.did_ = session.sub;
    this.status_ = "connected";
    this.lastError = null;
  }

  private async fetchAllRecords(): Promise<EditChunkRecord[]> {
    const agent = this.agent;
    if (agent === undefined || this.did_ === null) {
      return [];
    }
    const repo = this.did_;
    const out: EditChunkRecord[] = [];
    let cursor: string | undefined;
    do {
      const res = await agent.com.atproto.repo.listRecords({
        repo,
        collection: EDIT_COLLECTION,
        cursor,
        limit: 100,
      });
      cursor = res.data.cursor;
      for (const rec of res.data.records) {
        const value = rec.value as unknown as EditChunkRecord;
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
    return `atproto error: ${this.lastError}`;
  }
}

function isLoopbackEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}
