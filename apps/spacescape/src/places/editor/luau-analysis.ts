/**
 * The editor's client for the Luau analysis worker.
 *
 * **Lazy by construction.** The worker is not spawned until the first completion, and
 * the worker does not create the wasm artifact until the first completion either — so
 * opening a `.luau` tab costs a grammar, not three megabytes.
 *
 * **Stale answers are dropped, not queued.** A burst of keystrokes produces one visible
 * popup; the client keeps only the latest request id and rejects the older promise so
 * the editor falls back rather than flashing a result for text that has moved on.
 *
 * **A dead worker is dead for the session.** Two timeouts, a failed instantiation or an
 * `onerror` terminate it and mark analysis unavailable; every later completion rejects
 * immediately and the editor's textual source answers. That is the fallback ladder in
 * the plan, implemented in one place.
 */

import type {
  LuauAnalyzer,
  LuauCompletionItem,
} from "@big-mesh-studios/solid-codemirror";

import type {
  LuauAnalysisRequest,
  LuauAnalysisResponse,
} from "./luau-analysis-protocol";

/** The plan's first gate: a completion that takes longer than this is not useful. */
const COMPLETION_TIMEOUT_MS = 1500;

/** Two timeouts in a row mean the worker is wedged; the next open gets a fresh one. */
const MAX_CONSECUTIVE_TIMEOUTS = 2;

interface Pending {
  resolve(items: LuauCompletionItem[]): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Spawn the module worker Vite knows how to split.
 *
 * The `new URL(..., import.meta.url)` form is the one the bundler rewrites; a computed
 * string path would ship the worker source in the wrong chunk or not at all.
 */
const spawnWorker = (): Worker =>
  new Worker(new URL("./luau-analysis.worker.ts", import.meta.url), {
    type: "module",
  });

export class LuauAnalysisClient implements LuauAnalyzer {
  private worker: Worker | undefined;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private sources = new Map<string, string>();
  private specifierMap: Record<string, string> = {};
  private dead = false;
  private consecutiveTimeouts = 0;

  /** The factory is injectable so a test does not need a real Worker. */
  constructor(private readonly spawn: () => Worker = spawnWorker) {}

  /**
   * Replace the worker's view of the project.
   *
   * Called once per file-set change and on a project revision. The client stores the
   * maps either way, so a client created before the worker can be configured and then
   * lazily started with exactly this project.
   */
  configure(
    sources: Readonly<Record<string, string>>,
    specifiers: Readonly<Record<string, string>>,
  ): void {
    this.sources = new Map(Object.entries(sources));
    this.specifierMap = { ...specifiers };
    if (this.worker) {
      this.postConfigure(this.worker);
    }
  }

  /** One file changed. Sent on every keystroke, including for hidden tabs. */
  setSource(name: string, source: string): void {
    this.sources.set(name, source);
    if (this.dead || !this.worker) return;
    this.send(this.worker, { id: this.nextId++, kind: "source", name, source });
  }

  /**
   * Every `require` spelling the project accepts, for the editor's string completion.
   * `luauModuleSpecifiers` is the author; this is only the transport.
   */
  specifiers(): readonly string[] {
    return Object.keys(this.specifierMap);
  }

  /** Ask for completions at a 0-based line and a UTF-8 byte column. */
  async complete(request: {
    path: string;
    line: number;
    column: number;
  }): Promise<LuauCompletionItem[]> {
    if (this.dead) {
      throw new Error("luau-analysis: worker is unavailable");
    }

    const worker = this.ensureWorker();
    this.supersedePending();

    const id = this.nextId++;
    return new Promise<LuauCompletionItem[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.consecutiveTimeouts += 1;
        if (this.consecutiveTimeouts >= MAX_CONSECUTIVE_TIMEOUTS) {
          this.kill("completion timed out twice");
        }
        reject(new Error("luau-analysis: completion timed out"));
      }, COMPLETION_TIMEOUT_MS);

      this.pending.set(id, { resolve, reject, timer });
      this.send(worker, {
        id,
        kind: "complete",
        module: request.path,
        line: request.line,
        column: request.column,
      });
    });
  }

  /** Terminate the worker and reject anything in flight. Idempotent. */
  dispose(): void {
    this.kill("analysis was disposed");
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;

    const worker = this.spawn();
    worker.onmessage = (event: MessageEvent<LuauAnalysisResponse>) => {
      this.receive(event.data);
    };
    worker.onerror = (event) => {
      this.kill(event.message || "analysis worker failed");
    };
    worker.onmessageerror = () => {
      this.kill("analysis worker message could not be read");
    };

    this.worker = worker;
    this.postConfigure(worker);
    return worker;
  }

  private postConfigure(worker: Worker): void {
    this.send(worker, {
      id: this.nextId++,
      kind: "configure",
      sources: Object.fromEntries(this.sources),
      specifiers: this.specifierMap,
    });
  }

  private send(worker: Worker, request: LuauAnalysisRequest): void {
    worker.postMessage(request);
  }

  private receive(response: LuauAnalysisResponse): void {
    const pending = this.pending.get(response.id);
    // A configure/source failure, or an answer to a superseded request: nothing to
    // resolve, and the editor is already rendering the fallback or the newer answer.
    if (!pending) return;

    this.pending.delete(response.id);
    clearTimeout(pending.timer);

    if (response.kind === "items") {
      this.consecutiveTimeouts = 0;
      pending.resolve(response.items);
    } else {
      pending.reject(new Error(response.message));
      if (response.fatal) {
        this.kill(response.message);
      }
    }
  }

  private supersedePending(): void {
    for (const [id, pending] of this.pending) {
      this.pending.delete(id);
      clearTimeout(pending.timer);
      pending.reject(new Error("luau-analysis: completion superseded"));
    }
  }

  private kill(reason: string): void {
    if (this.dead) return;
    this.dead = true;

    const worker = this.worker;
    this.worker = undefined;
    worker?.terminate();

    this.supersedePending();
    // The reason is deliberately not stored: the editor's fallback is silent, and a
    // warning on every keystroke after a failure is worse than no warning. A caller
    // that wants the first failure logs it in `complete`'s rejection.
    void reason;
  }
}
