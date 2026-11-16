/**
 * A seeded `Math.random`, so two peers drawing the same place agree.
 *
 * This is `apps/spacescape/src/places/interpreter.ts`'s `mulberry32`, and it must stay
 * identical to it: the parity test (`apps/spacescape`'s Phase 1 suite, and the
 * `spike.test.ts` reference vector here) pins both to the same canonical output. A
 * change to the generator would change every place's world on every peer with nothing
 * on screen to say so, which is the exact sentence written over the TypeScript twin's
 * version of this comment — and it is why the vectors live in a test rather than in a
 * spec someone might read loosely.
 *
 * `mulberry32`: thirty-two-bit state, no dependencies, and — the property that matters
 * here — the *same sequence for the same seed on every machine*, since it is defined
 * entirely in terms of `Math.imul`, `>>>` and `|0`.
 *
 * Not security-reviewed and not claimed to be. A place script has no access to anything
 * worth attacking it for.
 */
export const mulberry32 = (seed: number): (() => number) => {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
