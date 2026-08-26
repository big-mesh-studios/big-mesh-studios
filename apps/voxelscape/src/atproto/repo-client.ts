// The record-level atproto surface subsystems build on: exactly the four
// `com.atproto.repo.*` calls the multiplayer mesh makes for presence and the
// signal mailbox. Declaring it as its own interface is what lets the mesh's
// harness stand in for the network entirely — no XRPC, no OAuth, no accounts —
// while the app passes `createAtprotoRepoClient` over a signed-in
// `@atcute/client` `Client`.
import { ok, type Client } from "@atcute/client";
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

/** Adapts a signed-in XRPC client to `AtprotoRepoClient`. */
export const createAtprotoRepoClient = (client: Client): AtprotoRepoClient => ({
  async putRecord({ repo, collection, rkey, record }) {
    await ok(
      client.post("com.atproto.repo.putRecord", {
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
    const response = await ok(
      client.get("com.atproto.repo.getRecord", {
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
    const response = await ok(
      client.get("com.atproto.repo.listRecords", {
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
    await ok(
      client.post("com.atproto.repo.deleteRecord", {
        input: {
          repo: repo as ActorIdentifier,
          collection: collection as Nsid,
          rkey: rkey as RecordKey,
        },
      }),
    );
  },
});
