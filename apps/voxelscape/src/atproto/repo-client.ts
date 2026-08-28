// The record-level atproto surface subsystems build on: exactly the four
// `com.atproto.repo.*` calls the multiplayer mesh makes for presence and the
// signal mailbox. Declaring it as its own interface is what lets the mesh's
// harness stand in for the network entirely — no XRPC, no OAuth, no accounts —
// while the app passes `createAtprotoRepoClient` over a signed-in
// `@atcute/client` `Client`.
//
// Routing matters: atcute's OAuth user-agent pins every request to the
// signed-in account's own PDS (`session.info.aud`), which is right for the
// mesh's own records but wrong for reading a peer's — their repo lives on
// their own PDS, and asking the local PDS for it comes back RecordNotFound.
// So each call resolves which PDS actually hosts `repo`: the authenticated
// client for this account, or a cloned, anonymous client aimed at the peer's
// PDS (presence and signal records are public).
import { ok, simpleFetchHandler, type Client } from "@atcute/client";
import type { ActorIdentifier, Nsid, RecordKey } from "@atcute/lexicons";

/**
 * Repos, collections, and record keys are plain strings here rather than
 * atcute's syntactic subtypes: every one the mesh passes came out of a
 * presence record or the relay, so it is already whatever the network said it
 * was, and a stand-in implementation shouldn't have to mint branded values.
 * `createAtprotoRepoClient` is where they re-enter the validated world.
 */
export interface AtprotoRepoClient {
  putRecord(params: {
    repo: string;
    collection: string;
    rkey: string;
    record: { [_ in string]: unknown };
  }): Promise<void>;
  /** Rejects when the record does not exist, as the XRPC call does. */
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
  }): Promise<{ records: Array<{ value: unknown }>; cursor?: string }>;
  deleteRecord(params: {
    repo: string;
    collection: string;
    rkey: string;
  }): Promise<void>;
}

/** Adapts a signed-in XRPC client to `AtprotoRepoClient`, routing each call to the repo's own PDS. */
export const createAtprotoRepoClient = (params: {
  /** The authenticated client, pinned to the signed-in account's own PDS. */
  client: Client;
  /** The signed-in account's DID; calls against it use `client` as-is. */
  selfDid: string;
  /** Resolves a DID to its `#atproto` PDS service endpoint (see `AtprotoController`). */
  resolveService: (did: string) => Promise<string>;
}): AtprotoRepoClient => {
  const { client, selfDid, resolveService } = params;

  /** The client that should perform a call against `repo`'s records. */
  const forRepo = async (repo: string): Promise<Client> => {
    if (repo === selfDid) {
      return client;
    }
    const service = await resolveService(repo);
    return client.clone({ handler: simpleFetchHandler({ service }) });
  };

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
  };
};
