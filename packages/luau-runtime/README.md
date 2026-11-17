# @big-mesh-studios/luau-runtime

The official Luau VM compiled to WebAssembly, reached through a thin C glue whose surface
Phase 0 of `apps/spacescape/docs/luau-scripting-plan.md` exists to freeze, with the three
caps ADR 0015 made load-bearing set where they can be seen. ADR 0060 is the decision; this
README is the manual.

## Consume it (no toolchain required, ever)

```ts
import { LuauState, mulberry32 } from "@big-mesh-studios/luau-runtime";

const state = await LuauState.create({
  seed: 20260901,
  host: {
    dispatch: (tag, payloadJson) => "", // "" means carried out; a sentence refuses
    query: (name, argsJson) => "null",
    now: () => sharedClockMs,
    random: mulberry32(20260901),
  },
});

state.load(
  state.compile(
    `return function(engine)\n  engine.dispatch("log", "\\"hi\\"")\nend`,
  ),
);
state.setDeadline(250); // one step budget over everything it runs
state.call();
state.step("1700000000000", "[]"); // every onTick handler, one budget, synchronous
state.dispose();
```

`dist/luau.wasm` (≈693 KiB, 257 KiB gzipped), `dist/luau.mjs`, and the hand-written
`dist/luau.d.mts` that types the factory are **committed artifacts** with the four built
files' SHA-256 recorded in `pin.txt`. Tests, dev, and CI load them as bytes and hand them
to the loader — nothing in the daily loop touches emscripten, cmake, or the Luau source,
which is the point of the pattern ADR 0015 learned the hard way. This package is the one
exception to the repository's blanket `dist` ignore, and `build.sh --check` refuses a tree
where the artifacts exist but are not tracked — a fresh clone is the thing the promise is
for.

```
pnpm test          # src/spike.test.ts and src/analysis.test.ts
pnpm check-types   # tsc over src/ and probe/
pnpm check-wasm    # dist/ matches pin.txt, in one line
pnpm probe         # then open /luau-probe.html in a real browser
```

### Type-aware completion (the analysis tool)

`@big-mesh-studios/luau-runtime/analysis` is a **separate, lazy artifact** built from the
same pin: `dist/luau-analysis.wasm` (3.38 MB, 1.13 MB gzipped) and `.mjs`, plus the
hand-written `dist/luau-analysis.d.mts`. It links `Luau.Analysis` and provides
`LuauAnalysis.complete`; nothing in `src/index.ts` imports it, so a peer that runs places
never downloads it. That separation is ADR 0060 decision 8 kept by the build.

```ts
import { LuauAnalysis } from "@big-mesh-studios/luau-runtime/analysis";

const analysis = await LuauAnalysis.create();
analysis.setSource("door.luau", "return { open = function() end }");
analysis.setSpecifier("./door", "door.luau");
analysis.setSource("main.luau", 'local door = require("./door")\ndoor.');
analysis.complete("main.luau", 1, 5); // [{ label: "open", kind: "property", … }]
analysis.dispose();
```

The specifier map is authored by the bundler (`luauModuleSpecifiers` in
`apps/spacescape/src/places/luau-bundle.ts`), so the C++ resolver is an exact lookup and
the module rules live in one place. Positions are **0-based lines and UTF-8 byte
columns**, which is what Luau's lexer counts; the editor client performs that conversion.

`build.sh` builds both executables in one cmake tree, records all four hashes, and
`--check` verifies both pairs. The VM's bytes are unchanged by the second target — that
is the boundary's proof, not a claim.

## The probe

`luau-probe.html` prints the claims `spike.test.ts` cannot make from a Node process: that
the committed binary loads through a real bundler's asset pipeline, and where the
recursion window sits on a browser **main thread** and in a **worker** — the three hosts
of the plan's stack row, because QuickJS's window moved between them (ADR 0015) and
Luau's does not. Run it with `pnpm probe`, open the printed URL. As of this writing all
claims pass on this machine's browser: **both browser hosts print the same 19 997 frames
Node does**, catchable, state alive, freed clean.

