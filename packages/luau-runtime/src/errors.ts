/**
 * The error the host catches, and the kinds it branches on.
 *
 * Same shape as `ScriptExecutionError` in `apps/spacescape/src/places/interpreter.ts` —
 * that file is the seam this package is built to sit beside, and the Phase 1 parity test
 * asserts they agree rather than trusting the comment. `compile` is the one kind Luau
 * adds: the TS sandbox never compiled on the load path (esbuild did), while here the
 * bundle step hands back syntax errors the way QuickJS hands back nothing — because here
 * the VM *is* the compiler.
 */

export type ScriptErrorKind =
  /** Ran past its deadline. The glue's interrupt hook. */
  | "interrupt"
  /** Asked for more memory than the cap allows. */
  | "memory"
  /** Recursed past what the VM allows, in Luau frames or C frames. Catchable — the
   * probe proves it, and if it ever stops being catchable this kind is where we learn. */
  | "stack"
  /** The bundle did not compile: a syntax error, in `message` with the line. */
  | "compile"
  /** The script threw. Whatever it threw is in `message`. */
  | "exception"
  /** The interpreter could not run the code at all. */
  | "fatal";

export class ScriptExecutionError extends Error {
  readonly kind: ScriptErrorKind;

  constructor(kind: ScriptErrorKind, message: string) {
    super(message);
    this.name = "ScriptExecutionError";
    this.kind = kind;
  }
}
