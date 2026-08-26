// An in-memory stand-in for atproto, "sitting in the place of" the real
// network so the mesh can be exercised without OAuth, accounts, or a relay.
// It holds per-DID repos of records, mirrors the relay's
// `listReposByCollection` view of which repos hold a given collection, and
// exposes a `FakeAgent` with the exact `com.atproto.repo.*` surface the mesh
// uses (`AtprotoRepoLike`), returning the same `{ data: ... }` shapes.
import type { AtprotoRepoLike } from "../atproto-repo";

export interface StoredRecord {
  rkey: string;
  value: unknown;
}

export class AtprotoHarness {
  /** did -> collection -> rkey -> value */
  private readonly repos = new Map<string, Map<string, Map<string, unknown>>>();

  /** A record write against `did`'s repo, mirroring `putRecord`. */
  write(did: string, collection: string, rkey: string, value: unknown): void {
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
  }

  /** A raw record value, or undefined when absent. */
  read(did: string, collection: string, rkey: string): unknown {
    return this.repos.get(did)?.get(collection)?.get(rkey);
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
   * The `AtprotoRepoLike` for one player: all operations against `did`'s
   * repo, returning the `{ data: ... }` shapes the controller expects and
   * throwing on a missing `getRecord` like the real client does.
   */
  agent(did: string): AtprotoRepoLike {
    const harness = this;
    return {
      com: {
        atproto: {
          repo: {
            async putRecord({ repo, collection, rkey, record }) {
              harness.write(repo, collection, rkey, record);
            },
            async getRecord({ repo, collection, rkey }) {
              const value = harness.read(repo, collection, rkey);
              if (value === undefined) {
                throw new Error(
                  `record not found: at://${repo}/${collection}/${rkey}`,
                );
              }
              return { data: { value } };
            },
            async listRecords({ repo, collection, limit = 100 }) {
              const records = harness.records(repo, collection).map((r) => ({
                uri: `at://${repo}/${collection}/${r.rkey}`,
                cid: "fake",
                value: r.value,
              }));
              return { data: { records: records.slice(0, limit) } };
            },
            async deleteRecord({ repo, collection, rkey }) {
              harness.remove(repo, collection, rkey);
            },
          },
        },
      },
    };
  }
}
