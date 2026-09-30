// The data a place remembers between runs: a value a script saves for one
// player, a value it saves for everyone, a value that belongs to the account
// rather than to any one place, and the ranking a leaderboard folds out of the
// per-player ones. The table is in memory so a script reads it inside a step
// and every peer computes the same answer from the same folded facts
// (ADR 0026); it is persisted as a whole through a storage seam, so the page's
// own storage backs it today and a network store can back it later without the
// script API changing.
//
// A scripted write is a fact, not a private save: a global value is one writer
// acting for everyone, and a player value is broadcast so every peer can rank
// it on a shared leaderboard. Each peer folds the fact into its own table and
// persists it, so the table converges across peers the way every other derived
// thing in a place does.

import type { DataScope, DataValue } from "./sandbox";

export type { DataScope, DataValue };

/** The longest a data key may be. */
export const MAX_DATA_KEY = 64;
/** The longest a string value may be. */
export const MAX_DATA_STRING = 512;
/** The most keys one player (or the global scope) may hold. */
export const MAX_DATA_KEYS = 256;

/** One key and its value, as a leaderboard or a save enumerates them. */
export interface DataEntry {
  key: string;
  value: DataValue;
}

/** The data a place remembers, read and written in memory. */
export interface PlaceData {
  /** The value remembered under `key` for `player`, or undefined. */
  get(scope: DataScope, player: string, key: string): DataValue | undefined;
  /** Remembers `value`, or forgets `key` when `value` is null. */
  set(
    scope: DataScope,
    player: string,
    key: string,
    value: DataValue | null,
  ): void;
  /** Every key and value a player (or the global scope) holds, in key order. */
  entries(scope: DataScope, player: string): DataEntry[];
  /** Every player name the store has a value for, in sorted order. */
  players(): string[];
}

/** Where a whole data table is kept between runs. */
export interface DataStorage {
  /** The table as it was last written, or undefined when there is none. */
  read(): unknown;
  /** Writes the whole table. */
  write(table: DataTable): void;
}

/** The table as it is held and written: player scope by player, then global, then account. */
export interface DataTable {
  player: Record<string, Record<string, DataValue>>;
  global: Record<string, DataValue>;
  account: Record<string, DataValue>;
}

/** Whether a value is one a place may remember. */
export const isDataValue = (v: unknown): v is DataValue =>
  typeof v === "boolean" ||
  (typeof v === "string" && v.length <= MAX_DATA_STRING) ||
  (typeof v === "number" && Number.isFinite(v));

/**
 * A table read back from unknown bytes, keeping only what fits the shape this
 * file writes. A table that will not read is empty rather than a failure, so a
 * place with damaged storage still plays.
 */
const readTable = (raw: unknown): DataTable => {
  const table: DataTable = { player: {}, global: {}, account: {} };
  if (typeof raw !== "object" || raw === null) {
    return table;
  }
  const record = raw as Record<string, unknown>;
  const players = record.player;
  if (typeof players === "object" && players !== null) {
    for (const [player, keys] of Object.entries(
      players as Record<string, unknown>,
    )) {
      if (typeof keys !== "object" || keys === null) {
        continue;
      }
      const kept: Record<string, DataValue> = {};
      for (const [key, value] of Object.entries(
        keys as Record<string, unknown>,
      )) {
        if (isDataValue(value)) {
          kept[key] = value;
        }
      }
      table.player[player] = kept;
    }
  }
  for (const [scope, bucket] of [
    ["global", table.global],
    ["account", table.account],
  ] as const) {
    const held = record[scope];
    if (typeof held !== "object" || held === null) {
      continue;
    }
    for (const [key, value] of Object.entries(
      held as Record<string, unknown>,
    )) {
      if (isDataValue(value)) {
        bucket[key] = value;
      }
    }
  }
  return table;
};

const keyCount = (keys: Record<string, unknown>): number =>
  Object.keys(keys).length;

/** A place's data a caller may read back whole and seed from another table. */
export interface PlaceDataStore extends PlaceData {
  /** Folds every key another table holds into this one, the incoming values winning. */
  merge(raw: unknown): void;
  /** The whole table as it stands, for writing out. */
  snapshot(): DataTable;
}

/**
 * A place's data, held in memory and written through `storage` after each
 * change. `storage` left out keeps the table only for the life of the run,
 * which is what a test or a place with no storage wants.
 */
