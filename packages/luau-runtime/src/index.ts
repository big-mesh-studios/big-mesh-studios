/**
 * The Luau runtime: official Luau compiled to WebAssembly, reached through the glue
 * surface Phase 0 exists to freeze.
 *
 * ## What this package is
 *
 * The engine half of the Luau plan (`docs/luau-scripting-plan.md`): the pinned source
 * (`pin.txt`, `vendor/`), the thin C surface (`glue/`), the committed artifact
 * (`dist/`), and these typed bindings. It deliberately knows nothing about places,
 * bundles, or effects — those are Phase 1's `luau-bundle.ts` / `luau-interpreter.ts`,
 * which will build on this. Voxelscape can point at the same pinned binary for the same
 * reason.
 *
 * ## The glue surface
 *
 * ```
 * state_new(cap, seed)  state_close  compile  load  call  set_deadline
 * step  eval  resume  thread_status  handler_count  thread_count
 * last_error  top_string  close_error  mem_used  version
 * ```
 *
 * plus the C→JS trampoline for the five bridge members (`dispatch`, `query`, `onTick`,
 * `now`, `random`), whose JS half is `glue/bridge-library.js`. Numbers in, strings out,
 * nothing crosses as an object — the same rule ADR 0015 draws, with one exception
 * smaller: no guest function ever crosses into JS at all; the host calls guest
 * functions through `step` and `resume`, which is the seam the plan's coroutine example
 * needs.
 *
 * ## Why the binary is handed over, not fetched
 *
 * ADR 0015's second finding: a bundler rewrites an Emscripten loader's idea of where
 * its own `.wasm` lives, and the failure is an uncatchable abort under Vitest while
 * working perfectly under a dev server. So the bytes are always supplied explicitly —
 * read from `dist/` by absolute path under Node, fetched through a `?url` asset import
 * in the browser — and the loader is never allowed to guess. `luau-probe.html` exists
 * because the browser half of that claim needs a real page to prove.
 */

import { ScriptExecutionError, type ScriptErrorKind } from "./errors";

export { ScriptExecutionError };
export type { ScriptErrorKind };

export { mulberry32 } from "./mulberry32";

/** The statuses of glue.cpp's frozen table. Mirrored, not guessed. */
const STATUS_OK = 0;
const STATUS_LOAD = 1;
const STATUS_DEADLINE = 3;
const STATUS_MEMORY = 4;
const STATUS_STACK = 5;
const STATUS_FATAL = 6;
const STATUS_YIELD = 7;

/** The eval modes of glue.cpp's `call_loaded`. */
const CALL_TEXT = 1;
const CALL_THREAD = 2;

/** `lua_Type` values from lua.h — enough to tell "nothing" from "empty string". */
const LUA_TNIL = 0;

/** The Emscripten module shape, narrowed to what the glue actually exports. */
interface LuauModule {
  HEAPU8: Uint8Array;
  _malloc: (n: number) => number;
  _free: (p: number) => void;
  _state_new: (capBytes: number, seed: number) => number;
  _state_close: (id: number) => void;
  _compile: (
    id: number,
    src: number,
    len: number,
    outPtr: number,
    outLen: number,
  ) => number;
  _load: (id: number, bc: number, len: number) => number;
  _set_deadline: (id: number, budgetMs: number) => void;
  _call: (id: number) => number;
  _step: (
    id: number,
    clock: number,
    clockLen: number,
    events: number,
    eventsLen: number,
  ) => number;
  _eval: (
    id: number,
    src: number,
    len: number,
    withEngine: number,
    mode: number,
  ) => number;
  _resume: (
    id: number,
    thread: number,
    arg: number,
    argLen: number,
    hasArg: number,
  ) => number;
  _thread_status: (id: number, thread: number) => number;
  _handler_count: (id: number) => number;
  _thread_count: (id: number) => number;
  _top_type: (id: number) => number;
  _last_error: (id: number) => number;
  _top_string: (id: number) => number;
  _close_error: () => number;
  _mem_used: (id: number) => number;
  _version: () => number;
}

/**
 * The JS side of the bridge: what a state's engine table reaches.
 *
 * `onTick` is not here — it registers the function VM-side and the host drives it
 * through `step`. That is the shape the plan's coroutine example needs, and it is one
 * fewer thing than the TypeScript sandbox ever handed over.
 */
export interface BridgeHost {
  /** Answers `engine.dispatch(tag, payloadJson)` with `""` or a refusal. */
  dispatch(tag: string, payload: string): string;
  /** Answers `engine.query(name, argsJson)`. */
  query(name: string, args: string): string;
  /** Answers `engine.now()` — the shared clock, in milliseconds. */
  now(): number;
  /** Answers `engine.random()` — the host's seeded generator, not the VM's. */
  random(): number;
}

