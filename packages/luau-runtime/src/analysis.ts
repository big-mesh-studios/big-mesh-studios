/**
 * Luau analysis: `Luau::autocomplete` from the pinned Analysis library, compiled to a
 * **second** WebAssembly artifact and reached through `@big-mesh-studios/luau-runtime/analysis`.
 *
 * ## Why this is a separate entry point
 *
 * Decision 8 of ADR 0060 says the type checker is a tool, never a load-path dependency.
 * The build keeps that true: `dist/luau-analysis.wasm` links `Luau.Analysis` and is
 * imported by nothing in `src/index.ts`; `dist/luau.wasm` still links only the VM and
 * the compiler. A place can be run by a peer that never downloads this file. The
 * subpath is the boundary — not a convention in a comment.
 *
 * ## The bytes are handed over, never guessed
 *
 * The same finding as `src/index.ts`: a bundler rewrites an Emscripten loader's idea of
 * its own `.wasm`, so the Node branch reads `dist/` by absolute path and the browser
 * branch fetches a `?url` asset. Neither loader lets the artifact derive a path.
 *
 * ## One session per worker
 *
 * `LuauAnalysis` owns one `Frontend` session. A worker is the isolation unit, so a
 * second editor gets a second worker rather than a session id the client has to track.
 * The C surface still numbers sessions; that is what makes a future diagnostics-only
 * session free.
 */

/** One completion entry, as the glue emits it. */
export interface LuauAnalysisCompletion {
  label: string;
  kind:
    | "property"
    | "variable"
    | "keyword"
    | "constant"
    | "type"
    | "function"
    | "module"
    | "text";
  detail?: string;
  insertText?: string;
  deprecated?: boolean;
  parentheses?: "none" | "cursorAfter" | "cursorInside";
  typeCorrect?: "none" | "correct" | "correctFunctionResult";
  replaceDotWithColon?: boolean;
}

/** The Emscripten module shape, narrowed to the analysis glue's exports. */
interface AnalysisModule {
  HEAPU8: Uint8Array;
  _malloc: (n: number) => number;
  _free: (p: number) => void;
  _analysis_create: () => number;
  _analysis_destroy: (id: number) => void;
  _analysis_set_source: (
    id: number,
    name: number,
    source: number,
    length: number,
  ) => number;
  _analysis_remove_source: (id: number, name: number) => number;
  _analysis_set_specifier: (
    id: number,
    specifier: number,
    module: number,
  ) => number;
  _analysis_clear_specifiers: (id: number) => void;
  _analysis_reset: (id: number) => void;
  _analysis_complete: (
    id: number,
    module: number,
    line: number,
    column: number,
  ) => number;
  _analysis_last_error: (id: number) => number;
  _analysis_version: () => number;
}

/** The instantiated artifact; one per worker. */
let analysisPromise: Promise<AnalysisModule> | undefined;

const runningUnderNode = (): boolean =>
  typeof process !== "undefined" && process.versions?.node !== undefined;

/**
 * Loads `dist/luau-analysis.mjs` and the bytes of `dist/luau-analysis.wasm`, by host,
 * both explicitly. The two branches mirror `src/index.ts` on purpose: the failure mode
 * a loader with a guessed path produces is an abort, not a diagnostic, and it is worth
 * having exactly one shape of code to read when it happens.
 */
const loadAnalysis = (): Promise<AnalysisModule> => {
  if (runningUnderNode()) {
    return (async () => {
      const { join } = await import("node:path");
      const { readFile } = await import("node:fs/promises");
      const { fileURLToPath, pathToFileURL } = await import("node:url");
      // Resolved against this module's own location, not through a package-name
      // self-resolution that a package manager may or may not link.
      const here = fileURLToPath(import.meta.url);
      const root = join(here, "..", "..");
      const bytes = new Uint8Array(
        await readFile(join(root, "dist", "luau-analysis.wasm")),
      );
      const spec = pathToFileURL(join(root, "dist", "luau-analysis.mjs")).href;
      const factory = (await import(spec)).default as unknown as (
        options: Record<string, unknown>,
      ) => Promise<AnalysisModule>;
      return factory({ wasmBinary: bytes });
    })();
  }
  return (async () => {
    // The `?url` is what makes this work under a dev server and a production build:
    // Vite rewrites it to the URL it serves the binary from. The mjs beside it is
    // imported statically, so the bundler moves its location with the bytes.
    const { default: wasmUrl } = await import("../dist/luau-analysis.wasm?url");
    const bytes = new Uint8Array(await (await fetch(wasmUrl)).arrayBuffer());
    const { default: factory } = await import("../dist/luau-analysis.mjs");
    return (
      factory as unknown as (
        options: Record<string, unknown>,
      ) => Promise<AnalysisModule>
    )({ wasmBinary: bytes });
  })();
};

const readCString = (mod: AnalysisModule, ptr: number): string => {
  if (ptr === 0) return "";
  const end = mod.HEAPU8.indexOf(0, ptr);
  return new TextDecoder().decode(mod.HEAPU8.subarray(ptr, end));
};

