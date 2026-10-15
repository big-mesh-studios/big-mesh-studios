# Draw lines, make walls, in the level editor

**What this is.** A new drawing tool for spacescape's level editor: the person draws a
polyline in a horizontal plane, presses **Finish**, and a **walls** item appears in the fold.
The walls item has a **height** (and a thickness) that the inspector edits, and the drawing
gesture shows the floating **length / angle** UI the sibling project already has.

**Why it is written down.** The gesture is one feature and the representation is another, and
the second one has a fork in it wide enough to change the size of the job by a factor of
three. The plan takes the narrow fork first (a spike), keeps the option to widen it, and puts
the touch interaction on paper because it is the part with the least prior art in this repo.

**Source material.**

|                                    |                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| Line drawing (desktop)             | `C:\Users\clinu\GitHub\online-quote-beta\apps\online-quote\src\app\modes\DrawLinesMode.tsx` |
| Working plane + projection         | the same file: `fixedWorkingSpace`, `workingPtUnderMouse`                                   |
| Floating length / angle UI         | the same file: `lengthAngleOverlayUI`, `LengthOnlyUI`                                       |
| Axis locks (keyboard)              | the same file: `_onKeyDown` (`X` / `Y` / `Z` / `Cont`)                                      |
| Overlay lines in the scene         | `apps/spacescape/src/places/zones.ts` (`LineSegments2`)                                     |
| Pointer drag helper                | `packages/ui/src/pointer.ts`                                                                |
| Orbit gestures (pinch during tool) | `apps/spacescape/src/level-editor/camera/orbit.ts:325-329`                                  |
| Screen-space picking               | `packages/picking/src/picker.ts` (`rayThroughScreen`, `pickAlong`)                          |
| Up at a point                      | `apps/spacescape/src/world/up.ts` (`Frame.upAt`, ADR 0037/0050)                             |

## Decisions already taken

1. **Representation: spike THEN decide.** The first working version makes a **level item of
   `kind: "walls"`** that `apply-level.ts` expands into one operation per segment. This needs
   **no `@big-mesh-studios/sdf` change, no `@big-mesh-studios/csg` change, no binary-format
   bump, no `.sdfmod` fallout and no guest-API change.** Promoting it later to a real
   `Walls` primitive is a separate, recorded decision (Phase 7) with its own cost.
2. **Vertical axis: the frame's up at the first point.** `WORLD.frame.upAt(firstPoint)` is
   `+Y` on a flat world and radial on a sphere (ADR 0037, ADR 0050). One call, correct on
   both worlds. Not a hard-coded `+Y`.
3. **One flow on every device: aim, then commit, then finish.** Committing the current segment
   is an explicit **Next** action — the reference's length field already commits on **Enter**
   (`DrawLinesMode.tsx:959`), so this is its touch equivalent rather than a second idea — with a
   left-click on desktop as a shortcut for the same thing. **Release never commits on either
   device.** **Finish** ends the draw; **New line** starts a disconnected chain; **Undo point**
   removes the last vertex. The floating length/angle field is editable on both, so a segment
   can be typed rather than dragged.
4. **Only the aim input differs, because the hardware does.** A mouse hovers, so its aim is
   continuous; a finger cannot, so it presses and drags and the aim is **latched** on release.
   That is the one difference and it is a fact about the device, not a second flow — every
   commit, undo, finish and typed value is reached the same way on both.