/** Options for one state. Defaults are the ADR 0015 values until the spike replaces them with measurements. */
export interface StateOptions {
  /** Seed for the VM's `math.random*`, per plan decision 5. */
  readonly seed: number;
  /** What the five engine members reach. */
  readonly host: BridgeHost;
  /** Guest heap budget. `0` means uncapped — probe-only; see `DEFAULT_MEMORY_LIMIT_BYTES`. */
  readonly memoryLimitBytes?: number;
}

export const DEFAULT_MEMORY_LIMIT_BYTES = 16 * 1024 * 1024;

/** What one `resume` call did. `finished` means the thread ended; `yielded` means it is waiting. */
export type ResumeOutcome =
  | { readonly status: "finished" | "yielded"; readonly value: string }
  | {
      readonly status: "error";
      readonly kind: ScriptErrorKind;
      readonly message: string;
    };

/** One instantiated module, and the state→host map its bridge library reads. */
interface LoadedModule {
  readonly mod: LuauModule;
  readonly hosts: Map<number, BridgeHost>;
}

/**
 * The interpreter binary, shared by every state in the peer.
 *
 * **One module rather than one per place, the way `interpreter.ts` does it** — the wasm
 * is immutable once instantiated and a peer running four places must not pay for it
 * four times; the *state* is what carries per-place caps, and those live inside the
 * module.
 */
let modulePromise: Promise<LoadedModule> | undefined;

const runningUnderNode = (): boolean =>
  typeof process !== "undefined" && process.versions?.node !== undefined;

/**
 * Loads `dist/luau.mjs` and the bytes of `dist/luau.wasm`, by host, both explicitly.
 *
 * The two branches are ADR 0015's finding, ported: neither may let the Emscripten
 * loader derive the binary's location from its own module location, because a bundler
 * moves that and the loader finds out in an abort rather than a diagnostic. The Node
 * branch reads the file itself; the browser branch fetches a `?url` asset Vite does
 * rewrite correctly. Either way the bytes arrive as `wasmBinary`.
 */
const loadGlue = (): Promise<LoadedModule> => {
  if (runningUnderNode()) {
    return (async () => {
      const { join } = await import("node:path");
      const { readFile } = await import("node:fs/promises");
      const { fileURLToPath, pathToFileURL } = await import("node:url");
      // Resolved against **this module's own location**, not through a
      // `require.resolve` of the package's name: self-resolution depends on the
      // package manager choosing to link a workspace package into its own
      // `node_modules`, and pnpm's answer to that has moved across versions. The
      // file beside the file that names it cannot move independently.
      const here = fileURLToPath(import.meta.url);
      const root = join(here, "..", "..");
      const bytes = new Uint8Array(
        await readFile(join(root, "dist", "luau.wasm")),
      );
      // A computed specifier: the literal would be resolved and rewritten by exactly
      // the pipeline that cannot be trusted with it — which is allowed here because
      // this branch only ever runs under Node, where there is no bundler in motion.
      const spec = pathToFileURL(join(root, "dist", "luau.mjs")).href;
      const factory = (await import(spec)).default as (
        options: Record<string, unknown>,
      ) => Promise<LuauModule>;
      const hosts = new Map<number, BridgeHost>();
      const mod = await factory({ luauHosts: hosts, wasmBinary: bytes });
      return { mod, hosts };
    })();
  }
  return (async () => {
    // The `?url` is what makes this work under a dev server and a production build:
    // Vite rewrites it to the URL it will actually serve the binary from. The mjs
    // beside it is imported statically, so the bundler moves its location *with* the
    // bytes rather than under them — which is the half ADR 0015 got wrong first.
    const { default: wasmUrl } = await import("../dist/luau.wasm?url");
    const bytes = new Uint8Array(await (await fetch(wasmUrl)).arrayBuffer());
    const factory = (await import("../dist/luau.mjs")).default as unknown as (
      options: Record<string, unknown>,
    ) => Promise<LuauModule>;
    const hosts = new Map<number, BridgeHost>();
    const mod = await factory({ luauHosts: hosts, wasmBinary: bytes });
    return { mod, hosts };
  })();
};

/**
 * One Luau state: a sandbox with the caps set, reached only through the glue exports.
 *
 * **Strings cross, through the heap; nothing else does.** Every C string a call hands
 * back is copied and freed before the TS call returns, so no pointer outlives the
 * expression that produced it.
 */