/**
 * One analysis session: a frontend, a file resolver with the bundler's specifier map,
 * and a completion entry point.
 *
 * Nothing here runs a place. It parses and type-checks text, and every failure comes
 * back as a refused completion the editor can fall back from.
 */
export class LuauAnalysis {
  private disposed = false;

  private constructor(
    private readonly mod: AnalysisModule,
    private readonly session: number,
  ) {}

  /** Create one session. The artifact is loaded once per worker. */
  static async create(): Promise<LuauAnalysis> {
    analysisPromise ??= loadAnalysis();
    const mod = await analysisPromise;
    const session = mod._analysis_create();
    if (session === 0) {
      throw new Error("luau-analysis: analysis_create failed");
    }
    return new LuauAnalysis(mod, session);
  }

  /** The pinned version, `"<tag> <commit>"`, for a bug report. */
  static async version(): Promise<string> {
    analysisPromise ??= loadAnalysis();
    const mod = await analysisPromise;
    const ptr = mod._analysis_version();
    const text = readCString(mod, ptr);
    mod._free(ptr);
    return text;
  }

  /** Replace one module's source. A syntax error is not a failure here. */
  setSource(name: string, source: string): void {
    this.checkLive();
    const module = this.write(name);
    const text = this.write(source);
    try {
      this.check(
        this.mod._analysis_set_source(
          this.session,
          module.ptr,
          text.ptr,
          text.len,
        ),
        `analysis_set_source(${name})`,
      );
    } finally {
      this.free(module);
      this.free(text);
    }
  }

  /** Remove one module, invalidating its dependents. */
  removeSource(name: string): void {
    this.checkLive();
    const module = this.write(name);
    try {
      this.check(
        this.mod._analysis_remove_source(this.session, module.ptr),
        `analysis_remove_source(${name})`,
      );
    } finally {
      this.free(module);
    }
  }

  /** Register one `require` spelling. The map is authored by the bundler. */
  setSpecifier(specifier: string, module: string): void {
    this.checkLive();
    const from = this.write(specifier);
    const to = this.write(module);
    try {
      this.check(
        this.mod._analysis_set_specifier(this.session, from.ptr, to.ptr),
        `analysis_set_specifier(${specifier})`,
      );
    } finally {
      this.free(from);
      this.free(to);
    }
  }

  /** Forget every specifier. */
  clearSpecifiers(): void {
    this.checkLive();
    this.mod._analysis_clear_specifiers(this.session);
  }

  /** Forget every source and specifier, and drop the frontend's caches. */
  reset(): void {
    this.checkLive();
    this.mod._analysis_reset(this.session);
  }

  /**
   * Complete `module` at a 0-based `line` and a **UTF-8 byte** `column`.
   *
   * The byte column is the caller's job: CodeMirror counts UTF-16 code units and Luau
   * counts bytes, so a line with `"é"` before the caret would land in the wrong place.
   * `apps/spacescape/src/places/editor/luau-analysis.ts` performs that conversion.
   */
  complete(
    module: string,
    line: number,
    column: number,
  ): LuauAnalysisCompletion[] {
    this.checkLive();
    if (
      !Number.isInteger(line) ||
      !Number.isInteger(column) ||
      line < 0 ||
      column < 0
    ) {
      return [];
    }

    const name = this.write(module);
    try {
      const ptr = this.mod._analysis_complete(
        this.session,
        name.ptr,
        line,
        column,
      );
      const text = readCString(this.mod, ptr);
      this.mod._free(ptr);
      return this.parse(text);
    } finally {
      this.free(name);
    }
  }

  /** Destroy the session. Idempotent, and it never aborts on a second call. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.mod._analysis_destroy(this.session);
  }

  private parse(text: string): LuauAnalysisCompletion[] {
    const payload = JSON.parse(text) as {
      items?: LuauAnalysisCompletion[];
      error?: string;
    };
    if (payload.error) {
      throw new Error(payload.error);
    }
    return payload.items ?? [];
  }

  private write(text: string): { ptr: number; len: number } {
    const bytes = new TextEncoder().encode(text);
    // One extra byte for the terminating NUL: module names, specifiers and error
    // strings cross as C strings even though sources carry an explicit length.
    const ptr = this.mod._malloc(bytes.length + 1);
    this.mod.HEAPU8.set(bytes, ptr);
    this.mod.HEAPU8[ptr + bytes.length] = 0;
    return { ptr, len: bytes.length };
  }

  private free(value: { ptr: number }): void {
    this.mod._free(value.ptr);
  }

  private takeError(): string {
    const ptr = this.mod._analysis_last_error(this.session);
    const text = readCString(this.mod, ptr);
    this.mod._free(ptr);
    return text;
  }

  private check(status: number, what: string): void {
    if (status === 0) return;
    const detail = this.takeError();
    throw new Error(
      detail
        ? `luau-analysis: ${what} failed: ${detail}`
        : `luau-analysis: ${what} failed`,
    );
  }

  private checkLive(): void {
    if (this.disposed) throw new Error("luau-analysis: session is disposed");
  }
}
