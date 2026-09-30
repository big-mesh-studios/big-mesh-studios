// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { AtprotoRepoClient } from "@big-mesh-studios/atproto/repo-client";
import {
  ACCOUNT_COLLECTION,
  ACCOUNT_RKEY,
  createAtprotoDataSource,
  DATA_COLLECTION,
  dataRkey,
  decodeData,
  encodeData,
  parseDataRecord,
} from "./data";

const PLACE = "at://did:plc:author/app.bms.voxelscape.place/maze";

/** A record client answering as a stand-in; each call is overridable. */
const fakeClient = (
  overrides: Partial<AtprotoRepoClient> = {},
): AtprotoRepoClient => ({
  putRecord: vi.fn(async () => ({ cid: "cid" })),
  getRecord: vi.fn(async () => {
    throw new Error("not found");
  }),
  listRecords: vi.fn(async () => ({ records: [] })),
  deleteRecord: vi.fn(async () => {}),
  ...overrides,
});

describe("the data record codec", () => {
  it("keeps string, number, and boolean values, and drops the rest", () => {
    expect(
      decodeData(
        JSON.stringify({
          name: "Al",
          score: 7,
          seen: true,
          nested: { a: 1 },
          list: [1, 2],
          long: "x".repeat(600),
        }),
      ),
    ).toEqual({ name: "Al", score: 7, seen: true });
  });

  it("reads an unreadable string as no values", () => {
    expect(decodeData("{not json")).toEqual({});
    expect(decodeData("[]")).toEqual({});
  });

  it("round-trips what encodeData wrote", () => {
    const values = { score: 3, name: "Al", seen: true };
    expect(decodeData(encodeData(values))).toEqual(values);
  });

  it("reads a versioned record and one written before the version field", () => {
    const data = encodeData({ score: 1 });
    expect(
      parseDataRecord({
        $type: DATA_COLLECTION,
        version: 1,
        place: PLACE,
        createdAt: "2026-01-01T00:00:00.000Z",
        data,
      }),
    ).toMatchObject({ version: 1, data });
    expect(
      parseDataRecord({
        $type: DATA_COLLECTION,
        place: PLACE,
        createdAt: "2026-01-01T00:00:00.000Z",
        data,
      }),
    ).toMatchObject({ version: 1 });
    expect(parseDataRecord({ $type: "other.collection" })).toBeNull();
  });
});

describe("the atproto data source", () => {
  it("loads the signed-in player's save", async () => {
    const value = {
      $type: DATA_COLLECTION,
      version: 1,
      place: PLACE,
      createdAt: "2026-01-01T00:00:00.000Z",
      data: encodeData({ score: 4 }),
    };
    const client = fakeClient({
      getRecord: vi.fn(async () => ({ value, cid: "c" })),
    });
    const source = createAtprotoDataSource({
      getClient: () => client,
      getRepo: () => "did:plc:me",
      place: PLACE,
    });
    expect(await source.load()).toEqual({
      player: { "did:plc:me": { score: 4 } },
      global: {},
      account: {},
    });
  });

  it("reads a missing or unreadable record as an empty table", async () => {
    const client = fakeClient();
    const source = createAtprotoDataSource({
      getClient: () => client,
      getRepo: () => "did:plc:me",
      place: PLACE,
    });
    expect(await source.load()).toEqual({
      player: {},
      global: {},
      account: {},
    });
  });

  it("reads as no data while signed out", async () => {
    const client = fakeClient();
    const source = createAtprotoDataSource({
      getClient: () => client,
      getRepo: () => null,
      place: PLACE,
    });
    expect(await source.load()).toBeUndefined();
  });

  it("writes the player's values to the place record and the account record", () => {
    const putRecord = vi.fn(
      async (_params: Parameters<AtprotoRepoClient["putRecord"]>[0]) => ({
        cid: "cid",
      }),
    );
    const client = fakeClient({ putRecord });
    const source = createAtprotoDataSource({
      getClient: () => client,
      getRepo: () => "did:plc:me",
      place: PLACE,
    });
    source.save({
      player: { "did:plc:me": { score: 4 }, "did:plc:other": { score: 9 } },
      global: { day: 2 },
      account: { pet: "cat" },
    });
    expect(putRecord).toHaveBeenCalledTimes(2);
    const place = putRecord.mock.calls[0]![0];
    expect(place.repo).toBe("did:plc:me");
    expect(place.collection).toBe(DATA_COLLECTION);
    expect(place.rkey).toBe(dataRkey(PLACE));
    // Only this player's values are written to the place record; another
    // player's and the global scope belong to someone else or to no one.
    expect(decodeData(place.record.data as string)).toEqual({ score: 4 });
    const account = putRecord.mock.calls[1]![0];
    expect(account.collection).toBe(ACCOUNT_COLLECTION);
    expect(account.rkey).toBe(ACCOUNT_RKEY);
    expect(decodeData(account.record.data as string)).toEqual({ pet: "cat" });
  });

  it("writes nothing while signed out", () => {
    const putRecord = vi.fn(async () => ({ cid: "cid" }));
    const source = createAtprotoDataSource({
      getClient: () => fakeClient({ putRecord }),
      getRepo: () => null,
      place: PLACE,
    });
    source.save({ player: {}, global: {}, account: {} });
    expect(putRecord).not.toHaveBeenCalled();
  });
});