export class LuauState {
  private constructor(
    private readonly loaded: LoadedModule,
    private readonly id: number,
    private disposed = false,
  ) {}

  /** Create a state with the caps and a host attached. */
  static async create(options: StateOptions): Promise<LuauState> {
    modulePromise ??= loadGlue();
    const loaded = await modulePromise;
    const id = loaded.mod._state_new(
      options.memoryLimitBytes ?? DEFAULT_MEMORY_LIMIT_BYTES,
      options.seed | 0,
    );
    if (id === 0)
      throw new Error(
        "luau-runtime: state_new failed (see README: caps below the VM's startup cost abort rather than report)",
      );
    loaded.hosts.set(id, options.host);
    return new LuauState(loaded, id);
  }

  /** The pinned version string: `"<luau tag> <commit>"`, from the built module itself. */
  static async version(): Promise<string> {
    modulePromise ??= loadGlue();
    const { mod } = await modulePromise;
    const ptr = mod._version();
    const text = readCString(mod, ptr);
    mod._free(ptr);
    return text;
  }

  /** The last `state_close` that failed, "" if none did — see `dispose`. */
  static closeError(): Promise<string> {
    modulePromise ??= loadGlue();
    return modulePromise.then(({ mod }) => {
      const ptr = mod._close_error();
      const text = readCString(mod, ptr);
      mod._free(ptr);
      return text;
    });
  }

  /** Compile with the pinned options. A syntax error is *not* thrown here — see `load`. */
  compile(source: string): Uint8Array {
    this.checkLive();
    const bytes = new TextEncoder().encode(source);
    const src = this.mod._malloc(bytes.length);
    const out = this.mod._malloc(8);
    try {
      this.mod.HEAPU8.set(bytes, src);
      // compile only fails when the compiler cannot allocate; syntax errors ride
      // inside the module and announce themselves at load, with a real message.
      this.throwIfFailed(
        this.mod._compile(this.id, src, bytes.length, out, out + 4),
      );
      const ptr = heapU32(this.mod, out);
      const len = heapU32(this.mod, out + 4);
      return this.mod.HEAPU8.slice(ptr, ptr + len);
    } finally {
      this.mod._free(src);
      this.mod._free(out);
    }
  }

  /** Load bytecode as the program, compiled from the body of `function(engine) … end`. */
  load(bytecode: Uint8Array): void {
    this.checkLive();
    const bc = this.mod._malloc(bytecode.length);
    try {
      this.mod.HEAPU8.set(bytecode, bc);
      this.throwIfFailed(this.mod._load(this.id, bc, bytecode.length));
    } finally {
      this.mod._free(bc);
    }
  }

  /** Arm a step budget on the VM's clock; `0` clears it. Call before each `call`/`step`. */
  setDeadline(budgetMs: number): void {
    this.checkLive();
    this.mod._set_deadline(this.id, budgetMs);
  }

  /** Run the loaded program. */
  call(): void {
    this.checkLive();
    this.throwIfFailed(this.mod._call(this.id));
  }

  /** Run every registered handler once, inside one budget. */
  step(clockJson: string, eventsJson: string): void {
    this.checkLive();
    const clock = this.write(clockJson);
    const events = this.write(eventsJson);
    try {
      this.throwIfFailed(
        this.mod._step(this.id, clock.ptr, clock.len, events.ptr, events.len),
      );
    } finally {
      this.free(clock);
      this.free(events);
    }
  }

  /**
   * Evaluate source as the body of `function(engine) … end`, and answer its first
   * returned value as text. `undefined` when the program returned nothing or nil.
   *
   * **A host tool, not a place facility** — the same note as `Interpreter.evaluate`:
   * the tests and the probe ask the VM questions it has no other way to answer.
   */
  evalText(source: string, withEngine = false): string | undefined {
    this.checkLive();
    const status = this.evalRaw(source, withEngine, CALL_TEXT);
    if (status !== STATUS_OK)
      throw new ScriptExecutionError(kindOf(status), this.takeError());
    const text = this.takeTop();
    // nil and "" cross the boundary as the same bytes; `top_type` tells them
    // apart, so a place author's `engine.dispatch` refusal of "" reads as the
    // empty string it is rather than as a script that returned nothing.
    return this.mod._top_type(this.id) === LUA_TNIL ? undefined : text;
  }

  /** Evaluate without reading a result. */
  eval(source: string, withEngine = false): void {
    this.checkLive();
    this.throwIfFailed(this.evalRaw(source, withEngine, 0));
  }

