# Extract the world ring into its own module

Following the renderer seam (ADR 0001), the next largest tangled cluster in `App.tsx`
was the terrain-streaming system: the `blocks`/`worldGrid` arrays, `lookupBlock`, the
fill-worker orchestration (generation counters, in-flight tracking, synchronous
fallback, worker message handling), `stepRing`, and `scrollToPlayer` — about 215 lines
mixed in with everything else `App.tsx` does.

We introduced a `WorldRing` class (`src/world-ring.ts`) that owns all of it: it builds
the initial ring synchronously in its constructor (mirroring what `App.tsx` did
inline), keeps it centred on the player, and refills scrolled-in blocks off the main
thread via the fill worker. It exposes `blocks` (readonly) and `lookupBlock(gx, gz)`
publicly; the per-slot grid coordinates (`worldGrid`) that used to be a bare shared
array are now a private implementation detail — nothing outside `WorldRing` ever
needed raw grid coordinates, only "the block at these coordinates" or "all current
blocks."

`WorldRing` does not depend on `RendererSwitch` or know rendering exists. It reports
block changes and repositions through constructor-injected callbacks
(`onBlockChanged`, `onBlockReposition`), which `App.tsx` wires to
`RendererSwitch.onBlockChanged`/`repositionBlock`. This preserves the dependency
direction already established in ADR 0001, where `RendererSwitch` depends on ring
data rather than the reverse — giving `WorldRing` a direct reference the other way
would have made the two mutually dependent for no reason.

## Considered options

- **Direct `RendererSwitch` reference instead of callbacks.** Rejected — would create a
  two-way coupling where `RendererSwitch` already depends on ring data one way; nothing
  requires `WorldRing` to know renderers exist.
- **Split fill-worker orchestration into its own class**, separate from ring
  windowing. Rejected for the same reason `TriangleRenderer` keeps its own mesh-build
  worker orchestration (ADR 0001): the fill worker only exists to serve `WorldRing`'s
  scroll refills, so a separate class would be an indirection with no second caller.

## Consequences

- The initial ring fill is synchronous (main thread, all `BLOCKS x BLOCKS` blocks, at
  construction) while every subsequent ring-scroll refill is asynchronous (fill
  worker). This is existing behavior, not introduced by this change — do not "fix" the
  asymmetry without checking the startup-cost tradeoff first.
- `WorldRing.dispose()` now terminates the fill worker; previously nothing did. This
  was a real gap (not just a refactor artifact) — `App`'s `createEffect` cleanup
  already disposes the `WebGLRenderer` but never terminated the fill worker.
