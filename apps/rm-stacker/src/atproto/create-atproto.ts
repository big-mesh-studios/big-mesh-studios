// The editor's side of atproto: who you are signed in as, and the models that
// are read from and written to a repository. Everything a view needs is here —
// the session, the account's name, and the four things you can do with a
// published model — and nothing about drawing is.
//
// Reading never needs a session. A model's record and the zip it points at are
// both public, so somebody else's models can be listed and opened before ever
// signing in; only publishing and deleting need an account, being writes to a
// repository that is yours.
import { Client } from "@atcute/client";
import type { Did, Handle } from "@atcute/lexicons";
import { isActorIdentifier } from "@atcute/lexicons/syntax";
import {
  deleteStoredSession,
  getSession,
  listStoredSessions,
  OAuthUserAgent,
} from "@atcute/oauth-browser-client";
import { createSignal } from "solid-js";
import type { Dimensions3D } from "../maths";
import { confirmHandle } from "./handles";
import {
  createDidDocumentResolver,
  createHandleResolver,
  pdsEndpoint,
  type DidDocument,
} from "./identity";
import {
  blobUrl,
  isModelRecord,
  MODEL_COLLECTION,
  MODEL_MIME_TYPE,
  modelBlobCid,
  modelRkey,
  type ModelRecord,
  type PublishedModel,
} from "./models";
import { configureOAuthClient, signInPopup } from "./oauth";
import { createAtprotoRepoClient } from "./repo-client";

/** How many records a listing asks for at a time. */
const PAGE_SIZE = 100;

export type AtprotoStatus = "anonymous" | "connecting" | "connected" | "error";

/** The signed-in account: always a DID, and a name for it once one is confirmed. */
export interface Account {
  did: string;
  handle: string | null;
}

