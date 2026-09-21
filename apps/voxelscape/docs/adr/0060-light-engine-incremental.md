# 0060 — The incremental light engine replaces the seam reconciler

## Status

Accepted

## Context

Every edit to a voxel world has to keep two light channels in step with what
the voxel stores hold. After an edit removed a stone or placed an emitter the
old per-block fills re-lit the whole block that owned the write, then a
separate seam reconciler walked every boundary face, pasted the two copies of
a shared seam column into agreement by copying one into the other, and filled
the temporary slab it built across the border. Each step cost a multiple of
the block volume, and they all ran on the frame that owned the edit, so a
burst of edits (fluid emitting step-to-step, embers re-seeding, a hammered
wall) stalled the render for whole frames at a time.

The world needed an edit's light to settle within a frame from the frame's
own budget, not to own the frame.

## Decision

`src/world/seam-light.ts` and its test are deletedrowing the seam reconciler
out of the picture entirely; `create-voxel-world` now owns a `LightEngine`
(`src/world/light-engine.ts`) whose instance is shared by the ember, flow,
and editing controllers. Editing, ember, and flow writes all route through a
single `setVoxel` that records before/after and seeds a flood.

A changed voxel does not trigger a full block re-light. The engine keeps the
increase and decrease probes in separate pending lists fed by a budgeted
two-pass flood (`budgetMs` slices per `flush`), so one voxel's change only
reworks the cells the flood actually reaches. Boundary agreement is carried by
`enqueueFaces`, which raises each copy of a shared seam column to the brighter
and seeds the raise into the block whose interior fell behind — a look at the
shared column plus the decay it seeds, not a second full block fill nor a
seam-wide slab blit.

## Consequences

- One voxel edit is now proportional to the light it casts instead of the
  block volume: a distant emitter edit grows roughly with the distance to the
  nearest lit surface rather than with `64^3` fill plus a same-size seam walk.
- The write path is budgeted: `flush` spends at most `budgetMs`, defers the
  rest to the next frame flush, and reports changed indices per flush so the
  mesh worker touches only the columns that actually gained or lost light.
- The seam reconciler surface (`reconcileBlockLight`, the temporary slab
  across a boundary) is gone; the engine reads the pair of copies each block
  keeps of a shared world column and raises them to the brighter before
  seeding a flood, so the flood never forks as callers find new surfaces to
  run it over.

## Alternatives considered

- Keep per-block `fillBlockLight` plus a seam reconciler (status quo) —
  correct but O(block volume) per edit and per seam face, and the source of
  the frame stalls this replaces.
- Do all light on the worker that fills blocks — moves the cost off the
  render thread but cannot see the incremental edits the main thread keeps
  queuing, so it still needs a reconciling step and adds a round-trip per
  edit.
