// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  MAX_EVENT_BLOCK_ID,
  MAX_EVENT_COORD,
  compareScriptEvents,
  decodeScriptEvents,
  encodeScriptEvents,
  isScriptEvent,
  type ScriptEvent,
} from "./events";

const stamp = (
  id: string,
  at: number,
  producer: string,
): { id: string; at: number; producer: string } => ({ id, at, producer });

const broken = (
  id: string,
  at: number,
  producer: string,
  voxel: [number, number, number] = [1, 2, 3],
  blockId = 3,
): ScriptEvent => ({
  ...stamp(id, at, producer),
  kind: "block-broken",
  voxel,
  blockId,
});

const placed = (id: string, at: number, producer: string): ScriptEvent => ({
  ...stamp(id, at, producer),
  kind: "block-placed",
  voxel: [4, 5, 6],
  blockId: 2,
});

const killed = (id: string, at: number, producer: string): ScriptEvent => ({
  ...stamp(id, at, producer),
  kind: "entity-killed",
  entityId: "m1_0_0_0",
  by: "did:plc:hunter",
});

const joined = (id: string, at: number, player: string): ScriptEvent => ({
  ...stamp(id, at, player),
  kind: "player-joined",
  player,
});

describe("script event validation", () => {
  it("accepts a well-formed event of every kind", () => {
    for (const e of [
      broken("e1", 1_000, "did:plc:alice"),
      placed("e2", 1_000, "did:plc:alice"),
      killed("e3", 1_000, "did:plc:alice"),
      joined("e4", 1_000, "did:plc:bob"),
      {
        ...stamp("e5", 1_000, "did:plc:bob"),
        kind: "player-left",
        player: "did:plc:bob",
      } as ScriptEvent,
      {
        ...stamp("e6", 1_000, "did:plc:bob"),
        kind: "npc-talk",
        npcId: "sable",
      } as ScriptEvent,
      {
        ...stamp("e7", 1_000, "did:plc:bob"),
        kind: "npc-choose",
        npcId: "sable",
        option: 3,
      } as ScriptEvent,
      {
        ...stamp("e8", 1_000, "did:plc:bob"),
        kind: "npc-leave",
        npcId: "sable",
      } as ScriptEvent,
    ]) {
      expect(isScriptEvent(e)).toBe(true);
    }
  });

  it("rejects a malformed npc event", () => {
    const cases: Array<unknown> = [
      { ...stamp("e1", 1, "p"), kind: "npc-talk" },
      { ...stamp("e1", 1, "p"), kind: "npc-talk", npcId: "" },
      { ...stamp("e1", 1, "p"), kind: "npc-talk", npcId: "x".repeat(65) },
      { ...stamp("e1", 1, "p"), kind: "npc-choose", npcId: "sable" },
      {
        ...stamp("e1", 1, "p"),
        kind: "npc-choose",
        npcId: "sable",
        option: -1,
      },
      {
        ...stamp("e1", 1, "p"),
        kind: "npc-choose",
        npcId: "sable",
        option: 33,
      },
      {
        ...stamp("e1", 1, "p"),
        kind: "npc-choose",
        npcId: "sable",
        option: 1.5,
      },
      { ...stamp("e1", 1, "p"), kind: "npc-leave" },
    ];
    for (const bad of cases) {
      expect(isScriptEvent(bad), JSON.stringify(bad)).toBe(false);
    }
  });

  it("accepts an empty `by` on a hazard kill", () => {
    expect(
      isScriptEvent({
        ...stamp("e1", 1, "p"),
        kind: "entity-killed",
        entityId: "m1_0_0_0",
        by: "",
      }),
    ).toBe(true);
  });

  it("rejects events with an unknown or missing kind", () => {
    expect(
      isScriptEvent({ ...broken("e1", 1, "p"), kind: "boss-defeated" }),
    ).toBe(false);
    expect(isScriptEvent({ ...broken("e1", 1, "p"), kind: undefined })).toBe(
      false,
    );
  });

  it("rejects events with a malformed stamp", () => {
    const cases: Array<unknown> = [
      { ...broken("e1", 1, "p"), id: "" },
      { ...broken("e1", 1, "p"), id: "x".repeat(65) },
      { ...broken("e1", 1, "p"), id: undefined },
      { ...broken("e1", 1, ""), producer: "" },
      { ...broken("e1", 1, "x".repeat(257)), producer: "x".repeat(257) },
      { ...broken("e1", -1, "p"), at: -1 },
      { ...broken("e1", Number.NaN, "p"), at: Number.NaN },
      { ...broken("e1", Number.POSITIVE_INFINITY, "p"), at: Infinity },
      { ...broken("e1", 1, "p"), at: undefined },
    ];
    for (const bad of cases) {
      expect(isScriptEvent(bad), JSON.stringify(bad)).toBe(false);
    }
  });

  it("rejects a malformed voxel or block id on a block event", () => {
    const badVoxels: Array<[number, number, number] | unknown> = [
      [1, 2],
      [1, 2, 3, 4],
      [1.5, 2, 3],
      [1, 2, "3"],
      [MAX_EVENT_COORD + 1, 0, 0],
      [0, 0, -MAX_EVENT_COORD - 1],
    ];
    for (const voxel of badVoxels) {
      expect(
        isScriptEvent({ ...broken("e1", 1, "p"), voxel }),
        JSON.stringify(voxel),
      ).toBe(false);
    }
    const badIds: Array<unknown> = [
      -1,
      MAX_EVENT_BLOCK_ID + 1,
      1.5,
      "stone",
      undefined,
    ];
    for (const blockId of badIds) {
      expect(
        isScriptEvent({ ...broken("e1", 1, "p"), blockId }),
        JSON.stringify(blockId),
      ).toBe(false);
    }
  });

  it("rejects a malformed entity-killed payload", () => {
    const cases: Array<unknown> = [
      { ...stamp("e1", 1, "p"), kind: "entity-killed", entityId: "", by: "q" },
      {
        ...stamp("e1", 1, "p"),
        kind: "entity-killed",
        entityId: "x".repeat(65),
        by: "q",
      },
      {
        ...stamp("e1", 1, "p"),
        kind: "entity-killed",
        entityId: "m1_0_0_0",
        by: "x".repeat(257),
      },
      {
        ...stamp("e1", 1, "p"),
        kind: "entity-killed",
        entityId: "m1_0_0_0",
        by: undefined,
      },
      { ...stamp("e1", 1, "p"), kind: "entity-killed", entityId: 42, by: "q" },
    ];
    for (const bad of cases) {
      expect(isScriptEvent(bad), JSON.stringify(bad)).toBe(false);
    }
  });
});

