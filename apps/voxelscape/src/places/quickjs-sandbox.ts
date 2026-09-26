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
import {
  VOXEL_AIR,
  VOXEL_BRICK,
  VOXEL_CLOUD,
  VOXEL_DIRT,
  VOXEL_GRASS,
  VOXEL_GREYSTONE,
  VOXEL_GLOWSTONE,
  VOXEL_ICE,
  VOXEL_LAVA,
  VOXEL_LEAVES,
  VOXEL_LOG,
  VOXEL_OBSIDIAN,
  VOXEL_SAND,
  VOXEL_STONE,
  VOXEL_WATER,
  VOXEL_WOOD,
} from "../world/voxel-store";
import {
  ScriptExecutionError,
  type DataScope,
  type RequireOnly,
  type ScriptErrorKind,
  type ScriptOutput,
  type ScriptSandbox,
  type WorldQuery,
} from "./sandbox";

/** The world-query surface this sandbox needs — every one of `WorldQuery`'s
 * functions but the shared clock is optional, since a bare interpreter
 * (a test, or a script that never asks the world anything) can go without —
 * plus the local player's held item, which the inventory owns rather than the
 * world. */
type SandboxWorldQuery = RequireOnly<WorldQuery, "getNow"> & {
  getHeldItem?: () => string;
};

/** One interpreter instance, owning one script and one run of its step budget. */
class QuickJSSandbox implements ScriptSandbox {
  private readonly context: QuickJSContext;
  private readonly runtime: QuickJSRuntime;
  private readonly effects: ScriptOutput["effects"] = [];
  private readonly logs: string[] = [];
  private readonly timeLimitMs: number;
  private readonly tickHandlers: QuickJSHandle[] = [];
  private planHandler: QuickJSHandle | undefined;
  /** The `engine` object, never installed on the global — a script reaches it only by receiving it. */
  private readonly engine: QuickJSHandle;
  /** Moment the current step must end; far in the future outside a step. */
  private deadline = Infinity;
  private disposed = false;

  constructor(
    params: SandboxWorldQuery & {
      runtime: QuickJSRuntime;
      context: QuickJSContext;
      random: () => number;
      timeLimitMs: number;
    },
  ) {
    this.runtime = params.runtime;
    this.context = params.context;
    this.timeLimitMs = params.timeLimitMs;
    // The interrupt handler runs on the interpreter's own cadence while code
    // executes; with the deadline in the future it lets everything through, so
    // only an overrunning step is ever stopped.
    params.runtime.setInterruptHandler(() => Date.now() > this.deadline);

    this.engine = this.installEngine(params.context, params);
    this.installDeterministicGlobals(params.context, params);
  }

  load(source: string): void {
    this.assertAlive();
    this.withBudget(() => {
      // The script runs as the body of a function taking `engine` as its one
      // parameter, never as a property of the interpreter's global object, so
      // a script that never reaches `engine` through an import has no way to
      // name it at all.
      const wrapped = this.context.evalCode(
        `(function (engine) {\n${source}\n});`,
        "place.js",
      );
      if (wrapped.error !== undefined) {
        const { name, message } = this.describeError(wrapped.error);
        wrapped.dispose();
        throw new ScriptExecutionError(
          kindFor(name, message),
          message === "" ? name : `${name}: ${message}`,
        );
      }
      const fn = wrapped.value;
      const result = this.context.callFunction(
        fn,
        this.context.undefined,
        this.engine,
      );
      fn.dispose();
      this.readResult(result);
    });
  }

  tick(clockMs: number, eventsJson: string): void {
    this.assertAlive();
    this.withBudget(() => {
      const clock = this.context.newNumber(clockMs);
      const events = this.context.newString(eventsJson);
      try {
        for (const handler of this.tickHandlers) {
          const result = this.context.callFunction(
            handler,
            this.context.undefined,
            clock,
            events,
          );
          this.readResult(result);
        }
      } finally {
        // A step that throws must still release the handles it built, or the
        // interpreter aborts when its runtime is freed.
        events.dispose();
        clock.dispose();
      }
    });
  }