  /**
   * Evaluate source and store the thread it produces for host-driven `resume`.
   *
   * This is the seam the plan's example rests on: the guest creates the coroutine, the
   * executor resumes it *inside a synchronous step*, and the deadline charges every
   * thread the same budget. Returns the thread's index as the glue counted it.
   */
  evalThread(source: string, withEngine = false): number {
    this.checkLive();
    this.throwIfFailed(this.evalRaw(source, withEngine, CALL_THREAD));
    return this.mod._thread_count(this.id);
  }

  /** Resume a stored thread with one optional string argument. */
  resume(threadIndex: number, arg?: string): ResumeOutcome {
    this.checkLive();
    const value = arg === undefined ? null : this.write(arg);
    try {
      const status = this.mod._resume(
        this.id,
        threadIndex,
        value?.ptr ?? 0,
        value?.len ?? 0,
        value ? 1 : 0,
      );
      if (status === STATUS_YIELD || status === STATUS_OK) {
        return {
          status: status === STATUS_YIELD ? "yielded" : "finished",
          value: this.takeTop(),
        };
      }
      return {
        status: "error",
        kind: kindOf(status),
        message: this.takeError(),
      };
    } finally {
      if (value) this.free(value);
    }
  }

  /**
   * The VM's coroutine status: 1 suspended, 2 resumable-by-another, 3 finished,
   * 4 finished-with-error; 0 for a thread that is currently running (not observable
   * from here), -1 for "the host could not ask".
   */
  threadStatus(threadIndex: number): number {
    this.checkLive();
    return this.mod._thread_status(this.id, threadIndex);
  }

  /** How many handlers the loaded program registered. */
  get handlerCount(): number {
    this.checkLive();
    return this.mod._handler_count(this.id);
  }

  /** Guest bytes currently against the memory cap. */
  memUsed(): number {
    this.checkLive();
    return this.mod._mem_used(this.id);
  }

  /**
   * Free the state. **A failure here is the finding of ADR 0015's stack row told in
   * this VM** — `closeError()` answers it afterwards, because a state that cannot be
   * freed has nowhere to put its own error.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.mod._state_close(this.id);
    this.loaded.hosts.delete(this.id);
  }

  private get mod(): LuauModule {
    return this.loaded.mod;
  }

  // -- internals ------------------------------------------------------------

  private evalRaw(source: string, withEngine: boolean, mode: number): number {
    const src = this.write(source);
    try {
      return this.mod._eval(
        this.id,
        src.ptr,
        src.len,
        withEngine ? 1 : 0,
        mode,
      );
    } finally {
      this.free(src);
    }
  }

  private write(text: string): { ptr: number; len: number } {
    const bytes = new TextEncoder().encode(text);
    const ptr = this.mod._malloc(bytes.length);
    this.mod.HEAPU8.set(bytes, ptr);
    return { ptr, len: bytes.length };
  }

  private free(value: { ptr: number }): void {
    this.mod._free(value.ptr);
  }

  private takeTop(): string {
    const ptr = this.mod._top_string(this.id);
    const text = readCString(this.mod, ptr);
    this.mod._free(ptr);
    return text;
  }

  private takeError(): string {
    const ptr = this.mod._last_error(this.id);
    const text = readCString(this.mod, ptr);
    this.mod._free(ptr);
    return text;
  }

  private throwIfFailed(status: number): void {
    if (status === STATUS_OK) return;
    throw new ScriptExecutionError(kindOf(status), this.takeError());
  }

  private checkLive(): void {
    if (this.disposed) throw new Error("luau-runtime: state is disposed");
  }
}

/** The status → kind table of `errors.ts`, written once. */
const kindOf = (status: number): ScriptErrorKind => {
  switch (status) {
    case STATUS_DEADLINE:
      return "interrupt";
    case STATUS_MEMORY:
      return "memory";
    case STATUS_STACK:
      return "stack";
    case STATUS_LOAD:
      return "compile";
    case STATUS_FATAL:
      return "fatal";
    default:
      return "exception";
  }
};

const heapU32 = (mod: LuauModule, ptr: number): number =>
  mod.HEAPU8[ptr] |
  (mod.HEAPU8[ptr + 1] << 8) |
  (mod.HEAPU8[ptr + 2] << 16) |
  (mod.HEAPU8[ptr + 3] << 24);

const readCString = (mod: LuauModule, ptr: number): string => {
  if (ptr === 0) return "";
  const end = mod.HEAPU8.indexOf(0, ptr);
  return new TextDecoder().decode(mod.HEAPU8.subarray(ptr, end));
};
