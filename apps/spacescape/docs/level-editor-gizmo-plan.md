# Move, rotate and duplicate in the level editor

**What this is.** The work, in order, to port `apps/sdf-modeller`'s move gizmo, rotate gizmo
and duplicate into spacescape's level editor. Written down because it is longer than a
context window and the reasoning behind each phase is worth more than the phase itself.

**Source material.**

|                    |                                                            |
| ------------------ | ---------------------------------------------------------- |
| Move arithmetic    | `apps/sdf-modeller/src/view/move-handle.ts` (249 lines)    |
| Move geometry      | `apps/sdf-modeller/src/view/move-handles.ts` (221 lines)   |
| Rotate arithmetic  | `apps/sdf-modeller/src/view/rotate-handle.ts` (138 lines)  |
| Rotate geometry    | `apps/sdf-modeller/src/view/rotate-handles.ts` (205 lines) |
| Drag ghost         | `apps/sdf-modeller/src/view/ghost.ts` (145 lines)          |
| Drag orchestration | `apps/sdf-modeller/src/app.tsx:1305-1386`, `:1397-1474`    |
| Quaternion maths   | `apps/sdf-modeller/src/model/part.ts:126-215`              |
| Duplicate          | `apps/sdf-modeller/src/model/model-store.ts:386-413`       |
| Tests to mirror    | the four `*.test.ts` files beside each of the four above   |