  plan(contextJson: string): string {
    this.assertAlive();
    let output = "";
    this.withBudget(() => {
      if (this.planHandler === undefined) {
        // A place that asks for no structures never calls `engine.onPlan`.
        return;
      }
      const context = this.context;
      const argument = context.newString(contextJson);
      try {
        const result = context.callFunction(
          this.planHandler,
          context.undefined,
          argument,
        );
        if (result.error !== undefined) {
          const { name, message } = this.describeError(result.error);
          result.dispose();
          throw new ScriptExecutionError(
            kindFor(name, message),
            message === "" ? name : `${name}: ${message}`,
          );
        }
        if (context.typeof(result.value) === "string") {
          output = context.getString(result.value);
        }
        result.dispose();
      } finally {
        argument.dispose();
      }
    });
    return output;
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
    for (const handler of this.tickHandlers) {
      handler.dispose();
    }
    this.planHandler?.dispose();
    this.engine.dispose();
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
   * Builds the one `engine` object a loaded script receives. Its methods are
   * the whole host surface; each reads its arguments as host strings and
   * queues them, so nothing crosses the boundary as an object — except
   * `onTick` and `onPlan`, which keep the function handle they are given, for
   * `tick` and `plan` to call later.
   */
  private installEngine(
    context: QuickJSContext,
    time: SandboxWorldQuery,
  ): QuickJSHandle {
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
    bind("getNow", () => context.newNumber(time.getNow()));
    bind("getEndings", () =>
      context.newString(JSON.stringify(time.getEndings?.() ?? [])),
    );
    bind("getPlayers", () =>
      context.newString(JSON.stringify(time.getPlayers?.() ?? [])),
    );
    bind("getHeightAt", (x, z) =>
      context.newNumber(
        time.getHeightAt?.(context.getNumber(x), context.getNumber(z)) ?? 0,
      ),
    );
    bind("getSolidAt", (x, y, z) =>
      time.getSolidAt?.(
        context.getNumber(x),
        context.getNumber(y),
        context.getNumber(z),
      )
        ? context.true
        : context.false,
    );
    bind("getWaterAt", (x, y, z) =>
      time.getWaterAt?.(
        context.getNumber(x),
        context.getNumber(y),
        context.getNumber(z),
      )
        ? context.true
        : context.false,
    );
    bind("getBlockAt", (x, y, z) =>
      context.newNumber(
        time.getBlockAt?.(
          context.getNumber(x),
          context.getNumber(y),
          context.getNumber(z),
        ) ?? 0,
      ),
    );
    bind("getEntity", (id) =>
      context.newString(
        JSON.stringify(time.getEntity?.(context.getString(id)) ?? null),
      ),
    );
    bind("getEntitiesInBox", (ax, ay, az, bx, by, bz) =>
      context.newString(
        JSON.stringify(
          time.getEntitiesInBox?.(
            [
              context.getNumber(ax),
              context.getNumber(ay),
              context.getNumber(az),
            ],
            [
              context.getNumber(bx),
              context.getNumber(by),
              context.getNumber(bz),
            ],
          ) ?? [],
        ),
      ),
    );
    bind("getEntitiesInSphere", (x, y, z, radius) =>
      context.newString(
        JSON.stringify(
          time.getEntitiesInSphere?.(
            context.getNumber(x),
            context.getNumber(y),
            context.getNumber(z),
            context.getNumber(radius),
          ) ?? [],
        ),
      ),
    );
    bind("getEntitiesWithTag", (tag) =>
      context.newString(
        JSON.stringify(time.getEntitiesWithTag?.(context.getString(tag)) ?? []),
      ),
    );
    bind("getPlayer", (did) =>
      context.newString(
        JSON.stringify(time.getPlayer?.(context.getString(did)) ?? null),
      ),
    );
    bind("getPlayersInBox", (ax, ay, az, bx, by, bz) =>
      context.newString(
        JSON.stringify(
          time.getPlayersInBox?.(
            [
              context.getNumber(ax),
              context.getNumber(ay),
              context.getNumber(az),
            ],
            [
              context.getNumber(bx),
              context.getNumber(by),
              context.getNumber(bz),
            ],
          ) ?? [],
        ),
      ),
    );
    bind("getLocalPlayer", () =>
      context.newString(time.getLocalPlayer?.() ?? ""),
    );
    bind("getInput", () =>
      context.newString(JSON.stringify(time.getInput?.() ?? null)),
    );
    bind("getPlayerValue", (did, key) =>
      context.newString(
        JSON.stringify(
          time.getPlayerValue?.(
            context.getString(did),
            context.getString(key),
          ) ?? null,
        ),
      ),
    );
    bind("getLeaderboard", (key, count) =>
      context.newString(
        JSON.stringify(
          time.getLeaderboard?.(
            context.getString(key),
            context.getNumber(count),
          ) ?? [],
        ),
      ),
    );
    bind("getData", (scope, player, key) =>
      context.newString(
        JSON.stringify(
          time.getData?.(
            context.getString(scope) as DataScope,
            context.getString(player),
            context.getString(key),
          ) ?? null,
        ),
      ),
    );
    bind("getDataLeaderboard", (key, count) =>
      context.newString(
        JSON.stringify(
          time.getDataLeaderboard?.(
            context.getString(key),
            context.getNumber(count),
          ) ?? [],
        ),
      ),
    );
    bind("raycast", (ox, oy, oz, dx, dy, dz, maxDistance) =>
      context.newString(
        JSON.stringify(
          time.raycast?.(
            [
              context.getNumber(ox),
              context.getNumber(oy),
              context.getNumber(oz),
            ],
            [
              context.getNumber(dx),
              context.getNumber(dy),
              context.getNumber(dz),
            ],
            context.getNumber(maxDistance),
          ) ?? null,
        ),
      ),
    );
    bind("findPath", (fx, fy, fz, tx, ty, tz, maxNodes, maxCells) => {
      const nodes = context.getNumber(maxNodes);
      const cells = context.getNumber(maxCells);
      return context.newString(
        JSON.stringify(
          time.findPath?.(
            [
              context.getNumber(fx),
              context.getNumber(fy),
              context.getNumber(fz),
            ],
            [
              context.getNumber(tx),
              context.getNumber(ty),
              context.getNumber(tz),
            ],
            {
              ...(nodes > 0 ? { maxNodes: nodes } : {}),
              ...(cells > 0 ? { maxCells: cells } : {}),
            },
          ) ?? null,
        ),
      );
    });
    bind("getHeldItem", () => context.newString(time.getHeldItem?.() ?? ""));
    bind("onTick", (fn) => {
      this.tickHandlers.push(fn.dup());
      return context.undefined;
    });
    bind("onPlan", (fn) => {
      this.planHandler?.dispose();
      this.planHandler = fn.dup();
      return context.undefined;
    });
    // The block ids a plan or effect may name, keyed by the names the starter
    // script's own `engine` type declares, so a creator never hard-codes one.
    const blocks = context.newObject();
    const ids: Record<string, number> = {
      air: VOXEL_AIR,
      grass: VOXEL_GRASS,
      dirt: VOXEL_DIRT,
      water: VOXEL_WATER,
      stone: VOXEL_STONE,
      cloud: VOXEL_CLOUD,
      lava: VOXEL_LAVA,
      log: VOXEL_LOG,
      leaves: VOXEL_LEAVES,
      brick: VOXEL_BRICK,
      wood: VOXEL_WOOD,
      ice: VOXEL_ICE,
      greystone: VOXEL_GREYSTONE,
      sand: VOXEL_SAND,
      obsidian: VOXEL_OBSIDIAN,
      glowstone: VOXEL_GLOWSTONE,
    };
    for (const [name, id] of Object.entries(ids)) {
      const value = context.newNumber(id);
      context.setProp(blocks, name, value);
      value.dispose();
    }
    context.setProp(engine, "blocks", blocks);
    blocks.dispose();
    return engine;
  }

  /**
   * Replaces the interpreter's entropy and wall clock with deterministic ones,
   * so a script produces the same numbers on every peer given the same inputs.
   */
  private installDeterministicGlobals(
    context: QuickJSContext,
    time: Pick<WorldQuery, "getNow"> & { random: () => number },
  ): void {
    const random = context.newFunction("random", () =>
      context.newNumber(time.random()),
    );
    const math = context.getProp(context.global, "Math");
    context.setProp(math, "random", random);
    random.dispose();
    math.dispose();

    const now = context.newFunction("now", () =>
      context.newNumber(time.getNow()),
    );
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

/** A deterministic 32-bit PRNG (mulberry32), seeding `Math.random` for the sandbox. */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

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
export const createQuickJSSandbox = async (
  params: SandboxWorldQuery & {
    /** Seed for the interpreter's `Math.random`; a place's peers all pass the same one. */
    seed: number;
    /** Longest one step may run before it is interrupted, in milliseconds. */
    timeLimitMs?: number;
    /** Most memory one interpreter may allocate, in bytes. */
    memoryLimitBytes?: number;
  },
): Promise<ScriptSandbox> => {
  modulePromise ??= quickjsModule();
  const module = await modulePromise;

  const runtime = module.newRuntime();
  runtime.setMemoryLimit(params.memoryLimitBytes ?? 16 * 1024 * 1024);
  const context = runtime.newContext();

  const random = mulberry32(params.seed | 0);
  return new QuickJSSandbox({
    ...params,
    runtime,
    context,
    random,
    timeLimitMs: params.timeLimitMs ?? 250,
  });
};
