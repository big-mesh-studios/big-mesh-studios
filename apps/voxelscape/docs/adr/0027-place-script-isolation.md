# Script isolation and determinism inside the place interpreter

A place's creator code runs on every peer of that place, and derived rules are
only correct if two peers compute the same result from the same facts (ADR
0026). Two things follow: the code must be isolated from the host, and it must
be deterministic. This decision picks the shape of both.

## Isolation by construction: an interpreter compiled to WASM

Creator scripts run inside a JavaScript interpreter (QuickJS) compiled to WASM
and executed in the page. A script therefore has no host access at all — no
fetch, no timers, no DOM, no WebAssembly of its own — beyond the handful of
functions the host injects. This is the property a plain Web Worker does not
give: a worker's script can reach `fetch`, `import()`, and the postMessage
bridge, so containing it would mean policing an entire language. An interpreter
in WASM needs no policing, because nothing exists to reach.

The host surface is deliberately tiny and crossing-free:

- The guest sees one `engine` object with `dispatch(tag, payload)`,
  `log(line)`, and `now()`, where `payload` and `line` are JSON strings.
  Anything the script wants done to the world is spoken through `dispatch` and
  queued for the trusted side to validate and apply — the guest never mutates
  shared state directly, and the boundary never carries objects, only strings,
  so identity cannot leak either way.
- The engine reaches the guest once a step: it calls a global `bmsTick(clockMs,
eventsJson)` the script defines, passing the shared clock and a JSON array of
  the events added since the last step.

## Determinism is enforced by the host, not promised by the author

- Every peer runs the same interpreter binary, whose wasm build is versioned
  with the place record, so the same source produces the same floats on every
  machine.
- `Math.random` is replaced with a PRNG seeded from the place's seed, and
  `Date.now` answers from a caller-supplied clock, so randomness and time are
  the two inputs every peer already agrees on. A script that reaches for the
  wall clock finds the shared one.
- Event delivery is in the deterministic total order the event log already
  guarantees (ADR 0026), and each script keeps its own state across steps, so
  two peers stepping the same script with the same clock and events converge.

## A runaway script is stopped, not feared

Each step runs under an interrupt deadline (the interpreter's own interrupt
handler) and each interpreter instance has a memory cap, so an infinite loop or
an allocation bomb ends the step rather than the peer. Effect output is bounded
too: the queue is drained by the trusted side, which applies its own limits.

## Considered options

- **Plain Web Workers running the script.** Rejected: a worker is not a sandbox
  for untrusted code — the script can reach the network and the page — and
  containing it means auditing a whole language's capabilities. The WASM
  interpreter gives containment without an audit.
- **An in-page evaluator (`eval`/`new Function`).** Rejected outright: no
  isolation at all.
- **Creators compile their own WASM modules.** Kept for later: a raw module
  needs its own import ABI, its own worker so a loop can be terminated by
  killing the thread, and the deterministic contract self-enforced by the
  author, since a compiler gives no guardrails. The interpreter is the default
  creator path precisely because it supplies those guardrails.

## Consequences

- Every peer of a scripted place downloads the interpreter's wasm — a fixed,
  one-time payload — and one peer-wide wasm instance is shared by however many
  scripts a place runs.
- Handles that cross the interpreter boundary must be disposed exactly once;
  a leaked handle makes QuickJS abort when its runtime is freed, so every host
  call is written to dispose its handles even when a step throws.
- Scripts are global-scope code today: `bmsTick` is a global, and module
  syntax (`import`/`export`) is not yet enabled in the interpreter. A future
  step may transpile and bundle a creator's sources to a single file before
  loading, which is also where a place's TypeScript would be compiled.
- The interpreter's vocabulary is internal until a place's zip format names
  script files by kind; the seam (`ScriptSandbox`) is where that lands.
