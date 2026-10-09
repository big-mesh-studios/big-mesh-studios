# 0047 — A figure is its own mesh, and it is not in the fold

## Context

A place script builds geometry. Every piece of geometry this engine has ever drawn has been an
entry in an operation list, folded into one field and meshed per chunk — that is ADR 0002, and
`docs/places-plan.md` describes how a place joins that fold (ADR 0016) without anyone having to
ask where a prop would go.

The open question was recorded rather than decided, in `places-plan.md` under "Later, and
deliberately not planned":

> **Props and NPCs from `.sdfmod`.** … Two real obstacles remain. **`.sdfmod` has no identity** …
> and **ADR 0022's fork is still open**: a prop as declared seat/surface data (cheap) versus real
> SDF geometry (expensive — `Operation` has no transform field and fold order _is_ the model).

What forced the decision is a demo. Porting voxelscape's `get-a-snack-at-4-am` needs sixty-three
props and two characters, two of which move during play — Dad relocates to whichever room the
player is in, and the Cashier walks outside when the break timer runs out.

Folding a figure into the operation list makes it _possible_ and makes it _bad_. Moving an NPC
would mean removing every operation that made it and adding them again somewhere else, which is
one fold index per primitive, a rebuilt `OperationBVH`, and a re-mesh of the chunks the figure
was standing in — several times a second, for something whose whole visual content is identical
before and after. A door that opens by rebuilding the door is a door that stutters.

The specific block was always **transform**. `Operation` has `origin` and `orientation` and no
scale, so an instance cannot be placed by pointing at an operation; it can only be placed by
copying the model's operations and rewriting each one's origin. A figure wants the opposite: one
thing, many placements.

## Decision

**A figure is meshed once per model, from a `.sdfmod` attachment, and every placement of it is a
`Mesh` over that one geometry.**

- A place's `manifest.models` names files. Each is read once at load into a `FigureModel`, which
  holds the operations, the field, the bounds and the GPU geometry — see
  `apps/spacescape/src/places/model-library.ts`.
- **A figure is not in the fold.** It is not an operation, it is not in `PlaceRegistry`, and it
  does not appear in `SculptSession.model()`. Nothing a place does with a figure reaches the
  chunk meshers, and nothing an edit does reaches a figure.
- **A placement is a `Mesh`.** `FigureModel.draw(material)` is the only way to get one, and the
  geometry behind it is not exposed — see below.
- **The instance owns a transform and nothing else.** Position, yaw and scale. That is the
  whole reason a figure can move.
- **Collision and picking are answered differently and deliberately.** Picking sphere-traces the
  figure's own field, so the cursor goes _through_ the gap in a vending machine's shelf and finds
  what is behind it. Collision uses the figure's yaw-aligned box, because `getSolidAt` runs
  several times a frame per player corner. Two answers to two questions.

## Consequences

**The expensive part of a figure is paid once, and only if a place is careful.** The geometry,
the buffers and the field are per _model_. A place with sixty-three props naming forty models
pays for forty. This is enforced rather than documented: `FigureModel` exposes `draw(material)`
and not the geometry, because a readable `BufferGeometry` is a `BufferGeometry` somebody will
`clone()` — which copies every buffer and silently undoes the entire mechanism.

**Meshing a model is a load-time cost on the main thread.** Forty models at the figure budget is
a few tens of milliseconds on a deliberate `/place:load`, which is a hitch rather than a
per-frame cost. If it stops being that, the budget is the first thing to turn and a worker is
the second; the chunk worker pool is not an option as it stands because its protocol is shaped
around chunk cells and level-of-detail strides.

**A figure cannot be dug, and does not deform the landscape.** There is no brush stroke that
takes a fridge away and no way to cut a hole in one short of removing the figure. In an engine
whose primary verb is digging, that is a real limitation and it is the price of movement.

**Standing on a figure is answered by a box.** You can stand on a bed and on a car and not on
the gap in a bench, and the cursor can see through that gap while the body cannot enter it. Both
answers are conservative in the direction that matters, and both are simple; reconciling them
would mean a field trace inside the physics loop.

**A model has no identity of its own.** `.sdfmod` has no id, no UUID and no content hash, so a
model's name is its path in the place's manifest — the limitation ADR 0033 records, and the
reason `ModelLibrary` is keyed by the attachment name rather than by anything read out of the
file.

## Alternatives

- **Fold figures into the fold, as operations.** Rejected: moving an NPC becomes an operation-list
  rewrite plus a re-mesh, several times a second, for a figure whose shape never changes. This is
  the whole reason the fork was left open rather than settled earlier — the answer is only
  obviously wrong once something moves.
- **A separate renderer, raymarching figures the way voxelscape does.** Rejected: it is a second
  renderer with its own camera, material model and performance cliff, none of which this engine
  has, and the sibling project records that cost at the top of its own
  `src/model/mesh-model.ts`. Figures here are drawn by the same `SurfaceMaterial` as the terrain.
- **Give `Operation` a scale, and instance through it.** Rejected on a format change: `Operation`
  crosses the wire into every meshing worker by structured clone and is written by
  `apps/sdf-modeller` into a shared file format. A transform field is not one byte.
- **Instance the geometry with an instanced draw call.** Not rejected on merit — it is probably
  the right answer for a thousand trees — but premature: the counts here are dozens, and the
  per-instance data a place script would need to vary (a figure that changes colour when it is
  talked to) is not uniform either.
