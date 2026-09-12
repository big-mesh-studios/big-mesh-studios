# Typing `engine.dispatch`'s payload against the shape its tag validates

`engine.dispatch(tag, payload)` used to take `payload` as a JSON string a
script had to build itself: `engine.dispatch("npc", JSON.stringify({ id,
x, z }))`. Three of the four built-in demo scripts had already grown their
own local `dispatch(tag, payload)` wrapper doing exactly that
`JSON.stringify` by hand, which was itself a sign the raw form was the
wrong default. `dispatch` now takes the plain object directly, typed to
the shape `effects.ts` itself validates that tag against, and stringifies
it once, in one place, before it crosses the sandbox boundary.

## Where the type comes from

`effects.ts` already defines `ParsedEffect`, a discriminated union of every
tag and the exact payload shape `isPayload` checks it against, each field
documented. `engine.d.ts` derives `dispatch`'s signature from that union
directly —

```ts
type PayloadFor<T extends EffectTag> = Extract<
  ParsedEffect,
  { tag: T }
>["payload"];
export function dispatch<T extends EffectTag>(
  tag: T,
  payload: PayloadFor<T>,
): void;
```

— rather than hand-writing a payload shape per tag inside `engine.d.ts`
itself. `effects.ts` is the only place a tag's shape is decided; this reads
it back instead of repeating it, so the two can never drift out of step the
way the five copies of `declare const engine` used to (ADR 0046).

A `declare module "engine"` block that imports another file the ordinary
way turns into a module _augmentation_ — it requires "engine" to already
exist somewhere else — rather than a fresh ambient module declaration, so
this reaches `effects.ts` through TypeScript's inline `import("./effects")`
type syntax instead of a top-level `import` statement, keeping `engine.d.ts`
itself import-free.

## Where the stringify happens

The native `dispatch` binding in `quickjs-sandbox.ts` is untouched: it still
reads a plain string, exactly as ADR 0027 requires of the sandbox boundary.
`bundle.ts`'s `require("engine")` now hands back a small wrapper built once
per bundle, whose `dispatch` does the one `JSON.stringify` call and passes
everything else through unchanged — the same place that already resolves
`"engine"` to the sandbox's host object instead of a project file (ADR
0046), so no new crossing point was added for this.

## The editor's checker needs the same types `tsc` has

`effects.ts` is a real file with real imports of its own — `CameraShot` from
`cutscene.ts`, `MotionSpec` from `motion.ts` — that the app's `tsc` resolves
for free because they all sit in the same program. The place editor's
language worker does not share that program; it only ever sees the files
`PlaceEditorPanes.tsx` feeds it. `effects.ts`, `cutscene.ts`, and
`motion.ts` are now fed to the worker the same way `engine.d.ts` already
was — alongside a project's own scripts, keyed by their real filenames, and
never rendered as an editable tab — so `dispatch`'s payload type resolves
the same way while a creator is typing as it does for `tsc`.

## Considered options

- **Per-tag overloads, hand-written in `engine.d.ts`.** Rejected: it
  reintroduces exactly the copy-and-drift risk ADR 0046 just closed, one
  layer up — `effects.ts` and `engine.d.ts` would each carry their own
  answer to "what does an `npc` effect look like."
- **Keep `payload` a string, and let a script call `JSON.stringify` itself.**
  Rejected: three of the four demo scripts had already independently
  reinvented a wrapper to avoid exactly this, and a hand-called
  `JSON.stringify` gives a creator no type checking on what they are
  sending at all.

## Consequences

- Passing a payload that does not match its tag's shape is now a
  type-checking error while a creator is editing, not a silently dropped
  effect discovered only by watching nothing happen in the world.
- `effects.ts`'s validators (`isPayload` and its helpers) are unaffected —
  they still run on the untrusted JSON text the sandbox boundary carries;
  the type on `dispatch` is a promise the trusted TypeScript side checks,
  not a replacement for validating what an actual script sends.
- The three demo scripts' own hand-rolled `dispatch` wrappers are gone; they
  called `engine.dispatch` directly, which is now exactly as convenient as
  the wrapper was, and properly typed besides.
