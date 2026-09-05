# Place scripting authority: owned, derived, and voice state

A place is a published world a creator can write scripts for and others can
join: its own terrain seed and rules, plus code that turns it into a game. The
question this decision answers is who is authoritative over the state a place's
scripts produce. The obvious answer — one host peer runs the scripts and
everyone else renders, the way a Roblox server would — was examined and
rejected: the engine already runs multiplayer with no server, and the scripted
parts of a place decompose into state that needs no single writer at all.

## The two sync tiers a place script divides along

The engine already reconciles two kinds of distributed state differently. A
zombie's position is owned: the nearest player steps it and broadcasts the
state, everyone else dead-reckons between deliveries, and atproto records hold
the coarse durable truth (ADR 0013). A voxel edit is a fact: each client
applies its own optimistically, broadcasts it, and the edit overlay converges
last-write-wins by timestamp (ADR 0009). Ownership exists because a zombie
reacts to live, asymmetric inputs — each player's position is authoritative on
their own machine and reaches the others at different times, so identical code
stepped on every peer would diverge. Facts exist because they have a single
moment of truth and a deterministic reconcile rule, so every peer can apply
them in any order and agree.

A place's script is a program that does both kinds of work, and the two tiers
already carry both kinds of state. No new authority model is needed: the script
is written so each piece of what it does lands on the tier built for it.

- **Owned state** — anything positional that reacts to live players: scripted
  creatures, the boss, a moving platform. The zombie machinery generalizes
  directly: a scripted kind rides the same owner-step, broadcast, dead-reckon,
  and durable-record loop, with the owner chosen by the existing nearest-player
  rule. The script's code runs on every peer; each _instance_ is executed on
  one.
- **Derived state** — win and lose, score, phases, waves: the state a server
  script usually holds in mutable globals. Here it has no writer at all. Rules
  are pure functions of the replicated fact stream — voxel edits, entity
  records, player joins and leaves, and script events such as
  `block-broken`, `plate-pressed`, and `entity-killed` — recomputed on every
  peer from the same facts, so no peer needs to broadcast rule state for the
  others to agree on it. Timers run on the day-night clock, which is already a
  deterministic function of the seed, never on a wall clock.
- **Voice** — a message, sound, or HUD element aimed at one player. This is a
  notification, not a fact: it travels as a unicast over the mesh the way poses
  do and never needs to converge.

The three tiers share a rule that keeps them consistent: **a script's memory is
the replicated event log, not mutable globals.** `score += 1` is legal only
inside a handler for a replicated event, and the counter is then recomputed
identically on every peer that replays that event. A timer fires when the
shared clock reaches a value, a score is a fold over the ordered log, a wave is
a phase the derived rules transition between. This is a different mental model
from a mutable server script — a creator must think of their game as a function
over events — but it is exactly the model the engine's own multiplayer already
behaves under, and it is what keeps the place hostless.

## Determinism is the load-bearing constraint

Derived state is only correct if two peers compute the same result from the
same facts. The engine does not need bit-identical brains for zombies — the
owner decides and the rest copy — so determinism was never previously required
of any shared code. A place script is the first shared code whose _outputs_ are
compared implicitly, every tick, by every peer, and a divergence would show as
two players watching different games with no mechanism to notice. Innocent
divergence is the risk, not hostile divergence: unseeded randomness, a wall
clock, map iteration order leaking across the host boundary, or a floating
format difference between interpreter builds.

The contract that keeps scripts convergent:

- Every peer runs the **same interpreter binary** — a byte-identical
  interpreter-in-WASM build — whose version is pinned in the place record, so
  the same script text produces the same floats on every machine.
- The host API hands the sandbox only deterministic primitives: randomness from
  a seeded PRNG, time from the shared clock, and host objects delivered as JSON
  round-trips or sorted arrays so iteration order never leaks.
- Replicated events are **immutable facts with an id**, applied exactly once
  (idempotent handlers) in a **total order** — by timestamp, ties by producer,
  then by id — the same merge shape the edit overlay already uses.
- Raw WASM modules a creator compiles themselves opt into the same contract;
  the interpreter guards it for ordinary scripts, a compiled module is
  bring-your-own-determinism.

Convergence is testable as a consequence, which is a property the engine has
never had before: two peers fed the same facts in different arrival orders can
be asserted byte-for-byte identical. That test is what makes the whole model
safe to build on.

## Considered options

- **One host peer runs the scripts; joiners render.** The closest Roblox
  shape, and the first instinct. Rejected: it reintroduces at place scale
  exactly the ownership arbitration and migration machinery that monster
  ownership already provides per entity, for no benefit — the reasons a single
  simulator exists, anti-cheat and competitive fairness, are explicitly out of
  scope, and the cost of a beat of divergence between players' screens is
  accepted. Every peer running the sandbox instead of one is the price of no
  host, and it is the smaller cost.
- **Strict lockstep: every peer runs the same script with synchronized
  identical input.** Rejected for the same reason ADR 0013 rejected it for
  monsters: inputs that are live and asymmetric cannot be delivered identically
  and on time to every peer, and a synchronized tick advances at the slowest
  peer. Determinism is still required — of _outputs from replicated facts_, not
  of live input order — which the contract above achieves without a shared
  clock sync.
- **Give the place's script a host that is itself an owned object.** Rejected
  as unnecessary once eventual consistency is accepted: ownership exists to
  give live-driven state a single writer, and derived state has no live inputs.
  The owned tier still exists for entities; the global rules simply do not need
  it.

## Consequences

- The sandbox and interpreter are part of the client download for every player
  of a scripted place, not a host-only cost; per-tick budgets keep a heavy
  script from starving a joiner's frame, and the WASM interpreter is a fixed
  one-time payload.
- A malicious or simply non-conforming peer is not detected: one that forges
  events or refuses to run the rules sees its own divergent game and can
  influence the shared log up to the merge rule's limits. Accepted — there is
  no cheat detection by design.
- The event log grows monotonically for the life of a place session; a pruning
  or compaction rule is a later decision, as are the record vocabularies for
  places and for the durable event stream.
- Because a derived rule's correctness depends on convergence, regression tests
  must include a double-store convergence check (two logs, shuffled arrival,
  identical output), not just single-store unit tests.
