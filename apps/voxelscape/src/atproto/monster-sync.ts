// The atproto persistence for monsters: writes the monsters this client owns
// into its own repo (one record per monster, rkey = the monster id) at a
// throttled cadence, and discovers every repo holding a monster record through
// the relay, fetching each and merging the records into the monster
// controller. An owner's records are the source of truth for where monsters
// are; the WebRTC broadcasts are the optimistic fast path in front of them. A
// plain domain object: it knows atproto and the monster controller, nothing
// else.
import {
  MONSTER_COLLECTION,
  isMonsterRecord,
  type MonsterRecord,
} from "./monsters";
import type { AtprotoRepoClient } from "./repo-client";

export interface MonsterSyncParams {
  getRepoClient: () => AtprotoRepoClient | undefined;
  getDid: () => string | null;
  /** Merges fetched records into the local simulation (last-write-wins). */
  onRecords: (records: MonsterRecord[]) => void;
  /** The records this client should write now, throttled by the controller. */
  getRecordsToWrite: (now: number) => MonsterRecord[];
  /** Acknowledges written records, so they stop being due. */
  onPersisted: (ids: string[]) => void;
  /** Public relay base URL for collection discovery (defaults to the main relay). */
  relay?: string;
  /** In-process discovery directory, for the harness. */
  fetchDirectory?: (collection: string) => Promise<string[]>;
}

/** How often the relay is re-scanned for repos holding monster records, ms. */
const DISCOVER_INTERVAL_MS = 15_000;
/** How often the write loop asks the controller what is due, ms. */
const WRITE_INTERVAL_MS = 1_000;
/** Cap on repos pulled per discovery pass (protects the relay and our quota). */
const DISCOVER_MAX_REPOS = 200;
const DEFAULT_RELAY = "https://bsky.network";

export class MonsterSync {
  private readonly getRepoClient: () => AtprotoRepoClient | undefined;
  private readonly getDid: () => string | null;
  private readonly onRecords: (records: MonsterRecord[]) => void;
  private readonly getRecordsToWrite: (now: number) => MonsterRecord[];
  private readonly onPersisted: (ids: string[]) => void;
  private readonly relay: string;
  private readonly fetchDirectory: (collection: string) => Promise<string[]>;

  private running = false;
  private writeInFlight = false;
  private discoverTimer: ReturnType<typeof setInterval> | undefined;
  private writeTimer: ReturnType<typeof setInterval> | undefined;
  private lastDiscoveryAt = 0;
  private lastError: string | null = null;

  constructor(params: MonsterSyncParams) {
    this.getRepoClient = params.getRepoClient;
    this.getDid = params.getDid;
    this.onRecords = params.onRecords;
    this.getRecordsToWrite = params.getRecordsToWrite;
    this.onPersisted = params.onPersisted;
    this.relay = params.relay ?? DEFAULT_RELAY;
    this.fetchDirectory = params.fetchDirectory ?? this.relayFetchDirectory;
  }

  /**
   * Starts discovery and the write loop: an immediate discovery pass, then
   * both on their own timers. Requires a signed-in account with a repo client.
   */
  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    void this.refreshDiscovery();
    this.discoverTimer = setInterval(
      () => void this.refreshDiscovery(),
      DISCOVER_INTERVAL_MS,
    );
    this.writeTimer = setInterval(
      () => void this.writeDue(),
      WRITE_INTERVAL_MS,
    );
  }

  /** Stops discovery and the write loop. */
  stop(): void {
    if (!this.running) {
      return;
    }
    this.running = false;
    if (this.discoverTimer !== undefined) {
      clearInterval(this.discoverTimer);
      this.discoverTimer = undefined;
    }
    if (this.writeTimer !== undefined) {
      clearInterval(this.writeTimer);
      this.writeTimer = undefined;
    }
  }

  dispose(): void {
    this.stop();
  }

  /** A one-line state, for a debug console. */
  describe(): string {
    const age =
      this.lastDiscoveryAt === 0
        ? "never"
        : `${Math.round((Date.now() - this.lastDiscoveryAt) / 1000)}s ago`;
    return `monster sync: ${this.running ? "on" : "off"} — discovery ${age}${
      this.lastError !== null ? ` — ${this.lastError}` : ""
    }`;
  }

  /**
   * Re-scans the relay for every repo holding a monster record and merges each
   * one's records into the local simulation. A failing repo is reported and
   * skipped rather than failing the whole pass.
   */
  private async refreshDiscovery(): Promise<void> {
    if (!this.running) {
      return;
    }
    try {
      const dids = await this.fetchDirectory(MONSTER_COLLECTION);
      const selfDid = this.getDid();
      const records: MonsterRecord[] = [];
      for (const did of dids) {
        if (did === selfDid) {
          continue;
        }
        try {
          records.push(...(await this.fetchRepoRecords(did)));
        } catch (err) {
          this.lastError = `${did}: ${
            err instanceof Error ? err.message : String(err)
          }`;
        }
      }
      this.lastDiscoveryAt = Date.now();
      this.onRecords(records);
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
    }
  }

  private async fetchRepoRecords(did: string): Promise<MonsterRecord[]> {
    const repoClient = this.getRepoClient();
    if (repoClient === undefined) {
      return [];
    }
    const out: MonsterRecord[] = [];
    let cursor: string | undefined;
    do {
      const page = await repoClient.listRecords({
        repo: did,
        collection: MONSTER_COLLECTION,
        cursor,
        limit: 100,
      });
      cursor = page.cursor;
      for (const rec of page.records) {
        if (isMonsterRecord(rec.value)) {
          out.push(rec.value);
        }
      }
    } while (cursor !== undefined);
    return out;
  }

  /**
   * Persists whatever the controller says is due, one record at a time under
   * an in-flight lock so a slow write never stacks a second batch on top.
   */
  private async writeDue(): Promise<void> {
    if (!this.running || this.writeInFlight) {
      return;
    }
    const repoClient = this.getRepoClient();
    const did = this.getDid();
    if (repoClient === undefined || did === null) {
      return;
    }
    const records = this.getRecordsToWrite(Date.now());
    if (records.length === 0) {
      return;
    }
    this.writeInFlight = true;
    try {
      for (const record of records) {
        await repoClient.putRecord({
          repo: did,
          collection: MONSTER_COLLECTION,
          rkey: record.id,
          record: record as unknown as { [_ in string]: unknown },
        });
      }
      this.onPersisted(records.map((r) => r.id));
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
    } finally {
      this.writeInFlight = false;
    }
  }

  /** The public-relay implementation of `fetchDirectory`. */
  private readonly relayFetchDirectory = async (
    collection: string,
  ): Promise<string[]> => {
    const url = `${this.relay}/xrpc/com.atproto.sync.listReposByCollection`;
    const dids: string[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 10 && dids.length < DISCOVER_MAX_REPOS; page++) {
      const params = new URLSearchParams({ collection, limit: "100" });
      if (cursor !== undefined) {
        params.set("cursor", cursor);
      }
      const res = await fetch(`${url}?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`discovery relay replied ${res.status}`);
      }
      const data = (await res.json()) as {
        repos?: Array<{ did: string }>;
        cursor?: string;
      };
      for (const repo of data.repos ?? []) {
        dids.push(repo.did);
      }
      cursor = data.cursor;
      if (cursor === undefined) {
        break;
      }
    }
    return dids;
  };
}
