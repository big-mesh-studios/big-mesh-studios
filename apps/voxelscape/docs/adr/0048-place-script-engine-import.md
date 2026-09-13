# Reaching `engine` by import, and registering a script's hooks by calling it

> Superseded by ADR 0050: a script no longer writes `import * as engine from
"engine"` — `"engine"` is retired as a specifier a project file may name at
> all, folded into the single reserved `"voxelscape"` import alongside
> `createNpc`/`createProp`. The mechanism this decision introduced —
> resolving a reserved bare specifier in the bundler's own `require` shim,
> not an ambient declaration — is exactly what ADR 0050 reuses; only the name
> a script writes changed.

ADR 0027 named a global `bmsTick` as the guest's one entry point and flagged
`engine` as a bare global only because the interpreter had no module syntax
yet. This decision retires both: a script now writes `import * as engine from
"engine"` to reach the host at all, and registers its own hooks by calling
`engine.onTick(fn)` and, if it wants one, `engine.onPlan(fn)` — nothing is
found by a fixed export name.

## What a script writes now

```ts
import * as engine from "engine";

engine.onTick(function (clockMs, eventsJson) {
  // ...
});
```

`onTick` may be called more than once; every registration runs each step, in
the order the script called it. `onPlan` answers the one call `compilePlacePlan`
makes before terrain generates; the most recent registration wins. Neither
hook is required — a script that registers nothing loads without error and
the sandbox steps nothing for it, the same as a script that once defined no
`bmsTick`.

## Resolving `"engine"` in the bundler, not the interpreter

`quickjs-emscripten-core` (already the dependency `quickjs-sandbox.ts` uses)
supports real ES modules: `context.evalCode(source, name, { type: "module" })`
plus `runtime.setModuleLoader(...)` lets a script `import` a specifier the
host resolves to source text of its own choosing. A spike proved this works
end to end — a script importing `{ onTick } from "engine"` with no bare
`engine` reachable anywhere, `runtime.setModuleLoader` handing back a small
shim module for the specifier "engine".

That machinery is not what shipped. `bundle.ts` already turns a place
project's files into one script by compiling each to CommonJS and linking
them through its own `require` shim (ADR 0026); resolving the specifier
`"engine"` inside that same shim — to the sandbox's host object rather than
another project file — gets the identical property (a file that never
imports "engine" cannot reach it, because each file's compiled code runs
inside its own `new Function("module", "exports", "require", code)`, which
closes over nothing outside itself) without teaching the interpreter a second
module system that duplicates the one the bundler already has. `quickjs-sandbox.ts`
now passes its `engine` object as the one parameter of a wrapper function the
whole bundle runs inside, rather than as a property of `context.global` —
that is the only interpreter-side change; the bundle output is still a single
piece of global-scope script text.

## Considered options

- **TC39 decorators** (`@tick` above `export function render() {}`), the
  original shape floated for tagging exports. Rejected outright: stage-3
  decorators — what this repo's TypeScript (`^5.7.2`, no
  `experimentalDecorators`) implements — attach only to classes and class
  members, never to a standalone function declaration. The syntax does not
  parse for the shape that was wanted.
- **QuickJS's native module system end to end**, evaluating the whole bundle
  with `{ type: "module" }` and a `setModuleLoader` covering both `"engine"`
  and every project file. Rejected for production: it duplicates the
  specifier resolution `bundle.ts`'s own `require` shim already does, adds
  the interpreter's module loader as a second linking mechanism to keep in
  sync with the first, and buys no isolation the wrapper-parameter technique
  does not already give.
- **Reading the entry module's exports** (`entry.bmsTick`) instead of a script
  registering itself. Rejected: it keeps a magic export name, which is the
  thing being retired, and gives no way for a script to register more than
  one handler or to have a helper file register on its behalf.

## The editor's types move to one file

Every place script used to carry its own `declare const engine: { ... }`,
copied by hand into the starter script and each demo and drifting out of sync
with which functions each happened to declare. `engine.d.ts` is now the one
`declare module "engine"` block: a real file under `src/places/`, so `tsc`
checks every demo script against it directly, and `project.ts` reads it back
as text (`ENGINE_TYPES`) to feed the code-mirror language worker the same
declaration for a creator's own scripts — added to the worker's file set
alongside a project's own scripts, not inside it, so it never becomes an
editable tab.

## Consequences

- This supersedes the "Scripts are global-scope code today: `bmsTick` is a
  global, and module syntax... is not yet enabled" line in ADR 0027's
  consequences: the bundle is still one piece of global-scope script text —
  module syntax still never reaches the interpreter — but `bmsTick`,
  `bmsPlan`, and the bare `engine` global are all gone; a script says what it
  wants by importing and calling, not by naming.
- `ScriptSandbox.load`, `.tick`, and `.plan` keep the same shape, but `tick`
  now calls every registered handler in order instead of one fixed global,
  and a handler that throws stops the ones after it in that same step — a
  script wanting isolation between independent tick handlers arranges that
  itself, the interpreter does not provide it.
- A place project's compiled bundle can no longer be produced with a script
  that never imports `"engine"` yet still calls `engine.something` — that was
  already true today, since `engine` was reachable only inside the sandbox,
  but with the bare global gone a project file must state the import to use
  any part of the host surface, including `dispatch`.
