// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  isPlaceManifest,
  isPlaceRecord,
  makePlaceRecord,
  MAX_PLACE_NAME,
  MAX_PLACE_SPAWN,
  parsePlaceAtUri,
  placeAtUri,
  PLACE_COLLECTION,
  placeRkey,
  placeWorld,
  type PlaceManifest,
  type PlaceRecord,
} from "./place";

const manifest = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  name: "The Haunted Mesa",
  seed: 12_345,
  spawn: [128, 0, -64],
  scripts: ["main.js"],
  ...overrides,
});

const blobRef = {
  $type: "blob",
  ref: { $link: "bafkreigh2akiscaildc" },
  mimeType: "application/zip",
  size: 42,
};

const record = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  $type: PLACE_COLLECTION,
  name: "The Haunted Mesa",
  seed: 12_345,
  spawn: [128, 0, -64],
  createdAt: "2026-09-05T00:00:00.000Z",
  file: blobRef,
  ...overrides,
});

describe("place manifest", () => {
  it("accepts a well-formed manifest, with or without scripts", () => {
    expect(isPlaceManifest(manifest())).toBe(true);
    const { scripts: _scripts, ...bare } = manifest();
    expect(isPlaceManifest(bare)).toBe(true);
  });

  it("rejects a malformed manifest", () => {
    const cases: Array<Record<string, unknown>> = [
      manifest({ name: "" }),
      manifest({ name: "x".repeat(MAX_PLACE_NAME + 1) }),
      manifest({ name: undefined }),
      manifest({ seed: "12" }),
      manifest({ seed: Number.NaN }),
      manifest({ seed: undefined }),
      manifest({ spawn: [1, 2] }),
      manifest({ spawn: [1, 2, 3, 4] }),
      manifest({ spawn: [1, "2", 3] }),
      manifest({ spawn: [MAX_PLACE_SPAWN + 1, 0, 0] }),
      manifest({ scripts: "main.js" }),
      manifest({ scripts: [""] }),
      manifest({ scripts: ["a/../b.js"] }),
      manifest({ scripts: ["/absolute.js"] }),
      manifest({ scripts: Array.from({ length: 65 }, (_, i) => `${i}.js`) }),
      {},
    ];
    for (const bad of cases) {
      expect(isPlaceManifest(bad), JSON.stringify(bad)).toBe(false);
    }
  });
});

describe("place record", () => {
  it("accepts a well-formed record", () => {
    expect(isPlaceRecord(record())).toBe(true);
  });

  it("rejects a malformed record", () => {
    const cases: Array<Record<string, unknown>> = [
      { ...record(), $type: "app.bms.voxelscape.edit" },
      { ...record(), name: "" },
      { ...record(), seed: "x" },
      { ...record(), seed: null },
      { ...record(), spawn: [1, 2] },
      { ...record(), createdAt: 5 },
      { ...record(), file: undefined },
      { ...record(), file: { mimeType: "application/zip" } },
    ];
    for (const bad of cases) {
      expect(isPlaceRecord(bad), JSON.stringify(bad)).toBe(false);
    }
  });

  it("rejects a non-integer or out-of-range spawn, but keeps finite floats", () => {
    // The spawn is a world point, not a voxel, so fractional coordinates are a
    // place you can start on.
    expect(isPlaceRecord(record({ spawn: [1.5, 64.25, -3] }))).toBe(true);
  });
});

describe("place record building", () => {
  it("builds a record from a manifest and an uploaded blob", () => {
    const made = makePlaceRecord(
      manifest() as PlaceManifest,
      "2026-09-05T00:00:00.000Z",
      blobRef as PlaceRecord["file"],
    );
    expect(made).toEqual(record());
  });

  it("derives the world a record boots", () => {
    expect(placeWorld(record() as PlaceRecord)).toEqual({
      seed: 12_345,
      spawn: [128, 0, -64],
    });
  });
});

describe("place record keys and addresses", () => {
  it("makes a safe, stable key from a name", () => {
    expect(placeRkey("The Haunted Mesa")).toBe("the-haunted-mesa");
    expect(placeRkey("v1.2")).toBe("v1.2");
    expect(placeRkey("A B")).toBe("a-b");
  });

  it("refuses a name that leaves no key", () => {
    expect(() => placeRkey("!!!")).toThrow();
    expect(() => placeRkey("")).toThrow();
  });

  it("round-trips an at-uri", () => {
    const uri = placeAtUri("did:plc:abc123", "the-haunted-mesa");
    expect(uri).toBe(
      "at://did:plc:abc123/app.bms.voxelscape.place/the-haunted-mesa",
    );
    expect(parsePlaceAtUri(uri)).toEqual({
      repo: "did:plc:abc123",
      rkey: "the-haunted-mesa",
    });
  });

  it("rejects an address that is not a place", () => {
    expect(
      parsePlaceAtUri("at://did:plc:abc123/app.bms.voxelscape.edit/xyz"),
    ).toBeNull();
    expect(parsePlaceAtUri("did:plc:abc123")).toBeNull();
    expect(parsePlaceAtUri("https://example.com/place")).toBeNull();
  });
});
