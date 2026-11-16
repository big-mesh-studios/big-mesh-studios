# 0060 — A place may also be written in Luau, and its guarantees are the pinned binary's

**Status: accepted.** The spike's measurements are below, taken on this machine, and the
recursion window is identical on all three hosts the plan named — Node, browser main
thread, browser module worker: 19 997 catchable frames on each. `luau-probe.html`
(`pnpm probe` in `packages/luau-runtime`) carries the browser halves and passes outright.
See the end of the measurements section.

## Context

ADR 0015 settled that a place's code runs in a sandbox whose three caps are set and
measured. `docs/luau-scripting-plan.md` proposes a second language for that sandbox — not
for speed, which is a wash between the two wasm VMs for a 250 ms step, but for
coroutines. The evidence was our own sample place: `animal-hospital/main.ts` spends a
hundred and seven lines on `ActionSpec` / `JourneyNode` / `compileJourney` / `perform` —
a hand-rolled coroutine in generators, with the mapped-union machinery that makes its
result types survive, because the QuickJS promise queue is never pumped (by ADR 0015's
design: nothing may suspend against a world that then moves). In Luau the same journey is
the language's own: `coroutine.yield` returns the outcome, and the executor is
`coroutine.resume`, called inside a synchronous step.

The spike ran before a single product file changed, the way 0015's did, because the
question it had to answer was 0015's own question in a new VM: **does unbounded recursion
in Luau-in-wasm surface as a catchable error, or as a wasm trap?** The answer turned out
to be better than the question assumed, and it is in the table below.

The engine is the official Luau (`luau-lang/luau`, tag `0.747`, commit
`c87565b8b0db5d5d5bfd2b8b00ad6573e5d06d9f`) compiled to WebAssembly with a thin C glue —
`packages/luau-runtime/` — so that the allocator, the interrupt hook, the opened globals,
and the compile options are each one knob we can see, which is the shape every cap in
0015 needed to be.

## Decision

**Luau is an optional second place language, a second implementation of the `Interpreter`
seam, and its reproducibility is a property of the pinned binary we ship.** Everything
downstream of `bridge.ts` stays language-blind.

1. `packages/luau-runtime` ships a **committed, prebuilt `luau.wasm`** with its SHA-256
   recorded in `pin.txt` and asserted by `build.sh --check` — the `@jitl/quickjs-*`
   discipline, so no dev loop, and no CI job, ever runs emscripten. The artifact
   self-reports its pin: `version()` answers `"0.747 c87565b8…"`, compiled in, not
   assumed from the build.
2. **The engine stays a parameter.** The bundle is the body of `return function(engine)
… end`, compiled to bytecode; `load`/`loadstring` are removed from the globals and
   `require` is the bundler shim's local, never a VM global.
3. **The bridge is unchanged, in both directions.** Strings and numbers only; the Luau
   guest library is a handwritten twin (`src/places/guest/place-api.luau`), not a
   transpilation — and Phase 1's parity test asserts the two libraries export the same
   surface, because the plan's risk of drift is real and a comment is not a check.
4. **The three caps carry over by requirement, not by analogy** — and the measurements
   are below, not the reasoning.
5. **No `os`, no `io`, no `debug`, no `require` of anything outside the module map.**
   `math.random*` is seeded from the place seed at state creation.
6. **`pairs()` iteration order is a property of the pinned binary.** Measured, and
   stated honestly: it is repeatable across fresh states of this artifact (below), and
   the docs will still tell authors to prefer arrays and `ipairs` — the same sentence
   Roblox tells its own authors, held to the same standard.
