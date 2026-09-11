// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  MAX_DAMAGE,
  MAX_SCRIPT_EVENTS_PER_MESSAGE,
  decodeMessage,
  encodeMessage,
} from "./messages";

const scriptEvent = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  kind: "entity-hit",
  entityId: "m1_0_0_0",
  amount: 8,
  attackerX: 12.3456,
  attackerZ: -4.567,
  id: "did:plc:abc123:1000:1",
  at: 1_000,
  producer: "did:plc:abc123",
  ...overrides,
});

describe("script-event message codec", () => {
  it("round-trips a batch of script facts", () => {
    const encoded = encodeMessage({
      v: 1,
      type: "script-event",
      seq: 3,
      t: 500,
      events: [scriptEvent() as never],
    });
    const decoded = decodeMessage(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.type).toBe("script-event");
    const message = decoded as Extract<
      typeof decoded,
      { type: "script-event" }
    >;
    expect(message.seq).toBe(3);
    expect(message.t).toBe(500);
    expect(message.events).toHaveLength(1);
    expect(message.events[0]).toEqual(scriptEvent());
  });

  it("accepts a valid script-event broadcast", () => {
    const encoded = encodeMessage({
      v: 1,
      type: "script-event",
      seq: 1,
      t: 1,
      events: [scriptEvent() as never],
    });
    expect(decodeMessage(encoded)).not.toBeNull();
  });

  it("rejects a script fact with a missing id or producer", () => {
    const cases: Array<Record<string, unknown>> = [
      scriptEvent({ id: "" }),
      scriptEvent({ producer: "" }),
      scriptEvent({ producer: undefined }),
    ];
    for (const bad of cases) {
      const encoded = encodeMessage({
        v: 1,
        type: "script-event",
        seq: 1,
        t: 1,
        events: [bad as never],
      });
      expect(decodeMessage(encoded), JSON.stringify(bad)).toBeNull();
    }
  });

  it("rejects a script fact with an unknown kind or an impossible amount", () => {
    const cases: Array<Record<string, unknown>> = [
      scriptEvent({ kind: "fly" }),
      scriptEvent({ amount: 0 }),
      scriptEvent({ amount: -8 }),
      scriptEvent({ amount: 1_001 }),
      scriptEvent({ attackerX: 1_000_001 }),
      scriptEvent({ attackerZ: "north" }),
    ];
    for (const bad of cases) {
      const encoded = encodeMessage({
        v: 1,
        type: "script-event",
        seq: 1,
        t: 1,
        events: [bad as never],
      });
      expect(decodeMessage(encoded), JSON.stringify(bad)).toBeNull();
    }
  });

  it("rejects an oversized script-event batch", () => {
    const encoded = encodeMessage({
      v: 1,
      type: "script-event",
      seq: 1,
      t: 1,
      events: Array.from({ length: MAX_SCRIPT_EVENTS_PER_MESSAGE + 1 }, () =>
        scriptEvent(),
      ) as never,
    });
    expect(decodeMessage(encoded)).toBeNull();
  });
});

describe("player-damage message codec", () => {
  const hit = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    v: 1,
    type: "player-damage",
    seq: 5,
    t: 700,
    target: "did:plc:abc123",
    amount: 2,
    ...overrides,
  });

  it("round-trips a zombie swing's damage", () => {
    const encoded = encodeMessage({
      v: 1,
      type: "player-damage",
      seq: 5,
      t: 700,
      target: "did:plc:abc123",
      amount: 2,
    });
    const decoded = decodeMessage(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.type).toBe("player-damage");
    const message = decoded as Extract<
      typeof decoded,
      { type: "player-damage" }
    >;
    expect(message.seq).toBe(5);
    expect(message.t).toBe(700);
    expect(message.target).toBe("did:plc:abc123");
    expect(message.amount).toBe(2);
  });

  it("accepts a valid player-damage message", () => {
    expect(decodeMessage(JSON.stringify(hit()))).not.toBeNull();
  });

  it("rejects player-damage with a missing target or an impossible amount", () => {
    const cases = [
      hit({ target: "" }),
      hit({ target: undefined }),
      hit({ target: "x".repeat(257) }),
      hit({ amount: 0 }),
      hit({ amount: -2 }),
      hit({ amount: MAX_DAMAGE + 1 }),
      hit({ amount: 1.5 }),
    ];
    for (const bad of cases) {
      expect(
        decodeMessage(JSON.stringify(bad)),
        JSON.stringify(bad),
      ).toBeNull();
    }
  });
});
