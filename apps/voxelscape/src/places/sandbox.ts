// The seam a place's creator code runs behind, and the vocabulary its inputs
// and outputs cross in. A sandbox isolates one script: the code is loaded once,
// then stepped deterministically — every peer hands it the same shared clock
// and the same event batch each step — and anything it wants to do to the world
// is spoken, never performed: effects are queued as JSON payloads for the
// trusted side to validate and apply. The sandbox itself has no access to the
// world; it only has the handful of functions this module declares.

/** One effect a script asked for, still to be validated and applied. */
export interface ScriptEffect {
  /** What the effect is, in the world host's vocabulary. */
  tag: string;
  /** The effect's arguments, as a JSON string. */
  payload: string;
}

/** What a step left behind for the trusted side to read. */
export interface ScriptOutput {
  effects: ScriptEffect[];
  /** Lines the script asked to be logged, in the order it logged them. */
  logs: string[];
}

/** Why a step or a load failed inside the sandbox. */
export type ScriptErrorKind = "interrupt" | "memory" | "exception" | "fatal";

/** A step or load that failed, with the sandbox's own word for why. */
export class ScriptExecutionError extends Error {
  readonly kind: ScriptErrorKind;

  constructor(kind: ScriptErrorKind, message: string) {
    super(message);
    this.name = "ScriptExecutionError";
    this.kind = kind;
  }
}

/**
 * One isolated script. Implementations pair a real sandbox (today the QuickJS
 * interpreter compiled to WASM) with the deterministic contract every peer must
 * be able to reproduce.
 */
export interface ScriptSandbox {
  /**
   * Loads the script's source. The code runs with the deterministic globals in
   * place and registers its hooks by importing `engine` and calling
   * `engine.onTick(fn)` — `fn` is then called each step with the shared clock
   * and a JSON array of the events added since the last step — and, if it
   * wants one, `engine.onPlan(fn)`.
   *
   * @throws {ScriptExecutionError} When the code throws, overruns its step
   * budget while loading, or exceeds its memory.
   */
  load(source: string): void;
  /**
   * Advances the script one step: calls every function registered with
   * `engine.onTick`, in the order it was registered, with `clockMs` and
   * `eventsJson`. Both are supplied by the caller and must be identical on
   * every peer for the script to converge.
   *
   * @throws {ScriptExecutionError} When a handler throws, overruns the step
   * budget, or exceeds the memory limit. A handler after the one that threw
   * does not run.
   */
  tick(clockMs: number, eventsJson: string): void;
  /**
   * Runs the function most recently registered with `engine.onPlan(fn)`,
   * called with `contextJson`, and returns the string it returns — the
   * structure plan a world is generated with. A script that never calls
   * `engine.onPlan` returns an empty string, which the caller reads as no
   * structures.
   *
   * @throws {ScriptExecutionError} When the handler throws, overruns the step
   * budget, or exceeds the memory limit.
   */
  plan(contextJson: string): string;
  /** Whatever the script emitted since the last drain, cleared by the call. */
  drain(): ScriptOutput;
  /** Releases the interpreter and its memory. A disposed sandbox is unusable. */
  dispose(): void;
}

/** One player's live position, by the did that identifies them. */
export interface LivePlayer {
  readonly did: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * The world a script reads from, answered by the trusted side and kept
 * injectable for determinism — every peer must hand a script the same
 * answers given the same shared clock. Declared once here so a script's own
 * "voxelscape" module (`voxelscape.d.ts`), the sandbox that binds it
 * (`quickjs-sandbox.ts`), and the two layers above it that answer it
 * (`ScriptHostParams`, `ScriptConsoleParams`) all reuse the same six
 * signatures instead of each retyping them; how many of the six a given
 * layer requires versus leaves optional is that layer's own choice, made
 * with `RequireOnly` below.
 */
export interface WorldQuery {
  /** The shared time source for this sandbox, in milliseconds. */
  getNow(): number;
  /** Every ending this place has defined. */
  getEndings(): string[];
  /** The terrain surface at (`x`, `z`). */
  getHeightAt(x: number, z: number): number;
  /** Whether (`x`, `y`, `z`) is inside solid ground. */
  getSolidAt(x: number, y: number, z: number): boolean;
  /** Whether (`x`, `y`, `z`) is water. */
  getWaterAt(x: number, y: number, z: number): boolean;
  /** Every player's live position: the local player first, then connected peers. */
  getPlayers(): LivePlayer[];
}

/** `T` with only `K` required; every other property stays optional. */
export type RequireOnly<T, K extends keyof T> = Required<Pick<T, K>> &
  Partial<Omit<T, K>>;
