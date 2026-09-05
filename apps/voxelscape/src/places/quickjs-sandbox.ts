// The QuickJS-in-WASM sandbox: creator code runs inside an interpreter compiled
// to WASM, so a script has no host access at all — no fetch, no timers, no DOM,
// no engine objects — beyond the handful of functions injected here. Isolation
// is by construction rather than by policy. Determinism is the second half:
// every peer runs the same interpreter binary (versioned with the place
// record), `Math.random` is a seeded PRNG instead of the engine's entropy,
// `Date.now` answers from a caller-supplied clock, and every boundary crossing
// is a JSON string so object identity never leaks in either direction. Each
// step is bounded by an interrupt deadline and a memory cap, so a runaway
// script stops rather than taking the peer down with it.
import {
  newQuickJSWASMModuleFromVariant,
  newVariant,
} from "quickjs-emscripten-core";
import type {
  QuickJSContext,
  QuickJSHandle,
  QuickJSRuntime,
  QuickJSWASMModule,
} from "quickjs-emscripten-core";
import QuickJSReleaseSync from "@jitl/quickjs-wasmfile-release-sync";
import { mulberry32 } from "../monsters/monster";
import {
  ScriptExecutionError,
  type ScriptErrorKind,
  type ScriptOutput,
  type ScriptSandbox,
} from "./sandbox";

/** One interpreter instance, owning one script and one run of its step budget. */
class QuickJSSandbox implements ScriptSandbox {
  private readonly context: QuickJSContext;
  private readonly runtime: QuickJSRuntime;
  private readonly effects: ScriptOutput["effects"] = [];
  private readonly logs: string[] = [];
  private readonly timeLimitMs: number;
  /** Moment the current step must end; far in the future outside a step. */
  private deadline = Infinity;
  private disposed = false;

  constructor(params: {
    runtime: QuickJSRuntime;
    context: QuickJSContext;
    now: () => number;
    random: () => number;
    timeLimitMs: number;
  }) {
    this.runtime = params.runtime;
    this.context = params.context;
    this.timeLimitMs = params.timeLimitMs;
    // The interrupt handler runs on the interpreter's own cadence while code
    // executes; with the deadline in the future it lets everything through, so
    // only an overrunning step is ever stopped.
    params.runtime.setInterruptHandler(() => Date.now() > this.deadline);

    this.installEngine(params.context, params);
    this.installDeterministicGlobals(params.context, params);
  }

  load(source: string): void {
    this.assertAlive();
    this.withBudget(() => {
      const result = this.context.evalCode(source, "place.js");
      this.readResult(result);
    });
  }

  tick(clockMs: number, eventsJson: string): void {
    this.assertAlive();
    this.withBudget(() => {
      const clock = this.context.newNumber(clockMs);
      const events = this.context.newString(eventsJson);
      const tick = this.context.getProp(this.context.global, "bmsTick");
      try {
        if (this.context.typeof(tick) === "function") {
          const result = this.context.callFunction(
            tick,
            this.context.undefined,
            clock,
            events,
          );
          this.readResult(result);
        }
      } finally {
        // A step that throws must still release the handles it built, or the
        // interpreter aborts when its runtime is freed.
        tick.dispose();
        events.dispose();
        clock.dispose();
      }
    });
  }

  drain(): ScriptOutput {
    return {
      effects: this.effects.splice(0, this.effects.length),
      logs: this.logs.splice(0, this.logs.length),
    };
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    // A context has to go before the runtime that owns it.
    this.context.dispose();
    this.runtime.dispose();
  }

  /** Runs `step` with the step budget armed, disarming whatever happened. */
  private withBudget(step: () => void): void {
    this.deadline = Date.now() + this.timeLimitMs;
    try {
      step();
    } finally {
      this.deadline = Infinity;
    }
  }

  /**
   * The one `engine` object handed to the guest. Its methods are the whole host
   * surface; each reads its arguments as host strings and queues them, so
   * nothing crosses the boundary as an object.
   */
  private installEngine(
    context: QuickJSContext,
    time: { now: () => number },
  ): void {
    const engine = context.newObject();
    const bind = (
      name: string,
      fn: (...args: QuickJSHandle[]) => QuickJSHandle,
    ): void => {
      const method = context.newFunction(name, fn);
      context.setProp(engine, name, method);
      method.dispose();
    };
    bind("dispatch", (tag, payload) => {
      this.effects.push({
        tag: context.getString(tag),
        payload: context.getString(payload),
      });
      return context.undefined;
    });
    bind("log", (line) => {
      this.logs.push(context.getString(line));
      return context.undefined;
    });
    bind("now", () => context.newNumber(time.now()));
    context.setProp(context.global, "engine", engine);
    engine.dispose();
  }

