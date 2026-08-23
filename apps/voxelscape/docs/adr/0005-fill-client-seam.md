# Extract fill-worker orchestration into its own module

ADR 0002 considered and rejected splitting fill-worker orchestration out of
`WorldRing`, reasoning that the fill worker exists only to serve `WorldRing`'s
scroll refills, so a separate class would be indirection with no second caller.
That reasoning held while the orchestration was three private fields and two
private methods. It stopped holding once a documentation pass tried to write
down what those fields were: `fillGen`, `fillInflight`, `fillWorker`, and
`fillAvailable` could only be explained together, in one paragraph, because
they *are* one thing — a client for the fill worker, with its own state
machine (idle, in flight, degraded-to-synchronous) — and a paragraph
documenting four fields at once is a sign the fields belong to an object that
doesn't exist yet, independent of whether that object would ever get a second
caller.

We introduced a `FillClient` class (`src/world/fill-client.ts`) that owns the
worker, the per-slot generation counters, the in-flight map, the synchronous
fallback, and the `Worker` construction/message/error wiring that used to sit
in `WorldRing`'s constructor. It exposes `requestFill(indices, centers)` —
fill these slots, using the worker if available or falling back to
synchronous generation otherwise — and `dispose()`. `WorldRing` holds one
`FillClient` field instead of four loose fields, and `stepRing` calls
`requestFill` instead of branching on `fillWorker`/`fillAvailable` itself.

`FillClient` takes `blocks: WorldBlock[]` directly (the same array
`WorldRing` holds, not a copy) rather than being handed one block per call,
because a fill result arrives asynchronously and must be applied to whatever
block currently occupies that slot — `FillClient` needs to read `blocks[i]`
at the time the result lands, not at the time the request was made.

## Considered options

- **Leave it as ADR 0002 decided.** Rejected — the reasoning that justified
  keeping it inline (no second caller) is a real consideration but not the
  only one; a class whose fields can't be documented individually is hard to
  read regardless of how many callers it has.
- **Split only the generation-counter/in-flight bookkeeping out**, leaving the
  `Worker` construction and message handling in `WorldRing`. Rejected — the
  bookkeeping only exists to know whether a worker result is still wanted;
  separating it from the worker it's tracking would just move the problem
  into two places that have to stay in sync instead of one.

## Consequences

- `WorldRing`'s constructor no longer needs a `try`/`catch` around `Worker`
  construction — that's `FillClient`'s concern now, reported via its own
  internal `workerAvailable` state rather than a field `WorldRing` reads.
- `WorldRing.dispose()` now delegates to `FillClient.dispose()` instead of
  terminating a worker it owned directly; behavior is unchanged.
