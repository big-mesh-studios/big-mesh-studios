# A model is imported by a bare name carrying a model attribute

A place script has always been able to place an NPC or a prop wearing a
model, but only by writing that model's file name as a string and trusting
it — `engine.dispatch("npc", JSON.stringify({ model: "zombie", ... }))`
type-checks the same whether `"zombie"` is a model the place actually
carries or a typo nobody catches until the place runs. This decision gives a
script a second way to name one: an import.

```ts
import zombie from "zombie" with { type: "model" };
```

The panel's language service (ADR 0029) can now generate real, per-model
types from the place's own attached bytes — `zombie.parts`/`zombie.motions`
as literal unions of that model's actual part and motion names — and the
bundler (same ADR) recognizes and compiles the same import, so a script that
uses it also runs. What `zombie` evaluates to at runtime is deliberately
inert for now: `{ name, parts, motions }`, no methods. A `Model` class
wrapping `engine` calls for actual gameplay behavior is a separate, later
decision building on this same seam.

## Why a bare name, not a path

ADR 0029 settled that an import may only ever name a project file, and
rejects "bare, absolute, parent, and protocol specifiers... with a load
error naming file and specifier." A model import is a deliberate, narrow
exception to that — but it still has to be _recognizable_ as one rather than
silently loosening the rule, so it is gated on the one thing an ordinary
project-file import never carries: a `with { type: "model" }` attribute.
Without the attribute, `import zombie from "zombie"` is rejected exactly as
it always was.

Given that it has to be an exception either way, it has to be a bare name
specifically — but not because TypeScript cannot type a relative import; it
can, precisely, the same way `typed-css-modules` types a relative
`import styles from "./button.module.css"`: generate a real sibling
declaration file (`button.module.css.d.ts`) at the exact path the specifier
resolves to, no ambient block involved. Checked against the real compiler,
that works for a model import too — a generated `zombie.d.ts` sitting next
to a script that writes `import zombie from "./zombie"` types it exactly,
with no wildcard and no suffix-matching involved at all.

What rules it out is specific to this project: every script in a place
shares one flat namespace with no folders, and a model's name can collide
outright with an authored script file of the same name. Checked directly: a
project holding both a real `zombie.ts` (an ordinary script a creator wrote,
sharing nothing with the model) and a generated `zombie.d.ts` resolves
`import zombie from "./zombie"` to the real file every time — TypeScript
prefers an actual implementation over a sibling declaration whenever both
exist, so the generated one is silently shadowed and the import fails
("Module has no default export") the moment a creator's own file happens to
share the model's name. A bare, non-relative specifier cannot collide this
way: ordinary project-file imports never use one — ADR 0029 rejects a bare
specifier outright — so there is no existing (or future) name it could ever
compete with.

## One ambient file typing every attached model, not one per import

The generated `.d.ts` (`model-dts.ts`) covers every model the place has
attached, unconditionally, rather than only the ones some script currently
imports. This falls out of the same bareness: an ambient `declare module`
block applies to the whole program once it is part of it, regardless of
which file it is registered under, so there is no reason to re-parse a
script's own text on the editor thread just to decide which blocks it
"needs." It also means opening a fresh, empty script tab for a place that
already has a model attached gets autocomplete immediately, with nothing to
wire up first.

## Considered options

- **Let the bundler resolve `./zombie` relative imports as models, keyed by
  file name, typed by a generated sibling declaration file the way
  `typed-css-modules` types a `.module.css` import.** Rejected: it reads
  naturally alongside the project's own `./` imports, and the panel could
  type it precisely — checked directly, this works with no wildcard
  involved. What breaks it is the flat, folder-less namespace every script
  in a place already shares: a model and an authored script file can carry
  the same name, and TypeScript always prefers the real file over a
  generated sibling declaration when both exist, so the model import is
  silently shadowed the moment a creator's own file happens to match it.
- **A distinct syntax, e.g. `import zombie from "model:zombie"`.** Rejected:
  it invents a URI scheme with no other meaning in this codebase, where the
  standard `with { type: ... }` attribute already exists to say exactly this
  ("resolve this specifier a different way") without a bespoke convention.
- **Generate the `.d.ts` per import rather than per attached model.**
  Rejected: it would mean parsing every script's imports on the editor
  thread just to decide what to generate, for a saving (skipping a model
  nothing imports yet) that only matters once a place attaches far more
  models than `MAX_PLACE_MODELS` allows today.

## Consequences

- `bundle.ts`'s `resolveSpecifier`/`specifiersOf` grow a second recognized
  import kind: distinct model names referenced anywhere in the project
  compile to one synthetic module each — an inert data literal, not a
  project file — resolved against the place's own attached model bytes
  (`PlaceProject.models`). A model-typed import naming a relative/absolute
  specifier, or a model the place does not carry, is refused with a
  `PlaceBundleError` naming the file and specifier, in the same voice ADR
  0029 already established.
- `bundlePlaceProject` takes the place's attached models as a third,
  defaulted parameter; every existing caller that has no model to give it
  is unaffected.
- Determinism (ADR 0026) holds without new machinery: `models` bytes are a
  fixed, synchronous input already on `PlaceProject` before bundling starts,
  and decoding them into a descriptor is a pure function of those bytes —
  two peers still produce byte-identical bundles.
- A `Model` class giving `zombie` real methods (`.play(motion)`, and
  whatever else turns out to earn its place) that call through to `engine`
  is explicit future work, not part of this decision.