  /**
   * Replaces the interpreter's entropy and wall clock with deterministic ones,
   * so a script produces the same numbers on every peer given the same inputs.
   */
  private installDeterministicGlobals(
    context: QuickJSContext,
    time: { now: () => number; random: () => number },
  ): void {
    const random = context.newFunction("random", () =>
      context.newNumber(time.random()),
    );
    const math = context.getProp(context.global, "Math");
    context.setProp(math, "random", random);
    random.dispose();
    math.dispose();

    const now = context.newFunction("now", () => context.newNumber(time.now()));
    const date = context.getProp(context.global, "Date");
    context.setProp(date, "now", now);
    now.dispose();
    date.dispose();
  }

  /** Turns a step's outcome into an error when it failed, disposing it either way. */
  private readResult(result: ReturnType<QuickJSContext["callFunction"]>): void {
    if (result.error !== undefined) {
      const { name, message } = this.describeError(result.error);
      result.dispose();
      throw new ScriptExecutionError(
        kindFor(name, message),
        message === "" ? name : `${name}: ${message}`,
      );
    }
    result.dispose();
  }

  /** The `name` and `message` an interpreter error carries. */
  private describeError(error: QuickJSHandle): {
    name: string;
    message: string;
  } {
    const read = (key: string): string => {
      const prop = this.context.getProp(error, key);
      const value =
        this.context.typeof(prop) === "string"
          ? this.context.getString(prop)
          : "";
      prop.dispose();
      return value;
    };
    return { name: read("name"), message: read("message") };
  }

  private assertAlive(): void {
    if (this.disposed) {
      throw new ScriptExecutionError("fatal", "sandbox disposed");
    }
  }
}

/** The interpreter's own words for its failures, as our kinds. */
const kindFor = (name: string, message: string): ScriptErrorKind => {
  if (name === "InternalError") {
    if (message === "interrupted") {
      return "interrupt";
    }
    if (message === "out of memory") {
      return "memory";
    }
  }
  return "exception";
};

/** The shared interpreter module; one wasm instance per peer, whatever the number of scripts. */
let modulePromise: Promise<QuickJSWASMModule> | undefined;

/** Whether the wasm loader is running under Node rather than in a browser. */
const runningUnderNode = (): boolean =>
  typeof process !== "undefined" && process.versions?.node !== undefined;

/**
 * Loads the interpreter module. In a browser the wasm bytes are bundled as an
 * asset and handed to the loader by address — the loader's own guess from its
 * module location breaks under Vite, which rewrites that location and leaves
 * the fetch answering with a page instead of the wasm. Under Node the loader is
 * reached through the files the package ships instead.
 */
const quickjsModule = (): Promise<QuickJSWASMModule> => {
  if (!runningUnderNode()) {
    return (async () => {
      const { default: wasmUrl } =
        await import("@jitl/quickjs-wasmfile-release-sync/wasm?url");
      return newQuickJSWASMModuleFromVariant(
        newVariant(QuickJSReleaseSync, { wasmLocation: wasmUrl as string }),
      );
    })();
  }
  return (async () => {
    const { createRequire } = await import("node:module");
    const { dirname, join } = await import("node:path");
    const { pathToFileURL } = await import("node:url");
    const require = createRequire(import.meta.url);
    const jitlRoot = dirname(
      require.resolve("@jitl/quickjs-wasmfile-release-sync/package.json"),
    );
    return newQuickJSWASMModuleFromVariant({
      type: "sync",
      importFFI: () =>
        import(pathToFileURL(join(jitlRoot, "dist", "ffi.mjs")).href).then(
          (module) => module.QuickJSFFI,
        ),
      importModuleLoader: () =>
        import(
          pathToFileURL(join(jitlRoot, "dist", "emscripten-module.mjs")).href
        ).then((module) => module.default),
    });
  })();
};

/**
 * Builds one isolated sandbox: a fresh runtime and context, with `Math.random`
 * seeded and both clocks answered by the caller, so two peers that call the
 * same steps converge to the same state.
 */
export const createQuickJSSandbox = async (params: {
  /** Seed for the interpreter's `Math.random`; a place's peers all pass the same one. */
  seed: number;
  /** The shared clock `Date.now` and `engine.now` answer from. */
  now: () => number;
  /** Longest one step may run before it is interrupted, in milliseconds. */
  timeLimitMs?: number;
  /** Most memory one interpreter may allocate, in bytes. */
  memoryLimitBytes?: number;
}): Promise<ScriptSandbox> => {
  modulePromise ??= quickjsModule();
  const module = await modulePromise;

  const runtime = module.newRuntime();
  runtime.setMemoryLimit(params.memoryLimitBytes ?? 16 * 1024 * 1024);
  const context = runtime.newContext();

  const random = mulberry32(params.seed | 0);
  return new QuickJSSandbox({
    runtime,
    context,
    now: params.now,
    random,
    timeLimitMs: params.timeLimitMs ?? 250,
  });
};
