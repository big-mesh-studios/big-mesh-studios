/**
 * The spike's questions, asserted — Phase 0 of `docs/luau-scripting-plan.md`.
 *
 * Every row here is a claim the scripting layer cannot be built on air about, and the
 * Node half of the measurements lands in ADR 0060's tables from the values these tests
 * print (and loose bounds these tests assert). The claims a *test process* cannot make —
 * that the binary loads under Vite, honest recursion depth on a browser main thread and
 * in a worker — belong to `luau-probe.html`, which runs the same claims in a real page,
 * exactly as `places-probe.html` did for QuickJS.
 */

import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_MEMORY_LIMIT_BYTES,
  LuauState,
  ScriptExecutionError,
  mulberry32,
  type BridgeHost,
} from "./index";

/**
 * The clock, advanced by hand — the same reason `interpreter.test.ts` fakes it: a test
 * that read real wall time could not assert that the *injected* one is what a script
 * sees.
 */
let clockMs = 1_700_000_000_000;

/** A host that accepts everything and answers nothing, unless a test overrides it. */
const host = (overrides: Partial<BridgeHost> = {}): BridgeHost => ({
  dispatch: () => "",
  query: () => "null",
  now: () => clockMs,
  random: mulberry32(20260901),
  ...overrides,
});

const state = (
  overrides: Partial<Parameters<typeof LuauState.create>[0]> = {},
) => LuauState.create({ seed: 20260901, host: host(), ...overrides });

/**
 * A place, per plan decision 2: the author's source is the *body* of
 * `return function(engine) … end`. The bundler will do this wrapping in Phase 1;
 * the spike repeats it here because it is part of what is being proved.
 */
const place = (s: LuauState, body: string): void => {
  s.load(s.compile(`return function(engine)\n${body}\nend`));
};

/** The kind a failing run reports, so a test can name the cap rather than the text. */
const kind = (run: () => unknown): string => {
  try {
    run();
  } catch (error) {
    if (error instanceof ScriptExecutionError) return error.kind;
    throw error;
  }
  return "none";
};

describe("does a Luau state run here at all", () => {
  it("runs code, and hands back what it returned", async () => {
    const s = await state();
    expect(s.evalText("return 1 + 2")).toBe("3");
    expect(s.evalText(`return "place"`)).toBe("place");
    s.dispose();
  });

  it("runs the whole language the plan's payoff needs", async () => {
    const s = await state();
    // Closures, tables as records, string methods, metatables, and — the point of
    // this second language — coroutines created and resumed in guest code.
    const result = s.evalText(`
      local scale = function(n) return n * 2 end
      local shape = setmetatable({ n = 3 }, { __index = { doubled = function(self) return scale(self.n) end } } )
      local co = coroutine.create(function()
        coroutine.yield("a")
        coroutine.yield("b")
        return "c"
      end)
      local parts = { tostring(shape:doubled()) }
      local ok, v = coroutine.resume(co) parts[#parts + 1] = v
      ok, v = coroutine.resume(co) parts[#parts + 1] = v
      ok, v = coroutine.resume(co) parts[#parts + 1] = v
      return table.concat(parts, "-")
    `);
    expect(result).toBe("6-a-b-c");
    s.dispose();
  });

  it("reports a thrown script as an exception, with the script's own message", async () => {
    const s = await state();
    expect(() => s.eval(`error("no bridge here")`)).toThrow(/no bridge here/);
    expect(kind(() => s.eval(`error("boom")`))).toBe("exception");
    s.dispose();
  });

  it("survives a script that throws and then runs another", async () => {
    const s = await state();
    expect(kind(() => s.eval(`error("first")`))).toBe("exception");
    expect(s.evalText(`return "still here"`)).toBe("still here");
    s.dispose();
  });

  it("rejects a bundle that does not compile, naming the line", async () => {
    const s = await state();
    // luau_compile encodes syntax errors into the module; load is where they
    // announce themselves — with a message the author can find the line in.
    let thrown: unknown;
    try {
      s.load(s.compile("local x = = 1"));
      expect.unreachable("the load should have refused");
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ScriptExecutionError);
    expect((thrown as ScriptExecutionError).kind).toBe("compile");
    const message = (thrown as ScriptExecutionError).message;
    console.log(`syntax error message: ${message}`);
    // Whatever the exact format, it names the line number — the bundler's per-file
    // error reporting in Phase 1 depends on it being locatable.
    expect(message).toMatch(/1/);
    s.dispose();
  });
});

