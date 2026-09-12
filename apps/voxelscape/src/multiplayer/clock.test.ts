// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PeerClock, clockRoster } from "./clock";
import type { RosterEntry } from "./roster";

const entry = (did: string, scope: string): RosterEntry => ({
  did,
  x: 0,
  y: 0,
  z: 0,
  scope,
  updatedAt: 1_000,
});

describe("PeerClock", () => {
  it("names the lowest DID among self and roster as the timekeeper", () => {
    const clock = new PeerClock();
    clock.setSelf("did:plc:mid");
    expect(clock.referenceDid).toBe("did:plc:mid");
    clock.setRoster(["did:plc:zeta", "did:plc:alpha"]);
    expect(clock.referenceDid).toBe("did:plc:alpha");
  });

  it("is its own timekeeper until another actor shares the place", () => {
    const clock = new PeerClock();
    clock.setSelf("did:plc:self");
    expect(clock.referenceDid).toBe("did:plc:self");
    clock.setRoster(["did:plc:peer"]);
    expect(clock.referenceDid).toBe("did:plc:peer");
  });

  it("reports no timekeeper before the player is named", () => {
    const clock = new PeerClock();
    expect(clock.referenceDid).toBeNull();
    expect(clock.offset).toBe(0);
  });

  it("measures a symmetric round trip as the midpoint offset", () => {
    let wall = 10_000;
    const clock = new PeerClock({ wallNow: () => wall });
    clock.setSelf("did:plc:self");
    clock.setRoster(["did:plc:peer"]);
    // Self sent at 10_000 (wall 10_000), peer read its wall 10_300 (peer is
    // 300ms ahead), the answer landed back at wall time 10_060.
    clock.observe("did:plc:peer", 10_000, 10_300, 10_060);
    expect(clock.offset).toBe(270);
    wall = 11_000;
    expect(clock.now()).toBe(11_270);
  });

  it("keeps the lowest-rtt sample as the best estimate", () => {
    const clock = new PeerClock();
    clock.setSelf("did:plc:self");
    clock.setRoster(["did:plc:peer"]);
    clock.observe("did:plc:peer", 10_000, 10_400, 10_200);
    clock.observe("did:plc:peer", 20_000, 20_250, 20_060);
    clock.observe("did:plc:peer", 30_000, 30_120, 30_040);
    expect(clock.offsetTo("did:plc:peer")).toBe(100);
    expect(clock.offset).toBe(100);
  });

  it("ignores exchanges whose round trip or offset is impossible", () => {
    const clock = new PeerClock();
    clock.setSelf("did:plc:self");
    clock.setRoster(["did:plc:peer"]);
    const day = 24 * 60 * 60 * 1000;
    clock.observe("did:plc:peer", 10_000, 10_100, 30_000);
    clock.observe("did:plc:peer", 10_000, 10_000 + day + 100, 10_020);
    clock.observe("did:plc:peer", 10_000, Number.NaN, 10_060);
    clock.observe("did:plc:peer", 10_000, 10_400, 9_000);
    expect(clock.offsetTo("did:plc:peer")).toBeNull();
    expect(clock.offset).toBe(0);
  });

  it("forgets a peer's measurements and roster slot on demand", () => {
    const clock = new PeerClock();
    clock.setSelf("did:plc:self");
    clock.setRoster(["did:plc:peer"]);
    clock.observe("did:plc:peer", 10_000, 10_500, 10_100);
    expect(clock.offset).toBe(450);
    clock.forget("did:plc:peer");
    expect(clock.offsetTo("did:plc:peer")).toBeNull();
    expect(clock.offset).toBe(0);
    expect(clock.referenceDid).toBe("did:plc:self");
  });

  it("reset drops self, roster, and every measurement", () => {
    const clock = new PeerClock();
    clock.setSelf("did:plc:self");
    clock.setRoster(["did:plc:peer"]);
    clock.observe("did:plc:peer", 10_000, 10_500, 10_100);
    clock.reset();
    expect(clock.referenceDid).toBeNull();
    expect(clock.offset).toBe(0);
    expect(clock.describe()).toContain("reference=none offset=0ms");
  });
});

describe("clockRoster", () => {
  it("lists only the entries in the given place", () => {
    const roster = [
      entry("did:plc:a", "place://one"),
      entry("did:plc:b", "place://two"),
      entry("did:plc:c", "place://one"),
    ];
    expect(clockRoster(roster, "place://one")).toEqual([
      "did:plc:a",
      "did:plc:c",
    ]);
    expect(clockRoster(roster, "place://two")).toEqual(["did:plc:b"]);
  });
});
