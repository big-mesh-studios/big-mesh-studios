// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  CLUSTER_DEFAULTS,
  rosterFromPresences,
  selectNeighbors,
  type RosterEntry,
  type ClusterSelection,
} from "./roster";
import { makePresence } from "./presence";

const SELF = "did:plc:self";

const at = (did: string, x: number, z: number, t = 100): RosterEntry => ({
  did,
  x,
  y: 0,
  z,
  updatedAt: t,
});

const empty = (): Map<string, number> => new Map();

const dids = (s: ClusterSelection): string[] => s.target;

describe("rosterFromPresences", () => {
  it("maps presence records to roster entries", () => {
    const entries = rosterFromPresences([
      { did: "did:plc:a", record: makePresence(1, 2, 3, null, 50) },
    ]);
    expect(entries).toEqual([
      { did: "did:plc:a", x: 1, y: 2, z: 3, updatedAt: 50 },
    ]);
  });
});

describe("selectNeighbors", () => {
  it("selects the k nearest fresh players, excluding self", () => {
    const roster = [
      at("did:plc:far", 500, 500), // outside maxDistance
      at("did:plc:near", 10, 0),
      at("did:plc:mid", 20, 0),
      at("did:plc:closest", 1, 0),
    ];
    const sel = selectNeighbors({
      selfDid: SELF,
      selfX: 0,
      selfZ: 0,
      roster,
      nowMs: 200,
      previous: empty(),
    });
    expect(dids(sel)).toEqual([
      "did:plc:closest",
      "did:plc:mid",
      "did:plc:near",
    ]);
    expect(sel.connect).toEqual([
      "did:plc:closest",
      "did:plc:mid",
      "did:plc:near",
    ]);
    expect(sel.disconnect).toEqual([]);
    expect(sel.links.get("did:plc:near")).toBe(-1);
  });

  it("ignores stale presence beyond the TTL", () => {
    const sel = selectNeighbors({
      selfDid: SELF,
      selfX: 0,
      selfZ: 0,
      roster: [at("did:plc:stale", 1, 0, 0)],
      nowMs: CLUSTER_DEFAULTS.ttlMs + 1,
      previous: empty(),
    });
    expect(dids(sel)).toEqual([]);
  });

  it("caps at k neighbors and reports truncation", () => {
    const roster = Array.from({ length: 10 }, (_, i) =>
      at(`did:plc:p${i}`, i, 0),
    );
    const sel = selectNeighbors({
      selfDid: SELF,
      selfX: 0,
      selfZ: 0,
      roster,
      nowMs: 200,
      previous: empty(),
    });
    expect(dids(sel)).toHaveLength(CLUSTER_DEFAULTS.k);
    expect(sel.target[0]).toBe("did:plc:p0");
    expect(sel.truncated).toBe(true);
  });

  it("keeps a connected peer on the buffer boundary (hysteresis)", () => {
    // 7 candidates for k=6: the 7th sits in the buffer zone.
    const roster = Array.from({ length: 7 }, (_, i) =>
      at(`did:plc:p${i}`, i, 0),
    );
    const first = selectNeighbors({
      selfDid: SELF,
      selfX: 0,
      selfZ: 0,
      roster,
      nowMs: 200,
      previous: empty(),
    });
    expect(dids(first)).toHaveLength(6);

    // The 7th peer moves in, the previous 6th stays connected via the buffer.
    const moved = roster.map((e) =>
      e.did === "did:plc:p6" ? { ...e, x: 1 } : e,
    );
    const second = selectNeighbors({
      selfDid: SELF,
      selfX: 0,
      selfZ: 0,
      roster: moved,
      nowMs: 300,
      previous: first.links,
    });
    expect(dids(second)).toContain("did:plc:p5");
    expect(second.disconnect).toEqual([]);
  });

  it("disconnects a departed peer only after the hysteresis window", () => {
    const roster = [at("did:plc:leaver", 5, 0), at("did:plc:stayer", 10, 0)];
    const first = selectNeighbors({
      selfDid: SELF,
      selfX: 0,
      selfZ: 0,
      roster,
      nowMs: 200,
      previous: empty(),
    });

    // Leaver departs entirely; stayer remains.
    const after = [
      at("did:plc:stayer", 10, 0, 300),
      at("did:plc:new", 12, 0, 300),
    ];
    const during = selectNeighbors({
      selfDid: SELF,
      selfX: 0,
      selfZ: 0,
      roster: after,
      nowMs: 300,
      previous: first.links,
    });
    expect(dids(during)).toContain("did:plc:leaver"); // grace window not elapsed
    expect(during.disconnect).toEqual([]);
    expect(during.links.get("did:plc:leaver")).toBe(300);

    const later = selectNeighbors({
      selfDid: SELF,
      selfX: 0,
      selfZ: 0,
      roster: after,
      nowMs: 300 + CLUSTER_DEFAULTS.hysteresisMs + 1,
      previous: during.links,
    });
    expect(dids(later)).not.toContain("did:plc:leaver");
    expect(later.disconnect).toEqual(["did:plc:leaver"]);
  });

  it("never reconnects a peer that is gone", () => {
    const roster = [at("did:plc:gone", 5, 0)];
    const first = selectNeighbors({
      selfDid: SELF,
      selfX: 0,
      selfZ: 0,
      roster,
      nowMs: 200,
      previous: empty(),
    });
    const during = selectNeighbors({
      selfDid: SELF,
      selfX: 0,
      selfZ: 0,
      roster: [],
      nowMs: 300,
      previous: first.links,
    });
    expect(dids(during)).toEqual(["did:plc:gone"]); // grace window
    expect(during.disconnect).toEqual([]);
    const later = selectNeighbors({
      selfDid: SELF,
      selfX: 0,
      selfZ: 0,
      roster: [],
      nowMs: 300 + CLUSTER_DEFAULTS.hysteresisMs + 1,
      previous: during.links,
    });
    expect(dids(later)).toEqual([]);
    expect(later.disconnect).toEqual(["did:plc:gone"]);
  });

  it("connects only the new peers in the target set", () => {
    const roster = [at("did:plc:a", 1, 0), at("did:plc:b", 2, 0)];
    const first = selectNeighbors({
      selfDid: SELF,
      selfX: 0,
      selfZ: 0,
      roster,
      nowMs: 200,
      previous: empty(),
    });
    const second = selectNeighbors({
      selfDid: SELF,
      selfX: 0,
      selfZ: 0,
      roster,
      nowMs: 300,
      previous: first.links,
    });
    expect(dids(second)).toEqual(["did:plc:a", "did:plc:b"]);
    expect(second.connect).toEqual([]);
  });
});