describe("the three caps, one table row per cap", () => {
  it("interrupts a script that will not finish, inside the budget", async () => {
    const s = await state();
    const started = Date.now();
    s.setDeadline(200);
    const outcome = kind(() => s.eval(`while true do end`));
    const elapsed = Date.now() - started;
    s.setDeadline(0);
    console.log(
      `deadline row: kind ${outcome}, stopped ${elapsed} ms into a 200 ms budget`,
    );
    expect(outcome).toBe("interrupt");
    // The budget is the assertion as much as the kind is: an interrupt that arrives in
    // ten seconds is a hang that happens to be labelled. Upper bound is loose because
    // a phone under thermal load drifts; the probe page records the tight numbers.
    expect(elapsed).toBeGreaterThanOrEqual(100);
    expect(elapsed).toBeLessThan(5000);
    // And the state still answers afterwards.
    expect(s.evalText("return 'still here'")).toBe("still here");
    s.dispose();
    expect(await LuauState.closeError()).toBe("");
  });

  it("stops an allocation that will not fit, and says so", async () => {
    const s = await state({ memoryLimitBytes: 1024 * 1024 });
    s.setDeadline(5000);
    const outcome = kind(() =>
      s.eval(`
        local all = {}
        local n = 0
        while true do
          n = n + 1
          all[n] = string.rep("0123456789", 100)
        end
      `),
    );
    s.setDeadline(0);
    console.log(
      `memory cap row: kind ${outcome}, refused at ${s.memUsed()} bytes of a ` +
        `${1024 * 1024} byte cap`,
    );
    expect(outcome).toBe("memory");
    // The accounting itself, not just the error: the cap must be a number that
    // means what it says, or the error above is a coincidence.
    expect(s.memUsed()).toBeLessThanOrEqual(1024 * 1024);
    s.dispose();
    expect(await LuauState.closeError()).toBe("");
  });

  it("leaves ordinary work alone", async () => {
    const s = await state();
    s.setDeadline(1000);
    expect(
      s.evalText(`
        local sum = 0
        for i = 1, 200000 do sum = sum + i end
        return tostring(sum)
      `),
    ).toBe("20000100000");
    s.setDeadline(0);
    s.dispose();
  });

  /**
   * **The row ADR 0060 will be written around.** Luau's VM grows Luau-on-Luau calls on
   * its heap rather than the C stack — which is what makes unbounded recursion a
   * catchable "stack overflow" instead of the trap that killed the QuickJS peer. The
   * assertion is that it stays catchable; the *depth* it prints is the honest number
   * for this host, and the probe records the browser's and the worker's beside it.
   */
  it("surfaces unbounded recursion as a catchable error, and measures the honest depth", async () => {
    const s = await state();
    s.setDeadline(5000);
    expect(
      kind(() => s.eval(`local function f(n) return f(n + 1) end; f(0)`)),
    ).toBe("stack");
    const depth = s.evalText(`
      local depth = 0
      local function f()
        depth = depth + 1
        return f()
      end
      pcall(f)
      return tostring(depth)
    `);
    console.log(`honest recursion depth (Node, wasm stack 1 MiB): ${depth}`);
    // It ran: some finite number of frames was refused before the trap could be the
    // answer. If this is ever "none" (no error at all) the cap mechanism broke; if the
    // state dies, that is the horror story, and the next two assertions catch it too.
    expect(Number(depth)).toBeGreaterThan(500);
    expect(s.evalText("return 'still here'")).toBe("still here");
    s.setDeadline(0);
    s.dispose();
    expect(await LuauState.closeError()).toBe("");
  });

  /**
   * **Nested `coroutine.resume`, the way the executor nests them.** The prediction
   * was LUAI_MAXCCALLS catching deep C re-entry with a "C stack overflow"; the
   * measurement (this host, 1000 levels) was that it *completes* — Luau's resume
   * does not consume a C-stack frame per level the way the bridge call path would.
   * The claim that matters for ADR 0060 is the one both outcomes share: no wasm
   * trap, the state survives, and the value comes back correct. The probe pushes
   * this deeper on the browser halves to find the level where *something* does
   * catch it, and the ADR quotes that number, not a guess at which mechanism
   * reaches it first.
   */
  it("nested coroutine.resume does not trap the module — whatever else it does", async () => {
    const s = await state();
    s.setDeadline(5000);
    const outcome = kind(() =>
      s.eval(`
        local function nest(n)
          if n == 0 then return 0 end
          local co = coroutine.create(function() return nest(n - 1) end)
          local ok, r = coroutine.resume(co)
          return r
        end
        return nest(1000)
      `),
    );
    s.setDeadline(0);
    console.log(`nested resume (1000 levels): ${outcome}`);
    expect(["none", "stack", "memory", "interrupt"]).toContain(outcome);
    // The sentence that would be the horror story repeated: anything else, or a
    // dead state, and this line is where ADR 0015's abort row finds its sequel.
    expect(s.evalText("return 'still here'")).toBe("still here");
    s.dispose();
    expect(await LuauState.closeError()).toBe("");
  });

  it("caps each step separately, so a script that fails every frame is bounded", async () => {
    const s = await state();
    // Three interrupted steps rather than one step allowed three budgets: the cap is
    // a cap, not an allowance.
    for (let attempt = 0; attempt < 3; attempt++) {
      const started = Date.now();
      s.setDeadline(120);
      expect(kind(() => s.eval(`while true do end`))).toBe("interrupt");
      s.setDeadline(0);
      expect(Date.now() - started).toBeLessThan(5000);
    }
    s.dispose();
  });
});

