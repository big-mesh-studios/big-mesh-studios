// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  createPlaceData,
  createSyncedPlaceData,
  MAX_DATA_KEYS,
  type DataStorage,
} from "./place-data";

describe("place data", () => {
  it("remembers, forgets, and enumerates values by scope", () => {
    const data = createPlaceData();
    data.set("player", "a", "score", 3);
    data.set("player", "a", "name", "Al");
    data.set("player", "b", "score", 5);
    data.set("global", "", "day", 2);

    expect(data.get("player", "a", "score")).toBe(3);
    expect(data.get("global", "", "day")).toBe(2);
    expect(data.entries("player", "a")).toEqual([
      { key: "name", value: "Al" },
      { key: "score", value: 3 },
    ]);
    expect(data.players()).toEqual(["a", "b"]);

    data.set("player", "a", "score", null);
    expect(data.get("player", "a", "score")).toBeUndefined();
    expect(data.players()).toEqual(["a", "b"]);
  });

  it("writes the whole table through storage and reads it back", () => {
    let saved: unknown;
    const storage: DataStorage = {
      read: () => saved,
      write: (table) => {
        saved = JSON.parse(JSON.stringify(table));
      },
    };
    createPlaceData(storage).set("player", "a", "score", 7);
    expect(saved).toEqual({
      player: { a: { score: 7 } },
      global: {},
      account: {},
    });

    const reopened = createPlaceData(storage);
    expect(reopened.get("player", "a", "score")).toBe(7);
  });

  it("keeps only what fits the shape when reading damaged storage", () => {
    const data = createPlaceData({
      read: () => ({
        player: { a: { good: 1, tooLong: "x".repeat(600), nested: {} } },
        global: { ok: true, bad: [] },
      }),
      write: () => {},
    });
    expect(data.get("player", "a", "good")).toBe(1);
    expect(data.get("player", "a", "tooLong")).toBeUndefined();
    expect(data.get("player", "a", "nested")).toBeUndefined();
    expect(data.get("global", "", "ok")).toBe(true);
    expect(data.get("global", "", "bad")).toBeUndefined();
  });

  it("caps how many keys one player may hold", () => {
    const data = createPlaceData();
    for (let i = 0; i < MAX_DATA_KEYS + 5; i++) {
      data.set("player", "a", `k${i}`, i);
    }
    expect(data.entries("player", "a")).toHaveLength(MAX_DATA_KEYS);
  });

  it("merges another table in and snapshots what it holds", () => {
    const data = createPlaceData();
    data.set("player", "a", "score", 1);
    data.set("account", "", "pet", "cat");
    data.merge({
      player: { a: { score: 2, name: "Al" }, b: { score: 3 } },
      global: { day: 2 },
      account: { pet: "dog" },
    });
    expect(data.get("player", "a", "score")).toBe(2);
    expect(data.get("player", "a", "name")).toBe("Al");
    expect(data.get("player", "b", "score")).toBe(3);
    expect(data.get("global", "", "day")).toBe(2);
    expect(data.get("account", "", "pet")).toBe("dog");
    expect(data.snapshot()).toEqual({
      player: { a: { score: 2, name: "Al" }, b: { score: 3 } },
      global: { day: 2 },
      account: { pet: "dog" },
    });
  });
});

describe("synced place data", () => {
  it("loads a durable table on ready and writes one out on flush", async () => {
    const saved: unknown[] = [];
    const data = createSyncedPlaceData({
      localKey: "bms-voxelscape:test:synced",
      remote: {
        load: async () => ({ player: { me: { score: 7 } }, global: {} }),
        save: (table) => {
          saved.push(JSON.parse(JSON.stringify(table)));
        },
      },
    });
    await data.ready();
    expect(data.get("player", "me", "score")).toBe(7);

    data.set("player", "me", "score", 8);
    data.flush();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toEqual({
      player: { me: { score: 8 } },
      global: {},
      account: {},
    });
  });
});
