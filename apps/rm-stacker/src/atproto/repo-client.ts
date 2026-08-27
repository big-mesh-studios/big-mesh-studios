// The record-level atproto surface the rest of the editor builds on: the
// handful of `com.atproto.repo.*` calls publishing and opening a model needs,
// behind an interface that hides which server each one has to go to.
//
// Routing is what the interface is for. atcute's OAuth user-agent pins every
// request to the signed-in account's own server, which is right for writing
// your own models and wrong for reading somebody else's — their repository
// lives on their own server, and asking yours for it comes back
// RecordNotFound. So each call works out which server actually holds `repo`:
// the authenticated client for the signed-in account, and an anonymous one
// aimed at the other account's server for everybody else. Anonymous is all a
// published model needs, being public, which is also what lets somebody browse
// another artist's models before ever signing in themselves.
import { Client, ok, simpleFetchHandler, type FetchHandler } from "@atcute/client";
import type { ActorIdentifier, Blob as LexBlob, Nsid, RecordKey } from "@atcute/lexicons";

/**
 * Repositories, collections and record keys are plain strings here rather than
 * atcute's syntactic subtypes: every one passed in came out of a record or a
 * listing, so it is already whatever the network said it was. This is where
 * they re-enter the validated world.
 */
export interface AtprotoRepoClient {
  putRecord(params: {
    repo: string;
    collection: string;
    rkey: string;
    record: { [_ in string]: unknown };
  }): Promise<void>;
  /** Rejects when the record does not exist, as the call itself does. */
  getRecord(params: {
    repo: string;
    collection: string;
    rkey: string;
  }): Promise<{ value: unknown }>;
  listRecords(params: {
    repo: string;
    collection: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ records: Array<{ uri: string; value: unknown }>; cursor?: string }>;
  deleteRecord(params: { repo: string; collection: string; rkey: string }): Promise<void>;
  /**
   * Stores `blob` on the signed-in account's own server and hands back the
   * reference a record refers to it by. A blob has to be uploaded to the
   * repository that will point at it, so this is the one call with nowhere
   * else to go: it rejects while signed out.
   */
  uploadBlob(blob: Blob): Promise<LexBlob>;
}

export interface AtprotoRepoClientOptions {
  /**
   * The authenticated client and the account it is signed in as, or undefined
   * while anonymous — in which case reads still work and writes do not.
   */
  session?: { client: Client; did: string };
  /** Resolves a DID to the address of the server holding its repository. */
  resolveService: (did: string) => Promise<string>;
}

/** Adapts atcute's client to `AtprotoRepoClient`, routing each call to the repository's own server. */
export function createAtprotoRepoClient(options: AtprotoRepoClientOptions): AtprotoRepoClient {
  const { session, resolveService } = options;

  /** The client that should perform a call against `repo`'s records. */
  async function forRepo(repo: string): Promise<Client> {
    if (session !== undefined && repo === session.did) {
      return session.client;
    }
    const service = await resolveService(repo);
    const handler: FetchHandler = simpleFetchHandler({ service });
    return session === undefined ? new Client({ handler }) : session.client.clone({ handler });
  }

  return {
    async putRecord({ repo, collection, rkey, record }) {
      const target = await forRepo(repo);
      await ok(
        target.post("com.atproto.repo.putRecord", {
          input: {
            repo: repo as ActorIdentifier,
            collection: collection as Nsid,
            rkey: rkey as RecordKey,
            record,
          },
        }),
      );
    },
    async getRecord({ repo, collection, rkey }) {
      const target = await forRepo(repo);
      const response = await ok(
        target.get("com.atproto.repo.getRecord", {
          params: {
            repo: repo as ActorIdentifier,
            collection: collection as Nsid,
            rkey: rkey as RecordKey,
          },
        }),
      );
      return { value: response.value };
    },
    async listRecords({ repo, collection, cursor, limit }) {
      const target = await forRepo(repo);
      const response = await ok(
        target.get("com.atproto.repo.listRecords", {
          params: {
            repo: repo as ActorIdentifier,
            collection: collection as Nsid,
            cursor,
            limit,
          },
        }),
      );
      return { records: response.records, cursor: response.cursor };
    },
    async deleteRecord({ repo, collection, rkey }) {
      const target = await forRepo(repo);
      await ok(
        target.post("com.atproto.repo.deleteRecord", {
          input: {
            repo: repo as ActorIdentifier,
            collection: collection as Nsid,
            rkey: rkey as RecordKey,
          },
        }),
      );
    },
    async uploadBlob(blob) {
      if (session === undefined) {
        throw new Error("sign in before publishing a model");
      }
      const response = await ok(
        session.client.post("com.atproto.repo.uploadBlob", { input: blob }),
      );
      return response.blob;
    },
  };
}
