# 0051 — A level shape carries its turn, and its box is oriented

## Context

The level editor had no rotation control, and said so in its own source rather than leaving it
to be discovered. `apps/spacescape/src/level-editor/panels/PropertiesPanel.tsx` opened with a
header titled _"Why there is no drag and no gizmo"_, and ADR 0001 named the transform gizmo as
the highest-risk item in the project with a numeric transform panel as the fallback. A level
was edited by clicking a thing and typing its numbers.

That fallback was sound but it left a real gap, which is that the editor could not do the one
thing the thing it edits has always been able to do. `createShape` in the guest library has
carried an `orientation` since the vocabulary was written
(`apps/spacescape/src/places/guest/place-api.ts:169-170`), and a place script has been free to
turn a wall since the first version. A level file goes through the same trust boundary as a
script — `readShape` maps each item onto the `shape-add` payload it stands for and hands it to
`inspectEffect` — and the effect table has declared `orientation` as a `quat` since
`effects.ts:223`. So the level format was not missing a field the engine could not hold. It was
holding one and dropping it: `readShape` built each item field by field and never copied
`orientation` across.

The consequence was not that rotation was impossible. It was that a level file carrying a
rotation would be **accepted and silently ignored**, which is the specific failure the
whole-or-refused rule in `level-plan.ts` exists to prevent, arriving through a door the rule
did not know was open.

Rotation also has a second cost, which is that it makes an axis-aligned box wrong. Two derived
boxes are computed from a shape on every selection and every pick: `shapeBox`
(`level-editor/view/picking.ts:72`) and `highlightBounds`
(`level-editor/view/highlight.ts:58`). Both were written for a world where a shape's extent is
its own extent, and both left a note saying where rotation would go:

> **An axis-aligned box, so a rotated shape is picked by its unrotated extent.** … A future
> rotation would want the oriented box, and this is where it would go.

The pivot question looked like the hard part and turned out not to be one. Every primitive's
`halfExtents` is a symmetric half-box about the primitive's own origin — including the ones
that do not look centrally symmetric, because ADR 0025 makes capsules, cones and cylinders
point up about Y (`packages/sdf/src/primitives.ts:513-518`). A box centred on the origin,
rotated about its own centre, stays centred there, so for all nine primitives at every
orientation the centre of the box is the shape's own `at`. "Rotate about the centre of the box"
and "rotate about the origin" are the same point, and the gizmo needed no pivot concept it did
not already have from `apps/sdf-modeller`.

## Decision

**A level shape carries a unit quaternion in `orientation`, and both boxes derived from a shape
are oriented boxes.**

- `LevelShape` gains `readonly orientation?: Quat`. Absent means the identity, as it does on
  `CreateShapeOptions` and on `Operation`.
- `readShape` passes it through, and `operationOf` forwards it to `placeOperation`, which has
  accepted an `orientation` since the CSG operation gained one.
- **`shapeBox` and `highlightBounds` describe the box in the shape's own frame**, and the
  consumer applies the turn: the highlight sets `mesh.quaternion`, and the picker rotates the
  ray into the shape's frame before its slab test. `rotate` and `conjugate` are already exported
  from `@big-mesh-studios/csg`.
- **The axis-aligned box stays, as the broad-phase reject.** `pickShape` loops every shape in
  the level, so the cheap test is still the right first question and the oriented one is only
  asked of the shapes that survive it.
- **The level format is not re-versioned.** The field is optional and the format's version
  guard is for a change that invalidates what came before; this one does not.
- **`boundsOf` was already right.** `operationBoundsOf`
  (`packages/csg/src/operations.ts:169-190`) takes eight corners and rotates each by
  `operation.orientation`, so chunk invalidation becomes correct the moment the quaternion
  reaches the operation. The file records that spacescape's `SculptDocument` once got this
  wrong, which is why the answer was written down rather than re-derived.
- **A figure's `yaw` turns its highlight box**, retiring the compromise recorded at
  `highlight.ts:62-66` where an upright box around a turned prop was documented as a slightly
  larger hit.