5. **The draft is not a level item until Finish.** Vertices live in the controller and are
   drawn as an overlay, so Undo and re-aiming are free and the level receives **one** edit —
   one undo step (`level-editor-store.ts`'s `apply`).
6. **Orbit camera only.** Under no-clip the pointer lock freezes `clientX`/`clientY`, which is
   the same reason the gizmo is orbit-only (`app.tsx:2136`).

---

## The gesture

### The controller's state machine (no DOM, testable)

`createDrawLinesController` holds:

- `plane` — `{ origin: Vec3; up: Vec3; axisA: Vec3; axisB: Vec3 }`, from the first ground
  point and `upAt(origin)`. `axisA`/`axisB` are the tangent pair (`onbFromDirection(up)`).
- `vertices: Vec3[]` — committed, in world space, all coplanar.
- `start: Vec3 | undefined` — the end of the last committed segment, i.e. the anchor the
  current aim measures from.
- `aim: Vec3 | undefined` — the current (possibly latched) target on the plane.
- `angleLock: "none" | "a" | "b" | "continue"`.
- `newChain: boolean` — the next `press` sets a fresh `start` instead of continuing.

Transitions:

| call                        | meaning                                                                                                                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `press(ray)`                | empty: `pickAlong(terrain)` fixes `origin` + plane, pushes the first vertex, `start = origin`. drawing: begins aiming **on touch** — a mouse aims by hovering, so it has nothing to press for. |
| `move(ray)`                 | `aim = ray ∩ plane`, then snapped (endpoint, then angle lock). Ignored when nothing is aiming.                                                                                                 |
| `release()`                 | **stops aiming and commits nothing.** `aim` stays latched.                                                                                                                                     |
| `next()`                    | if `aim` is set and distinct from `start`: push it, `start = aim`, `aim = undefined`.                                                                                                          |
| `newLine()`                 | set `newChain`; the next `press` starts a disconnected chain.                                                                                                                                  |
| `undoPoint()`               | drop the last vertex; `start` back to the one before (or the first).                                                                                                                           |
| `length` / `angle` override | re-derives `aim` from `start`, `length`, `angle` in the plane basis (the reference's `userLengthAngle`).                                                                                       |
| `finish()`                  | returns the walls spec (`at`, `points`, `height`) when ≥ 2 vertices; the store names it. Otherwise cancels.                                                                                    |

### Snapping

- **Endpoint snap** first: project every existing vertex to screen, snap the aim to the
  nearest within a generous radius (~24–32 CSS px for a finger), matching the reference's
  `snapManagerSnapPtUnderMouse` idea. Also snap to the first vertex to close a loop.
- **Angle lock** second: `none` / plane axis A / plane axis B / `continue` (the previous
  segment's direction). The reference spells these `X`/`Y`/`Z`/`Cont` on arrow keys; here the
  axes are the plane's two tangents, so the buttons are labelled for the plane, not the world.

### The floating length / angle UI

The field is the same on both devices — two numbers, editable, and editing either re-derives
the latched aim (the reference's `userLengthAngle`), so a segment can be typed as an exact
6 m wall instead of dragged. **Enter commits** (`next()`) wherever there is a keyboard.

- **Desktop** — anchored near the pointer, the reference's shape (`lengthAngleOverlayUI`): Tab
  between the two fields.
- **Touch** — anchored **above** the aim point with an offset, so a finger does not cover the
  point; read-only until tapped, then an editable field with the soft keyboard on demand.

### Touch navigation

While the walls tool is active the controller **claims the gesture for the whole session**
(`camera.claimGesture(true)`), so a one-finger drag aims instead of orbiting. Two-finger pinch
and slide still move the camera, because `OrbitController` runs its multi-pointer branch before
it consults `toolOwnsLeft` (`orbit-camera.ts:325-329`). The claim is released on tool change,
editor close, and on `finish()`. This **differs from the gizmo**, which claims per press, and is
written in the code where somebody will read it.

---

## Phase 0 — Record the decisions

New ADR (`docs/adr/00xx-a-wall-is-a-drawn-polyline.md`) recording: the plane convention
(up at the first point), the latched touch aim, and the representation fork with its eventual
cost. Amend ADR 0025 if and when Phase 8 happens. Add the row to `docs/adr/README.md`.

## Phase 1 — Plane geometry (no UI, no world)

New `apps/spacescape/src/level-editor/draw/plane.ts`:

- `planeThrough(point, up)` → origin + orthonormal basis.
- `rayPlanePoint(ray, plane)` — `undefined` for a ray parallel to the plane (the horizon case).
- `toPlane(value)` → `{ a, b }` local coordinates; `fromPlane`.
- `lengthAngle(start, to, plane)`, `angleLocked(start, to, plane, lock, previousDir)`.
- `snapToPoint(aim, candidates, projectToScreen, screenPos, radius)` — the screen-space
  endpoint snap, written as a pure function so it is testable with a stub projection.

Tests `draw/plane.test.ts`, in the style of `view/*.test.ts`.

## Phase 2 — The drawing controller (no UI, no world)

`apps/spacescape/src/level-editor/draw/draw-lines-controller.ts`:

- the state machine above, as a Solid-store-backed closure (or a plain object plus signals the
  overlay reads), with **no DOM and no scene**.
- Exposes reactive reads the overlay needs: `state`, `aimScreen`, `length`, `angle`,
  `vertexCount`, `points`.
- Exposes `press/move/release/next/newLine/undoPoint/finish/setAngleLock` and the
  length/angle override.

Tests `draw/draw-lines-controller.test.ts`, and **the ones that matter are the surprises**:
release commits nothing; `next` chains from the previous end; `newLine` disconnects; a typed
length/angle re-derives the aim; `finish` with one vertex does nothing.

## Phase 3 — The live overlay and the pointer plumbing

- `apps/spacescape/src/level-editor/draw/draw-lines-overlay.ts` — committed vertices + the aim
  segment + vertex dots, drawn with `LineSegments2` / `LineSegmentsGeometry` /
  `Line2NodeMaterial`, **added after the world** (the way `places/zones.ts` is, ADR 0014).
- `apps/spacescape/src/level-editor/draw/DrawLinesUi.tsx` — the floating length/angle field and
  the touch cluster (**Next**, **New line**, **Undo point**, **Finish**, angle-lock toggles).
  Rendered over the canvas like `LevelEditorTouchControls`.

Wiring in `app.tsx`, inside the editor-open effect (`app.tsx:2551`) and under `appOwner`:

- a `DrawLines` holder (mirroring `clickLevelWorld`) so the overlay can bind to the controller
  that is built in `onSettled`;
- canvas `pointerdown` / `pointermove` / `pointerup` handlers gated on the tool and orbit;
- **aim:** desktop `pointermove` (hover) aims; touch primary `pointerdown` + `pointermove` aims;
- **commit:** desktop mouse-left `pointerdown` calls `next()` (the reference's `_onMouseLeftPressed`
  shape); both devices call `next()` from the **Next** button;
- **release (`pointerup`) commits nothing on either device** — it only stops aiming on touch;
- a guard so the existing "`pointerup` places a shape" handler (`app.tsx:2588`) does **not**
  fire while the walls tool is active — the same shape as `justDragged`.

## Phase 4 — The `walls` level item and its expansion (the spike)

- `places/level/types.ts` — `LevelWalls` (`kind: "walls"`, `id`, `at`, `points: [x, z][]`,
  `height`, `thickness`, plus `combine` / `softness` / `material` / `colour` reused from
  `LevelShape`), `isLevelWalls`, the `LevelItem` union, and `itemLabel`.
- `places/level/level-plan.ts` — a `readItem` branch and a reader that validates the shape of a
  walls item (finite points, ≥ 2, a height in range). **No `LEVEL_VERSION` bump**: an older
  build already refuses an unknown `kind` whole, which is the honest answer.
- `places/level/apply-level.ts` — expand a walls item into one operation per segment, under
  **derived ids** (`<id>#0`, `<id>#1`, …) so `orderChanged` sees a changed id list when the
  segment count changes and does the existing rebuild; a same-count edit (move a point, change
  height) is the existing per-id `place.set`, which keeps the fold index. A height change is a
  `set`; adding or removing a point is a rebuild.
- `level-editor/level-editor-store.ts` — `addWallsAt(...)` (one `apply`, one undo step) and
  `defaultWallThickness`.
- `level-editor/panels/vocabulary.ts` / `ToolbarPanel.tsx` — a **Walls** tool button. Because
  it is a gesture and not a click, it is its own `ToolKind` (`"walls"`), not a tenth entry in
  the shape row.

## Phase 5 — Inspector, picking, highlight

- `panels/PropertiesPanel.tsx` — walls fields: height, thickness, position, combine, softness,
  material, colour; and the point count with a **Redraw** button that re-enters Phase 2's
  controller seeded with the existing points.
- `level-editor/view/picking.ts` / `highlight.ts` — a walls item needs a box for selection and
  for the gizmo pivot. Cheapest correct answer: the point-set's bounding box in the plane,
  extruded by height, as an `OrientedBox` (the machinery already exists from ADR 0051).
- `level-editor-store.ts` — `defaultShape`/`addShapeAt` untouched; walls is a separate item.

## Phase 6 — Tests and verification

- `draw/plane.test.ts`, `draw/draw-lines-controller.test.ts` (Phase 1–2).
- `places/level/level-plan.test.ts` — a walls item round-trips; an unknown `kind` is refused.
- `places/level/apply-level.test.ts` — expansion count and ids; a height change is a `set`;
  a point added is a rebuild; **`geometryChanged` bounds cover the whole polyline** (the
  chunk-invalidation trap below).
- `panels/properties-panel.test.tsx` — the walls fields, keeping the `STRICT_READ_UNTRACKED`
  discipline the file already holds.
- A test that **two-finger navigation survives** while a draw has the gesture claimed.
- `pnpm --filter spacescape check-types`, `pnpm --filter spacescape test`, `prettier --check`.

## Phase 7 — (deferred) Promote to a real `Walls` primitive

Only if the spike earns it. The work, recorded so the decision is informed:

- `packages/sdf/src/primitives.ts` — a `Walls` entry plus an extension to `PrimitiveParameter`
  (today `arity: 1 | 3`) to carry a point list, and `sdWalls` (min over extruded segments).
- `packages/sdf/src/index.ts` — export it.
- `packages/csg/src/serialise.ts` — a per-operation point count and `FORMAT_VERSION` 5. **This
  format is also the worker wire format (`session.ts:354`) and the `.sdfmod` model format**, so
  a bump orphans every existing `.sdfmod` — the models baked by `tools/make-snack-models.ts`
  must be regenerated, and `apps/sdf-modeller` is affected too.
- `places/fields.ts` (`checkShape`), `places/guest/place-api.ts` (the `PlaceShape` mapped type),
  `level-editor/panels/vocabulary.ts`, `store.ts`'s `defaultShape`.
- The level's walls item becomes a `LevelShape` with `shape.type === "Walls"`, retiring the
  expansion in `apply-level.ts`.

---

## Things that will bite

- **Chunk invalidation.** `operationBoundsOf` rotates the eight corners of a _symmetric_
  half-box. A wall's half-extents must cover the whole polyline about the item's `at`, or the
  far end of a long wall will not re-mesh. Test a wall longer than a chunk.
- **The placement `pointerup`.** The editor places a shape on a mouse `pointerup`
  (`app.tsx:2588`). The walls path must own that event and suppress placement, the way
  `justDragged` does for the gizmo.
- **The claim's lifetime.** A claim held for a whole draw session must be released on every
  exit (tool change, editor close, `finish`), or the camera stops responding one finger at a
  time. The gizmo's per-press claim is not the same shape; say so in the code.
- **Fold order and the op cap.** N segments per wall against `MAX_OPERATIONS_PER_PLACE`
  (2000). A walls item added at the end of the list appends its segments in order, which is the
  fold order (ADR 0016) — correct, but worth a test.
- **The old build's refusal.** A level containing a walls item is refused _whole_ by a build
  older than this one (the unknown-`kind` rule). That is the right behaviour and the ADR should
  say it rather than leave it to be discovered.
- **Plane basis on a sphere.** "Axis-aligned" angle locks are relative to the plane's own
  tangent basis when up is radial, not to world axes. Label the lock buttons for the plane.

## What is out of scope

- Snapping to existing _terrain_ features beyond the polyline's own vertices (the reference has
  a snap manager; spacescape has none and this does not add one).
- Boolean joinery between a wall and other shapes beyond the existing softness.
- Filled floor polygons — this is lines extruded to walls, not a floor.
- Migrating to the real primitive (Phase 7) — deferred by decision 1.

---

## What landed

All seven phases of the plan's `Walls`-as-a-third-kind path, plus the "Edit lines" redraw the
plan left to the inspector.

| File                                                                               | What                                                                                      |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/level-editor/draw/plane.ts` (+ test)                                          | The drawing plane, ray/plane, angle locks, screen-space vertex snapping                   |
| `src/level-editor/draw/draw-lines-controller.ts` (+ test)                          | The state machine: begin / aim / commit / newLine / undoPoint / finish / seed             |
| `src/level-editor/draw/draw-lines-overlay.ts` (+ test)                             | The draft lines and the hit-area rings, `depthTest` off like the move handles             |
| `src/level-editor/draw/DrawLinesUi.tsx` + `.module.css`                            | The floating length/angle readout and the Next / Undo / New line / Finish / lock row      |
| `src/places/level/types.ts`                                                        | `LevelWalls`, `isLevelWalls`, the widened `LevelItem`                                     |
| `src/places/level/walls.ts` (+ test)                                               | Segments, oriented boxes (`quatFromBasis`), bounds, centre                                |
| `src/places/level/level-plan.ts` (+ test)                                          | The walls reader and its refusals; `itemLabel`                                            |
| `src/places/level/apply-level.ts` (+ test)                                         | Expansion to one operation per segment, under `id#n`, with fold-index stability           |
| `src/level-editor/view/picking.ts`, `highlight.ts`                                 | `wallsBox`, selection and highlight                                                       |
| `src/level-editor/level-editor-store.ts` (+ test)                                  | The `walls` tool, `selectedWalls`, `addWalls`                                             |
| `src/level-editor/panels/PropertiesPanel.tsx`, `ToolbarPanel.tsx`, `vocabulary.ts` | Height/thickness inspector, **Edit lines**, the tool button, the wall defaults            |
| `src/app.tsx`                                                                      | The controller, the overlay render, the pointer plumbing, `finishWalls`, `beginEditWalls` |

**Edit lines.** Selecting a wall and pressing **Edit lines** seeds the controller from the
item's stored lines (plane rebuilt from the first point and the item's `up`), switches to the
walls tool, and makes **Finish** write the redrawn lines back over the same item — recomputing
its centre and carrying height, thickness, combine, material and colour across.

**One deviation from the plan, and it is a fix.** The plan had the walls tool hold the camera's
gesture claim for the whole session. `setToolOwnsLeft` declines _every_ single-pointer drag and
the wheel, so that would have taken right-drag orbit and zoom away on a desktop. The claim is
now per press, and only for a finger or pen, so a mouse keeps its right button and wheel and a
touch drag still aims while two fingers navigate.

### Environment notes (this machine)

- **A workspace package that a dependency points at must be built before `dev` or a bare
  `vitest`/`tsc` will resolve it.** `@big-mesh-studios/solid-codemirror` declares
  `exports → ./dist/index.js`, and `dist/` is gitignored, so `pnpm install` links the package
  (a junction into `packages/…`) but leaves nothing to import — and Vite answers "Failed to
  resolve import". The turbo tasks give the fix for free (`test` and `check-types` both
  `dependsOn: ["^build"]`), so **`pnpm test` / `pnpm check-types` / `pnpm build` at the root
  build it first**; a direct `npx vitest` or `npx tsc` does not. `pnpm build` once, or
  `pnpm --filter @big-mesh-studios/solid-codemirror build`, clears it.
- **Vitest does not run `solid-refresh`.** `vite-plugin-solid` injects it in dev, and on a
  Windows machine the virtual id resolves to `file:///@solid-refresh`, which has no drive
  letter and which `fileURLToPath` refuses — every `.tsx` suite failed to load with "must be a
  file URL … Received 'file:///@solid-refresh'" before one test ran. `vite.config.ts` now sets
  `refresh: { disabled: process.env.VITEST === "true" }`, which is right on its own terms (a
  test wants no hot reloading) and fixes it.
- Prettier flags every pre-existing file on this checkout because git's `autocrlf` has them
  CRLF while the config asks for LF; after normalising line endings the existing files are
  clean. Only the files this work touched were reformatted, and `git diff --stat` shows no
  unrelated reformatting.
