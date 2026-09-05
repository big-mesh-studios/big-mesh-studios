// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createQuickJSSandbox } from "./quickjs-sandbox";
import { ScriptExecutionError, type ScriptSandbox } from "./sandbox";

const now = () => 5_000_000;

const make = (
  overrides: {
    seed?: number;
    now?: () => number;
    timeLimitMs?: number;
    memoryLimitBytes?: number;
  } = {},
): Promise<ScriptSandbox> =>
  createQuickJSSandbox({
    seed: overrides.seed ?? 1,
    now: overrides.now ?? now,
    timeLimitMs: overrides.timeLimitMs,
    memoryLimitBytes: overrides.memoryLimitBytes,
  });

describe("a QuickJS sandbox", () => {
  it("loads a script and runs its tick against the shared clock", async () => {
    const sandbox = await make();
    sandbox.load(`
      function bmsTick(clockMs, eventsJson) {
        var events = JSON.parse(eventsJson);
        engine.dispatch("heartbeat", JSON.stringify({ at: clockMs, n: events.length }));
        engine.log("beat");
      }
    `);
    sandbox.tick(1_000, "[]");
    expect(sandbox.drain()).toEqual({
      effects: [
        { tag: "heartbeat", payload: JSON.stringify({ at: 1000, n: 0 }) },
      ],
      logs: ["beat"],
    });
    // Draining clears what a step left behind.
    expect(sandbox.drain()).toEqual({ effects: [], logs: [] });
    sandbox.dispose();
  });

  it("delivers the events added since the last step", async () => {
    const sandbox = await make();
    sandbox.load(`
      function bmsTick(clockMs, eventsJson) {
        var events = JSON.parse(eventsJson);
        engine.log(events.map(function (e) { return e.kind; }).join(","));
      }
    `);
    const events = JSON.stringify([
      { kind: "block-broken", id: "e1", at: 10, producer: "did:plc:a" },
      { kind: "player-joined", id: "e2", at: 11, producer: "did:plc:b" },
    ]);
    sandbox.tick(2_000, events);
    expect(sandbox.drain().logs).toEqual(["block-broken,player-joined"]);
    sandbox.dispose();
  });

  it("is deterministic across two sandboxes with the same seed and clock", async () => {
    const source = `
      function bmsTick(clockMs, eventsJson) {
        var events = JSON.parse(eventsJson);
        engine.dispatch("roll", JSON.stringify({
          r: Math.random().toFixed(8),
          t: Date.now(),
          at: clockMs,
          n: events.length,
        }));
      }
    `;
    const first = await make({ seed: 7 });
    const second = await make({ seed: 7 });
    for (const sandbox of [first, second]) {
      sandbox.load(source);
      sandbox.tick(1_000, "[]");
      sandbox.tick(2_000, "[]");
    }
    const firstOut = first.drain();
    const secondOut = second.drain();
    expect(secondOut).toEqual(firstOut);
    expect(firstOut.effects).toHaveLength(2);
    const firstRoll = JSON.parse(firstOut.effects[0].payload) as {
      r: string;
      t: number;
      at: number;
      n: number;
    };
    expect(firstRoll.r).toMatch(/^\d+\.\d{8}$/);
    expect(firstRoll).toMatchObject({ t: 5_000_000, at: 1_000, n: 0 });
    expect(JSON.parse(firstOut.effects[1].payload)).toMatchObject({
      t: 5_000_000,
      at: 2_000,
    });
    first.dispose();
    second.dispose();
  });

  it("seeds Math.random, so a different seed draws a different stream", async () => {
    const source = `
      function bmsTick() {
        engine.dispatch("roll", JSON.stringify({ r: Math.random().toFixed(6) }));
      }
    `;
    const a = await make({ seed: 3 });
    const b = await make({ seed: 4 });
    a.load(source);
    b.load(source);
    a.tick(0, "[]");
    b.tick(0, "[]");
    const rollOf = (out: { effects: Array<{ payload: string }> }): string =>
      out.effects[0].payload;
    expect(rollOf(b.drain())).not.toBe(rollOf(a.drain()));
    a.dispose();
    b.dispose();
  });

  it("interrupts a step that runs past its budget", async () => {
    const sandbox = await make({ timeLimitMs: 20 });
    sandbox.load("function bmsTick() { while (true) {} }");
    let thrown: ScriptExecutionError | undefined;
    try {
      sandbox.tick(0, "[]");
    } catch (error) {
      thrown = error as ScriptExecutionError;
    }
    expect(thrown).toBeInstanceOf(ScriptExecutionError);
    expect(thrown?.kind).toBe("interrupt");
    sandbox.dispose();
  });

  it("stops a script that exhausts its memory", async () => {
    const sandbox = await make({
      memoryLimitBytes: 512 * 1024,
      timeLimitMs: 2_000,
    });
    sandbox.load(`
      function bmsTick() {
        var a = [];
        while (true) { a.push("x".repeat(8 * 1024 * 1024)); }
      }
    `);
    let thrown: ScriptExecutionError | undefined;
    try {
      sandbox.tick(0, "[]");
    } catch (error) {
      thrown = error as ScriptExecutionError;
    }
    expect(thrown).toBeInstanceOf(ScriptExecutionError);
    expect(thrown?.kind).toBe("memory");
    sandbox.dispose();
  });

  it("reports an exception thrown by the script", async () => {
    const sandbox = await make();
    sandbox.load("function bmsTick() { missingCall(); }");
    let thrown: ScriptExecutionError | undefined;
    try {
      sandbox.tick(0, "[]");
    } catch (error) {
      thrown = error as ScriptExecutionError;
    }
    expect(thrown?.kind).toBe("exception");
    expect(thrown?.message).toMatch(/ReferenceError/);
    sandbox.dispose();
  });

  it("reports a script that fails to load", async () => {
    const sandbox = await make();
    let thrown: ScriptExecutionError | undefined;
    try {
      sandbox.load("throw new Error('bad place script');");
    } catch (error) {
      thrown = error as ScriptExecutionError;
    }
    expect(thrown?.kind).toBe("exception");
    expect(thrown?.message).toMatch(/bad place script/);
    sandbox.dispose();
  });

  it("does nothing when a script never defines bmsTick", async () => {
    const sandbox = await make();
    sandbox.load("var marker = 1;");
    expect(() => sandbox.tick(1_000, "[]")).not.toThrow();
    expect(sandbox.drain()).toEqual({ effects: [], logs: [] });
    sandbox.dispose();
  });

  it("refuses to step a disposed sandbox", async () => {
    const sandbox = await make();
    sandbox.dispose();
    sandbox.dispose(); // disposing twice is fine
    let thrown: ScriptExecutionError | undefined;
    try {
      sandbox.tick(0, "[]");
    } catch (error) {
      thrown = error as ScriptExecutionError;
    }
    expect(thrown?.kind).toBe("fatal");
  });

  it("keeps a script's own state across steps", async () => {
    const sandbox = await make();
    sandbox.load(`
      var broken = 0;
      function bmsTick(clockMs, eventsJson) {
        var events = JSON.parse(eventsJson);
        for (var i = 0; i < events.length; i++) {
          if (events[i].kind === "block-broken") broken += 1;
        }
        engine.dispatch("score", JSON.stringify({ broken: broken }));
      }
    `);
    sandbox.tick(1_000, JSON.stringify([{ kind: "player-joined", id: "e1" }]));
    sandbox.tick(2_000, JSON.stringify([{ kind: "block-broken", id: "e2" }]));
    sandbox.tick(3_000, JSON.stringify([{ kind: "block-broken", id: "e3" }]));
    expect(sandbox.drain().effects).toEqual([
      { tag: "score", payload: '{"broken":0}' },
      { tag: "score", payload: '{"broken":1}' },
      { tag: "score", payload: '{"broken":2}' },
    ]);
    sandbox.dispose();
  });
});