**Why there is nothing to port from the model.** spacescape's `LevelShape` already stores a
position and a size (`at` plus the primitive's parameters), the same as sdf-modeller's
`Part`. The min/max `Bounds` that appears in `level-editor/view/picking.ts` and
`level-editor/view/highlight.ts` is derived on demand and discarded; it never reaches a level
file, a panel or the fold. So this work changes the representation of nothing.

## The design points that must survive the port

These are what make the tools feel right rather than merely function, and each is a line of
reasoning in the source rather than a number:

| Rule                                                                                    | Where it lives                        |
| --------------------------------------------------------------------------------------- | ------------------------------------- |
| Arithmetic split from geometry, per tool                                                | `move-handle.ts` vs `move-handles.ts` |
| Screen-space hit test, **nearest wins**, never a raycast                                | `armUnderPointer`, `ringUnderPointer` |
| `GRAB_RADIUS = 22` px (finger-sized), `HUB_RADIUS = 18` px, `TOO_FORESHORTENED = 10` px | `move-handle.ts:113-127`              |
| Drag is **absolute** from the grab origin, never accumulated                            | `distanceDragged`, `radiansDragged`   |
| `depthTest = false` **and** added to the scene after the model                          | `move-handles.ts:21-37`               |
| Handles scale by camera distance; placed in the render loop                             | `app.tsx:1091-1119`                   |
| Ghost follows the pointer; **one store write on pointer-up**                            | `ghost.ts:1-38`                       |

## What spacescape changes about the port

Six things differ enough to matter, and each is its own phase.

1. **`LevelShape` has no orientation.** `LevelFigure` has `yaw`; shapes have nothing.
2. **The store is command/queue based.** `apply()` → `doCommand` → `Command.setItem`, so
   "one write on pointer-up" is `updateItem`, not `transform`.
3. **The orbit camera has no `setInteractive`** — only `setToolOwnsLeft`, and it is raised
   only for mouse left presses (`camera/orbit.ts:73-81`). A _touch_ gizmo drag would fight
   the camera.
4. **The canvas is absolutely positioned into a pane**, so screen maths needs
   `getBoundingClientRect()`, as `toNdc` already does at `app.tsx:2062-2068`.
5. **`pointerup` on the canvas places a shape** (`app.tsx:2216-2220`). A gizmo drag ends
   with a `pointerup` and would immediately place or deselect. This is the single most likely
   thing to make the feature feel broken.
6. **Solid 2 effect arms have no owner** — `onCleanup` inside an arm is a silent no-op. The
   teardown must be the arm's return value (`app.tsx:2191-2199`).

## Decisions already taken

1. **A toolbar toggle**, not an always-on widget: an `adjust` bar of Move / Rotate / Off,
   defaulting to Move. Matches sdf-modeller and keeps a busy scene uncluttered.
2. **`orientation` goes on `LevelShape`, and picking and highlight become oriented boxes.**
   Both files already say where rotation belongs (`picking.ts:67-71`,
   `highlight.ts:16-25`).
3. **No scale gizmo.** It would only help figures — shapes scale by editing primitive
   parameters, which the inspector already does per-primitive and which is a better control
   than a gizmo for a capsule's length-vs-radius.
4. **No snapping, no keyboard nudge** in this pass.
5. **A duplicate is suffixed until unique** (`wall-Box-0-20-0` → `-2`, `-3`), because
   `idFor` is position-derived and the reader refuses duplicate ids.

## Why the pivot needs no new concept

The user asked for rotation about the centre of the box, and it turns out this needs no
arithmetic at all.

Every primitive's `halfExtents` is a **symmetric half-box about the primitive's own origin**,
including the ones that do not look centrally symmetric — ADR 0025 makes capsules, cones and
cylinders point up about Y (`packages/sdf/src/primitives.ts:513-518`). A box centred on the
origin, rotated about its own centre, stays centred there. So for all nine primitives at
every orientation:

```
(min + max) / 2  ===  at
```

"Rotate about the centre of the box" and "rotate about `at`" are the same point, which is
exactly sdf-modeller's `part.origin` pivot. `place(at, distance)` ports straight across.

**The AABB still grows** even though its centre does not — a capsule at 45° has an
axis-aligned box far larger than the capsule. That is why the highlight must become an OBB
rather than a nicer pivot. rmsl applies scale → rotate → translate, so a unit cube scaled to
`max - min` and rotated about its centre stays centred on `at`.

**`boundsOf` already handles orientation.** `operationBoundsOf`
(`packages/csg/src/operations.ts:169-190`) takes eight corners and rotates each by
`operation.orientation`, so chunk invalidation becomes correct the moment `apply-level.ts`
forwards the quaternion. No work.

## Phase 0 — Record the decision

`docs/adr/0051-a-level-shape-carries-its-turn.md`: the level format gains `orientation`;
picking and the highlight become oriented boxes. Update the ADR table in `docs/adr/README.md`
and amend ADR 0001's "The transform gizmo is the real cost" consequence, which predicted
this.

**Done.** ADR 0051 written, the README table and prose updated, ADR 0001 amended in both its
table row and its gizmo consequence.

## Phase 1 — The pure arithmetic

New files under `apps/spacescape/src/level-editor/view/`, copied from sdf-modeller:

- `move-handle.ts` — `Axis`, `AXIS_COLOUR`, `VIEW_SHARE`, `SHAFT_RADIUS`, `HEAD_LENGTH`,
  `HEAD_RADIUS`, `GRAB_RADIUS`, `HUB_RADIUS`, `TOO_FORESHORTENED`, `projectToScreen`,
  `distanceToSegment`, `armUnderPointer`, `distanceDragged`
- `move-handles.ts` — `createMoveHandles(scene)`
- `rotate-handle.ts` — `RING_VIEW_SHARE`, `TUBE_RADIUS`, `AROUND`, `RingOnScreen`,
  `ringUnderPointer`, `radiansDragged`
- `rotate-handles.ts` — `createRotateHandles(scene)`

**One adaptation.** `place(origin, radius)` in the source takes an orbit radius.
spacescape's `CameraControl` seam exposes no radius and no-clip has no meaningful one, so use
the **camera-to-item distance** — `hypot(camera.position − item.at)` — which is correct under
both styles and needs no seam change.

Tests port as-is, including `move-handles.test.ts` and `rotate-handles.test.ts`, which assert
screen-size invariance and that a camera behind the handles yields `[]`.

**Done.** All eight files copied and adapted; `place`'s second argument renamed `radius` →
`distance` throughout with the reason recorded on `VIEW_SHARE`. **42 tests pass unchanged**,
which is the point of the split.

## Phase 2 — `orientation` in the level format

No version bump and no change to the effect table: `orientation` is **already** an accepted
`shape-add` field (`places/effects.ts:223`, validated by `places/fields.ts:206`); `readShape`
simply drops it today.

- `places/level/types.ts` — `readonly orientation?: Quat` on `LevelShape`
- `places/level/level-plan.ts` — `ShapePayload.orientation`, and `readShape` passing it through
- `places/level/apply-level.ts` — `operationOf` forwards it to `placeOperation`, which already
  accepts `orientation` (`place-registry.ts:465`)

The assertion at `level-plan.test.ts:87` (`not.toContain("orientation")`) still holds — it
asserts nothing is _invented_. Add coverage for round-tripping a rotated shape.

**Known consequence, for the ADR rather than for a fix.** `orientation` is already a declared
field, so a build older than this one accepts a file carrying it and then silently un-rotates
the shape, rather than refusing the file the way an unknown key would be refused. Bumping
`LEVEL_VERSION` would close that properly and would also refuse every existing file, which is
worse. Recorded, not fixed.

**Done.** `LevelShape.orientation` added as a four-number tuple, matching `CreateShapeOptions`
rather than `Quat` — a level file is JSON, and `at` is already a tuple for the same reason.
`readShape` passes it through, `operationOf` converts it to `Quat` for the operation. Five new
tests: the round-trip that used to fail, the table's own two refusals reached through the
reader, and the check that an un-turned shape grows no key. **61 tests pass.**

## Phase 3 — Oriented picking and highlight

- `level-editor/view/picking.ts` — `shapeBox` → oriented box; the ray is rotated into the
  shape's frame and the existing slab test works unchanged. `rotate` and `conjugate` are
  already exported from `@big-mesh-studios/csg`. Keep the AABB as the broad-phase reject,
  since `pickShape` loops every shape.
- `level-editor/view/highlight.ts` — `show(bounds, orientation?)` sets `mesh.quaternion`;
  `Highlightable` gains `orientation`.
- Figures get `yaw` applied to their box, retiring the compromise noted at
  `highlight.ts:62-66`.

**Done, and the AABB reject did not survive.** `Bounds {min, max}` is replaced outright by an
`OrientedBox {centre, half, orientation}`, because the only two callers asked the same question
and keeping a world-space AABB as well would have meant computing eight rotated corners per
shape per click in order to save two quaternion rotations — a bad trade, and one the code
would have made silently rather than obviously.

`rayOrientedBoxDistance` is therefore two `rotate` calls and the _existing_ `rayBoxDistance`,
not a second slab test; `orientedBoxContains` is the same change of coordinates. The pivot
needed no arithmetic: `centre` is `at`, and the tests now pin that a turned shape's `half` is
unchanged and its `centre` is unchanged, which is what makes the gizmo's pivot free.

`figureBox` added, so a figure's box is its model's half-extents **with its yaw applied**,
retiring the "a slightly larger hit than the prop" compromise. The full suite passes:
**105 files, 2184 tests.**

## Phase 4 — The ghost

Port `ghost.ts` (`MeshBasicMaterial`, `opacity 0.65`, `depthWrite = false`, unlit, built once
in the primitive's own frame). The source differs by item kind:

- **shape** — `primitiveMesh(placeOperation(...))` from `@big-mesh-studios/meshing`, already a
  dependency. This is `primitivePartMesh` under another name; `primitiveMesh` forces `Add` and
  a hard edge, so a `Subtract` wall previews as a wall rather than as nothing.
- **figure** — `model.draw(ghost.material)` (`places/model-library.ts:139`), which hands out a
  new `Mesh` over **shared** geometry. Do not clone it, and do not dispose it.

**Done.** `createGhost` owns a `Group` added once to the scene, and the mesh is swapped
_inside_ it. That is not decoration: rmsl draws in insertion order, so a ghost added straight
to the scene would land at the end of the list on the second drag — after the handles — and
draw over the arrows being dragged. The group's place in the scene is fixed by the order the
caller constructs these in, and a drag cannot move it.

`shapeGhostMesh` meshes at `FIGURE_MESH_BUDGET` — this world's own `VOXEL_SIZE`, the same
budget a prop standing in this world is meshed at — and hands `primitiveMesh` the **identity**
so the turn lives on the ghost as a quaternion. `show(mesh, ownGeometry)` takes a flag because
a shape's ghost geometry is built per drag and the ghost's to free, while a figure's is the
model's own and shared by every placement of it.

12 tests. Both of the two that guard something a bug would be silent about were
**mutation-checked**: making the ghost bake the turn, and making it free a shared geometry,
each fail the test written for them. The first only started failing once the test shape was
made asymmetric — a 40 × 6 × 40 box is unchanged by a quarter turn about up, so the original
test was vacuous. (The same trap bit `picking.test.ts` earlier in the same pass.)

## Phase 5 — Claiming the gesture

Add `claimGesture(claimed: boolean): void` to the `CameraControl` seam.

- **orbit** — replace the bare `setToolOwnsLeft` calls with a claim **counter**:
  `takeLeftButton` increments, `releaseLeftButton` decrements, `claimGesture` increments or
  decrements, and `setToolOwnsLeft(count > 0)`. A counter because the placement path and the
  gizmo can legitimately both hold a claim.
- **no-clip** — `input.setEnabled(!claimed)`. The gizmo reads its own `pointer()` from
  `@big-mesh-studios/ui/pointer` on the canvas, so silencing `input` does not silence the drag.

Claims are always released in a `finally`, and the editor's existing `applyEditorInput` owns
the open/close transition. The ordering constraint is that a claim never outlives its drag.

**Done, and the no-clip half did not survive contact with the code.** Pointer lock freezes
`clientX`/`clientY` — which `app.tsx:2020-2023` already records as the reason the editor
suspends the lock on open — and no-clip re-enables the input controller, which re-takes the
lock on the next click. So under no-clip **the gizmo has no pointer position to measure and is
not offered at all**. `claimGesture` is therefore a no-op there, and that is also what keeps
`noclip.ts` from becoming a second writer of `input.setEnabled` racing the editor's own
open/close transition — a release that re-enabled input there would hand the flight controls
back to a camera that was not meant to have them.

That in turn makes the orbit counter the only claim in the editor, and it is genuinely
necessary: on a mouse, `takeLeftButton` has already claimed by the time the gizmo sees the
press, so a boolean released by the gizmo would hand the camera back **halfway through the
drag**. Four tests, one of which mutation-checks exactly that by turning the counter back into
a boolean. Clamped at zero, because a negative count reads as "nobody wants the button" and
presents a caller bug as a camera that has quietly stopped responding.

**Suite after Phase 5: 106 files, 2200 tests.**

## Phase 6 — Drag orchestration (`app.tsx`)

Port `grabHandle` and `grabRing`.

- Add `let dragging` and `let justDragged`. `justDragged` is reset in a `pointerdown` and
  checked by the `onPointerUp` handler at `app.tsx:2216`, which otherwise places a shape or
  clears the selection the instant a drag ends. **Do not skip this.**
- Register the gizmo's `pointerdown` **before** `takeLevelCamera` attaches the orbit
  controller — sdf-modeller does the same (`app.tsx:2153` then `:2169`).
- Inside the existing `createEffect(levelEditorOpen, …)` arm, with its teardown added to the
  arm's **returned** function (`app.tsx:2226-2232`).
- `standHandles()` is called at the top of `editorFrame` (`app.tsx:2046-2051`), not from an
  effect — the camera is not a signal, so an effect would leave the handles stale after a zoom
  or an orbit.
- Scene order: terrain and figures → `levelHighlight` (already last at `app.tsx:1929`) →
  ghost → `createMoveHandles` → `createRotateHandles`. rmsl draws in insertion order
  (ADR 0014); `depthTest = false` changes nothing unless the handles are traversed last.

**Done.** `quaternion.ts` added first, because `core` has the `Quat` _type_ and nothing that
makes one — `axisAngle`, `multiply`, `fromEuler` and `toEuler` ported from
`sdf-modeller/src/model/part.ts:126-215`, with the axis normalised rather than required to be
unit (the caller here is a drag that read its axis off a hit test, so a wrong-length axis
would be a rotation of the wrong size with no complaint).

`grabHandle` and `grabRing` wired into the editor-open effect, with `pointerdown` registered
**before** `takeLevelCamera` — the camera reads its tool flag while deciding what a drag
means, so a listener registered after it would be told about the press second.

**`justDragged` is the piece that makes the rest usable.** A gizmo drag ends in the same
`pointerup` the editor places a shape on, so without it every drag was followed one event
later by a shape landing on top of what had just been moved, or — with the select tool — by a
re-pick that cleared the selection of the thing being dragged. Set on `pointerdown`, read and
cleared by the click, so the next press is a click again.

**`standHandles` runs from `editorFrame`, not from an effect**, because the camera is not a
signal and an effect would leave the arrows at a fixed on-screen size after every zoom.

Two decisions the plan did not have:

- **A figure gets one ring, not three.** `FigureSpec` carries a `yaw` and the host refuses a
  turn on any other axis, so two of the three rings would take a drag and then do nothing. The
  rotate write for a figure goes back as the one angle it has.
- **The gizmo is orbit-only**, which is what `claimGesture`'s no-op on no-clip implied.
  `standHandles` hides the handles when the style is not orbit, rather than showing handles
  that cannot be hit.

## Phase 7 — Store

- `level-editor-store.ts` — a `gizmo: Accessor<GizmoKind>` signal (`"off" | "move" |
"rotate"`, default `"move"`), deliberately **not** part of `ToolKind`, which drives what a
  canvas click places.
- `duplicateItem(index)` — builds the copy by spread (so `material`, `colour`, `softness` and
  `orientation` all survive); gives it a fresh id; applies it as
  `Command.addItem(copy, index + 1)` immediately after the original; selects it; and records
  exactly one undo step.
- **Naming.** `idFor` is position-derived, so a same-spot copy collides. Walk `-2`, `-3`, …
  until free, checking `working`. One `apply()` call, so one undo entry.

**Done.** The copy goes **immediately after the original rather than at the end**, which is
about the fold: the list order _is_ the fold order (ADR 0016) and the fold combines with a
smooth minimum, so appending a copy of a `Subtract` behind everything else would change the
surface rather than duplicating it.

The id walk starts at 2 — the plain id is the original's — and walks rather than counts,
because suffixes need not be contiguous. Duplicating the same item twice gives `-2` and `-3`
(a flat series, which reads as a count of copies); duplicating a selected copy gives `-2-2`
(a nested name, which says what it is a copy _of_).

Six tests. **One of my own test claims was wrong** and the suite said so: I had assumed the
selection followed the copy, but `duplicateItem` takes an index explicitly — so duplicating
index 0 twice copies the _original_ twice. That is the better behaviour and the tests now say
so. Another assumed a failed duplicate would leave the undo stack alone; it did, but the test
proved it by pressing undo and took back the _placement_, because `place()` is itself a step.
It reads the stack now.

## Phase 8 — UI

- `panels/ToolbarPanel.tsx` — a `Bar label="handles"` with Move / Rotate / None.
- A duplicate button in `ItemListPanel.tsx`, beside the ▲▼/✕ controls so it acts on the
  highlighted row.
- `panels/PropertiesPanel.tsx` — yaw/pitch/roll in degrees for shapes. **Position and size
  need no change**: the panel already edits `at` through a `Vec3Field` and generates the size
  from `PARAMETERS_OF(kind())`.
  - Gate the bar on `isAxial`, which excludes **only `Sphere`**. It asks about a _kind_, so it
    has to hold for every instance of that kind: an `Ellipsoid` with three different radii
    turns visibly and only becomes symmetric when somebody makes it so, and a `RoundBox` of
    `40 × 6 × 20` on its side is plainly a different shape from the one standing up.
  - **Compose from the displayed degrees, not from the stored quaternion.** If Yaw is dragged
    to 30 and Pitch is then edited, it must compose from `(30, currentPitch, currentRoll)` via
    `toEuler` → `fromEuler`. Composing from the last-committed quaternion instead would make
    every edit compound against a value the panel is not showing.
- **Rewrite the `PropertiesPanel` header** (lines 3-14), titled _"Why there is no drag and no
  gizmo"_, which is now false.

**Done.** Duplicate is a per-row control in the list's own group rather than a toolbar button:
it is an insert, so it changes the fold, so it belongs beside the two controls that also change
the fold. It hands back to the move gizmo, because a copy lands on top of the original and
the next thing anybody wants is to put it somewhere else — and it is the _panel_ that switches,
not the store, because a store that changed the editor's tool as a side effect of an add would
be a store reaching into the UI.

Five panel tests, including the composition claim — **mutation-checked** by making `turned()`
ignore the angles on screen and confirming the test fails.

## Phase 9 — Tests and verification

Port the four sdf-modeller test files. Add duplicate and orientation cases to
`level-editor-store.test.ts` and `level-plan.test.ts`, OBB cases in `picking.test.ts`, and
quaternion cases in `highlight.test.ts`. `properties-panel.test.tsx` must keep passing — it
asserts no `STRICT_READ_UNTRACKED`, and the new rotation fields read through the same accessor
discipline the existing ones do.

Then `pnpm --filter spacescape check-types` and `pnpm --filter spacescape test`.

**Done.** `pnpm --filter spacescape check-types` clean, `prettier --check` clean across
`apps/spacescape/src`, `apps/spacescape/docs` and `docs/adr`.

```
Test Files  107 passed (107)
     Tests  2224 passed | 2 expected fail | 2 skipped (2228)
```

Up from 105 files / 2184 tests before this work.

### What is new, in one place

| File                                      |                                                                             |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| `level-editor/view/move-handle.ts`        | ported, unchanged arithmetic                                                |
| `level-editor/view/move-handles.ts`       | ported, `place`'s second argument renamed                                   |
| `level-editor/view/rotate-handle.ts`      | ported, unchanged arithmetic                                                |
| `level-editor/view/rotate-handles.ts`     | ported, `place`'s second argument renamed                                   |
| `level-editor/view/quaternion.ts`         | `axisAngle`, `multiply`, `fromEuler`, `toEuler`                             |
| `level-editor/view/ghost.ts`              | the drag preview, in a group of its own                                     |
| `level-editor/view/picking.ts`            | `OrientedBox`; `rayOrientedBoxDistance`, `orientedBoxContains`, `figureBox` |
| `level-editor/view/highlight.ts`          | `show(OrientedBox)`, `mesh.quaternion`                                      |
| `places/level/types.ts`                   | `LevelShape.orientation`                                                    |
| `places/level/level-plan.ts`              | read it through                                                             |
| `places/level/apply-level.ts`             | forward it to the operation                                                 |
| `level-editor/level-editor-store.ts`      | `gizmo`, `duplicateItem`, `freeId`                                          |
| `level-editor/camera/CameraControl.ts`    | `claimGesture` on the seam                                                  |
| `level-editor/camera/orbit.ts`            | the claim counter                                                           |
| `level-editor/camera/noclip.ts`           | a documented no-op                                                          |
| `level-editor/panels/vocabulary.ts`       | `isAxial`                                                                   |
| `level-editor/panels/ToolbarPanel.tsx`    | the handles row                                                             |
| `level-editor/panels/ItemListPanel.tsx`   | duplicate                                                                   |
| `level-editor/panels/PropertiesPanel.tsx` | rotation fields, header rewritten                                           |
| `app.tsx`                                 | `grabHandle`, `grabRing`, `standHandles`, `justDragged`                     |

## Features deliberately left out

**Scale gizmo.** sdf-modeller does not have one either; it came from its sibling
`apps/rm-stacker/src/arm-widget.ts` (`sizeDragged`, arm length = doubling). It would only
help figures. Real, but narrow.

**Snapping.** Neither app has it. On a planet with `VOXEL_SIZE = 10` (`constants.ts:18`),
snapping a move to whole units and a rotate to 15° is probably a larger day-to-day win than
anything on this list — worth a follow-up.

**Not worth porting at all:** sdf-modeller's paint brush (sculpting already has a better one),
its reorder arrows (the ▲▼ fold-order controls exist and are the only correct control for it),
and its numeric transform panel (the inspector _is_ that panel, and a better one — it
generates its fields from the primitive table).
