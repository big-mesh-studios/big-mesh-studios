// @vitest-environment node
import { describe, expect, it } from "vitest";
import { EventLog } from "./event-log";
import type { ScriptEvent } from "./events";

const stamp = (
  id: string,
  at: number,
  producer: string,
): { id: string; at: number; producer: string } => ({ id, at, producer });

const broken = (id: string, at: number, producer: string): ScriptEvent => ({
  ...stamp(id, at, producer),
  kind: "block-broken",
  voxel: [0, 0, 0],
  blockId: 3,
});

const placed = (id: string, at: number, producer: string): ScriptEvent => ({
  ...stamp(id, at, producer),
  kind: "block-placed",
  voxel: [1, 0, 0],
  blockId: 2,
});

const joined = (id: string, at: number, player: string): ScriptEvent => ({
  ...stamp(id, at, player),
  kind: "player-joined",
  player,
});

/** The events every store in the convergence tests is fed, in "true" order. */
const FACTS = () => [
  joined("e0", 0, "did:plc:bob"),
  broken("e1", 1_000, "did:plc:alice"),
  broken("e2", 2_000, "did:plc:alice"),
  placed("e3", 3_000, "did:plc:bob"),
];

describe("EventLog deduplication", () => {
  it("ignores an event whose id is already present", () => {
    const log = new EventLog();
    expect(log.add(broken("e1", 1, "did:plc:alice"))).toBe(true);
    expect(log.add(broken("e1", 1, "did:plc:alice"))).toBe(false);
    expect(log.size).toBe(1);
  });

  it("counts only newly added events in a batch", () => {
    const log = new EventLog();
    const events = FACTS();
    expect(log.apply([events[0], events[1], events[0]])).toBe(2);
    expect(log.size).toBe(2);
  });

  it("returns an independent copy from inOrder", () => {
    const log = new EventLog();
    log.apply(FACTS());
    const first = log.inOrder();
    first.length = 0;
    expect(log.inOrder()).toHaveLength(4);
  });
});

/** A derived rule: folds the ordered events into a small game state. */
const reduceRule = (log: EventLog): { broken: number; storm: boolean } => {
  let broken = 0;
  for (const event of log.inOrder()) {
    if (event.kind === "block-broken") {
      broken++;
    }
  }
  return { broken, storm: broken >= 2 };
};

describe("EventLog convergence", () => {
  it("orders the log deterministically by moment, producer, and id", () => {
    const log = new EventLog();
    log.apply([FACTS()[3], FACTS()[1], FACTS()[0], FACTS()[2]]);
    expect(log.inOrder().map((e) => e.id)).toEqual(["e0", "e1", "e2", "e3"]);
  });

  it("converges to the same ordered log and rule state across arrival orders", () => {
    const facts = FACTS();
    // Three peers: true order, fully shuffled, and shuffled with duplicates.
    const storeA = new EventLog();
    storeA.apply([facts[0], facts[1], facts[2], facts[3]]);
    const storeB = new EventLog();
    storeB.apply([facts[3], facts[2], facts[0], facts[1]]);
    const storeC = new EventLog();
    storeC.apply([facts[3], facts[0], facts[0], facts[1], facts[2], facts[3]]);

    expect(storeA.size).toBe(4);
    expect(storeB.size).toBe(4);
    expect(storeC.size).toBe(4);
    expect(storeB.inOrder()).toEqual(storeA.inOrder());
    expect(storeC.inOrder()).toEqual(storeA.inOrder());

    // The rule each peer folds over its own copy of the log is the same game.
    expect(reduceRule(storeA)).toEqual({ broken: 2, storm: true });
    expect(reduceRule(storeB)).toEqual(reduceRule(storeA));
    expect(reduceRule(storeC)).toEqual(reduceRule(storeA));
  });

  it("replaying a persisted snapshot back into a fresh log converges too", () => {
    const first = new EventLog();
    first.apply(FACTS());
    const restarted = new EventLog();
    // A late joiner replays the durable snapshot in whatever order it fetched it.
    restarted.apply([...first.snapshot()].reverse());
    expect(restarted.inOrder()).toEqual(first.inOrder());
  });
});