describe("script event codec", () => {
  it("round-trips a batch through JSON without loss", () => {
    const events = [
      broken("e1", 1_000, "did:plc:alice"),
      joined("e2", 1_001, "did:plc:bob"),
    ];
    const decoded = decodeScriptEvents(encodeScriptEvents(events));
    expect(decoded).toEqual(events);
  });

  it("decodes a Uint8Array chunk", () => {
    const events = [killed("e1", 1_000, "did:plc:alice")];
    const bytes = new TextEncoder().encode(encodeScriptEvents(events));
    expect(decodeScriptEvents(bytes)).toEqual(events);
  });

  it("returns null for a chunk that is not an array or holds an invalid event", () => {
    const cases: Array<unknown> = [
      "{not json",
      JSON.stringify({ kind: "block-broken" }),
      JSON.stringify([broken("e1", 1, "p"), { kind: "block-broken" }]),
      JSON.stringify([broken("e1", -5, "p")]),
      '"hello"',
      42,
      null,
      undefined,
    ];
    for (const bad of cases) {
      expect(decodeScriptEvents(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("returns an empty list for an empty batch", () => {
    expect(decodeScriptEvents("[]")).toEqual([]);
  });
});

describe("script event total order", () => {
  it("orders by moment, then producer, then id", () => {
    const early = broken("a", 100, "did:plc:zed");
    const late = broken("b", 200, "did:plc:ann");
    const tieOtherProducer = broken("c", 200, "did:plc:bob");
    const sameStamp = placed("d", 200, "did:plc:bob");
    const sorted = [tieOtherProducer, late, early, sameStamp].sort(
      compareScriptEvents,
    );
    expect(sorted).toEqual([early, late, tieOtherProducer, sameStamp]);
  });

  it("orders a duplicate stamp by id", () => {
    const a = joined("e9", 1, "did:plc:ann");
    const b = joined("e10", 1, "did:plc:ann");
    expect(compareScriptEvents(b, a)).toBeLessThan(0);
    expect(compareScriptEvents(a, b)).toBeGreaterThan(0);
  });
});
