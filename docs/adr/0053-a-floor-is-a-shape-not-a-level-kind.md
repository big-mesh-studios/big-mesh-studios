# 0053 — A floor is a shape, not a level kind

## Context

ADR 0051 made a level shape carry its own turn, and `draw-walls-plan.md` shipped a drawn set of
walls as a **fourth `LevelItem` kind** (`kind: "walls"`). It recorded the price honestly:

> **The price:** Every place that asked 'shape or figure' now asks 'shape, figure or walls'.
> Picking, the highlight, the inspector and the level reader each gain a branch.

That tax was worth paying for walls, because a wall is not a shape. `wallParts` turns a polyline
into one oriented `Box` per segment and the CSG fold's smooth-min does the union — the wall
_is_ many operations that happen to look like one, and calling it a shape would have been a lie
about what the level file holds.

Then a floor arrived. A floor is a drawn loop extruded by a thickness
(`apps/spacescape/docs/floor-plan.md`), and a loop is **one polygon with a boundary** — one
operation, one distance function, nothing for a fold to join. The walls argument does not
transfer, and with it goes the reason for a fourth kind.

There was also a question of where the outline lives. Walls store world-space points and the
plane's `up`, and derive an orientation per segment — a wall's turn is a function of its own
direction. A floor's turn is **shared by every one of its points**, so it belongs on the item,
which is exactly what ADR 0051 had already put there.

## Decision

**A floor is a `LevelShape` whose `shape` is a `{ type: "Polygon" }`, with the drawn plane's
basis in the item's `orientation` and the outline in the shape's own local XZ frame.**

So `src/places/level/types.ts`, `level-plan.ts`, `apply-level.ts`, `picking.ts` and `highlight.ts`
gain **nothing**. `apply-level.ts` passes `item.shape` straight through to `placeOperation`
(`apply-level.ts:213`), `level-plan.ts` validates it through `checkShape`, `picking.ts` asks
`primitiveHalfExtents` for it, and none of them learn that a floor exists. The three
`Record<ShapeType, …>` maps in `panels/vocabulary.ts` and `defaultShape` did have to learn, and
**the compiler is what made them**: they are exhaustively keyed, so growing `ShapeType` is a type
error. That is the forcing function ADR 0025 set up, working.

**The outline is stored in the shape's own frame, not in world space.** Projecting onto the drawn
plane's axes costs two dot products per vertex once and buys three things: the item turns with
`orientation` the way every other shape does, a level file is diffable against one drawn
elsewhere, and `halfExtents` — which must be a box symmetric about the operation's own origin,
because `operationBoundsOf` rotates the eight corners of one — has a centre to be symmetric about.

**A floor's `at.y` is its mid-plane**, so the underside is `at.y - thickness / 2`. The
alternative, standing the slab on its line the way a wall stands on its own, would put the
shape's extent on one side of where it is indexed, which is the trap `draw-walls-plan.md`
recorded as its first bite.

## Consequences

**The inspector's fields are generated from the table, and a point list has no field.** The
`<For>` over `PARAMETERS_OF` filters to `EDITABLE_PARAMETERS_OF`, because rendering an outline as
a number field would put a stepper on a value that is a length. That leaves a person looking at a
floor with nothing that says the outline exists, so the outline gets its own bar: a count and an
**Edit outline** button.

**Editing an outline needs the drawn frame back, and re-deriving it does not work.**
`planeThrough` builds a fresh basis with `onbFromDirection`, and a different basis in the same
plane is a different _set of coordinates for the same points_ — except that `floorCentre` takes
its centre from the bounding box **in that basis**. Rotating the basis inside a plane rotates the
box, so the centre moves by up to the difference between two enclosing boxes: a person who
pressed Edit outline and then Finish without moving a point would watch the floor slide across the
room. So `floorDrawing` recovers the frame from the item's own `orientation` instead, and
`floor.test.ts` asserts the whole round trip on four planes including two tilted.

**A floor is `Add` whatever the toolbar's combine button says.** The button says what the next
shape placed by a click will do, and nobody clicked to place this one — they drew it. A draw
that came out as a `Subtract` because a button was left on `Subtract` last time would be a hole
in the ground.

**One `editingDrawId` signal covers both drawing tools**, not one each: an edit is an edit, and
the teardown effect that clears it already knows which tool went away.

## Alternatives

**A fourth kind, `kind: "floor"`, mirroring walls.** The consistent choice, and the one this
record exists to argue against. It re-pays the tax `draw-walls-plan.md` named — picking, the
highlight, the inspector and the reader each gain a branch — for a shape that _is_ a shape, and
it needs a reader of its own with its own key allowlist when `checkShape` would have validated it
for free.

**Store the outline as world points beside an `up`, as walls do.** Keeps the drawn provenance
legible in the file, and costs the item's rotation, the half-extent symmetry, and a diffable
comparison between two floors. It also needs a stored basis vector to be exact, which is a second
way of saying where every point is.

**Let a person type the outline into the inspector.** A polygon with sixteen corners is sixteen
pairs of numbers and a person cannot tell whether corner 14 is where they meant. The draw tool is
the only reasonable way to edit an outline, which is why the field filter and the **Edit outline**
button are the whole of the answer rather than half of it.
