/**
 * The second interpreter: a place's Luau bundle, running, with the same three caps the
 * QuickJS file sets.
 *
 * **This implements `Interpreter`, not a second interface beside it** — plan decision 1:
 * `host.load()` branches on the language here and nothing downstream of the bridge knows
 * two languages exist. Every property `interpreter.ts` documents is asserted here with the
 * same shape, by the same right: the caps were measured in `packages/luau-runtime` (ADR
 * 0060), and this file is that measurement wearing the host's clothes.
 *
 * ## Where the two files stop being the same program, honestly
 *
 * - **`stackLimitBytes` has no Luau equivalent, and that is ADR 0060's finding rather
 *   than this file's shortcut**: Luau grows call frames on its own heap and raises its own
 *   catchable "stack overflow" — there is no host stack to cap. The option is ignored
 *   rather than honoured by a fake.
 * - **`load` may not be called twice** on one Luau interpreter. The QuickJS twin drops the
 *   previous place's handlers on a re-load; the glue's frozen surface has no handler-drop
 *   export (clearing them would mean a new C function, and ADR 0060 froze that surface with
 *   the rule that it takes a new ADR line to add one). Nothing in the host reuses an
 *   interpreter across places — `load()` constructs one per place — so the divergence is
 *   stated, guarded, and pointed at its follow-up rather than papered over.
 * - **`compile` is a `ScriptErrorKind` the QuickJS sandbox never had**: the TypeScript
 *   load path never compiled on the load path (esbuild did, earlier), while a `.luau`
 *   bundle's syntax error arrives at load, from the VM, with a line number.
 * - **`evaluate` answers strings.** The QuickJS twin `dump`ed JS values; the Luau boundary
 *   carries text, which is enough for every probe and test that reads it and is stated
 *   rather than smuggled through a `JSON.parse`.
 */

import {
  LuauState,
  ScriptExecutionError as LuauRuntimeError,
} from "@big-mesh-studios/luau-runtime";

import { MAX_LOAD_MS, MAX_STEP_MS } from "./limits";
import {
  mulberry32,
  ScriptExecutionError,
  type Interpreter,
  type InterpreterOptions,
} from "./interpreter";

/**
 * Builds one isolated Luau interpreter.
 *
 * **Same options object as `createInterpreter`**, which is the seam doing its job: the
 * host's bridge handlers, seed, and clock are language-blind, and the two differences
 * above are the whole of what the Luau half cannot wear from the TypeScript half.
 */
export const createLuauInterpreter = async (
  options: InterpreterOptions,
): Promise<Interpreter> => {
  const stepBudgetMs = options.stepBudgetMs ?? MAX_STEP_MS;
  const random = mulberry32(options.seed);

  let state = await LuauState.create({
    seed: options.seed,
    memoryLimitBytes: options.memoryLimitBytes,
    host: {
      dispatch: (tag, payloadJson) => options.onDispatch(tag, payloadJson),
      query: (name, argsJson) => options.onQuery(name, argsJson),
      now: () => options.now(),
      random: () => random(),
    },
  });

  /**
   * Runs `body` inside one step's budget.
   *
   * The deadline is armed per call and cleared after, the way `withinBudget` does it in
   * the QuickJS twin: a step that fails has spent its budget, and the next step gets a
   * fresh one — three failing steps are three budgets, the cap-not-allowance rule.
   */
  const withinBudget = <T>(body: () => T, budgetMs = stepBudgetMs): T => {
    state.setDeadline(budgetMs);
    try {
      return body();
    } finally {
      state.setDeadline(0);
    }
  };

  /**
   * One call's worth of work, translated and bounded.
   *
   * The translation is the only kind of bridging the two error classes need: the
   * *kinds* are one vocabulary (the package owns the table, this file exports it into
   * the host's class), and an `instanceof` across two module graphs is exactly the
   * comparison that would otherwise fail quietly — a throw that reaches the frame loop
   * unclassified is ADR 0015's bug, wearing a bundler seam.
   */
  const run = <T>(body: () => T, bounded: boolean | number): T => {
    try {
      return bounded === false
        ? body()
        : withinBudget(body, bounded === true ? stepBudgetMs : bounded);
    } catch (error) {
      if (error instanceof LuauRuntimeError) {
        throw new ScriptExecutionError(error.kind, error.message);
      }
      throw error;
    }
  };

  let loaded = false;
  let disposed = false;

  return {
    load(bundle: string): void {
      if (disposed) {
        throw new Error("luau-interpreter: this interpreter is disposed");
      }
      if (loaded) {
        throw new Error(
          "luau-interpreter: load() may be called once per interpreter; construct " +
            "a new one with createLuauInterpreter. The frozen glue surface has no " +
            "handler-drop export, so a re-load cannot clear the previous place's " +
            "handlers the way the QuickJS twin does — see this file's header.",
        );
      }
      loaded = true;

      // **Compile outside the armed budget, because the twin does.** The QuickJS
      // path pays esbuild in `bundlePlace`, before the interpreter exists to arm a
      // deadline; charging the compiler's wall clock against a place's own step
      // budget was the one asymmetry this seam introduced, and the hospital demo's
      // load flaked under suite-wide load precisely because of it. The VM's
      // interrupt hook could never fire *during* compiling (it is not VM execution)
      // — but the time was leaving the budget anyway.
      const bytecode = run(() => state.compile(bundle), false);
      run(() => {
        state.load(bytecode);
        state.call();
      }, MAX_LOAD_MS);
    },

    evaluate(source: string): unknown {
      return run(() => state.evalText(source, true), true);
    },

    step(clockJson: string, eventsJson: string): void {
      if (disposed) return;
      run(() => state.step(clockJson, eventsJson), true);
    },

    get handlerCount(): number {
      return disposed ? 0 : state.handlerCount;
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      state.dispose();
      // Detach so a reference cannot be walked back into the freed sandbox.
      state = undefined as never;
    },
  };
};
