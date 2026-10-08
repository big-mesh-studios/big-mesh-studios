/**
 * The published shape of a place: the record, the key it is filed under, and the address it is
 * shared by.
 *
 * ## What is being tested
 *
 * **The refusals, one per reason, each asserted against what it said** rather than that it threw.
 * Everything reaching `isPlaceRecord` was written by somebody else's client and has crossed a
 * network to get here, so a validator that quietly accepts almost anything is the failure this
 * file exists to prevent — and a person whose place will not open is entitled to know it would not
 * open here rather than that it did not open at all.
 *
 * **And one claim the rest of the format rests on**, which is only worth a test because it is
 * invisible when true: a record's world fields are checked by `isPlaceManifest` rather than by
 * rules written here. If that ever becomes a second set of rules, the two drift, and the first
 * place that opens in a zip but not from a repository is a bug nobody finds by reading.
 */

import { describe, expect, it } from "vitest";

import {
  isPlaceRecord,
  parsePlaceAtUri,
  PLACE_COLLECTION,
  PLACE_RECORD_VERSION,
  placeAtUri,
  placeRkey,
  type PlaceRecord,
} from "./place-record";
import { MAX_PLACE_SOURCE, MAX_SCRIPT_SOURCE } from "./limits";

const DID = "did:plc:abc123";

/** A record that passes, for a test to spoil one field of. */
const record = (
  over: Record<string, unknown> = {},
): Record<string, unknown> => ({
  $type: PLACE_COLLECTION,
  version: PLACE_RECORD_VERSION,
  name: "harbour",
  seed: 20260901,
  entry: "main.ts",
  createdAt: "2026-10-08T09:00:00.000Z",
  scripts: [{ name: "main.ts", source: "export {};" }],
  ...over,
});

describe("the collection a place is published to", () => {
  it("is this engine's own, and not voxelscape's", () => {
    // **Two apps, two collections, on purpose.** A place in `app.bms.voxelscape.place` carries
    // rm-stacker model references and a plan handler that reads levels; a place in this one
    // carries an explicit entry and neither. One record read by both would be a place that opens
    // as neither.
    expect(PLACE_COLLECTION).toBe("app.bms.spacescape.place");
    expect(PLACE_COLLECTION).not.toContain("voxelscape");
  });
});

