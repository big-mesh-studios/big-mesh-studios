// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  SIGNAL_COLLECTION,
  hashDid,
  isSignalRecord,
  makeSignal,
  parseSignals,
  signalRkey,
} from "./signal";

const SELF = "did:plc:self";
const OTHER = "did:plc:other";

describe("signal record keys", () => {
  it("orders by seq and distinguishes recipients", () => {
    const a = signalRkey(OTHER, 1);
    const b = signalRkey(OTHER, 2);
    expect(a).toBe(`sig1_${hashDid(OTHER)}`);
    expect(b).toBe(`sig2_${hashDid(OTHER)}`);
    expect(a).not.toBe(b);
    expect(signalRkey("did:plc:zzz", 1)).not.toBe(a);
  });

  it("produces rkey-grammar-safe keys", () => {
    for (const key of [signalRkey(OTHER, 1), signalRkey(OTHER, 123)]) {
      expect(key).toMatch(/^[a-zA-Z0-9._~:-]+$/);
      expect(key.endsWith(".")).toBe(false);
    }
  });

  it("hashes a DID deterministically", () => {
    expect(hashDid("did:plc:abc")).toBe(hashDid("did:plc:abc"));
    expect(hashDid("did:plc:abc")).not.toBe(hashDid("did:plc:abd"));
  });
});

describe("signal records", () => {
  it("builds a record and round-trips it through the type guard", () => {
    const record = makeSignal(
      OTHER,
      "offer",
      { type: "offer", sdp: "v=0" },
      1,
      5,
    );
    expect(record.$type).toBe(SIGNAL_COLLECTION);
    expect(isSignalRecord(record)).toBe(true);
  });

  it("rejects malformed and non-signal values", () => {
    expect(isSignalRecord(null)).toBe(false);
    expect(isSignalRecord({ to: OTHER, seq: 1, kind: "offer" })).toBe(false);
    expect(
      isSignalRecord({ ...makeSignal(OTHER, "offer", {}, 1, 5), kind: "nope" }),
    ).toBe(false);
    expect(
      isSignalRecord({
        ...makeSignal(OTHER, "offer", {}, 1, 5),
        $type: "other",
      }),
    ).toBe(false);
  });
});

describe("parseSignals", () => {
  const offer = makeSignal(SELF, "offer", { type: "offer", sdp: "v=0" }, 1, 10);
  const candidate = makeSignal(SELF, "candidate", { candidate: "c" }, 3, 30);
  const answer = makeSignal(
    SELF,
    "answer",
    { type: "answer", sdp: "v=0" },
    2,
    20,
  );

  it("returns only signals addressed to self, ascending by seq", () => {
    const parsed = parseSignals(
      [
        offer,
        candidate,
        answer,
        makeSignal(OTHER, "offer", {}, 99, 0),
        { junk: 1 },
      ],
      SELF,
    );
    expect(parsed.map((s) => s.seq)).toEqual([1, 2, 3]);
    expect(parsed.map((s) => s.kind)).toEqual(["offer", "answer", "candidate"]);
  });

  it("returns an empty list for no relevant records", () => {
    expect(parseSignals([], SELF)).toEqual([]);
    expect(parseSignals([makeSignal(OTHER, "offer", {}, 1, 0)], SELF)).toEqual(
      [],
    );
  });

  it("drops malformed values without failing the batch", () => {
    const parsed = parseSignals(
      [offer, null, { $type: SIGNAL_COLLECTION }],
      SELF,
    );
    expect(parsed).toHaveLength(1);
    expect(parsed[0].seq).toBe(1);
  });
});