7. **One language per place.** The entry is the declaration — a `.luau` entry compiles
   and runs as Luau, anything else as TypeScript — so an absent signal means TypeScript
   and every published place keeps loading untouched (ADR 0021's compatibility rule).
   The plan's manifest-level `language` field is a later Phase 1 addition; until it
   exists, the extension is the whole of the signal, the host branches on it at one
   seam, and nothing below that seam knows there are two.
8. **The type checker is a tool, never a load-path dependency** — this build does not
   compile Analysis at all, which is what makes the rule structural rather than hopeful.
9. **The two open questions the plan left are resolved.** (a): stated plainly — a Luau
   place's reproducibility is versioned against _our shipped binary_; app-version skew is
   the only divergence source, and a peer logs the artifact's own version string with its
   session so a skew is nameable when it happens. This is the regime QuickJS is already
   in, said out loud this time. (b): **public places do not require `--!strict`.** The
   spike answered this empirically: the animal-hospital port is written unannotated, and
   the strict mode's first fight is the JSON decoder — a handwritten decoder's output has
   no inferable shape, which is the shape _every_ place's `require("spacescape")` hands it.
   A load path that refuses a working program because the author skipped types is a load
   path that depends on analysis, which decision 8 already forbids. The editor's
   diagnostics (Phase 3) work on unannotated code too.

## The measurements

All from `packages/luau-runtime/src/spike.test.ts` (24 claims, this machine, Node v24)
and `luau-probe.html` for the browser halves. The state defaults: 250 ms step budget via
the interrupt hook, 16 MiB memory cap via the custom allocator, no stack cap — see row 3.

**The caps.**

| cap      | mechanism                                                                                                                                                                                                                                 | measured on Node                                                                                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| deadline | `set_deadline(budgetMs)` → interrupt hook vs `emscripten_get_now`, trips at VM and string-library safepoints only (GC assists defer to the next VM hit, so the collector is never exited mid-cycle)                                       | kind `interrupt`, stopped 200 ms into a 200 ms budget; three failing steps cost three budgets, not one allowance                                                                                                           |
| memory   | `state_new(cap, seed)` installs a counting allocator; `NULL` past the cap is Luau's catchable `not enough memory`                                                                                                                         | kind `memory`, refused at 803 104 bytes of a 1 048 576 cap (one 1 KB block short — the refusal granularity is the block that did not fit, and the byte count means what it says)                                           |
| stack    | none, because the VM's own bound is the catchable one: nested Luau calls grow heap CallInfo arrays to `LUAI_MAXCALLS` (20 000) and raise `stack overflow`; nested C re-entry is bounded at `LUAI_MAXCCALLS` (200) with `C stack overflow` | honest depth **19 997 frames**, catchable, state usable after, dispose clean. The wasm C stack is _not_ the recursion's limit here — that is the difference from 0015's finding, and it is the row that had to be measured |

The QuickJS horror row does not repeat: there is no value of a host-side stack cap to set,
because unbounded Luau recursion never reaches the host's stack. What must never _be_
reached is the C stack via bridge re-entry, and the bridge does not re-enter the VM —
Phase 1 keeps it that way by construction, one direction per call.

**Coroutines.** A guest thread resumed by the host yields and finishes linearly
(`yielded("at-counter")` → `finished("served:next")`); a thread that spins instead of
yielding is charged to the armed step budget — kind `interrupt`, no fresh allowance per
resume; and 1 000 nested `coroutine.resume` levels **complete without error and without a
trap** (`LUAI_MAXCCALLS` never fires; resume does not consume a C frame per level). The
plan's bet that the VM interprets Luau calls without recursing into C++ held.

**Determinism.** Same seed ⇒ `math.random` sequences identical across fresh states (the
first eight floor-draws for 20260901: 930184,755616,300222,481434,391685,329588,319219,412105).
`pairs()` over a seeded 16-key table gives the **same order in 10 fresh states**, and twice
in one state. The host's seeded generator and the guest's `engine.random` agree digit for
digit at 2³¹ quantisation — the same `mulberry32` sequence the TypeScript sandbox draws.
The full demo ran its identical event script on two fresh states and produced
**byte-identical dispatch traces**, 788 effects each.

**Size and speed.**

|                     |                                                                                                                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `luau.wasm`         | 709 648 bytes; **263 008 gzipped (-9)** — roughly half QuickJS's gzipped half-megabyte, not the 1–2 MB the plan guessed; shared per peer, not per place                                                  |
| idle state          | 213 568 guest bytes; 1 000 strings later, 336 304 — the 16 MiB cap's "runtime plus a modest script" sentence keeps its units, with ~78× headroom over idle                                               |
| the animal hospital | 29 439 source bytes → 21 518 bytecode, **compile 10.3 ms, load 0.2 ms** on a phone; its first 521 steps run in well under a frame budget each                                                            |
| syntax error        | `[string "place.luau"]:1: Expected identifier when parsing expression, got '='` — line-naming, from the compiler the load path already runs (0018's "bundling already compiles" holds in both languages) |

**The payoff, measured.** The port lands at 578 lines beside the original's 816, and the
107 lines of journey ceremony become 26 lines of functions that yield. The executor
survives in both files — walking a patient 0.3 units a frame is the place's behaviour, not
its plumbing — but the _type_ machinery was the plumbing, and it is gone.

**The browser rows.** The plan required the recursion window on a main thread and in a
worker as well as Node, because that window moved between hosts for QuickJS. For Luau the
mechanism is host-independent by construction — the depth is the VM's own heap bound
(`LUAI_MAXCALLS` against heap-grown CallInfo), not a race against a host stack — and the
probe page carries the two claims to the hosts that prove or refute it. They hold: the
main thread and the worker each print **19 997 frames, the same as Node**, catchable,
state alive, freed clean, on a build instantiating the binary in ~100 ms; deadline
stopped 202 ms into a 200 ms budget; nine isolation probes nil; the `pairs()` trace
identical across fresh states; a thread resumed inside a step charged to that step's
budget. The window that moved for QuickJS does not move for Luau, and the reason is in
the mechanism rather than in the numbers: there is no host stack in the race.

The harness earns one sentence of its own: the worker row's _first_ run timed out
because the page constructed the worker and never sent it the start message, so the
worker waited 30 s for a nudge that had not been written. It is named here because the
symptom it faked — a silent worker on the recursion row — is exactly the symptom a
C-stack trap would produce, and a probe that can lie about the one row it exists for is
the QuickJS lesson arriving through the probe instead of the VM. The worker now answers
even when it fails, so silence means only what the claim fears.

## The frozen glue surface

`packages/luau-runtime/glue/glue.cpp` exports, and Phase 1 builds no new C surface without
a new ADR line:

```
state_new(capBytes, seed)  state_close(id)  close_error()
compile(id, src, len, outPtr, outLen)       -> counted bytecode; syntax errors ride inside
load(id, bytecode, len)                     -> luau_load; errors surface here, named
set_deadline(id, budgetMs)                  -> 0 clears; armed per call
call(id)                                    -> the loaded program, with engine
step(id, clockJson, clockLen, eventsJson, eventsLen)
                                             -> every handler, one budget
eval(id, src, len, withEngine, mode)         -> mode: discard | text | thread
resume(id, threadIndex, argJson, argLen, hasArg) -> the host-driven coroutine seam
thread_status(id, threadIndex)  handler_count(id)  thread_count(id)
last_error(id)  top_string(id)  top_type(id)  mem_used(id)  version()
```

plus the five-member bridge trampoline (`luau_dispatch`, `luau_query`, `luau_now`,
`luau_random` as wasm imports in `bridge-library.js`; `onTick` lands VM-side in a registry
table and is _driven_ by `step`, so no guest function ever crosses into JS — one exception
smaller than the TypeScript sandbox's). The status contract is
`0 OK · 1 LOAD · 2 RUNTIME · 3 DEADLINE · 4 MEMORY · 5 STACK · 6 FATAL · 7 YIELD`.
Compile options are pinned in one struct (optimizationLevel 1, debugLevel 1, everything
else default) — the bundler's reproducibility rule, enforced where the compiler is.

Known limits, stated: `state_new`'s library opens are the one path without a protected
landing, so a cap below the VM's ~214 KB idle cost fails loudly at construction rather
than erroring politely (the API throws; it does not corrupt); and `luau_compile` allocates
from the _module's_ heap, not the capped guest heap — source-size bounds are Phase 1's
`limits.ts` job, not a property of this glue.

## Consequences

- **The Phase 1 seams are cut.** `luau-bundle.ts` and `luau-interpreter.ts` exist,
  `host.load()` branches on the entry's extension (decision 7), and nothing downstream of
  `bridge.ts` learns that two languages exist. The `require` shim the spike tests
  hand-build now has its proper owner, with the reproducibility rules copied from
  `bundle.ts`.
- The animal-hospital Luau port is a **shipped built-in demo**: `demos.ts` carries its
  files, level and models, `DemoPlace` grew a `levels` field for it, and `demos.test.ts`
  runs it through the same nine assertions as every other place — including "reaches the
  same state every time it is loaded," which is ADR 0016's determinism now asserted over
  the Luau path. The file diff against the TypeScript is the announcement.
- The guest library needed `utf8` for its JSON decoder's `\uXXXX` escapes, so the opened
  library set is `base, coroutine, string, table, math, utf8` — the list is in one function
  in the glue and one line in the isolation probe, and Phase 1's parity test extends both
  at once.
- **Two guest libraries can still drift** (plan risk 2), and the spike's evidence raises the
  stakes honestly: the Luau twin is 415 lines covering a _subset_ of the TS library's
  1 599 — the parity test has to cover the whole surface as Phase 1 completes it, and the
  wire contract (five members, JSON both ways) is what makes that test finite.
- The wasm carries exception support (`-fwasm-exceptions`) because the _compiler_ half of
  Luau throws C++ the ordinary way and the glue catches at the boundary — `bad_alloc` from
  a hostile 300 KB source becomes a `FATAL` that names itself, never a trap. The VM's own
  errors are longjmps (`LUA_USE_LONGJMP=1`), which is why the deadline hook can land a
  catchable error the same way QuickJS's interrupt does.
- The 250 ms budget, 16 MiB cap and mulberry32 sequence now have **two** consumers. A change
  to any of them is a change for both languages at once — which is the point, and the test
  that pins the mulberry32 vectors is where forgetting costs a release.

## Alternatives

**`@luau-rs/luau` (npm).** Considered during the spike at the project owner's prompting, and
rejected for 0015's own reason: its limits are its defaults, its interrupt surfaces are
per-`execute` (the `LuaWorker` model is a worker-per-run, and the synchronous `Lua` class
exposes no step-level deadline knob), and the caps we cannot set are the caps we do not
have. It is also a Rust-bindings build whose wasm we would pin blindly at 0.739, and a
dependency whose toolchain we could not re-knob from a phone when a measurement disagrees.
The thin glue is 700 lines and it makes every knob a flag we can see; that is the trade
this record is recording.

**`luau-web` / `luau-interop`.** A fork with a rewritten execution API; the plan's verdict
stands and the Rust point above applies in kind.

**ulua (Rust Luau, wasm32).** Rejected as the plan rejected it: a JIT that cannot run in a
browser is a headline for the wrong claim, and "unproven under untrusted scripts" is the
claim we cannot risk.

**Staying single-language.** The cheapest option — and the one the plan's opening evidence
answers with a number: 107 lines of ceremony per journey that wants branching results, in
every place that wants one, forever. The generator machinery existed because the VM's
coroutine machinery was not reachable; now it is.

**Capping the stack from the host, like QuickJS.** Rejected by measurement: there is no
host-side stack to overflow (the row above), and setting a `LUAI_MAXCALLS` override would
cap _honest_ recursion (20 000 frames is a real depth a place's parser might reach) to
protect against a vector that does not exist. The QuickJS cap fixed a bug in how _that VM_
hit the host stack; porting the cure without the disease is how spikes are supposed to
stop you.

## What this does not decide

The bundle format for `.luau` input (one module per file, or one chunk per module id — the
spike's hand-built `require` shim is not the promise), the editor's language picker, the
`spacescape.d.luau` type stubs, Phase 3's analysis loading, and whether the TypeScript
`Function`-constructor probes need Luau-side siblings in `bundle.test.ts` (they do; Phase 1
writes them). Whether voxelscape adopts the same package is that application's decision on
the same evidence — the package has no opinion (ADR 0024).