describe("isolation is by construction", () => {
  it("has no host globals, and no dynamic-code globals either", async () => {
    const s = await state();
    // The absent-names probe, extended to Luau per the plan: os, io, debug are the
    // library names this VM *has* in its C++ but is not opened into the globals;
    // load/loadstring are the Function-constructor analogue and are removed from the
    // base library the way decision 2 requires; require is never installed at all.
    for (const name of [
      "os",
      "io",
      "debug",
      "load",
      "loadstring",
      "require",
      "tick",
      "module",
      "engine",
    ]) {
      expect(s.evalText(`return typeof(${name})`), name).toBe("nil");
    }
    s.dispose();
  });

  it("reaches engine only as the parameter it is handed", async () => {
    const seen: string[] = [];
    const s = await state({
      host: host({
        dispatch: (tag, payload) => {
          seen.push(`${tag}:${payload}`);
          return "";
        },
      }),
    });
    // Reached, because it was passed.
    expect(s.evalText(`return engine.dispatch("log", "41")`, true)).toBe("");
    expect(seen).toEqual(["log:41"]);
    // Not a global: the program scope receives it; the *compiled* scope cannot name it.
    expect(s.evalText(`return typeof(engine)`)).toBe("nil");
    // The analogue of the `new Function(...)` probe: with loadstring removed, code
    // compiled after load cannot even exist, let alone see anything.
    expect(s.evalText(`return typeof(loadstring)`)).toBe("nil");
    s.dispose();
  });

  it("refuses a query it does not have, rather than asking the host", async () => {
    let asked = false;
    const s = await state({
      host: host({
        query: () => {
          asked = true;
          return "null";
        },
      }),
    });
    expect(
      s.evalText(`return engine.query("getSecret", "[]")`, true),
    ).toContain("no query called");
    expect(asked).toBe(false);
    s.dispose();
  });

  it("holds the engine table read-only", async () => {
    const s = await state();
    // Overwriting a bridge member is a bug in the script, caught where it happens.
    expect(kind(() => s.eval(`engine.dispatch = nil`, true))).toBe("exception");
    s.dispose();
  });
});