Each claim prints _before_ it runs: a page that goes dark mid-list dies naming the row
that trapped, which is the artefact to bring back. The worker row is built so that any
failure _answers_ rather than going silent, because "a silent worker" is exactly the
symptom a wasm trap would produce and the harness must never be able to fake it. (The
first run taught that the hard way: the page constructed the worker but never sent it a
start message, so the worker waited out the watchdog politely doing nothing — a
harness bug reading precisely like the engine failure the row exists to catch.)

## Rebuilding (the only place emscripten is reached)

```
pnpm build-wasm    # ./build.sh — needs emcc + emcmake + cmake + ninja + network
```

`build.sh` clones `vendor/luau` at exactly the tag and commit in `pin.txt` and refuses
any other checkout; it writes the artifacts to `dist/` and records their hashes back into
`pin.txt`, so a mismatch between source pin, artifact, and hash fails `--check` loudly.
`vendor/` and `build/` are gitignored — the source clone is a build cache, not content —
while `dist/` is committed, the one directory this package overrides the repository's
blanket ignore for: a built artifact that is not in the repository is a build nobody else
can run.
A pin bump is: edit `pin.txt` (tag + commit), run `build-wasm`, re-run `pnpm test`, and
the two rows of the caps table that move get a sentence in a later ADR that supersedes
this one — records are not edited after the fact, which is also the rule for binaries.

CI never rebuilds. When a GitHub-hosted rebuild is wanted, the shape is a
`workflow_dispatch` job with [emscheckout/emsdk] on ubuntu-latest opening a PR against
`dist/` — that job belongs to Phase 1's wiring, and this package will work without it.

## The glue surface (frozen by ADR 0060)

`glue/glue.cpp` — the whole C side, ~700 lines, in four parts:

| part     | what it is                                                                                                                                                                                                                                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| states   | `state_new(cap, seed)` / `state_close` / `close_error`; the caps are armed here                                                                                                                                                                                                                                   |
| programs | `compile` / `load` / `call` / `step` — the bundle's pipeline; syntax errors surface at `load` with the compiler's line-naming message                                                                                                                                                                             |
| probes   | `eval(id, src, len, withEngine, mode)` / `resume` / `thread_status` / `top_string` / `top_type` / `handler_count` / `thread_count` / `mem_used` / `version` — the host's answer channel, so the spike tests the VM rather than a product surface                                                                  |
| bridge   | the five engine members as C closures on a read-only table handed to the program as its **parameter**, not a global; the JS halves of `dispatch`/`query`/`now`/`random` live in `glue/bridge-library.js` (an Emscripten JS library), and `onTick` never crosses into JS at all — `step` drives what it registered |

Status contract: `0 OK · 1 LOAD · 2 RUNTIME · 3 DEADLINE · 4 MEMORY · 5 STACK · 6 FATAL ·
7 YIELD`, classified in C once, mapped to `ScriptErrorKind` in TypeScript once.

Compile options are pinned in `compile()`/`eval()` (optimizationLevel 1, debugLevel 1) —
one frozen struct is the bundler's reproducibility rule before there is a bundler.

## What this package is not

No places, no bundles, no manifest awareness, no editor chrome. The app's
`luau-bundle.ts` / `luau-interpreter.ts` import this, and the animal-hospital demo loads
through them to `/place:demos` — so product does reference this package, and the `.luau`
files it measures against (`guest/place-api.luau`, `demo/animal-hospital.luau`) are the
same files the app ships: one copy, measured where it runs. Voxelscape may depend on
this package for the same reasons the app does — the pin is the guarantee, and the
guarantee does not care which app is holding it.

## Known limits, from the spike

- `state_new`'s library opens run before any protected call exists: a cap below the VM's
  measured idle (~214 KiB) fails at construction as a thrown error rather than a
  polite `memory` kind. The default 16 MiB has 78× headroom; nothing ships near that floor.
- `luau_compile` allocates from the module heap, not the capped guest heap. Source-size
  bounds are Phase 1's `limits.ts` job; this glue bounds the _runtime_, the way QuickJS
  bounds its runtime.
- The VM's error model here is `LUA_USE_LONGJMP=1` (set in `glue/CMakeLists.txt`), so
  guest errors never rely on wasm exception support; the _compiler_'s C++ exceptions are
  caught at the glue boundary (`-fwasm-exceptions` link) and reported as `FATAL`, which
  is the difference between a refusal and a dead peer.

[emscheckout/emsdk]: https://github.com/marketplace/actions/emsdk
