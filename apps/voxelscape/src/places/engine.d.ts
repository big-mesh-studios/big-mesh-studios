// The `"engine"` module's ambient types: the one place every function
// `quickjs-sandbox.ts` binds is typed, whether or not a given script calls
// it. `tsc` sees this file as part of the app's own program, so every demo
// script that imports "engine" type-checks against it directly; `project.ts`
// reads it back as text (`ENGINE_TYPES`) to feed the editor's language worker
// the same declaration for a creator's own scripts.
declare module "engine" {
  export function dispatch(tag: string, payload: string): void;
  export function log(line: string): void;
  export function now(): number;
  export function endings(): string;
  /** Every player's live position: the local player first, then connected peers. */
  export function players(): string;
  /** The terrain surface at (x, z). */
  export function heightAt(x: number, z: number): number;
  /** Whether (x, y, z) is inside solid ground. */
  export function solidAt(x: number, y: number, z: number): boolean;
  /** Whether (x, y, z) is water. */
  export function waterAt(x: number, y: number, z: number): boolean;
  export function onTick(
    fn: (clockMs: number, eventsJson: string) => void,
  ): void;
  export function onPlan(fn: (contextJson: string) => string): void;
  export const blocks: Record<string, number>;
}
