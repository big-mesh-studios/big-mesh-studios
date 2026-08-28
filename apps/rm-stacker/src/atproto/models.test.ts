import { describe, expect, it } from "vitest";
import {
  isModelRecord,
  MODEL_COLLECTION,
  modelRkey,
  type ModelRecord,
} from "@big-mesh-studios/stacker/lexicon";

const record: ModelRecord = {
  $type: MODEL_COLLECTION,
  name: "Cute Zombie",
  createdAt: "2026-08-27T12:00:00.000Z",
  file: {
    $type: "blob",
    mimeType: "application/zip",
    ref: { $link: "bafkreiabc123" },
    size: 2048,
  },
  dimensions: { width: 15, height: 15, depth: 15 },
};

describe("modelRkey", () => {
  it("keeps the characters a record key may hold", () => {
    expect(modelRkey("zombie-2.v3_final~")).toBe("zombie-2.v3_final~");
  });

  it("gives the same key for the same name, so a second publish is an edit", () => {
    expect(modelRkey("Cute Zombie")).toBe(modelRkey("cute  zombie"));
  });

  it("replaces runs of anything else with a single hyphen", () => {
    expect(modelRkey("Cute Zombie!! (green)")).toBe("cute-zombie-green");
  });

  it("refuses a name that leaves nothing to be found under", () => {
    expect(() => modelRkey("!!!")).toThrow();
  });
});

describe("isModelRecord", () => {
  it("accepts a record this editor wrote", () => {
    expect(isModelRecord(record)).toBe(true);
  });

  it("passes over a record from another collection", () => {
    expect(isModelRecord({ ...record, $type: "app.bsky.feed.post" })).toBe(
      false,
    );
  });

  it("passes over a record whose file went missing", () => {
    expect(isModelRecord({ ...record, file: undefined })).toBe(false);
  });

  it("passes over a record naming dimensions it does not have", () => {
    expect(
      isModelRecord({ ...record, dimensions: { width: 15, height: 15 } }),
    ).toBe(false);
  });

  it("passes over what is not a record at all", () => {
    expect(isModelRecord(null)).toBe(false);
    expect(isModelRecord("app.bms.stacker.model")).toBe(false);
  });
});
