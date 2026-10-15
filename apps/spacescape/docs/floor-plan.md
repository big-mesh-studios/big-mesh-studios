# A floor or roof is a polygon with a thickness

The plan for drawing a closed outline and getting a single slab out of it, where the walls
feature that shipped in `ce90c7f` gets one box per segment.

**A floor is one shape, and walls were many.** A wall is a straight run, so a box is exactly its
shape. A floor is not a straight run — it is an outline, and the thing you want out of the other
side is one solid with the outline's own boundary. So this cannot be `wallParts` with a different
primitive in place of the box. It is one operation, carrying an outline.

## Why this one is a real primitive and walls was not

**The walls spike avoided `@big-mesh-studios/sdf` by expanding into primitives that were already
there.** `wallParts` (`src/places/level/walls.ts:151`) emits `{ type: "Box", len }` per segment.
`Box` is in the table, `parametersToFloats` already knows its three floats, and the fold's
smooth-min joins the segments into a union. That is why the walls plan could promise "no sdf
change, no csg change, no binary-format bump".

A polygon has no such existing primitive, and there is nowhere else for it to go:

```
apply-level.ts:256  →  sculpt.invalidate  →  session.setOperations
                    →  session.ts:354 serialiseOperations(currentOperations)
                    →  every meshing worker (protocol.ts:70-88 carries an ArrayBuffer)
```

**Every operation in a level is serialised on every applied edit**, including an edit made in the
editor itself. And `operationDistance` (`packages/csg/src/operations.ts:267`) is a pure leaf that
ends at `sdShape(indexed.operation.shape, local)` — a table lookup
(`packages/sdf/src/primitives.ts:632-639`). There is no per-operation escape hatch for a custom
distance function, and there could not be: `Operation` is documented as plain numbers precisely
because "the list is cloned into every meshing worker whenever it changes".

So this is the **Phase 7 that `draw-walls-plan.md` deferred** — "promoting it later to a real
`Walls` primitive is a separate, recorded decision" — for polygons, where the promotion is the
whole feature rather than an optimisation of it.

## The one decision this plan had to make: how an outline is written

The file format's stated invariant (`packages/csg/src/serialise.ts:10-11`):

> The layout is fixed-width and little-endian, which makes it seekable and impossible to misparse
> in a way that yields plausible numbers: a shape's parameter count depends on its type, but its
> position does not, because every shape's parameters are contiguous after the shape's type byte.

An outline is a variable-length point list, which is exactly the thing that invariant forbids.
Three ways out:

|       | Mechanism                                            | Verdict                                                                                                                                                                                                               |
| ----- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | Fixed capacity — always `1 + 2N` floats, zero-padded | **Rejected.** No bump needed, but a triangle spends 68 bytes and there is a hard vertex cap.                                                                                                                          |
| **B** | Variable length — the shape writes its own width     | **Chosen.** See ADR 0052.                                                                                                                                                                                             |
| **C** | A separate polygon section after the operations      | Rejected. Old readers ignore trailing bytes so no bump is needed, but operations need an index into it and the only free byte was spent on `material` (ADR 0048). The bump comes back anyway, with more moving parts. |

**Option A is worth naming as the one that lost.** It was recommended and declined. It keeps
`FORMAT_VERSION` at 4, so every place already baked keeps loading; the price is that the width of
the stream stops being a function of the type, which is the one property that makes this format
refuse garbage instead of parsing it. ADR 0052 records the same trade and the same alternative,
because the cheaper-in-bytes option being available and rejected is the part worth remembering.

## Phases

| Phase | Content                                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 0     | This file, plus ADR 0052 (a shape may write its own width) and ADR 0053 (a floor is a shape, not a level kind).                            |
| 1     | `packages/sdf` — the `Polygon` primitive. Widening the parameter arity, the SDF, `halfExtents`, and the five readers that switch on arity. |
| 2     | `packages/csg/src/serialise.ts` — `FORMAT_VERSION` 5 and a `readShape` that peeks a width.                                                 |
| 3     | The level editor — validation, the vocabulary, the property panel, and the draw tool's floor finish.                                       |
| 4     | Tests, `check-types`, `prettier`.                                                                                                          |

