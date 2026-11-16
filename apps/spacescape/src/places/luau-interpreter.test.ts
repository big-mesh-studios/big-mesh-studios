/**
 * The Luau interpreter, measured against the seam it claims to implement.
 *
 * `demos.test.ts` runs this code through the real host; this file asks the questions
 * the host's happy path cannot: that a `load()` twice refuses *loudly* rather than
 * running two places' handlers at once, that the runtime's error class arrives as the
 * host's (`instanceof` across two module graphs is exactly the check that fails
 * quietly), and that the options object is genuinely the shared one.
 */

import { describe, expect, it } from "vitest";

import { ScriptExecutionError, type InterpreterOptions } from "./interpreter";
import { createLuauInterpreter } from "./luau-interpreter";

const NOW = 1_700_000_000_000;

const options = (overrides: Partial<InterpreterOptions> = {}): InterpreterOptions => ({
  seed: 20260901,
  now: () => NOW,
  onDispatch: () => "",
  onQuery: () => "null",
  ...overrides,
});

/** The body of `function(engine)`, which is what a bundle is to this seam. */
const place = (body: string): string => `return function(engine)\n${body}\nend`;

describe("the Interpreter seam, in Luau", () => {
  it("runs a place's top level and counts what it registered", async () => {
    const interpreter = await createLuauInterpreter(options());
    interpreter.load(
      place(`
        engine.onTick(function() engine.dispatch("tick", "[]") end)
        engine.onTick(function() engine.dispatch("tick", "[]") end)
      `),
    );
    expect(interpreter.handlerCount).toBe(2);
    const tags: string[] = [];
    const second = await createLuauInterpreter(
      options({
        onDispatch: (tag) => {
          tags.push(tag);
          return "";
        },
      }),
    );
    second.load(place(`engine.onTick(function() engine.dispatch("hello", "[]") end)`));
    second.step(String(NOW), "[]");
    expect(tags).toEqual(["hello"]);
    interpreter.dispose();
    second.dispose();
  });

  it("refuses a second load, naming the seam that owns the choice", async () => {
    const interpreter = await createLuauInterpreter(options());
    interpreter.load(place("engine.dispatch(\"one\", \"[]\")"));
    expect(() => interpreter.load(place("engine.dispatch(\"two\", \"[]\")"))).toThrow(
      /load\(\) may be called once per interpreter/,
    );
    interpreter.dispose();
  });

  it("translates the runtime's error class into the host's", async () => {
    // The whole argument for the translation in one line: `host.ts` catches
    // `instanceof ScriptExecutionError`, and there are two such classes across the
    // package boundary — the comparison silently never matches unless the
    // interpreter translates. A `throw` that escapes into the frame loop is
    // ADR 0015's exact bug.
    const interpreter = await createLuauInterpreter(options());
    try {
      interpreter.load(place(`error("boom")`));
      expect.unreachable("the place should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ScriptExecutionError);
      expect((error as ScriptExecutionError).kind).toBe("exception");
      expect((error as ScriptExecutionError).message).toContain("boom");
    }
    interpreter.dispose();
  });

  it("interrupts a runaway step inside the budget, as the same kind the host names", async () => {
    const interpreter = await createLuauInterpreter(options({ stepBudgetMs: 200 }));
    interpreter.load(
      place(`engine.onTick(function()
        while true do end
      end)`),
    );
    let kind = "none";
    try {
      interpreter.step(String(NOW), "[]");
    } catch (error) {
      expect(error).toBeInstanceOf(ScriptExecutionError);
      kind = (error as ScriptExecutionError).kind;
    }
    expect(kind).toBe("interrupt");
    // The step failed, the interpreter lives: the next step is a fresh budget, not a
    // dead sandbox — three failing steps are three budgets, the cap-not-allowance rule.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        interpreter.step(String(NOW), "[]");
      } catch (error) {
        expect(error).toBeInstanceOf(ScriptExecutionError);
      }
    }
    interpreter.dispose();
  });

  it("answers evaluate in text, engine included", async () => {
    const interpreter = await createLuauInterpreter(options());
    expect(interpreter.evaluate(`return 1 + 2`)).toBe("3");
    expect(interpreter.evaluate(`return typeof(engine)`)).toBe("table");
    expect(interpreter.evaluate(`return typeof(loadstring)`)).toBe("nil");
    interpreter.dispose();
  });

  it("does nothing once disposed, and does not throw doing it", async () => {
    const interpreter = await createLuauInterpreter(options());
    interpreter.load(place(`engine.onTick(function() engine.dispatch("x", "[]") end)`));
    interpreter.dispose();
    expect(interpreter.handlerCount).toBe(0);
    interpreter.step(String(NOW), "[]");
    expect(() => interpreter.dispose()).not.toThrow();
  });

  it("refuses a query the closed set has not, without asking the host", async () => {
    let asked = false;
    const interpreter = await createLuauInterpreter(
      options({
        onQuery: () => {
          asked = true;
          return "null";
        },
      }),
    );
    const answer = interpreter.evaluate(`return engine.query("getSecret", "[]")`);
    expect(String(answer)).toContain("no query called");
    expect(asked).toBe(false);
    interpreter.dispose();
  });
});
