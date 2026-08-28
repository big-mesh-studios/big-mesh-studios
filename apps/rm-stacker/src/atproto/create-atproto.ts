// The editor's side of atproto: who you are signed in as, and the models kept
// in that account. Everything a view needs is here — the session, the
// account's name, and the four things you can do with a model of your own —
// and nothing about drawing is.
//
// One account's work, its own. Everything here needs a session, including the
// reads: a published model is public and could in principle be read from
// anybody's account, but the editor only ever asks after yours.
import { createSignal } from "solid-js";
import type { Dimensions3D } from "@big-mesh-studios/maths";
import { createIdentityLookup } from "@big-mesh-studios/atproto/identity";
import {
  blobUrl,
  isModelRecord,
  MODEL_COLLECTION,
  MODEL_MIME_TYPE,
  modelBlobCid,
  modelRkey,
  THUMBNAIL_MIME_TYPE,
  type ModelRecord,
  type PublishedModel,
} from "@big-mesh-studios/stacker/lexicon";
import type {
  AtprotoBlobClient,
  AtprotoRepoClient,
} from "@big-mesh-studios/atproto/repo-client";
import { createAtprotoSession } from "@big-mesh-studios/atproto/session";
import { createBrowserSessionStore } from "@big-mesh-studios/atproto/session-store";
import * as oauth from "./oauth";

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

  const identity = createIdentityLookup();

  // The session reports through a callback; these three signals are that
  // report, as the views here read it. A status of "unknown" is what the
  // session calls not having looked yet, which is what this shows as anonymous.
  const session = createAtprotoSession({
    oauth,
    identity,
    store: createBrowserSessionStore(),
    onChange(state) {
      setStatus(state.status === "unknown" ? "anonymous" : state.status);
      setError(state.error);
      setAccount((current) =>
        state.did === null
          ? null
          : current?.did === state.did
            ? current
            : { did: state.did, handle: null },
      );
    },
    async onConnected(did) {
      // The name is worth waiting for but nothing waits on it: the account is
      // signed in and usable under its DID meanwhile, and shows a handle the
      // moment one has been confirmed.
      const confirmed = await identity.handle(did);
      setAccount((current) =>
        current?.did === did ? { ...current, handle: confirmed } : current,
      );
    },
  });

  function fail(cause: unknown): never {
    const message = cause instanceof Error ? cause.message : String(cause);
    setError(message);
    setStatus(account() === null ? "error" : "connected");
    throw cause instanceof Error ? cause : new Error(message);
  }

  /** The signed-in account's record client, or a refusal explaining there is none. */
  function requireSession(): {
    client: AtprotoRepoClient & AtprotoBlobClient;
    did: string;
  } {
    const signedIn = account();

    const client = session.repoClient;

    if (client === undefined || signedIn === null) {
      throw new Error("sign in first");
    }

    return { client, did: signedIn.did };
  }

  /**
   * Every model in the account, most recently published first, skipping records
   * this editor cannot open.
   *
   * The listing itself arrives in record-key order, and a key is made from the
   * model's name, so what comes back is alphabetical and says nothing about
   * when anything was drawn. The order worth showing is by the date in the
   * record, which is why they are sorted here rather than shown as they came.
   */
  async function listOwn(): Promise<PublishedModel[]> {
    const { client, did } = requireSession();
    const models: PublishedModel[] = [];
    let cursor: string | undefined;

    do {
      const page = await client.listRecords({
        repo: did,
        collection: MODEL_COLLECTION,
        cursor,
        limit: PAGE_SIZE,
      });
      cursor = page.cursor;

      for (const { uri, value } of page.records) {
        if (isModelRecord(value)) {
          models.push({
            repo: did,
            rkey: uri.slice(uri.lastIndexOf("/") + 1),
            record: value,
          });
        }
      }
    } while (cursor !== undefined);

    return models.sort(
      (a, b) => Date.parse(b.record.createdAt) - Date.parse(a.record.createdAt),
    );
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
      return session.restore();
    },

    /** Signs in as `actor` through a popup, and stays signed in across reloads. */
    signIn(actor: string): Promise<void> {
      return session.signIn(actor);
    },

    signOut(): Promise<void> {
      return session.signOut();
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
      /** The small picture to list the model by, from `thumbnailFromSides`. */
      thumbnail?: Uint8Array;
    }): Promise<PublishedModel> {
      try {
        const { client, did } = requireSession();
        const rkey = modelRkey(params.name);
        const file = await client.uploadBlob(
          params.file.type === MODEL_MIME_TYPE
            ? params.file
            : new Blob([params.file], { type: MODEL_MIME_TYPE }),
        );
        // A picture that will not upload is not worth failing a publish over:
        // the model still lists, just without one.
        const thumbnail =
          params.thumbnail === undefined
            ? undefined
            : await client
                .uploadBlob(
                  new Blob([params.thumbnail as BlobPart], {
                    type: THUMBNAIL_MIME_TYPE,
                  }),
                )
                .catch(() => undefined);
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
          ...(thumbnail === undefined ? {} : { thumbnail }),
        };

        await client.putRecord({
          repo: did,
          collection: MODEL_COLLECTION,
          rkey,
          record,
        });
        setError(null);

        return { repo: did, rkey, record };
      } catch (cause) {
        return fail(cause);
      }
    },

    /** Every model the account has published. */
    async list(): Promise<PublishedModel[]> {
      try {
        const models = await listOwn();
        setError(null);

        return models;
      } catch (cause) {
        return fail(cause);
      }
    },

    /**
     * Where a blob belonging to `did` is served from, for a view that shows
     * pictures: the address is public and the same for every one of them, so a
     * listing resolves it once and builds its own image addresses.
     */
    async blobAddress(did: string, cid: string): Promise<string> {
      return blobUrl(await identity.service(did), did, cid);
    },

    /** The zip `model` points at, as `load` in `load-save.ts` takes it. */
    async open(model: PublishedModel): Promise<Blob> {
      try {
        const service = await identity.service(model.repo);
        const response = await fetch(
          blobUrl(service, model.repo, modelBlobCid(model.record)),
        );

        if (!response.ok) {
          throw new Error(
            `the file for "${model.record.name}" could not be read from ${service}`,
          );
        }

        const file = await response.blob();
        setError(null);

        return file;
      } catch (cause) {
        return fail(cause);
      }
    },

    /** Takes one of the account's models down. */
    async remove(rkey: string): Promise<void> {
      try {
        const session = requireSession();
        await session.client.deleteRecord({
          repo: session.did,
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
