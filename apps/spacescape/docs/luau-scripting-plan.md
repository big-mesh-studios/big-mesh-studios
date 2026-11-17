# Places in Luau: a second scripting language

**What this is.** The work, in order, to offer place authors Luau alongside TypeScript, on
top of the QuickJS sandbox that ADR 0015 established. Written down because it is longer than
a context window and because the reasoning — which VM, which caps, which determinism
guarantees — decides more files than any single phase does.

**Why at all.** Not speed. A place script runs inside a 250 ms step budget and the actual
work happens in the engine; Luau-in-wasm and QuickJS-in-wasm are peers for this workload and
the difference is irrelevant. The reason is **coroutines**, and the evidence is our own
sample place: `spacescape-places/animal-hospital/main.ts` spends roughly 200 of its lines on
`ActionSpec` / `JourneyNode` / `compileJourney` / `perform()` — a hand-rolled coroutine in
generators, with type casts, because the interpreter's promise job queue is never pumped (by
design: nothing may suspend against a world that then moves; ADR 0015). In Luau the same
journey is the language's own:

```lua
local co = coroutine.create(function()
  ctx.walkTo(-267.0, -15.0)
  local outcome = ctx.waitAtCounter() -- blocks "linearly"; really yields
  if outcome == "served" then
    ctx.waitInBed()
  end
end)
```

The executor `coroutine.resume`s the thread **inside a synchronous step**, so the step model,
the event order, and the ADR 0016 fold are untouched. The ceremony just stops being the
author's problem. Secondary draw: Roblox modders already write this language.

## Source material

|                                   |                                                                         |
| --------------------------------- | ----------------------------------------------------------------------- |
| The seam to reuse                 | `src/places/interpreter.ts` — the `Interpreter` interface               |
| The boundary that must not change | `src/places/bridge.ts` — `GuestBridge`, five members                    |
| The bundler to parallel           | `src/places/bundle.ts` — its three reproducibility rules                |
| The ADRs that bind us             | 0015 (sandbox), 0016 (fold recomputation), 0018 (guest lib), 0021 (zip) |
| The probe to mirror               | `places-probe.html` + `interpreter.test.ts` (20 tests)                  |
| The showcase to port              | `animal-hospital/main.ts` — the `-200 lines` ad                         |

## The VM, and what we are not choosing

No Luau WASM engine is benchmarked against QuickJS in a way that matters here. The field as
found (Nov 2026):

| Candidate                                                                                        | Verdict                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Official Luau + own Emscripten glue** (precedent: `luau-lang/playground` `wasm/build.sh`)      | **Pick.** Battle-tested VM, MIT, and we control the allocator, the hook, and what globals exist. ~a few hundred lines of C.                                                                                                                                                                                                                                      |
| `luau-web` / `luau-interop` (npm, MIT)                                                           | Probe it in the spike for API ideas, but it is a **fork** with a rewritten execution API; ADR 0015's whole lesson is that caps we cannot measure are caps we do not have.                                                                                                                                                                                        |
| **ulua** (Rust Luau, wasm32, JIT)                                                                | Rejected. Its headline is a JIT that cannot run in a browser, a young VM rewritten wholesale, and no embedding story for a per-place memory cap. "Fastest" was never the claim we needed; "unproven under untrusted scripts" is the claim we cannot risk.                                                                                                        |
| `@luau-rs/luau` (npm; Rust bindings over official Luau compiled to wasm; found during the spike) | Rejected, for 0015's reason rather than ulua's: its interrupt and memory surfaces are the bindings' defaults, per-`execute` and per-`LuaWorker`, with no knob for a step deadline spanning N handler resumes or a per-state allocator budget. A cap we cannot set is a cap we do not have — measured against our own, the glue won. See ADR 0060's alternatives. |

Version discipline mirrors QuickJS: **one pinned Luau commit, one prebuilt `luau.wasm`
shipped with the app** (committed artifact + recorded hash, like the `@jitl/quickjs-wasmfile-*`
pattern), so no emsdk is ever in the dev loop — the Termux/glibc lesson in ADR 0015's context.

## Decisions already taken

1. **Luau is a second `Interpreter` implementation, not a second host.** `host.load()`
   branches on the place's language; nothing downstream of `bridge.ts` is language-aware.
2. **`engine` stays a parameter in both languages.** The Luau program is the body of
   `return function(engine) … end`, compiled to bytecode. `load`/`loadstring` are stripped
   from the globals, because they are the `Function`-constructor analogue that would let code
   in global scope name `engine`.
3. **Same bridge, same wire.** No objects cross: `dispatch`/`query` take and return JSON
   strings; `onTick` registers a function; `now`/`random` are numbers. The guest library's
   Luau twin is handwritten over that contract — not transpiled.
4. **The three caps carry over by requirement, not by analogy.** Deadline via an interrupt
   hook reading `emscripten_get_now`; memory via a custom per-state allocator with a byte
   budget; stack — **measured, not assumed**: Luau's VM interprets Luau calls without
   recursing into C++, which is promising, and the spike's job is to prove unbounded
   recursion surfaces as a catchable error rather than trapping the wasm module.
