// Player data records for atproto storage: the values one player's save holds
// in a place, written as one custom record in that player's own repository. It
// lives in the owner's repo because only the owner can write there, which is
// exactly right for a per-player save — a peer can read it, and only the player
// it belongs to can change it. Global data has no such owner and is not kept
// here; it stays in the page's own storage.
//
// The values are carried as one JSON string rather than nested objects: the
// lexicon validates the record's envelope, and the map inside is read back
// through the same filtering the in-memory table uses, so a malformed or
// oversized value is dropped instead of being trusted.
import * as lex from "@atcute/lexicons/validations";
import { versionedRecord } from "@big-mesh-studios/atproto/migration";
import type { AtprotoRepoClient } from "@big-mesh-studios/atproto/repo-client";
import {
  isDataValue,
  MAX_DATA_KEY,
  MAX_DATA_KEYS,
  type DataSource,
  type DataTable,
  type DataValue,
} from "../places/place-data";

/** The atproto record collection for one player's place data. */
export const DATA_COLLECTION = "app.bms.voxelscape.data";

/**
 * A data record's shape before it carried a `version` of its own. Nothing was
 * ever written in it, but a chain has to start somewhere, and a record with no
 * `version` reads as this shape.
 */
const DataRecordV0Schema = lex.object({
  $type: lex.literal(DATA_COLLECTION),
  place: lex.genericUriString(),
  createdAt: lex.datetimeString(),
  data: lex.string(),
});

const DataRecordV1Schema = lex.object({
  $type: lex.literal(DATA_COLLECTION),
  version: lex.literal(1),
  place: lex.genericUriString(),
  createdAt: lex.datetimeString(),
  data: lex.string(),
});

/** One player's place data, at the shape every record is written as today. */
export type DataRecord = lex.InferOutput<typeof DataRecordV1Schema>;

const dataRecordMigration = versionedRecord(DataRecordV0Schema).upgradesTo(
  DataRecordV1Schema,
  (v0): DataRecord => ({ ...v0, version: 1 }),
);

/** Reads `value` as a data record at whichever version it was written, or null when it isn't one. */
export const parseDataRecord = (value: unknown): DataRecord | null =>
  dataRecordMigration.parse(value);

/** The atproto record collection for one player's data that belongs to no one place. */
export const ACCOUNT_COLLECTION = "app.bms.voxelscape.account";

/** The fixed record key one player's account-wide data is kept under. */
export const ACCOUNT_RKEY = "self";

const AccountRecordV0Schema = lex.object({
  $type: lex.literal(ACCOUNT_COLLECTION),
  createdAt: lex.datetimeString(),
  data: lex.string(),
});

const AccountRecordV1Schema = lex.object({
  $type: lex.literal(ACCOUNT_COLLECTION),
  version: lex.literal(1),
  createdAt: lex.datetimeString(),
  data: lex.string(),
});

/** A player's account-wide data, at the shape every record is written as today. */
export type AccountRecord = lex.InferOutput<typeof AccountRecordV1Schema>;

const accountRecordMigration = versionedRecord(
  AccountRecordV0Schema,
).upgradesTo(AccountRecordV1Schema, (v0): AccountRecord => ({
  ...v0,
  version: 1,
}));

/** Reads `value` as an account-data record at whichever version it was written, or null. */
export const parseAccountRecord = (value: unknown): AccountRecord | null =>
  accountRecordMigration.parse(value);

/** The values a save holds, as the JSON string a record carries. */
export const encodeData = (values: Record<string, DataValue>): string =>
  JSON.stringify(values);

/**
 * The values a record's JSON string holds, keeping only what fits the shape a
 * place may remember: a bounded key and a value that is a string, a finite
 * number, or a boolean, up to the table's key cap.
 */
export const decodeData = (text: string): Record<string, DataValue> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {};
  }
  const kept: Record<string, DataValue> = {};
  let count = 0;
  for (const [key, value] of Object.entries(
    parsed as Record<string, unknown>,
  )) {
    if (count >= MAX_DATA_KEYS) {
      break;
    }
    if (key.length > 0 && key.length <= MAX_DATA_KEY && isDataValue(value)) {
      kept[key] = value;
      count++;
    }
  }
  return kept;
};

/** Stable short hash of a string, for embedding a place's address in a record key. */
const hashPlace = (s: string): string => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
};

/**
 * A valid atproto record key for a place's data: deterministic from the place,
 * so re-saving overwrites the record already there instead of leaving an
 * earlier save behind it.
 */
export const dataRkey = (place: string): string => `d_${hashPlace(place)}`;

export interface AtprotoDataSourceParams {
  /** The signed-in account's record client, or undefined while signed out. */
  getClient: () => AtprotoRepoClient | undefined;
  /** The signed-in account's DID, or null while signed out. */
  getRepo: () => string | null;
  /** The place the data belongs to, as its own address. */
  place: string;
}

/**
 * A player's data kept in their own repository, as a `DataSource` the synced
 * table reads at start and writes after a change. `load` reads only the
 * signed-in player's own save; a peer's save is not fetched here, because a
 * space it shares is what the `data-changed` facts are for. A record that does
 * not exist yet reads as no data, and a write while signed out is dropped.
 */
export const createAtprotoDataSource = (
  params: AtprotoDataSourceParams,
): DataSource => {
  const rkey = dataRkey(params.place);

  return {
    async load(): Promise<unknown> {
      const client = params.getClient();
      const did = params.getRepo();
      if (client === undefined || did === null) {
        return undefined;
      }
      const table: DataTable = { player: {}, global: {}, account: {} };
      try {
        const response = await client.getRecord({
          repo: did,
          collection: DATA_COLLECTION,
          rkey,
        });
        const record = parseDataRecord(response.value);
        if (record !== null) {
          table.player[did] = decodeData(record.data);
        }
      } catch {
        // No save in this place yet, or one this cannot read: it starts empty.
      }
      try {
        const response = await client.getRecord({
          repo: did,
          collection: ACCOUNT_COLLECTION,
          rkey: ACCOUNT_RKEY,
        });
        const record = parseAccountRecord(response.value);
        if (record !== null) {
          table.account = decodeData(record.data);
        }
      } catch {
        // No account-wide save yet, or one this cannot read.
      }
      return table;
    },

    save(table: DataTable): void {
      const client = params.getClient();
      const did = params.getRepo();
      if (client === undefined || did === null) {
        return;
      }
      const createdAt = new Date().toISOString();
      const placeRecord: DataRecord = {
        $type: DATA_COLLECTION,
        version: 1,
        place: params.place as DataRecord["place"],
        createdAt,
        data: encodeData(table.player[did] ?? {}),
      };
      void client
        .putRecord({
          repo: did,
          collection: DATA_COLLECTION,
          rkey,
          record: placeRecord,
        })
        .catch(() => {
          // A save that will not upload leaves the page's own copy in place.
        });
      const accountRecord: AccountRecord = {
        $type: ACCOUNT_COLLECTION,
        version: 1,
        createdAt,
        data: encodeData(table.account),
      };
      void client
        .putRecord({
          repo: did,
          collection: ACCOUNT_COLLECTION,
          rkey: ACCOUNT_RKEY,
          record: accountRecord,
        })
        .catch(() => {
          // A save that will not upload leaves the page's own copy in place.
        });
    },
  };
};