describe("coroutines: threads are charged, not free", () => {
  it("resumes a guest thread inside one step, across steps, linearly", async () => {
    const log: string[] = [];
    const s = await state({
      host: host({
        dispatch: (tag) => {
          log.push(tag);
          return "";
        },
      }),
    });
    // The plan's example, small: a journey that yields "between worlds" and is driven
    // entirely by steps, never by promises.
    place(
      s,
      `
        local co = coroutine.create(function()
          engine.dispatch("walk", "{}")
          coroutine.yield()
          engine.dispatch("counter", "{}")
          coroutine.yield()
          engine.dispatch("bed", "{}")
        end)
        engine.onTick(function()
          if coroutine.status(co) ~= "dead" then coroutine.resume(co) end
        end)
      `,
    );
    s.call();
    expect(s.handlerCount).toBe(1);
    for (let frame = 0; frame < 4; frame++) {
      s.setDeadline(250);
      s.step("1700000000000", "[]");
      s.setDeadline(0);
    }
    expect(log).toEqual(["walk", "counter", "bed"]);
    s.dispose();
  });

  it("resumes a thread handed to the host, with an argument, inside the budget", async () => {
    // The host-driven shape: the executor resumes the thread; the arg is the shared
    // event the journey waits on; every resume is one synchronous call.
    const s = await state();
    const co = s.evalThread(`
      return coroutine.create(function(waiting)
        local outcome = coroutine.yield("at-counter")
        return outcome .. ":" .. waiting
      end)
    `);
    // Narrow through the union rather than hoping `expect` does it: reading `.value`
    // on the error variant is a type error exactly where the run would have gone
    // wrong, and that is the assertion in a stronger form than `status === ...`.
    const yielded = s.resume(co, "next");
    if (yielded.status !== "yielded")
      throw new Error(`expected yielded, got ${yielded.status}`);
    expect(yielded.value).toBe("at-counter");

    const finished = s.resume(co, "served");
    if (finished.status !== "finished")
      throw new Error(`expected finished, got ${finished.status}`);
    expect(finished.value).toBe("served:next");

    expect(s.threadStatus(co)).toBe(3); // LUA_COFIN — the plan's table names the code
    // Resuming a dead thread is an ordinary catchable error, not a crash.
    expect(s.resume(co).status).toBe("error");
    s.dispose();
  });

  it("a runaway thread cannot buy a place more time than a handler-less one", async () => {
    const budgetMs = 150;
    const spin = (handlers: number) => `
      local co = coroutine.create(function()
        while true do end
      end)
      for h = 1, ${handlers} do
        engine.onTick(function()
          if coroutine.status(co) ~= "dead" then coroutine.resume(co) end
        end)
      end
    `;
    const none = await state();
    place(none, "-- no handlers at all");
    const baseline = Date.now();
    none.setDeadline(budgetMs);
    none.step("1", "[]");
    none.setDeadline(0);
    const noneElapsed = Date.now() - baseline;
    none.dispose();

    const runaway = await state();
    place(runaway, spin(1));
    runaway.call();
    const started = Date.now();
    runaway.setDeadline(budgetMs);
    const outcome = kind(() => runaway.step("1", "[]"));
    runaway.setDeadline(0);
    const elapsed = Date.now() - started;
    runaway.dispose();

    expect(outcome).toBe("interrupt");
    // The same comparison the QuickJS spike made: adding a spinning thread must not
    // move the bound of the step. Loose because it is a phone; the probe tightens it
    // on hosts that hold still.
    expect(elapsed).toBeLessThan(Math.max(2000, noneElapsed * 20));
  });
});