5. **No `os`, no `io`, no `debug`. Isolation by construction, again.** `math.random*` is
   seeded from the place seed at load. `tick()` and friends simply do not exist.
6. **`pairs()` determinism is a property of the pinned binary, not of the language** — the
   wasm heap is deterministic, so peers running the same shipped `luau.wasm` should agree,
   but this is measured in the spike and stated honestly in the ADR. Docs tell authors to
   prefer arrays and `ipairs` regardless, exactly as Roblox tells its own.
7. **One language per place.** A manifest field, absent means TypeScript — published places
   keep loading untouched (the ADR 0021 compatibility rule).
8. **The type checker is a tool, never a load-path dependency.** ADR 0016 dies the moment a
   fold depends on analysis; analysis wasm is lazy-loaded editor chrome only.

## ADR 0060 to write first — it settles everything else

**ADR 0060 — Luau is an optional second place language, and its guarantees are the pinned
binary's.** Contents: the decision above, the spike's measurements (stack behavior under
recursion, cap values, `pairs()` repeatability across fresh states, wasm size), the
version-pinning rule, and the two open questions below resolved.

## Open questions

- (a) State plainly that a Luau place's reproducibility is **versioned against our shipped
  wasm binary**, peer-app-version skew being the one divergence source; same regime QuickJS
  is already in, but said out loud this time.
- (b) Whether public places require `--!strict` + annotations — more predictable authored
  behavior and better editor diagnostics, at the cost of welcoming authors who skip types.

## The phases

### Phase 0 — the spike (this is what ADR 0015 did, and why it worked)