- **The gizmo is sdf-modeller's**, and there is still no scale gizmo — see the consequences.

## Consequences

**A shape is now rotated in the world, and the fold still holds its place.** An edit that
changes a shape's parameters goes through `PlaceHandle.set`, which keeps the fold index it
already had (`apply-level.ts:196-206`). Turning a `Subtract` wall therefore does not move it
past its neighbours and does not take their terrain with it — the property the whole of
`apply-level.ts` exists to protect, and the reason rotation is safe to expose.

**The axis-aligned box grows when a shape turns, and the pivot does not move.** A capsule at
45° has a box far larger than the capsule. This is why the highlight had to become an oriented
box rather than a better pivot: a selection that balloons as it turns reads as a bug, where a
pivot that drifts away from the handles would read as a different bug. rmsl applies scale,
then rotation, then translation, so a unit cube scaled to `max - min` and turned about its own
centre stays centred on `at`.

**A build older than this one reads a rotated shape as un-rotated rather than refusing it.**
`orientation` is a declared `shape-add` field, so a payload check passes and `readShape` does
not copy it onto the item. Bumping `LEVEL_VERSION` would close this properly and would also
refuse every level file written before it, which is a worse trade for a field whose absence
means "not turned". Recorded rather than fixed; it is the cost of extending the format through
a field the effect table already declared.

**There is still no scale gizmo, and the reason is not the gizmo.** `Operation` has no scale
field, and a shape's size is its primitive's parameters — a capsule has a `len` and a `radius`
that mean different things, a torus a `majorRadius` and a `minorRadius`. Those are edited in
the inspector, per-primitive, with the labels, minimums and steps the primitive table already
supplies (ADR 0025). A gizmo for that would be a worse control, not a missing one. Figures do
have a uniform `scale`, and a gizmo for it remains available from
`apps/rm-stacker/src/arm-widget.ts`.

**Nothing about the stored representation changed.** `LevelShape` stores a position and a size,
as it always did; the min/max `Bounds` that appears in the editor is derived on every call and
discarded, and never reached a level file, a panel or the fold. A level file written before
this change reads exactly as it did, and one written after it differs by one optional field.

**The editor's own header is now false and is rewritten.** _"Why there is no drag and no gizmo"_
is removed from `PropertiesPanel.tsx`, along with the reasoning that a level is edited by
clicking a thing and typing its numbers.

## Alternatives

- **Store min and max instead of a position and a size.** Rejected, and not because min/max is
  worse: nothing stores it. `shapeBox` computes `at ± halfExtents ± padding` on demand and the
  result is thrown away. A min/max pair is a world-space axis-aligned box, which cannot be
  turned without being rebuilt, and rebuilding it on every rotation frame is a worse answer
  than keeping the frame it came from.
- **Store Euler angles rather than a quaternion.** Rejected: storing the representation a
  person reads and deriving the one the engine uses means the two can disagree. The
  representation disagreement is what makes the number in the panel stop being the number in
  the model after any sequence of rotations that does not commute. The quaternion is stored and
  the angles are derived on read, as `apps/sdf-modeller/src/model/part.ts` does.
- **Add a `bounds` field to a level shape.** Rejected: it is derived, so it can go stale, and
  the fold would then have two sources of truth for where a shape is.
- **Rebuild the whole place when a shape is turned.** Rejected: a place rebuild allocates a
  fresh fold index to every shape in the level, which is what `apply-level.ts` calls out as the
  real cost of an edit. `set` keeps the index and there is no reason to give that up for a
  drag.
- **Rotate figures only, and leave shapes un-turnable until the editor grows.** Rejected: a
  level editor that cannot turn a wall is not a level editor, and the asymmetry would have to be
  explained in the UI rather than designed away.
- **Port `apps/voxelscape`'s editor transform gizmo instead.** Rejected: it is a different
  editor over a different model — voxelscape's stores a `Box` of min/max per item, which is
  where the representation question came from — and sdf-modeller's is the same engine, the
  same renderer, the same `rmsl` version and the same CSG operations, with tests beside it.
