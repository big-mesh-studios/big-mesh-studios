// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  PRESENCE_COLLECTION,
  PRESENCE_RKEY,
  horizontalDistance,
  isPresenceRecord,
  makePresence,
} from "./presence";

describe("presence records", () => {
  it("builds a record and round-trips it through the type guard", () => {
    const record = makePresence(10, 5, -3, 54321, 1_000);
    expect(record).toEqual({
      $type: PRESENCE_COLLECTION,
      x: 10,
      y: 5,
      z: -3,
      seed: 54321,
      updatedAt: 1_000,
    });
    expect(isPresenceRecord(record)).toBe(true);
  });

  it("quantizes float world coordinates to integers for atproto", () => {
    const record = makePresence(1.673, 64.5, -3.2, null, 1_000);
    expect(record.x).toBe(2);
    expect(record.y).toBe(65);
    expect(record.z).toBe(-3);
    for (const coord of [record.x, record.y, record.z]) {
      expect(Number.isInteger(coord)).toBe(true);
    }
  });

  it("rejects non-presence and malformed values", () => {
    expect(isPresenceRecord(null)).toBe(false);
    expect(isPresenceRecord({ x: 1 })).toBe(false);
    expect(
      isPresenceRecord({ ...makePresence(0, 0, 0, null, 1), $type: "other" }),
    ).toBe(false);
    expect(
      isPresenceRecord({ ...makePresence(0, 0, 0, null, 1), x: "1" }),
    ).toBe(false);
    expect(
      isPresenceRecord({ ...makePresence(0, 0, 0, null, 1), updatedAt: "1" }),
    ).toBe(false);
  });

  it("uses a fixed rkey so the collection never grows", () => {
    expect(PRESENCE_RKEY).toBe("latest");
    expect(PRESENCE_COLLECTION).toBe("app.bms.voxelscape.presence");
  });

  it("measures horizontal (xz) distance", () => {
    const p = makePresence(0, 99, 0, null, 1);
    expect(horizontalDistance(p, 3, 4)).toBe(5);
  });
});