> **Status: complete.** The spike lives in `packages/luau-runtime/` (its README is the
> manual): official Luau pinned at `0.747` / `c87565b8…`, ~700 lines of C glue, a
> committed `luau.wasm` — **257 KiB gzipped, roughly half QuickJS's, not the 1–2 MB
> guessed below** — and `src/spike.test.ts` asserting all of it (24 claims, all green).
> ADR 0060 is written with the measurements and is the authority now; this box is only
> the signpost.
>
> The headline finding, and the reason the spike was run: unbounded Luau recursion
> surfaces as a catchable `stack overflow` at **19 997 frames**, and that number is
> **identical on Node, the browser main thread, and a browser module worker**. The VM
> grows CallInfo on its own heap rather than racing the host's stack, so — unlike
> QuickJS — there is no host-side stack cap to set and the window does not move between
> hosts. **There is no Luau successor to `DEFAULT_STACK_LIMIT_BYTES`.** The three caps,
> `pairs()` repeatability, engine-random/mulberry32 agreement, and the coroutine-charge
> claim all hold on all three hosts.
>
> The showcase port is `src/places/guest/place-api.luau` +
> `src/places/demo/animal-hospital.luau` — 816 lines to 578, the journey ceremony 107 to
> 26 — and its two dispatch traces (788 effects) match byte-for-byte, the fold property
> on a real place. **It is a shipped built-in demo now**, listed at `/place:demos` as
> `animal-hospital`: the Phase 1 runtime seams it needed arrived early
> (`luau-bundle.ts`, `luau-interpreter.ts`, the host's extension branch, `DemoPlace.levels`),
> and `demos.test.ts` holds it to the same nine assertions as every other place plus a
> claim of its own — the patient demonstrably walks, on a coroutine the VM resumes.
>
> Exit criteria met: the measurements exist, ADR 0060 carries them, and the glue surface
> is frozen (`packages/luau-runtime/README.md`).

A probe before a single product file changes: build official Luau to wasm with a thin C glue
exporting exactly `state_new(cap) / state_close / compile / load_bytecode / call / set_deadline`,
plus the C→JS trampoline for the five bridge functions. Prove, in Node under vitest and in
`luau-probe.html` in a real browser:

- the three caps, one table row per cap, the ADR 0015 way — with the _recursion_ row
  measured on a browser main thread, a worker, and Node, because that window moved last time
  between hosts;
- isolation: the absent-names probe extended to Luau (`os`, `io`, `debug`, `load`,
  `loadstring`, `require`-of-anything-not-in-the-map);
- coroutines: `resume` driven from the host inside one step, threads charged to the step
  budget, one runaway thread cannot buy a place more time than a handler-less one;
- determinism: two fresh states, same source + seed ⇒ identical dispatch trace, repeated,
  and the `pairs()` case specifically;
- numbers: wasm bytes gzipped, compile-on-load ms for `place-api.luau` + a demo-sized main.

Exit: the measurements exist, ADR 0060 is written with them, and the glue surface is frozen.

### Phase 1 — the runtime

> **Partly cut early, by the demo.** `luau-bundle.ts`, `luau-interpreter.ts`, the
> `guest/place-api.luau` twin, and the host's branch exist and are tested —
> `luau-bundle.test.ts`, `luau-interpreter.test.ts`, and the hospital's run through the
> nine `demos.test.ts` assertions plus its own claim. The language signal today is the
> entry's extension, so the `place-file.ts` row is deferred until a manifest needs to
> state it independently. What remains: the mirror suites below, `limits.ts`' Luau
> budget, and the parity test — the Luau library covers the hospital's vocabulary today,
> not all of `place-api.ts`'s.
>
> **The demo also opens in the editor.** `/place:load animal-hospital` adopts its project
> into the editor (`demoProject` in `demos.ts`), so `/place:editor` shows `main.luau`, its
> level and its models — the code that is running is the code being read. It now renders as
> Luau: the shared `CodeMirror` takes a `language` prop, and a `.luau` document gets
> `@fazelstudio/codemirror-lang-luau` — a native Lezer grammar with highlighting,
> indentation, folding, and the package's keyword/global completion. `solid-codemirror` adds
> the document's own identifiers and standard-library members on top, which are the honest
> completions available without semantic analysis. The worker remains TypeScript's alone; a
> `.luau` path is still not something it can parse.

| File                              | What it is                                                                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/luau-runtime/`          | new workspace package: `luau.wasm` + typed bindings                                                                                                                                               |
| `src/places/luau-bundle.ts`       | the `bundle.ts` twin: sorted module ids, pinned compile options, one-chunk `require` shim, guest library prepended, per-file syntax errors. Byte-identical across peers, by the same three rules. |
| `src/places/guest/place-api.luau` | handwritten mirror of `guest/place-api.ts` over `GuestBridge`                                                                                                                                     |
| `src/places/luau-interpreter.ts`  | implements `Interpreter`; owns caps, handlers, step loop                                                                                                                                          |
| `src/places/host.ts`              | `load()` picks the interpreter from the manifest                                                                                                                                                  |
| `src/places/place-file.ts`        | `language?: "typescript" \| "luau"`, extension checks in `scripts`/`entry`, `.luau` accepted                                                                                                      |
| `src/places/limits.ts`            | Luau source + compile budgets                                                                                                                                                                     |

Tests: mirror the `interpreter.test.ts` suite (caps, isolation, parameter), mirror
`bundle.test.ts` (reproducibility, refusal rules), host round-trip with a real `.luau` place,
cross-instance fold equality in `place-registry`/session tests.

### Phase 2 — the editor and the docs

- Language picker; `main.luau` template whose starting code **is** the coroutine journey
  pattern, so the payoff is the first thing an author sees.
- `.luau` in `guest-library-files.ts`: `spacescape.d.luau` so annotations resolve.
- Luau highlighting in `solid-codemirror` (the playground's CM6 Luau mode is prior art);
  syntax/compile diagnostics come free — bundling already compiles. **Highlighting and
  textual completion are in:** the grammar is `@fazelstudio/codemirror-lang-luau`, and the
  pane picks it from the `.luau` extension. **Type-aware completion is in too**, through a
  second lazy artifact (`luau-analysis.wasm`) built from the same pin and kept off the
  load path, as decision 8 requires; the editor worker and fallback ladder are described
  in `luau-autocomplete-plan.md`. Diagnostics and hover are the remaining Phase 3
  candidates on that artifact.
- place-reference gets a Luau view of the API surface, and the cookbook gains the journeys
  page. `animal-hospital` ported to Luau as the showcase; the diff is the announcement.

### Phase 3 — optional IDE chrome

Lazy-load the analysis half (diagnostics, autocomplete, hover — same capability split as the
official playground) behind an editor-only import, tens of MB staying out of the main
bundle, and never touching the load path (decision 8).

**Autocomplete is implemented as its own artifact.** `luau-autocomplete-plan.md` records
the design; the shipped version is:

- `packages/luau-runtime/glue/analysis.cpp` and a second CMake target produce
  `dist/luau-analysis.wasm` (3.38 MB, 1.13 MB gzipped) from the same pin. `dist/luau.wasm`
  is byte-identical — the second target did not touch the execution link line.
- `src/analysis.ts` is behind the `./analysis` subpath and is never imported by
  `src/index.ts`.
- `apps/spacescape/src/places/editor/luau-analysis.worker.ts` owns a session; the client
  is lazy, coalesces requests, and falls back to the textual sources after a timeout or an
  error.
- The editor source completes member access, standard-library members, the guest API
  through `require("spacescape")`, cross-file members, and `require("…")` specifiers. The
  `typeCorrect`/`parentheses`/dot-to-colon fields are mapped to CodeMirror options.

Diagnostics and hover are deliberately left open; the artifact's `Frontend::check` returns
both, but where they appear is a separate UX question.

## Risks, honestly listed

1. **The stack cap is the whole ADR 0015 horror story repeated in a new VM.** If wasm Luau
   recursion traps instead of erroring, the fix is glue-side (frame counting in the hook),
   and the spike finds this out before four product files are written.
2. **Two guest libraries drift.** The bridge is stable (five members, JSON both ways) and
   the test that pins the TS surface (`guest/place-api.ts` — "no bundler internals in the
   bundle") gains a twin asserting every Luau export has a TS counterpart and vice versa.
3. **Wasm weight** (~1–2 MB vs QuickJS's half-MB, both cached after first load) is paid per
   app, not per place — same shared-module note as `interpreter.ts`.
4. **Coroutines invite per-frame work in threads**, which the step budget already handles —
   threads are charged; nothing new, but it should be _tested_ new.
