// The record-level atproto surface both programs build on: the
// `com.atproto.repo.*` calls reading and writing records needs. Declaring it as
// its own interface is what lets a test harness stand in for the network
// entirely — no XRPC, no OAuth, no accounts — while an application passes
// `createAtprotoRepoClient` over a signed-in `@atcute/client` `Client`.
//
// Routing matters: atcute's OAuth user-agent pins every request to the
// signed-in account's own server, which is right for that account's own records
// and wrong for reading somebody else's — those live on their own server, and
// asking the local one comes back RecordNotFound. So each call resolves which
// server actually hosts `repo`: the authenticated client for this account, or a
// cloned, anonymous client aimed at the other one.
import { ok, simpleFetchHandler, type Client } from "@atcute/client";
import type {
  ActorIdentifier,
  Blob as LexBlob,
  Nsid,
  RecordKey,
} from "@atcute/lexicons";

/**
 * Repos, collections, and record keys are plain strings here rather than
 * atcute's syntactic subtypes: every one passed in came out of a record, a
 * listing, or the relay, so it is already whatever the network said it was, and
 * a stand-in implementation shouldn't have to mint branded values.
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
  }): Promise<{
    records: Array<{ uri: string; value: unknown }>;
    cursor?: string;
  }>;
  deleteRecord(params: {
    repo: string;
    collection: string;
    rkey: string;
  }): Promise<void>;
}

/**
 * Uploading a file, kept apart from the record calls so that something standing
 * in for those — a test harness with no network behind it — does not have to
 * answer for blobs it will never be asked about.
 */
export interface AtprotoBlobClient {
  /**
   * Stores `blob` on the signed-in account's own server and hands back the
   * reference a record refers to it by. A blob has to be uploaded to the
   * repository that will point at it, so this one takes no `repo`.
   */
  uploadBlob(blob: Blob): Promise<LexBlob>;
}

/** Adapts a signed-in client to `AtprotoRepoClient`, routing each call to the repo's own server. */
export function createAtprotoRepoClient(params: {
  /** The authenticated client, pinned to the signed-in account's own server. */
  client: Client;
  /** The signed-in account's DID; calls against it use `client` as-is. */
  selfDid: string;
  /**
   * Resolves a DID to the address of the server holding its records. Only
   * reached for a repo other than the signed-in account's own, so an
   * application that reads nobody else's records never needs it to work.
   */
  resolveService: (did: string) => Promise<string>;
}): AtprotoRepoClient & AtprotoBlobClient {
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
    async uploadBlob(blob) {
      const response = await ok(
        client.post("com.atproto.repo.uploadBlob", { input: blob }),
      );
      return response.blob;
    },
  };
}

/**
 * Every record in a collection, following the cursor to the end. `pageSize` is
 * how many to ask for at a time, a hundred by default.
 */
export async function listAllRecords(
  client: AtprotoRepoClient,
  params: { repo: string; collection: string; pageSize?: number },
): Promise<Array<{ uri: string; value: unknown }>> {
  const out: Array<{ uri: string; value: unknown }> = [];
  let cursor: string | undefined;

  do {
    const page = await client.listRecords({
      repo: params.repo,
      collection: params.collection,
      cursor,
      limit: params.pageSize ?? 100,
    });
    out.push(...page.records);
    cursor = page.cursor;
  } while (cursor !== undefined);

  return out;
}