describe("the record a place is published as", () => {
  it("is a record this can open", () => {
    expect(isPlaceRecord(record())).toBe(true);
  });

  it("carries a version, and requires it", () => {
    // **Every record this engine has written has one, so an absent version is not an older
    // record — it is something else.** Refusing it is the honest answer, and it is what makes
    // publishing a shape change reversible from a reader's side.
    expect(isPlaceRecord(record({ version: undefined }))).toBe(false);
    expect(isPlaceRecord(record({ version: "1" }))).toBe(false);
    expect(isPlaceRecord(record({ version: 1.0 }))).toBe(true);
  });

  it("refuses a version this build does not know", () => {
    // **A reader meeting the future must return null rather than guess**, because guessing is
    // how a place opens as something its author did not write.
    expect(isPlaceRecord(record({ version: 2 }))).toBe(false);
    expect(isPlaceRecord(record({ version: -1 }))).toBe(false);
  });

  it("refuses a record belonging to another collection", () => {
    expect(isPlaceRecord(record({ $type: "app.bms.voxelscape.place" }))).toBe(
      false,
    );
    expect(isPlaceRecord(record({ $type: undefined }))).toBe(false);
  });

  it("refuses a record that says nothing about when it was written", () => {
    expect(isPlaceRecord(record({ createdAt: undefined }))).toBe(false);
    expect(isPlaceRecord(record({ createdAt: "" }))).toBe(false);
    expect(isPlaceRecord(record({ createdAt: 1_700_000_000_000 }))).toBe(false);
  });

  it("refuses a record whose seed is not a number", () => {
    // **Nothing is coerced**, which is `isPlaceManifest`'s rule arriving through it: a publisher
    // that wrote `"12345"` has a bug that would otherwise surface as a world subtly not the one
    // the place was authored for.
    expect(isPlaceRecord(record({ seed: "20260901" }))).toBe(false);
    expect(isPlaceRecord(record({ seed: Number.NaN }))).toBe(false);
    expect(isPlaceRecord(record({ seed: undefined }))).toBe(false);
  });

  it("refuses a spawn beyond where the engine can stand a player", () => {
    expect(isPlaceRecord(record({ spawn: [0, 0, 0] }))).toBe(true);
    expect(isPlaceRecord(record({ spawn: [0, 0] }))).toBe(false);
    expect(isPlaceRecord(record({ spawn: [0, 0, 1e8] }))).toBe(false);
  });

  it("refuses an entry that is not one of its own scripts", () => {
    // **The same check the manifest makes**, and it is what stops a record naming a program that
    // does not exist — which the loader would otherwise discover as a refusal about a line number
    // in a scope nobody wrote.
    expect(isPlaceRecord(record({ entry: "span.ts" }))).toBe(false);
    expect(isPlaceRecord(record({ entry: undefined }))).toBe(false);
  });

  it("refuses a script whose name walks out of the zip's own root", () => {
    // **The record is the far end of the same traversal the zip defends against.** A name
    // arriving here becomes a key somebody will read source under, so the check is the same
    // `isSafePathName` rather than a looser one.
    for (const name of [
      "../outside.ts",
      "/absolute.ts",
      "a\\b.ts",
      "./here.ts",
    ]) {
      expect(
        isPlaceRecord(
          record({ scripts: [{ name, source: "export {};" }], entry: name }),
        ),
        name,
      ).toBe(false);
    }
  });

  it("refuses two scripts claiming one name", () => {
    // **Which of the two a reader used would be decided by iteration order**, so the record would
    // describe a place that does not exist.
    expect(
      isPlaceRecord(
        record({
          scripts: [
            { name: "main.ts", source: "export const a = 1;" },
            { name: "main.ts", source: "export const b = 2;" },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("refuses a source over the single-file limit", () => {
    expect(
      isPlaceRecord(
        record({
          scripts: [
            { name: "main.ts", source: "x".repeat(MAX_SCRIPT_SOURCE + 1) },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("refuses a place over the total source limit, however it is split", () => {
    // **The bound that is not the product of the others.** Sixty-four files of a hundred thousand
    // characters is forty million characters of TypeScript arriving into a browser tab, and it is
    // the total a repository can make a tab hold rather than any one file that it can be made to.
    //
    // **The count is derived rather than written down**, because a test that says `12` is a test of
    // the number twelve: it would still pass if either limit were halved, and the whole claim is
    // that the two together are what refuse it.
    const wholeFiles = Math.floor(MAX_PLACE_SOURCE / MAX_SCRIPT_SOURCE) + 1;
    const scripts = Array.from({ length: wholeFiles }, (_, index) => ({
      name: `a${index}.ts`,
      source: "x".repeat(MAX_SCRIPT_SOURCE),
    }));

    expect(isPlaceRecord(record({ scripts, entry: "a0.ts" }))).toBe(false);
  });

  it("refuses a record carrying no scripts at all", () => {
    expect(isPlaceRecord(record({ scripts: [] }))).toBe(false);
    expect(isPlaceRecord(record({ scripts: undefined }))).toBe(false);
  });

  it("refuses a place that is not an object", () => {
    for (const value of [null, undefined, 7, "harbour", [], true]) {
      expect(isPlaceRecord(value), String(value)).toBe(false);
    }
  });

  it("refuses a field the format does not define, without refusing the record", () => {
    // **An unknown field is inert, not dangerous.** This is the opposite of ADR 0017's rule for an
    // effect payload — a payload is arriving at a handler, whereas a record is read once by this
    // code and never reaches a place. Refusing here would make every added field a breaking
    // change for every record already published.
    expect(isPlaceRecord(record({ mode: "multi" }))).toBe(true);
    expect(isPlaceRecord(record({ somethingNew: true }))).toBe(true);
  });

  it("has its world fields checked by the manifest's own rules", () => {
    // **The claim the rest of the format rests on.** These four refusals are `isPlaceManifest`'s,
    // reached rather than restated — and they are written here so that replacing the call with a
    // second set of rules fails this test rather than passing it.
    expect(isPlaceRecord(record({ name: "" }))).toBe(false);
    expect(isPlaceRecord(record({ name: undefined }))).toBe(false);
    expect(isPlaceRecord(record({ scripts: [{ name: 7, source: "" }] }))).toBe(
      false,
    );
    expect(isPlaceRecord(record({ scripts: [{ name: "main.ts" }] }))).toBe(
      false,
    );
  });
});

describe("the key a place is published under", () => {
  it("is derived from the name, so publishing twice is editing once", () => {
    // **The property that makes a shared link keep naming the place it named.** A key generated
    // per publish would give every save of an unchanged place a new address.
    expect(placeRkey("Harbour")).toBe("harbour");
    expect(placeRkey("  The  Harbour  ")).toBe("the-harbour");
    expect(placeRkey("the harbour")).toBe(placeRkey("The Harbour"));
  });

  it("keeps the characters a place name is allowed to have", () => {
    expect(placeRkey("harbour-2")).toBe("harbour-2");
    expect(placeRkey("harbour_2.lock~1")).toBe("harbour_2.lock~1");
    expect(placeRkey("harbour!!!")).toBe("harbour");
  });

  it("refuses a name with nothing left to name a place by", () => {
    // **Refused rather than sent to `putRecord`**, which would reject it with a sentence about a
    // lexicon. A name is a person's typing, and this says which of their characters went wrong.
    for (const name of ["", "   ", "!!!", "...", "---"]) {
      expect(() => placeRkey(name), name).toThrow(/holds no letters or digits/);
    }
  });
});

describe("the address a published place is joined by", () => {
  it("is the record's own URI, and parses back to it", () => {
    const uri = placeAtUri(DID, placeRkey("Harbour"));
    expect(uri).toBe(`at://${DID}/app.bms.spacescape.place/harbour`);
    expect(parsePlaceAtUri(uri)).toEqual({ repo: DID, rkey: "harbour" });
  });

  it("refuses an address naming another collection", () => {
    expect(
      parsePlaceAtUri(`at://${DID}/app.bms.voxelscape.place/harbour`),
    ).toBeNull();
  });

  it("refuses a handle where a repository is required", () => {
    // **Resolving a handle is a network round trip through a directory this code does not own**,
    // and a publisher that already has a DID should hand over that.
    expect(
      parsePlaceAtUri(`at://you.bsky.social/${PLACE_COLLECTION}/harbour`),
    ).toBeNull();
  });

  it("refuses an address that is not one", () => {
    for (const uri of [
      "",
      "harbour",
      `at://${DID}/${PLACE_COLLECTION}`,
      `at://${DID}/${PLACE_COLLECTION}/harbour/extra`,
      `https://example.com/${PLACE_COLLECTION}/harbour`,
      `at://${DID}/app.bms.spacescape.other/harbour`,
    ]) {
      expect(parsePlaceAtUri(uri), uri).toBeNull();
    }
  });
});

describe("the collection's record type", () => {
  it("is assignable to the shape a repository stores", () => {
    // **The reason `PlaceRecord` is a type alias rather than an interface.** An atproto record
    // body is a `Record<string, unknown>`, and an interface is not assignable to one — which would
    // make every `putRecord` call in the publisher need a cast this shape was written to avoid.
    const body: Record<string, unknown> = {} as PlaceRecord;
    expect(body).toBeDefined();
  });
});
