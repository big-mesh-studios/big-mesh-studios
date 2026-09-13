// An in-memory stand-in for atproto, "sitting in the place of" the real
// network so the mesh can be exercised without OAuth, accounts, or a relay.
// It holds per-DID repos of records, mirrors the relay's
// `listReposByCollection` view of which repos hold a given collection, and
// stands in for one player's `AtprotoRepoClient` — the four record calls the
// mesh makes — against those in-memory repos.
import type { AtprotoRepoClient } from "@big-mesh-studios/atproto/repo-client";

export interface StoredRecord {
  rkey: string;
  value: unknown;
}

export class AtprotoHarness {
  /** did -> collection -> rkey -> value */
  private readonly repos = new Map<string, Map<string, Map<string, unknown>>>();
  /** did -> collection -> rkey -> a fake but write-unique cid, mirroring the real network's. */
  private readonly cids = new Map<string, Map<string, Map<string, string>>>();
  private nextCid = 0;

  /** A record write against `did`'s repo, mirroring `putRecord`. */
  write(did: string, collection: string, rkey: string, value: unknown): string {
    let repo = this.repos.get(did);
    if (repo === undefined) {
      repo = new Map();
      this.repos.set(did, repo);
    }
    let col = repo.get(collection);
    if (col === undefined) {
      col = new Map();
      repo.set(collection, col);
    }
    col.set(rkey, value);

    let cidRepo = this.cids.get(did);
    if (cidRepo === undefined) {
      cidRepo = new Map();
      this.cids.set(did, cidRepo);
    }
    let cidCol = cidRepo.get(collection);
    if (cidCol === undefined) {
      cidCol = new Map();
      cidRepo.set(collection, cidCol);
    }
    const cid = `cid-${this.nextCid++}`;
    cidCol.set(rkey, cid);
    return cid;
  }

  /** Removes a record, mirroring `deleteRecord`. */
  remove(did: string, collection: string, rkey: string): void {
    const col = this.repos.get(did)?.get(collection);
    if (col === undefined) {
      return;
    }
    col.delete(rkey);
    if (col.size === 0) {
      this.repos.get(did)?.delete(collection);
    }
    const cidCol = this.cids.get(did)?.get(collection);
    cidCol?.delete(rkey);
    if (cidCol?.size === 0) {
      this.cids.get(did)?.delete(collection);
    }
  }

  /** A raw record value, or undefined when absent. */
  read(did: string, collection: string, rkey: string): unknown {
    return this.repos.get(did)?.get(collection)?.get(rkey);
  }

  /** The cid `write` minted for a record, or undefined when absent. */
  cidOf(did: string, collection: string, rkey: string): string | undefined {
    return this.cids.get(did)?.get(collection)?.get(rkey);
  }

  /** Every record in a did's collection, for mailbox inspection. */
  records(did: string, collection: string): StoredRecord[] {
    const col = this.repos.get(did)?.get(collection);
    if (col === undefined) {
      return [];
    }
    return [...col.entries()].map(([rkey, value]) => ({ rkey, value }));
  }

  /** The relay view: every repo that currently holds a record in `collection`. */
  listReposByCollection(collection: string): string[] {
    const out: string[] = [];
    for (const [did, repo] of this.repos) {
      if (repo.has(collection)) {
        out.push(did);
      }
    }
    return out;
  }

  /**
   * An `AtprotoRepoClient` over these repos. Session-agnostic, as the real one
   * effectively is for these four calls: every one addresses whichever repo it
   * was handed, which is how a player reads its peers' repos through its own
   * session. A missing `getRecord` throws, matching the XRPC call.
   */
  repoClient(): AtprotoRepoClient {
    const harness = this;
    return {
      async putRecord({ repo, collection, rkey, record }) {
        const cid = harness.write(repo, collection, rkey, record);
        return { cid };
      },
      async getRecord({ repo, collection, rkey }) {
        const value = harness.read(repo, collection, rkey);
        if (value === undefined) {
          throw new Error(
            `record not found: at://${repo}/${collection}/${rkey}`,
          );
        }
        // A record just read exists, so `write` has already minted its cid.
        return { value, cid: harness.cidOf(repo, collection, rkey)! };
      },
      async listRecords({ repo, collection, limit = 100 }) {
        const records = harness
          .records(repo, collection)
          .slice(0, limit)
          .map((record) => ({
            uri: `at://${repo}/${collection}/${record.rkey}`,
            // Every listed record exists, so `write` has already minted its cid.
            cid: harness.cidOf(repo, collection, record.rkey)!,
            value: record.value,
          }));
        return { records };
      },
      async deleteRecord({ repo, collection, rkey }) {
        harness.remove(repo, collection, rkey);
      },
    };
  }
}