describe("two peers running the same program agree", () => {
  it("draws the same numbers from the same seed", async () => {
    const draws = async (seed: number): Promise<string | undefined> => {
      const s = await state({ seed });
      const out = s.evalText(`
        local n = {}
        for i = 1, 8 do n[i] = tostring(math.floor(math.random() * 1e6)) end
        return table.concat(n, ",")
      `);
      s.dispose();
      return out;
    };
    const first = await draws(20260901);
    expect(await draws(20260901)).toBe(first);
    expect(await draws(20260902)).not.toBe(first);
    console.log(`math.random trace (seed 20260901): ${first}`);
  });

  it("agrees engine.random with the host's mulberry32, digit for digit", async () => {
    const seed = 4242;
    // Two generators from one seed: `random` answers the guest's calls, `reference`
    // computes the expectation. Draining a single generator to build the expected
    // values *before* creating the state — the first draft of this line did exactly
    // that — makes the guest the second caller in the sequence, and agreement fails
    // against a reference that already consumed the first four draws.
    const random = mulberry32(seed);
    const reference = mulberry32(seed);
    const want = [0, 1, 2, 3].map(() => Math.floor(reference() * 2 ** 31));
    const s = await state({ seed, host: host({ random }) });
    const got = s
      .evalText(
        `
        local n = {}
        for i = 1, 4 do n[i] = tostring(math.floor(engine.random() * 2^31)) end
        return table.concat(n, ",")
      `,
        true,
      )!
      .split(",")
      .map(Number);
    expect(got).toEqual(want);
    s.dispose();
  });

  /**
   * **The plan's decision 6, measured rather than cited**: `pairs()` iteration order is
   * a property of the pinned binary. Ten fresh states — the closest thing here to ten
   * peers starting from nothing — must agree key-for-key on the same program. If this
   * ever stops holding, it is the divergence source ADR 0060 has to state in words,
   * which is why the docs will tell authors to prefer `ipairs` either way.
   */
  it("iterates a hash table in the same order across fresh states", async () => {
    const program = `
      local t = {}
      for i = 1, 16 do t["key" .. tostring(math.floor(engine.random() * 1e6))] = i end
      local out = {}
      for k in pairs(t) do out[#out + 1] = k end
      return table.concat(out, "|")
    `;
    const runs: string[] = [];
    for (let attempt = 0; attempt < 10; attempt++) {
      const s = await state({ seed: 7 });
      runs.push(s.evalText(program, true)!);
      s.dispose();
    }
    const first = runs[0];
    for (const run of runs) expect(run).toBe(first);
    console.log(`pairs() trace (fresh state): ${first}`);
  });

  it("converges two independent states fed the same clock and seed", async () => {
    const run = async (): Promise<string> => {
      const rows: string[] = [];
      const s = await state({ seed: 4242 });
      for (let step = 0; step < 3; step++) {
        rows.push(
          s.evalText(
            `return tostring(engine.now()) .. ":" ..
               tostring(math.floor(math.random() * 1000))`,
            true,
          )!,
        );
        clockMs += 1000;
      }
      s.dispose();
      return rows.join("|");
    };
    clockMs = 1_700_000_000_000;
    const first = await run();
    clockMs = 1_700_000_000_000;
    expect(await run()).toBe(first);
  });
});

