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
  /** Heading in radians; absent where the world does not report one. */
  readonly yaw?: number;
  /** Hit points the player has left; absent where the world does not report them. */
  readonly health?: number;
  /** The most hit points the player can hold; absent where the world does not report it. */
  readonly maxHealth?: number;
  /** The team the player is on, or "" for none; absent where the world has no teams. */
  readonly team?: string;
}

/** A value a script may hang on an entity under a name. */
export type AttributeValue = string | number | boolean;

/**
 * Which players a remembered value belongs to: one in this place, everyone in
 * this place, or the signed-in account across every place.
 */
export type DataScope = "player" | "global" | "account";

/** A value a place may remember: a string, a finite number, or a boolean. */
export type DataValue = string | number | boolean;

/** One player's score on a leaderboard, keyed by the player string a script's own values use. */
export interface LeaderboardEntry {
  readonly player: string;
  readonly value: number;
}

/** One scripted figure as a script's own queries see it. */
export interface EntitySnapshot {
  readonly id: string;
  readonly kind: "npc" | "prop";
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  /** The place model file the figure wears, or "" for the world's own pick. */
  readonly model: string;
  readonly name: string;
  readonly tags: readonly string[];
  readonly attributes: Readonly<Record<string, AttributeValue>>;
}

/** Where a ray first met the world, and what it met. */
export interface RaycastHit {
  /** What the ray hit first: terrain, a scripted figure, or a player. */
  readonly kind: "block" | "npc" | "prop" | "player";
  /** The point of first contact, in world units. */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** The face normal at the contact, in world axes. */
  readonly nx: number;
  readonly ny: number;
  readonly nz: number;
  /** How far along the ray the contact lies, in world units. */
  readonly distance: number;
  /** The entity or player id, or "" when the contact is terrain. */
  readonly id: string;
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
  /** The block id at (`x`, `y`, `z`), or 0 for air. */
  getBlockAt(x: number, y: number, z: number): number;
  /** The scripted figure `id` names, or null when there is none. */
  getEntity(id: string): EntitySnapshot | null;
  /** Every scripted figure in the box `min` to `max`, inclusive, each corner's components smallest first, in id order. */
  getEntitiesInBox(
    min: readonly [number, number, number],
    max: readonly [number, number, number],
  ): EntitySnapshot[];
  /** Every scripted figure within `radius` of (`x`, `y`, `z`), in id order. */
  getEntitiesInSphere(
    x: number,
    y: number,
    z: number,
    radius: number,
  ): EntitySnapshot[];
  /** Every scripted figure carrying `tag`, in id order. */
  getEntitiesWithTag(tag: string): EntitySnapshot[];
  /** The player `did` names, or null when they are not in the place. */
  getPlayer(did: string): LivePlayer | null;
  /** Every player in the box `min` to `max`, inclusive, in the order `getPlayers` gives. */
  getPlayersInBox(
    min: readonly [number, number, number],
    max: readonly [number, number, number],
  ): LivePlayer[];
  /** The DID of the player on this peer, or "" when they are not signed in. */
  getLocalPlayer(): string;
  /** The value the script set for `did` under `key`, or null when there is none. */
  getPlayerValue(did: string, key: string): number | null;
  /** The value the place remembers under `scope`/`key` for `player`, or undefined. */
  getData(scope: DataScope, player: string, key: string): DataValue | undefined;
  /** The players ranked by a remembered `key`, highest first, ties by player, at most `count`. */
  getDataLeaderboard(
    key: string,
    count: number,
  ): Array<{ player: string; value: DataValue }>;
  /** The players ranked by `key`, highest first, ties by player string, at most `count` of them. */
  getLeaderboard(key: string, count: number): LeaderboardEntry[];
  /** Where a ray from `origin` along `direction` first meets the world, or null within `maxDistance` world units. */
  raycast(
    origin: readonly [number, number, number],
    direction: readonly [number, number, number],
    maxDistance: number,
  ): RaycastHit | null;
  /** The walkable route from `from` to `to`, as world-unit waypoints, or null when none exists within the bounds. */
  findPath(
    from: readonly [number, number, number],
    to: readonly [number, number, number],
    options?: { maxNodes?: number; maxCells?: number },
  ): Array<[number, number, number]> | null;
}

/** `T` with only `K` required; every other property stays optional. */
export type RequireOnly<T, K extends keyof T> = Required<Pick<T, K>> &
  Partial<Omit<T, K>>;