export function createAtproto() {
  const [status, setStatus] = createSignal<AtprotoStatus>("anonymous");
  const [account, setAccount] = createSignal<Account | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const didDocumentResolver = createDidDocumentResolver();
  const handleResolver = createHandleResolver();
  /** DID -> its resolved document, so a repository is not looked up twice. */
  const documents = new Map<string, DidDocument>();

  let agent: OAuthUserAgent | undefined;
  let repoClient = createAtprotoRepoClient({ resolveService });
  let restoring: Promise<void> | undefined;

  /** Fetches a DID's document from the directory that issues it or its own domain, once. */
  async function resolveDocument(did: string): Promise<DidDocument> {
    const cached = documents.get(did);

    if (cached !== undefined) {
      return cached;
    }

    const document = await didDocumentResolver.resolve(did as Did<"plc" | "web">);
    documents.set(did, document);

    return document;
  }

  /** The address of the server holding `did`'s repository. */
  async function resolveService(did: string): Promise<string> {
    const endpoint = pdsEndpoint(await resolveDocument(did));

    if (endpoint === undefined) {
      throw new Error(`the DID document for ${did} names no atproto server`);
    }

    return endpoint;
  }

  /**
   * The DID `actor` names. A DID is already one; anything else is taken as a
   * handle and resolved through the places its own owner controls.
   */
  async function resolveDid(actor: string): Promise<string> {
    const identifier = actor.trim().replace(/^@/, "");

    if (!isActorIdentifier(identifier)) {
      throw new Error(`"${actor}" is not an atproto handle or DID`);
    }

    return identifier.startsWith("did:")
      ? identifier
      : await handleResolver.resolve(identifier as Handle);
  }

  /** Adopts the stored session for `did`, and asks after the name to show for it. */
  async function adoptSession(did: Did): Promise<void> {
    // `allowStale` accepts an expired access token rather than blocking on a
    // refresh; the agent refreshes on the first request that needs one.
    agent = new OAuthUserAgent(await getSession(did, { allowStale: true }));
    repoClient = createAtprotoRepoClient({
      session: { client: new Client({ handler: agent }), did: agent.sub },
      resolveService,
    });
    setAccount({ did: agent.sub, handle: null });
    setError(null);
    setStatus("connected");

    // The name is worth waiting for but nothing waits on it: the account is
    // signed in and usable under its DID meanwhile, and shows a handle the
    // moment one has been confirmed.
    const confirmed = await confirmHandle({
      did: agent.sub,
      document: await resolveDocument(agent.sub),
      resolveDid: candidate => handleResolver.resolve(candidate as Handle),
    });
    setAccount(current => (current?.did === did ? { ...current, handle: confirmed } : current));
  }

  function fail(cause: unknown): never {
    const message = cause instanceof Error ? cause.message : String(cause);
    setError(message);
    setStatus(account() === null ? "error" : "connected");
    throw cause instanceof Error ? cause : new Error(message);
  }

  /** The models in `repo`, newest key first, skipping records this editor cannot open. */
  async function listRepo(repo: string): Promise<PublishedModel[]> {
    const models: PublishedModel[] = [];
    let cursor: string | undefined;

    do {
      const page = await repoClient.listRecords({
        repo,
        collection: MODEL_COLLECTION,
        cursor,
        limit: PAGE_SIZE,
      });
      cursor = page.cursor;

      for (const { uri, value } of page.records) {
        if (isModelRecord(value)) {
          models.push({ repo, rkey: uri.slice(uri.lastIndexOf("/") + 1), record: value });
        }
      }
    } while (cursor !== undefined);

    return models;
  }

  return {
    status,
    account,
    /** What went wrong in the last thing that did, for a view to show. */
    error,

    /**
     * Signs back in as whoever this browser was last signed in as, if anybody.
     * Runs at most once: the OAuth client is module-level state, configuring it
     * fetches the client metadata document, and neither is worth doing twice —
     * nor at startup, since a session only matters once somebody asks after it.
     */
    restore(): Promise<void> {
      restoring ??= (async () => {
        try {
          setStatus("connecting");
          await configureOAuthClient();
          const [stored] = listStoredSessions();

          if (stored === undefined) {
            setStatus("anonymous");
            return;
          }

          await adoptSession(stored);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause));
          setStatus("error");
        }
      })();

      return restoring;
    },

    /** Signs in as `actor` through a popup, and stays signed in across reloads. */
    async signIn(actor: string): Promise<void> {
      const identifier = actor.trim().replace(/^@/, "");

      if (!isActorIdentifier(identifier)) {
        setError(`"${actor}" is not an atproto handle or DID`);
        setStatus("error");
        return;
      }

      try {
        setStatus("connecting");
        setError(null);
        await configureOAuthClient();
        await adoptSession(await signInPopup({ identifier }));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("error");
      }
    },

    async signOut(): Promise<void> {
      try {
        await agent?.signOut();
      } catch {
        // A revoke that fails — offline, or a token the server has already
        // dropped — still has to sign this browser out, and only the session
        // store being cleared does that.
        const did = account()?.did;
        if (did !== undefined) {
          deleteStoredSession(did as Did);
        }
      }

      agent = undefined;
      repoClient = createAtprotoRepoClient({ resolveService });
      setAccount(null);
      setError(null);
      setStatus("anonymous");
    },

    /**
     * Publishes `file` — the zip the editor saves — to the signed-in account's
     * repository under a key made from `name`, and hands back the model as it
     * now reads there. Publishing under the same name again replaces what is
     * there rather than adding to it, which is how a drawing gets touched up
     * without everyone reading it having to follow a new address.
     */
    async publish(params: {
      name: string;
      file: Blob;
      dimensions: Dimensions3D;
    }): Promise<PublishedModel> {
      const signedIn = account();

      if (signedIn === null) {
        return fail(new Error("sign in before publishing a model"));
      }

      try {
        const rkey = modelRkey(params.name);
        const file = await repoClient.uploadBlob(
          params.file.type === MODEL_MIME_TYPE
            ? params.file
            : new Blob([params.file], { type: MODEL_MIME_TYPE }),
        );
        const record: ModelRecord = {
          $type: MODEL_COLLECTION,
          name: params.name,
          createdAt: new Date().toISOString(),
          file,
          dimensions: {
            width: params.dimensions.width,
            height: params.dimensions.height,
            depth: params.dimensions.depth,
          },
        };

        await repoClient.putRecord({
          repo: signedIn.did,
          collection: MODEL_COLLECTION,
          rkey,
          record,
        });
        setError(null);

        return { repo: signedIn.did, rkey, record };
      } catch (cause) {
        return fail(cause);
      }
    },

    /**
     * Every model `actor` has published, or the signed-in account's own when no
     * actor is named. Works signed out, an account's records being public.
     */
    async list(actor?: string): Promise<PublishedModel[]> {
      const named = actor?.trim() ?? "";

      try {
        const repo = named === "" ? account()?.did : await resolveDid(named);

        if (repo === undefined) {
          throw new Error("sign in, or name whose models to look for");
        }

        const models = await listRepo(repo);
        setError(null);

        return models;
      } catch (cause) {
        return fail(cause);
      }
    },

    /** The zip `model` points at, as `load` in `load-save.ts` takes it. */
    async open(model: PublishedModel): Promise<Blob> {
      try {
        const service = await resolveService(model.repo);
        const response = await fetch(blobUrl(service, model.repo, modelBlobCid(model.record)));

        if (!response.ok) {
          throw new Error(`the file for "${model.record.name}" could not be read from ${service}`);
        }

        const file = await response.blob();
        setError(null);

        return file;
      } catch (cause) {
        return fail(cause);
      }
    },

    /** Takes one of the signed-in account's own models down. */
    async remove(rkey: string): Promise<void> {
      const signedIn = account();

      if (signedIn === null) {
        return fail(new Error("sign in before taking a model down"));
      }

      try {
        await repoClient.deleteRecord({
          repo: signedIn.did,
          collection: MODEL_COLLECTION,
          rkey,
        });
        setError(null);
      } catch (cause) {
        return fail(cause);
      }
    },
  };
}