**Phases 0–3 are done; Phase 4 is the two ADRs.** `pnpm turbo check-types` passes,
`pnpm format:check` passes, and the whole suite passes except two tests that time out only when
the entire monorepo runs concurrently on this machine (`voxelscape`'s `chunk-sphere` and
spacescape's QuickJS `snack` demo) — both pass in isolation.

### What landed early, and why

**Phase 2 could not wait for its own phase.** Growing `ShapeType` makes `parameterFloats` return
a number that disagrees with `parametersToFloats`, and `operationBytes` sized its buffer with
the first while `writeShape` filled it with the second — so a level containing a floor wrote
past the end of its own buffer and the reader resumed at a plausible offset with plausible
numbers. That is the exact failure the version byte exists to prevent, and leaving the tree in
that state between phases is worse than finishing the phase.

So these, which the table puts in Phase 3, were pulled forward because `ShapeType` growing left
the workspace not compiling without them:

- **3b** — `PlaceShape`'s mapped type gains a `variable` branch, plus a `PlaceVec2`.
- **3c** — `Polygon` in `SHAPE_KIND_LABELS` ("Floor"), `DEFAULT_SHAPE_SIZES` and
  `MIN_SHAPE_SIZES`. All three are `Record<ShapeType, …>`, so the compiler was the forcing
  function and it did its job.
- **3d** — `defaultShape`'s rectangle outline, at the walls' default thickness.
- **3e, part** — the inspector's `<For>` filters to `EDITABLE_PARAMETERS_OF` so an outline
  renders no field, and `PARAMETER_LABELS` gained a per-kind key so `Polygon.len` reads
  "Thickness" rather than "Size".

**Phase 3 is done.** `checkShape`, `PlaceShape`, the vocabulary, `defaultShape`, the inspector's
field filter and its outline bar, `draw/floor.ts`, `finishFloor`, the Floor tool, and `app.tsx`
wiring all through `drawsInAPlane`.

### Phase 2 — what it cost, and one thing it needed that was not planned

Regenerating the snack models was the recorded cost arriving on schedule:
`make-snack-models.test.ts` failed on the first run after the version byte moved, and
`pnpm run snack-models` fixed it. That test is the format's own canary for exactly this, and it
is worth knowing it exists.

`serialise.test.ts` also had a `sampleShape` that built _every_ parameter from the table as a
number — including a polygon's outline. It now builds a real outline, because a file-format test
that generated a malformed shape would have been testing the wrong thing: it would write a `NaN`
count and read back a shape that was never written.

And the two new tests the plan called for are the two that would have caught the corruption in
the first place: `sizes a polygon from the points it has rather than from its type` checks the
sizer against the writer, and `round-trips a polygon next to nine fixed shapes without shifting
one` puts a floor between two operations so an off-by-one lands on a neighbour and names itself.

---

## Phase 1 — the primitive (`packages/sdf`)

### 1a. Widen the arity so every reader is forced to handle an outline

`PrimitiveParameter` (`primitives.ts:362`) becomes a discriminated union:

```ts
type PrimitiveParameter =
  | { name; arity: 1; label; min; step }
  | { name; arity: 3; label; axes?; min; step }
  | { name; arity: "variable"; label; minPoints; maxPoints };
```

**The `variable` variant has no `min` and no `step` on purpose.** Those mean "smallest size that
still describes a shape" and "a sensible increment", and a list of points has neither — it has a
length. Carrying `min: 3` on a parameter whose `min` everywhere else means a size would make the
one number that reads correctly the one number that means something else.

This keeps the existing `arity === 3` checks working and turns every `arity === 1` into a real
three-way branch, which is the point: a reader that forgets the outline fails to compile rather
than quietly ignoring a field.

Readers to branch: `parameterFloats`, `parametersToFloats`, `shapeFromFloats`, `dimensionGroups`,
`withParameter`. Plus two outside the package — `checkShape` (`apps/spacescape/src/places/fields.ts:388`)
and the `PlaceShape` mapped type (`apps/spacescape/src/places/guest/place-api.ts:112`).

### 1b. The shape itself

```ts
| { type: "Polygon"; points: readonly { x: number; z: number }[]; len: number }
```

**Points are in the operation's own local frame, relative to `origin`.** That is what makes the
item turn correctly for free, through the `orientation` an operation already carries.

Table entry: `code: 9` — never reused, never reordered (`primitives.ts:398-404`) — and
`exact: false`, the same honesty `Ellipsoid` already declares.

### 1c. The distance function

```ts
sdPolygonPrism(shape, p) = max(
  sdPolygon2D(p.x, p.z, shape.points),
  Math.abs(p.y) - shape.len / 2,
);
```

`sdPolygon2D` is Inigo Quilez's `sdPolygon`: a crossing test for the sign, and a running minimum
over per-edge clamped projections for the magnitude.

**It is a true signed distance function on both sides of the outline, and the first draft of
this plan said otherwise.** The usual claim about polygon distance functions is that they
degrade inside a non-convex region, and that is not what happens here: the boundary of the
interior _is_ the outline, so the closest boundary point to an interior point is the closest
point on the outline to it, which is what the running minimum finds. `polygon.test.ts`
checks this against a brute-force walk along every edge rather than taking it on trust.

Two properties fell out of choosing the crossing count and are worth stating because they are
what a hand-drawn plan needs:

- **Winding does not matter.** The number of times a ray leaves a point through the boundary
  is odd exactly when the point is inside, and it is odd whichever way round the outline was
  drawn. So there is no winding to normalise, and a level file edited by hand cannot come out
  inside out.
- **What it does assume is that the outline is simple.** A figure of eight has two lobes and
  the parity rule reports one inside and the other outside. Detecting that is an O(n²) segment
  test a level reader runs once and a mesh sample runs a million times, so it belongs at the
  door: the draw tool refuses to close a self-intersecting loop, and a hand-edited file that
  gets one has a floor with a puzzling bite out of it rather than a NaN.

The extrusion is `max(planar, |y| - len / 2)`, the intersection of the two conditions.

**That is exact in three of the four regions a point can be in, and short in the fourth** —
outside the outline _and_ above or below the slab's height, where the true distance is the
hypotenuse to the corner and `max` reports the longer leg. The error is bounded by a factor of
√2 and grows with distance, which is why the entry declares `exact: false`, and why the cost
is a sphere tracer taking a few more steps outside a floor rather than fewer. Every other
region is exact: the top and bottom faces are `len / 2` away and the walls are the outline's
own distance. Both halves of that are measured on a grid in `polygon.test.ts`, because a flag
that only ever says "approximate" is a flag nobody can act on.

`halfExtents` is `{ x: (maxX - minX) / 2, y: len / 2, z: (maxZ - minZ) / 2 }` over the **used**
points. This is load-bearing: `operationBoundsOf` (`operations.ts:150-190`) rotates the eight
corners of a symmetric half-box, so the origin must be the XZ bounds centre or the far end of a
long floor will not re-mesh. It is the trap `draw-walls-plan.md` recorded first.

### 1d. The five readers

`parameterFloats` returns `1` for a variable parameter — the width prefix — and its doc changes
from "the float count a primitive's parameters occupy" to "the fixed part; a shape whose width is
not a constant writes that width as its first float". `parametersToFloats` pushes the count and
then the coordinates. `shapeFromFloats` reads the count and then that many pairs.
`dimensionGroups` skips it, and its doc ("One entry for a number, three for a `Vec3`. Never
two.") gains a clause. `withParameter` skips it.

### 1e. Keep it out of the modeller's palette

`PRIMITIVE_NAMES` (`primitives.ts:614`) drives `apps/sdf-modeller/src/app.tsx:2538`, whose
`defaultShape` (`parts-panel.tsx:32`) is an exhaustive switch and whose transform panel renders
`dimensionGroups`. Neither has a story for an outline.

Add `readonly inPalette?: boolean` to `PrimitiveSpec`, `false` for `Polygon`, and export
`PALETTE_NAMES` as the filtered list. `PRIMITIVE_NAMES` stays complete because
`primitiveFromCode` (`primitives.ts:826`) walks it. The modeller still gets a `case "Polygon"` so
its switch stays exhaustive — a default square is harmless for a shape the palette does not offer.

### 1f. Tests

`packages/sdf/src/polygon.test.ts`:

- a point inside is negative; a point outside an edge is within a hair of its true distance
- **exactness against a brute-force nearest-boundary-point search, inside a concavity as well
  as outside it** — the claim above, measured rather than taken on trust
- a point above the top face is `p.y - len / 2`
- **winding invariance** — the same outline drawn the other way round gives the same field
- an L-shape is solid through the notch and hollow in the corner
- a grid over all four regions, pinning exactness in three and the √2 shortfall in the fourth
- a zero-length edge and an outline under three points, both finite
- `halfExtents` contains the surface, which `primitives.test.ts` already asserts for every entry

`primitives.test.ts` additionally checks codes are unique and that 0, 1 and 2 are still
Ellipsoid, Box and Capsule.

**One thing this phase changed that was not planned.** `radius` (`primitives.ts:98`) was not
total: `undefined < MIN_RADIUS` is false, so the clamp returned `undefined` unchanged and every
primitive with an axial size would hand a NaN to the field. Every size in the table passes
through that one function, so a single missing clamp was one NaN reachable from any of them. It
now tests `Number.isFinite` first.

---

## Phase 2 — the format (`packages/csg/src/serialise.ts`)

The costly phase, isolated so it can be reverted on its own.

1. `FORMAT_VERSION = 4 → 5` (`:84`), with a section in the same voice as the existing three.
   **The recorded cost: every place baked at version 4 — snack models, and the figure and prop
   models `model-library.ts:201` reads out of a place — is refused by `deserialiseOperations:249`
   until re-exported.** `tools/make-snack-models.ts` regenerates this repository's own.
2. `operationBytes` (`:109`) switches from `parameterFloats(shape)` to
   `parametersToFloats(shape).length`. **One source of truth, deliberately**, even though it
   means `serialisedSize` allocates an array per operation per edit: two disagreeing width
   computations would silently shift every operation after the first polygon in the file, which
   parses into plausible-looking garbage — the exact failure this reader is built to refuse.
3. `readShape` (`:150`) drops the "dummy empty call" for variable shapes, peeks the count float at
   `offset`, and reads `prefix + count * floatsPerPoint`. The trick survives for every fixed-width
   shape.
4. The layout comment block (`:13-26`).

**Tests**: a 3-point and a 64-point round-trip; a **frozen version-4 fixture asserting the
refusal message**, because the cost is only real if it is named; and
`parametersToFloats(shape).length` equal to the width `readShape` will consume, for polygons of
two different sizes.

---

## Phase 3 — the level editor (`apps/spacescape`)

**A floor is a `LevelShape` with `shape.type: "Polygon"`, not a fourth `LevelItem` kind.** The
reason, and the reason it is worth writing down: the walls plan recorded the price of a third kind
as "every place that asked 'shape or figure' now asks 'shape, figure or walls'. Picking, the
highlight, the inspector and the level reader each gain a branch." A polygon needs none of that —
it is a shape, and `orientation` already means "the turn this particular shape has been put at"
(ADR 0051). So `types.ts`, `level-plan.ts`, `apply-level.ts`, `picking.ts` and `highlight.ts` gain
**nothing**, and their existing tests should pass untouched.

### 3a. `checkShape` (`src/places/fields.ts`) — done

`checkOutline` refuses a point count outside the table's bounds, a coordinate that is not a
finite number within ±`MAX_SHAPE_SIZE`, and **two consecutive vertices at the same place** —
including the closing pair, because that is what a person closing a drawn loop actually
produces. Ten tests for it in `level-plan.test.ts`, and one trap, which is why it gets a comment:

> Coordinates must **not** go through `within()` (`:397`), which refuses anything below
> `MIN_SHAPE_SIZE = 1e-3`. A vertex at local `(0, 0)` is the centre vertex of a perfectly
> ordinary symmetric square.

So: an array of `{ x, z }`, its length within `minPoints..maxPoints`, each finite and within
±`MAX_SHAPE_SIZE`, and **no consecutive duplicate points** — a zero-length edge is `dot(e, e) === 0`,
a division by zero inside the field, three modules from the editor.

### 3b. `PlaceShape` (`src/places/guest/place-api.ts:112`)

One more mapped-type branch and a `PlaceVec2`. A guest script can then create a polygon, and the
format handles it.

### 3c. The vocabulary

`Polygon` in `SHAPE_KIND_LABELS` ("Floor"), `DEFAULT_SHAPE_SIZES` (24) and `MIN_SHAPE_SIZES` (1).
All three are `Record<ShapeType, …>`, so growing `ShapeType` makes them compile errors. **The
forcing function is free and it is the best argument for this design.**

### 3d. `defaultShape` (`src/level-editor/level-editor-store.ts:88`)

`Polygon: { type: "Polygon", points: <a 24-wide square>, len: 8 }`.

### 3e. The property panel (`panels/PropertiesPanel.tsx`)

- Filter the generated `<For>` (`:295-324`) to non-variable parameters, so `points` renders no
  field.
- `PARAMETER_LABELS` (`:73`) is keyed by bare parameter name, so `len` reads "Size" for every
  shape. Prefer a per-kind key and add `"Polygon.len": "Thickness"`.
- An outline bar beside the walls one (`:503`): the vertex count, and an **Edit outline** button
  wired like `props.onEditWalls`.

**`y` and thickness, as decided:** the SDF stays symmetric about its local origin so `halfExtents`
and chunk invalidation stay correct, and `at.y` is the **mid-plane** — so the floor's top surface
is `at.y + thickness / 2` and its underside is `at.y - thickness / 2`. The item already has a
Position field, so this needs no new one.

### 3f. The draw tool

`createDrawLinesController` already snaps back to vertex 0 to close a loop, so this is mostly a
second finish rather than a new gesture.

- `draw/draw-lines-controller.ts` — `finishFloor()` and a `floorRefusal` string on the snapshot,
  requiring **one chain, at least three distinct vertices, and no self-intersection**. **No
  winding to normalise** — the SDF's sign is a crossing count, which is odd inside for either
  direction, so whatever way round the hand closed the loop gives the same floor.
- `draw/floor.ts` — **done.** `floorRefusal`, `openOutline`, `outlineIsSimple`, `floorCentre` and
  `floorPlacement`, with `floor.test.ts`.
- `DrawLinesUi.tsx` — **done.** Hides **New line** for a floor rather than disabling it, because a
  second chain is how a floor's Finish is refused and a button that leads to "A floor is one
  outline" is worse than one that was never there. Says the refusal in words, because there are
  four and each calls for a different next press. And **Finish is enabled from `floorRefusal`,
  not `canFinish`** — see below.
- `panels/ToolbarPanel.tsx`, `level-editor-store.ts`, `LevelEditorOverlay.tsx`,
  `panels/PropertiesPanel.tsx` — **done.** A Floor tool, `addFloor`, and an outline bar with
  **Edit outline**.
- `app.tsx` — **done.** `finishDrawing` is the one branch, and everything else asks
  `drawsInAPlane`.

### One predicate, ten sites

`app.tsx` asked `tool() === "walls"` in about ten places: the render, the click path, the press,
the move, the release, the cancel, the teardown effect, and so on. Each one is the same
question — _is a drawing happening_ — and a pair of `||`s at each of them would be ten places to
forget the half. So the store exports `drawsInAPlane(kind)` and every one of them asks that,
which renames the question once instead of answering it ten times.

**`canFinish` was the one site that could not be a predicate call**, and it is worth naming
because it looks like it was. `canFinish` answers "some chain has two points or more", which is
the _walls_ answer; a floor with two points in one open chain satisfies it. Left alone, a
floor's Finish would be enabled on a chain that is not a floor — a button that does nothing
when pressed. It is enabled from `floorRefusal === undefined` instead, which is both the
message and the enablement.

### The frame is left-handed if you write it the obvious way

**Two bugs in `floor.ts` that a flat-ground test could not have found**, both written and caught
in the same afternoon, both of which produce a floor that still meshes and still renders:

1. **`(axisA, up, axisB)` is not a rotation.** `onbFromDirection` hands back `(axisA, axisB, up)`
   right-handed — `axisA × axisB = up` — so putting `up` second is a _transposition_ of that,
   which flips the determinant. A frame with determinant −1 is a reflection, and no quaternion
   represents it. `quatFromBasis` still returns a number for it; the number is not this frame.
   The third axis is now `cross(axisA, up)`, computed rather than taken.
2. **`floorCentre` mixed two different quantities.** It projected absolute world points onto the
   plane's axes and then added `plane.origin` back, counting the origin twice — invisible on the
   ground, and twice the offset everywhere else. And it took the height from the points' world
   `y`, which on a plane tilted forty degrees says nothing about how far the points are from each
   other along its normal. Up is a function of where you are (ADR 0037), so the height has to be
   the projection onto `up` too, and `(axisA, axisB, up)` being orthonormal is what licenses
   rebuilding the centre from all three.

The tests that found them are the tilted-plane one and the right-handedness assertion, and both
are worth keeping: a floor on a flat planet is the only case where every one of these is
invisible.

### 3g. Tests

`src/level-editor/draw/floor.test.ts` — rotate the local axes back through the stored quaternion
and prove they land on the drawn plane's, the same proof `walls.test.ts:1-12` gives a wall's. Plus
`level-plan.test.ts`: a polygon shape accepted, two points refused, sixty-five refused, and
`points: [{x: 0, z: 0}, …]` **accepted**, which is the `within()` trap from 3a.

---

## Verification

```
pnpm turbo check-types
pnpm turbo test --concurrency=2
pnpm format:check
pnpm --filter @big-mesh-studios/spacescape place-reference:check
```

## Open costs, named

- **The SDF is O(vertices) per field sample**, and `Field.distance` runs per BVH candidate per
  mesh sample. The BVH bounds a polygon to its box, but every sample inside that box pays for
  every edge. Sixty-four is the proposed cap; a room is four to six.
- **Version 5 orphans baked places**, described in Phase 2. If that turns out to be a real cost
  rather than a theoretical one, option A in Phase 2 is roughly fifteen lines and keeps version 4.