describe("numbers the ADR quotes", () => {
  it("reports the artifact: version, bytes, gzipped bytes, compile cost", async () => {
    const version = await LuauState.version();
    const [tag, commit] = version.split(" ");
    console.log(`version: luau ${tag} (${commit})`);
    expect(tag).toMatch(/^\d+\.\d+$/);
    expect(commit).toMatch(/^[0-9a-f]{40}$/);

    const bytes = readFileSync(new URL("../dist/luau.wasm", import.meta.url));
    const gzipped = gzipSync(bytes, { level: 9 });
    console.log(
      `luau.wasm: ${bytes.length} bytes, ${gzipped.length} gzipped (-9)`,
    );
    // Loose bound, stated so: the plan's risk row says ~1–2 MB gzipped. Over that by
    // enough to matter is a regression worth seeing in a failing line.
    expect(gzipped.length).toBeLessThan(4 * 1024 * 1024);

    // Compile-on-load, on the real thing: the guest library and the official demo,
    // read from the app's own files — the plan's numbers row names exactly these two
    // costs, and a fixture copy here would be the second copy the repo's conventions
    // exist to forbid. When Phase 1's luau-bundle.ts owns the require shim below, the
    // harness becomes a call to it rather than a string template.
    const appFile = (path: string): string =>
      readFileSync(
        new URL(`../../../apps/spacescape/src/places/${path}`, import.meta.url),
        "utf8",
      );

    /**
     * The one-chunk bundle shape, minimal: module bodies become functions nested in
     * `function(engine)` — so `engine` reaches them as an upvalue and never a global,
     * and the isolation probe's claim about `require` stays exactly as stated, since
     * the `require` here is this program scope's local, not a name the VM installed.
     *
     * The levels reach the library through the same sentinel `luau-bundle.ts` uses —
     * the spike hand-builds what that file does properly, which is exactly the split
     * the plan drew: this harness measures the engine, the app's tests run the bundler.
     */
    const luaQuote = (text: string): string => JSON.stringify(text); // Luau's double-quote escapes are a subset of JSON's here

    const bundleLuau = (
      library: string,
      main: string,
      levels: Readonly<Record<string, string>>,
    ): string => {
      const entries = Object.entries(levels)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, text]) => `    [${luaQuote(name)}] = ${luaQuote(text)}`)
        .join(",\n");
      const injected = library.replace(
        "local __levels = {}",
        `local __levels = {\n${entries}\n}`,
      );
      return `
      return function(engine)
        local __modules = {}
        local __cache = {}
        local function require(name)
          local cached = __cache[name]
          if cached ~= nil then return cached end
          local module = __modules[name]
          if module == nil then error("require: no module called " .. name) end
          cached = module()
          __cache[name] = cached
          return cached
        end
        __modules["spacescape"] = function()
  ${injected}
        end
  ${main}
      end
    `;
    };

    const source = bundleLuau(
      appFile("guest/place-api.luau"),
      appFile("demo/animal-hospital.luau"),
      { "animal-hospital.json": appFile("demo/animal-hospital.json") },
    );

    // One play of the demo's opening, as the host drives it: the load budget, 520
    // walk frames, then the shutter — the player using the camera prop, which shows
    // the forms. The patient enters at z=85 and the counter sits at z=-15 — 334
    // frames of walking before the first nag line is even reached.
    const play = async (): Promise<{ rows: string[]; startup: number }> => {
      const rows: string[] = [];
      const peer = await state({
        host: host({
          dispatch: (tag, payload) => {
            rows.push(tag + " " + payload);
            return "";
          },
        }),
      });
      peer.load(peer.compile(source));
      peer.setDeadline(1000); // load is its own budget, armed once, the way the host arms steps
      peer.call();
      peer.setDeadline(0);
      // The patient enters at z=85 and the counter sits at z=-15: 100 units at 0.3 a
      // frame is 334 frames of walking before the first turn even starts, then a
      // turn, then 77 more, and only then the counter's tick 0 with its "Hello!".
      let clock = 1_700_000_000_000;
      for (let frame = 0; frame < 520; frame++) {
        peer.setDeadline(250);
        peer.step(String(clock), "[]");
        peer.setDeadline(0);
        clock += 50;
      }
      peer.setDeadline(250);
      // The shutter — and in the **wire form the host actually sends**: the script's
      // flat `event.entityId` is the guest library's unwrapping, not the transport's
      // shape. The first draft of this line hand-rolled the flat form and the fixed
      // library correctly dropped the malformed event, which is the harness telling
      // the harness it lied.
      peer.step(
        String(clock),
        '[{"kind":"entity-used","at":1700000052000,"producer":"local","payload":{"entityId":"level/prop-hospital-camera"}}]',
      );
      peer.setDeadline(0);
      expect(peer.handlerCount).toBe(1);
      // The startup cost the ADR quotes: what one running state's own allocator
      // accounts, library and demo included.
      const startup = peer.memUsed();
      peer.dispose();
      return { rows, startup };
    };

    // Compile cost, measured once here rather than inside play, so the ADR gets its
    // own number for it; the phone's answer is the floor, not the ceiling.
    const s = await state();
    const started = performance.now();
    const bytecode = s.compile(source);
    const compiled = performance.now() - started;
    const startedRun = performance.now();
    s.load(bytecode);
    const ran = performance.now() - startedRun;
    // The startup cost is what the demo's own state reports after running, so play
    // hands it up beside the trace.
    s.dispose();
    console.log(
      `animal hospital (luau): ${source.length} bytes source, ${bytecode.length} bytes ` +
        `bytecode, compile ${compiled.toFixed(1)} ms, load ${ran.toFixed(1)} ms`,
    );
    expect(compiled).toBeLessThan(5000);
    expect(ran).toBeLessThan(1000);

    const { rows: trace, startup } = await play();
    console.log(
      `animal hospital: ${trace.length} dispatches across load + 521 steps, ` +
        `state after play ${startup} bytes`,
    );
    expect(trace.length).toBeGreaterThan(250); // the walk dispatched every frame
    // The opening dispatches in source order: the lamps before the level assert even
    // returns text, and `level(...)` no longer dispatches at all — the host owns the
    // fold. The first line out of a fresh hospital is therefore a lamp.
    expect(trace[0]).toContain("light-add");
    expect(trace.filter((t) => t.startsWith("light-add"))).toHaveLength(8);
    expect(
      trace.some(
        (t) => t.startsWith("entity-add") && t.includes('"kind":"npc"'),
      ),
    ).toBe(true);
    const hello = trace.find(
      (row) => row.startsWith("narrate") && row.includes("Hello!"),
    );
    expect(hello).toBeDefined();
    expect(trace.some((row) => row.startsWith("photo-take"))).toBe(true);
    expect(
      trace.some(
        (row) => row.startsWith("entity-add") && row.includes('"kind":"prop"'),
      ),
    ).toBe(true); // the forms

    /**
     * **The fold property at its smallest honest scale:** the identical event script
     * on a second fresh state answers a byte-identical dispatch trace. `pairs()`
     * determinism rides on the same assertion, because the payloads carry computed
     * float positions that no two runs may disagree about.
     */
    expect((await play()).rows).toEqual(trace);
  });

  it("reports the default memory cap as a measurement, not an assumption", async () => {
    // The plan's memory row: how much does an *idle* state cost, so the cap that ships
    // is a number with headroom above it. (The QuickJS cap, 16 MiB, was "roughly a
    // runtime plus a modest script" — this is the same sentence earning its keep in
    // Luau's units, and ADR 0060 quotes whichever this prints.)
    const s = await state({ memoryLimitBytes: DEFAULT_MEMORY_LIMIT_BYTES });
    const idle = s.memUsed();
    s.eval(`
      local t = {}
      for i = 1, 1000 do t[i] = tostring(i) end
    `);
    const modest = s.memUsed();
    console.log(
      `idle state: ${idle} bytes; after 1k strings: ${modest} bytes; ` +
        `cap ${DEFAULT_MEMORY_LIMIT_BYTES} bytes`,
    );
    expect(idle).toBeGreaterThan(0);
    expect(modest).toBeLessThan(DEFAULT_MEMORY_LIMIT_BYTES);
    s.dispose();
  });
});
