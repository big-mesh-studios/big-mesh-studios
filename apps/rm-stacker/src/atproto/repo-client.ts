// The record-level atproto surface the rest of the editor builds on: the
// handful of `com.atproto.repo.*` calls publishing and opening your own work
// needs.
//
// Every call goes to one repository, the signed-in account's own. That is
// where atcute's OAuth user-agent points every request anyway, and it is the
// only repository this editor reads or writes: opening somebody else's models
// would mean asking the server that holds their account instead, which is a
// question this cannot ask and does not need to.
import { ok, type Client } from "@atcute/client";
import type { ActorIdentifier, Blob as LexBlob, Nsid, RecordKey } from "@atcute/lexicons";

/**
 * Collections and record keys are plain strings here rather than atcute's
 * syntactic subtypes: every one passed in came out of a record or a listing,
 * so it is already whatever the network said it was. This is where they
 * re-enter the validated world.
 */
export interface AtprotoRepoClient {
  putRecord(params: {
    collection: string;
    rkey: string;
    record: { [_ in string]: unknown };
  }): Promise<void>;
  listRecords(params: {
    collection: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ records: Array<{ uri: string; value: unknown }>; cursor?: string }>;
  deleteRecord(params: { collection: string; rkey: string }): Promise<void>;
  /**
   * Stores `blob` on the account's own server and hands back the reference a
   * record refers to it by. A blob has to be uploaded to the repository that
   * will point at it, which is the same one everything else here goes to.
   */
  uploadBlob(blob: Blob): Promise<LexBlob>;
}

/** Adapts a signed-in client to `AtprotoRepoClient`, aimed at that account's own repository. */
export function createAtprotoRepoClient(params: {
  /** The authenticated client, pinned to the signed-in account's own server. */
  client: Client;
  /** The signed-in account's identifier, which every call is made against. */
  repo: string;
}): AtprotoRepoClient {
  const { client, repo } = params;

  return {
    async putRecord({ collection, rkey, record }) {
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
    async listRecords({ collection, cursor, limit }) {
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
    async deleteRecord({ collection, rkey }) {
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
    async uploadBlob(blob) {
      const response = await ok(client.post("com.atproto.repo.uploadBlob", { input: blob }));
      return response.blob;
    },
  };
}
