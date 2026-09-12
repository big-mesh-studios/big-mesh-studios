// The `"engine"` module's ambient types: the one place every function
// `quickjs-sandbox.ts` binds is typed, whether or not a given script calls
// it. `tsc` sees this file as part of the app's own program, so every demo
// script that imports "engine" type-checks against it directly; `project.ts`
// reads it back as text (`ENGINE_TYPES`) to feed the editor's language worker
// the same declaration for a creator's own scripts. `PlaceEditorPanes.tsx`
// feeds the worker `effects.ts`, `cutscene.ts`, and `motion.ts` too, so
// `dispatch`'s payload type resolves the same way there as it does for `tsc`.
//
// This file carries no top-level `import` of its own — an inline
// `import("./effects")` type reaches the same file without one — because a
// top-level import would turn `declare module "engine"` below from a fresh
// ambient module declaration into an augmentation of one that would then
// need to already exist elsewhere.
declare module "engine" {
  type EffectTag = import("./effects").EffectTag;
  type ParsedEffect = import("./effects").ParsedEffect;

  /** The shape `tag` validates against, per `effects.ts`'s own `ParsedEffect`. */
  type PayloadFor<T extends EffectTag> = Extract<
    ParsedEffect,
    { tag: T }
  >["payload"];

  /**
   * Queues one effect for the trusted side to validate and apply. `payload`
   * is typed to the shape `tag` itself validates against — `dispatch`
   * stringifies it before it crosses the sandbox boundary.
   */
  export function dispatch<T extends EffectTag>(
    tag: T,
    payload: PayloadFor<T>,
  ): void;
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