export const createPlaceData = (storage?: DataStorage): PlaceDataStore => {
  const table = readTable(storage?.read());

  const save = (): void => {
    storage?.write(table);
  };

  return {
    get(scope, player, key) {
      if (scope === "global") {
        return table.global[key];
      }
      if (scope === "account") {
        return table.account[key];
      }
      return table.player[player]?.[key];
    },

    set(scope, player, key, value) {
      if (scope === "global" || scope === "account") {
        const keys = scope === "global" ? table.global : table.account;
        if (value === null) {
          delete keys[key];
        } else if (keys[key] !== undefined || keyCount(keys) < MAX_DATA_KEYS) {
          keys[key] = value;
        }
        save();
        return;
      }
      const keys = table.player[player] ?? {};
      if (value === null) {
        delete keys[key];
      } else if (keys[key] !== undefined || keyCount(keys) < MAX_DATA_KEYS) {
        keys[key] = value;
      }
      table.player[player] = keys;
      save();
    },

    entries(scope, player) {
      const keys =
        scope === "global"
          ? table.global
          : scope === "account"
            ? table.account
            : (table.player[player] ?? {});
      return Object.entries(keys)
        .map(([key, value]) => ({ key, value }))
        .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    },

    players() {
      return Object.keys(table.player).sort();
    },

    merge(raw) {
      const incoming = readTable(raw);
      for (const [player, keys] of Object.entries(incoming.player)) {
        const held = table.player[player] ?? {};
        for (const [key, value] of Object.entries(keys)) {
          if (held[key] !== undefined || keyCount(held) < MAX_DATA_KEYS) {
            held[key] = value;
          }
        }
        table.player[player] = held;
      }
      for (const [key, value] of Object.entries(incoming.global)) {
        table.global[key] = value;
      }
      for (const [key, value] of Object.entries(incoming.account)) {
        table.account[key] = value;
      }
      save();
    },

    snapshot() {
      return table;
    },
  };
};

/**
 * The storage key one place's data is kept under. The seed and entry file name
 * the place, so two different places never share a table.
 *
 * @param seed The terrain seed the place runs against.
 * @param entry The script file execution starts from.
 */
export const placeDataKey = (seed: number, entry: string): string =>
  `bms-voxelscape:data:${seed}:${entry}`;

/**
 * The page's own storage as a data table's backing. Storage that is absent or
 * refuses to read or write — a private window, a full quota — leaves the run
 * with an in-memory table that just forgets, rather than failing the place.
 */
export const localStorageDataStorage = (key: string): DataStorage => ({
  read(): unknown {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? undefined : JSON.parse(raw);
    } catch {
      return undefined;
    }
  },
  write(table): void {
    try {
      localStorage.setItem(key, JSON.stringify(table));
    } catch {
      // A place whose storage is full still plays; the run just forgets.
    }
  },
});

/**
 * A place's data kept in the page's own storage. Storage that is absent or
 * refuses to read or write — a private window, a full quota — leaves the run
 * with an in-memory table that just forgets, rather than failing the place.
 */
export const createLocalPlaceData = (key: string): PlaceDataStore =>
  createPlaceData(localStorageDataStorage(key));

/** A durable table a synced place data reads at start and writes after a change. */
export interface DataSource {
  /** The table as it was last written, or undefined when there is none. */
  load(): Promise<unknown>;
  /** Writes the whole table. */
  save(table: DataTable): void;
}

/** A place's data that also syncs a durable table, behind the in-memory one. */
export interface SyncedPlaceData extends PlaceData {
  /** Loads the durable table into memory; call once, before the script runs. */
  ready(): Promise<void>;
  /** Re-reads the durable table, folding what it holds into memory. */
  refresh(): Promise<void>;
  /** Writes any pending change out now. */
  flush(): void;
}

/** How long a change waits before the durable table is written. */
const DATA_SAVE_DEBOUNCE_MS = 800;

/**
 * A place's data kept in the page's own storage and, when `remote` is given,
 * synced with a durable table: `ready` folds the stored table into memory
 * before the script runs, a change is written to the page's storage at once and
 * to the durable table after a pause, and `flush` writes any pending change
 * right away (as on the way out). Without a `remote` this is the page's own
 * storage alone, so a signed-out player still plays.
 */
export const createSyncedPlaceData = (params: {
  localKey: string;
  remote?: DataSource;
}): SyncedPlaceData => {
  const store = createPlaceData(localStorageDataStorage(params.localKey));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let loaded = false;

  const scheduleSave = (): void => {
    if (params.remote === undefined) {
      return;
    }
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = undefined;
      params.remote!.save(store.snapshot());
    }, DATA_SAVE_DEBOUNCE_MS);
  };

  const refresh = async (): Promise<void> => {
    if (params.remote === undefined) {
      return;
    }
    store.merge(await params.remote.load());
  };

  return {
    get: (scope, player, key) => store.get(scope, player, key),
    entries: (scope, player) => store.entries(scope, player),
    players: () => store.players(),
    set(scope, player, key, value) {
      store.set(scope, player, key, value);
      scheduleSave();
    },
    async ready() {
      if (loaded) {
        return;
      }
      loaded = true;
      await refresh();
    },
    refresh,
    flush() {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      params.remote?.save(store.snapshot());
    },
  };
};
