# Porting "Get a Snack at 4 AM" into spacescape

**What this is.** The work, in order, to port `apps/voxelscape`'s `get-a-snack-at-4-am`
demo into this engine as a fifth built-in place, with props and NPCs drawn as SDF models
rather than voxel figures. Written down because it is longer than a context window and the
reasoning behind each phase is worth more than the phase itself.

**Source material.**

|                 |                                                                      |
| --------------- | -------------------------------------------------------------------- |
| Demo script     | `apps/voxelscape/src/places/demo-scripts/gasa4.ts` (1340 lines)      |
| Source ADR      | `apps/voxelscape/docs/adr/0093-place-script-get-a-snack-at-4-am.md`  |
| Models list     | `apps/voxelscape/src/places/demo-scripts/model-lists.ts` (39 models) |
| Model generator | `apps/voxelscape/tools/make-demo-models.ts`                          |
| Tests to mirror | `apps/voxelscape/src/places/demos.test.ts` (27 gasa4 tests)          |

## The gap, in one table

voxelscape's gasa4 needs seventeen things. spacescape has six.

| Need                                          | spacescape                                   | Work                                      |
| --------------------------------------------- | -------------------------------------------- | ----------------------------------------- |
| Structure plan (`box`/`road` voxels)          | —                                            | **None** — authored as explicit SDF ops   |
| Zones, timers, toast, clock, `lookAt`         | yes                                          | —                                         |
| Point lights (replaces glowstone block-light) | yes                                          | —                                         |
| Prop/NPC geometry, identity, placement        | —                                            | New `src/figures/`, six new effects       |
| Model attachments that mean something         | `models?: string[]` carried, nothing decodes | `ModelLibrary`; `MAX_PLACE_MODELS` 8 → 64 |
| Crosshair picking of entities + reach         | —                                            | New picker + `use` input action           |
| Inventory / held item                         | —                                            | Four effects + `ScriptInventory`          |
| Dialog / narration / ending overlay           | `toast` only                                 | Four effects + `PlaceOverlay.tsx`         |
| Fire                                          | no particles                                 | Prop + light, script-driven flicker       |
| Brick/plaster/wood materials                  | vertex colour only                           | `Operation.material` + procedural shader  |

## Decisions already taken

1. **Separate figure meshes**, not folded into the place's operation list. A figure's own
   transform is the point: moving an NPC is a matrix write, not an operation-list rewrite
   plus a re-mesh.
2. **Material id in the free alpha lane** of the `unorm8x4` colour attribute, plus an
   unrolled procedural pattern chain in the fragment shader. Zero extra vertex bytes.
3. **Buildings authored as explicit SDF operations** in the demo script. No `onPlan`
   callback, no voxel vocabulary.
4. **Models produced by a generator script** writing `.sdfmod` files, authored at final
   world scale so props need no runtime scaling.
5. **Full port** — all thirteen endings, the shop, the 33-pair breakfast table.
6. Phase 1's churn into `packages/meshing` is acceptable.
7. Bump `FORMAT_VERSION` now.

## Two ADRs to write first — they settle everything else

**ADR 0047 — A figure is its own mesh, and it is not in the fold.** This is the fork
`places-plan.md` explicitly left open: _"`Operation` has no transform field and fold order
*is* the model"_. Consequence to record honestly: a figure cannot be dug, and standing on
one is answered by a yaw-box, not by the field.

**ADR 0048 — The colour's free alpha lane carries a material id, and materials are
procedural.** `packages/meshing/src/chunk-mesh.ts` already documents the fourth byte as
"a lane kept for a face index" / "a lane left free", so it costs zero vertex bytes
(`VERTEX_BYTES` stays 20), `split-colour-boundaries.ts` already keys on all four bytes so
material seams get cut for free, and `b.positionWorld` is already available in
`buildFragmentBody` — so triplanar world-space shading needs no UVs. Rejected: a fourth
vertex attribute, which reopens ADR 0033's vertex-size decision for no gain.

---

## Where this has got to

Keep this list current — the phases below are the plan, this is the state.

| Phase                                                       | State       | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1c — `Operation.material`, `FORMAT_VERSION` 4               | **done**    | One byte after the opacity. Zero on the wire is "no material" and reads back _absent_, so `0` and `undefined` cannot mean different things.                                                                                                                                                                                                                                                                                                                                                                   |
| 1b — `.sdfmod` manifest into `@big-mesh-studios/csg`        | **done**    | `model-file.ts`. `ProjectView.mode` is now checked as a name, not against a mesher list — csg does not know what a mesher is. sdf-modeller's `project-file.ts` is now the app's half: `isSaveableProject`, `projectManifest`, and the tests that keep the shared bounds equal to `MAX_PARTS`/`PALETTE_LIMIT`.                                                                                                                                                                                                 |
| 1a — model mesher into `@big-mesh-studios/meshing`          | **done**    | `model-mesh.ts`, reparameterised on `readonly Operation[]`. `meshing` now depends on `csg`, in one direction, confined to that one file. sdf-modeller's `mesh-model.ts` is the adapter owning `Part[]` → `Operation[]` (`partsToOperations`, `meshParts`, `primitivePartMesh`).                                                                                                                                                                                                                               |
| 1d — `ModelLibrary`, `DemoPlace.models`, `MAX_PLACE_MODELS` | **done**    | `src/places/model-library.ts`. `MAX_PLACE_MODELS` 8 → 64. `DemoPlace.models` is name → **URL** (a `?url` import, fetched at load by `loadDemoModels`) rather than inline bytes. `startPlace` builds the library, reports each unreadable model as a notice, and `dropPlace` disposes it — it owns GPU buffers, so it cannot live inside `PlaceHost`.                                                                                                                                                          |
| ADRs 0047 + 0048                                            | **done**    | `docs/adr/0047-a-figure-is-its-own-mesh.md`, `docs/adr/0048-a-material-in-the-free-byte.md`, both indexed in the ADR README.                                                                                                                                                                                                                                                                                                                                                                                  |
| 2 — `src/figures/`                                          | **done**    | `figure.ts` (placement, and the two directions out of it), `figure-picker.ts` (traces each figure's _own field_, not its box), `figure-set.ts` (the `Mesh`es, the collision reader, and `aim`). `GameWorld` gains `figureDistanceAt` and takes one `min` over terrain and figures, which is what lets the player stand on a figure. Wired into `app.tsx`: the group is added after the terrain, the crosshair is traced after `game.tick` and after the place steps, and `dropPlace` clears it.               |
| 3 — entities                                                | **done**    | Three effects, **one id space**: `entity-add` (with a `kind` of `prop`/`npc`), `entity-remove`, `entity-move`. Three events: `entity-used` (carrying the held item), `npc-talk`, `npc-choose` — all naming `entityId`, because there is one namespace. The guest library still offers `createProp` and `createNpc` separately, because that is where the difference _is_ expressible: `createNpc` requires a `name`. `MAX_ENTITIES` 256. Also in this phase: **geometry invalidation coalesces** — see below. |
| 4 — the `use` action                                        | **done**    | `InputSnapshot.use`, edge-triggered and never held; `KeyE`/`KeyF` and a fourth touch button. `GameOptions.onUse(input)` fires **last in `tick`**, after the camera has settled. The routing is voxelscape's rule, in `PlaceHost`: empty hands on an `npc` → `npc-talk`, anything held on one → `entity-used {entityId, item}`, a figure with anything held or a prop always → `entity-used`, nothing aimed at and something held → `item-used`, nothing aimed at and nothing held → **no event at all**.      |
| 5 — the inventory                                           | **done**    | `ScriptInventory`: a name and a count, nothing else. `item-define` / `item-give` / `item-take` effects, `defineItem` / `giveItem` / `takeItem` on the guest side. `MAX_ITEMS` 64, `MAX_ITEM_COUNT` 999.                                                                                                                                                                                                                                                                                                       |
| 6 — narration, dialog, ending                                | **done**    | Four effects (`narrate`, `dialog`, `dialog-close`, `ending`) → `HostEffects` 8 → 12. Guest `narrate` / `openDialog` / `closeDialog` / `endGame`. New `src/places/ui/PlaceOverlay.tsx` + `place-overlay.css`, using ADR 0010's pointer-lock suspension. New `text-list` field kind for the narration line. "Play again" re-runs `startPlace` with the **retained loaded-place arguments** (`loadedForRestart`), so a demo with models re-fetches them rather than starting empty.                                                                                                                                                                                                     |
| 7 — procedural materials                                     | **done**    | `SurfaceColour.material` everywhere (ADR 0048), `createShape({material})` as a closed enum, and `render/material-names.ts` + `material-patterns.ts` + `material-nodes.ts`. **A 3D lattice, not triplanar** — one pattern in the world, every plane a slice through it, so corners are continuous. Anti-aliased with `fwidth` and faded to nothing past a cell per pixel. `wantsPattern` off for figures and the sky. Measured: ~15% of the material's CPU cost (see `material-shader.test.ts`). |
| 8 — the models                                             | **done**    | `tools/run.ts` + `tools/make-snack-models.ts` + `tools/snack-model-table.ts`, `npm run snack-models` → 39 `.sdfmod` in `public/models/`. Shapes and palettes copied entry-for-entry from the sibling's table; the format is signed distance operations rather than indexed pngs, and the units are world rather than voxels. Also in this phase: `Part.material` and the carrying of it, which Phase 7 left the modeller unable to save. |
| 9 — the demo                                              | **done**    | `src/places/demo/snack.ts` + `snack-combos.ts` + `snack-tables.ts`, registered in `demos.ts` as `snack` with all 39 models. The house and store are explicit SDF boxes (`buildNeighbourhood()`); thirteen endings, the shop, the 33-pair breakfast table, the stove, the vending machine and the cashier's break are all script. 19 behaviour tests in `snack.test.ts` plus the generic run-clean checks in `demos.test.ts`. |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

**Three fixes came out of Phase 1 that are worth knowing about independently of this port:**

- **`boundsOf` is now in `@big-mesh-studios/csg` and is rotation-aware.** `SculptDocument`'s
  copy read each operation's half-extents off its shape and added them to its origin — the
  shape's extent in _its own_ frame, applied as though it were in the world's. A rotated
  brush dab therefore reported a box narrower than the operation's reach, so the chunks
  holding its far corners were never invalidated and an edit's edge stayed stale on screen.
- **`operationBounds` keeps its flat one-unit pad; `boundsOf` does not.** The unit is there
  for the BVH's rejection test, and at `VOXEL_SIZE` of ten it is a tenth of a voxel of
  nothing for a caller invalidating chunks. `boundsOf` still includes the softness reach,
  because a soft edge genuinely moves the surface past the primitive that caused it.
- **A sample must never land on a model's own surface.** `meshRegion` now offsets the sample
  run half a sample below the bounds. This one was latent and is the interesting find: the
  bounds used to come from a bounding _sphere_ per part — a cube's half-**diagonal**, 1.73×
  its half-extent — so the surface sat nowhere near the region and the coincidence could not
  arise. Correcting the bounds to the operations' own extents is what made it load-bearing,
  and a box's flat face then came back with normals **180° off its own**, because every face
  landed exactly on a sample and a sample on a crossing has an ambiguous sign.
  `model-mesh.test.ts` pins it two ways: no sample lands on a surface, and the grid still
  brackets the whole model.

### Tinting a figure, and why it took a second material

A figure is drawn with the terrain's **own** `SurfaceMaterial` instance, so it is lit by the same
shader, sky, fog and point lights as the ground it stands on. The aimed figure is the exception,
and the exception needed a second material instance rather than a per-mesh uniform:

- **Uniforms live on the material**, every figure shares one material, and rmsl's
  `onBeforeRender` hook carries neither the mesh nor the material — so there is no seam through
  which "this one mesh only" could be said.
- **Whether a uniform set in `onBeforeRender` is read by this draw or the next** is not something
  to depend on, which rules the hook out even though it would have avoided the second instance.
- **A `Mesh` holds a material reference**, so `FigureSet.aim(id)` writes one field on one mesh.
  **The geometry is still the model's and still shared**, and `figure-set.test.ts` checks that:
  twelve tinted-or-not instances are one geometry.

The tint itself is a **wash and not a multiply**, applied after the lighting and before the fog:

- A multiply toward a bright colour moves a _dark_ surface less than a light one, so the selection
  would be least visible on the thing you most need to select.
- Applied before the lighting it would go under the light and a figure in shadow would not show it.
- Applied before the fog because fog is what is between the surface and the eye, and a selection
  that faded into the haze first would be reading backwards.

`tintStrength` is **0 on the terrain's own instance**, so every other surface in the world
compiles and costs exactly what it did before.

---

## Phase 1 — A model file spacescape can read

`apps/sdf-modeller/src/model/mesh-model.ts` **is already the one-shot bounded-box mesher
this needs** — `meshModel`, `modelField`, `samplesFor`, marching cubes +
`splitColourBoundaries` + `reportMesh`. Do not rewrite it.

- **1a.** Move it to `packages/meshing/src/model-mesh.ts`, reparameterised on
  `readonly Operation[]` instead of `Part[]`. sdf-modeller adapts at the seam. ~350 lines
  of subtle code shared rather than forked.
- **1b.** Move `.sdfmod` manifest validation to `packages/csg/src/model-file.ts`. Both apps
  read it; sdf-modeller's `project-file.ts` already documents why the binary format cannot
  carry ids and `coloured`.
- **1c.** `Operation.material?: number` and `FORMAT_VERSION` 3 → 4 in
  `packages/csg/src/serialise.ts`. One byte per operation, additive. sdf-modeller writes 0.
  This unblocks Phase 7.
- **1d.** `src/places/model-library.ts`: `name → { operations, bounds, geometry, solidBox }`.
  Decoded and meshed **once per model**; geometry shared by every instance.
  `DemoPlace` gains `models`; `startPlace` gains a models argument; `MAX_PLACE_MODELS` 8 → 64.

## Phase 2 — Figures exist and are drawn

- `src/figures/figures.ts` — `FigureSet` owns `Mesh`es in a `Group` on `viewport.scene`,
  keyed by a script-chosen id.
- `src/figures/figure-picker.ts` — sphere-trace the player's ray against each nearby
  figure's **own field** with `pickAlong`. Exact, and one ray a frame is ~70 traces, which
  is nothing. Not OBBs: the vending machine's mouth would be solid to the cursor.
- `src/figures/figure-solid.ts` — yaw-box SDF, `min` over figures, fed to `GameWorld` as a
  second live reader beside `field` and `mediumAt`. One `min` in `getSolidAt` and
  `getGroundDistanceAt` and both answer correctly.
- Draw with **the terrain's existing `SurfaceMaterial` instance** — same shader, same sky,
  same point lights, same fog. No new material path.
- `figure-reticle.ts` — a `LineSegments2` aim box, following `zones.ts`.

## Phase 3 — Places place figures

Effects `prop-add`, `prop-remove`, `prop-move`, `npc-add`, `npc-move`, `npc-remove`;
events `entity-used`, `npc-talk`, `npc-choose`. Guest: `createProp`, `createNpc`,
`removeProp`, `moveProp`, `removeNpc`, `moveNpc`.

Figures stay **host-owned** (ADR 0019's "what the host can own, it owns") — `HostEffects`
does not grow.

**Prerequisite in this phase: coalesce geometry invalidation.** Today `shape-add` calls
`geometryChanged(place.bounds)` per shape, which rebuilds the `OperationBVH` _and_ re-sends
the model. The demo builds its house in ~150 `shape-add`s in one tick → 150 BVH rebuilds and
150 cancellations of in-flight worker meshes. Accumulate bounds, flush once at the end of
`step()`.

## Phase 4 — The `use` action

`InputSnapshot` gains edge-triggered `use`; `KeyE`/`KeyF`; a fourth touch button.
`Game.updateUse` traces from the camera, asks the figure picker, and routes by **held
item**: empty hands on an NPC → `npc-talk`, anything held → `entity-used {entityId, item}`,
nothing aimed at → `item-used`. That is voxelscape's whole interaction rule, in one function.

## Phase 5 — Items

`item-define`, `item-give`, `item-take`, `item-hold` plus a `ScriptInventory` in the host
(16 items, `stackable`, one held slot). `item-used` event.

## Phase 6 — Narration, dialog, ending

Four effects (`narrate`, `dialog`, `dialog-close`, `ending`) → `HostEffects` grows 8 → 12,
all of them things only the application can draw. New `src/places/ui/PlaceOverlay.tsx`:
narration line, dialog with options, ending card + restart. Reuse ADR 0010's pointer-lock
suspension.

## Phase 7 — Procedural materials — done

**The one byte was free and the pattern is a lattice.** `Operation.material` → `SurfaceColour.material`
through `bvh.evalPaint`, `Field.colourAt`, `chunk-mesher`, `patch-mesher` and `model-mesh`;
`createShape({material})` is a closed enum refused whole on an unknown name (ADR 0017);
**`VERTEX_BYTES` stays 20.**

Three files, and the split between them is the design:

- **`render/material-names.ts`** — `MATERIAL_NAMES`, the ordered list that *is* the ids. Shared
  with `places/fields.ts`, which is why it does not import rmsl: the interpreter validates
  payloads against it and importing a renderer there would pull rmsl into every place test.
- **`render/material-patterns.ts`** — the scalar reference, with the tests. Brick, plaster,
  timber, tile, concrete, plus `hash3` and `detailAt`.
- **`render/material-nodes.ts`** — the same arithmetic as node graphs for the shader. **Not
  derived from the reference and not testable directly** — a node graph cannot be called from
  TypeScript — so both files say at the top that they are the same maths twice and the scalar one
  is where the maths changes.

**A 3D lattice, not triplanar.** One pattern in the world and every plane is a slice through it,
so a corner is the same pattern cut by two faces rather than two projections meeting with a seam.
The cost is one aspect ratio for all orientations, which is why brick and tile are different
materials rather than one material with an orientation-dependent scale. Brick shears **both** X
and Z by half a brick on alternate courses, so a wall gets a running bond whichever way it faces —
a detail worth knowing if you write a test for it: the horizontal joint is at `z = 0` in even
courses and `z = BRICK.z / 2` in odd ones, so only a quarter-depth is mid-cell for both.

**Anti-aliasing is `fwidth`, and the fade shape matters more than the fade.** `detailAt` is whole
until half a cell per pixel and then linear to nothing at a full cell — *not* `1 - perCell`, which
would thin a wall's mortar by a quarter at an ordinary viewing distance and so get less brick-like
the closer you got. Past a cell it is gone, not clamped: a mortar line is not visible two hundred
units away whether or not anything draws it, and drawing it anyway is what shimmers.

**`hash3` is Dave Hoskins' `hash13`, not `fract(sin(dot(p, k)) * c)`** — the `sin` version bands
visibly on some drivers, and a brick wall is exactly where you would see it. A distribution test
averages it into ten buckets, because the failure mode is *bunched*, not crashed.

**Measured**, because this was the plan's one real performance risk: 400 single-pixel renders of
the terrain material cost **61.1ms with the chain and 52.9ms without** — about 15%. That is the
CPU evaluator and is the pessimistic end, not a claim about GPU frame time. `wantsPattern` exists
because a tint material and the sky have no vertex colours to read an id from, and the sky is a
full-screen background that would otherwise evaluate four lattices per pixel.

**Three bugs this phase found, none of them in the material code:**

- **`water-mesher.ts` wrote `255` into the fourth byte**, which was opaque alpha and is now id 1 —
  so water would have been laid in brick courses, by a field that also writes the byte.
- **`point-lights.test.ts` had the same `1`** in its `vColour` fixture, and three lantern tests
  failed on it. That is the whole argument for doing this on a byte: a value that was meaningful
  before stays meaningful and silently changes meaning.
- **The `select` chain's ids were off by the position of `tile` and `plaster`** in
  `MATERIAL_NAMES`. Nothing failed: plaster had no case, fell through to `plain`, and tile was
  never drawn. So the chain now names its materials and looks the ids up through
  `requireMaterialId`, which throws at module load on a rename instead of returning `undefined`
  into a node builder as a silent zero.

**`Operation.opacity` is still carried and still unread.** `shape-add` no longer offers it, the
limits test records why, and the field stays exported because a future soft paint blend will want
to bound it.

## Phase 8 — The models — done

`tools/make-snack-models.ts` → 39 `.sdfmod` zips into `public/models/`, mirroring
`apps/voxelscape/tools/make-demo-models.ts`. Shapes, voxel extents and palettes are copied
entry for entry from the sibling's table, because this is a port and a fridge that is not the
demo's fridge is a bug in the port. What changed is the format and the units:

- **Indexed pngs and a ray-marched grid become signed distance operations.** Each part is a
  primitive with a colour; four models subtract, and each subtract is a recess the sibling's
  bitmap expressed by not drawing a cell.
- **World units, not voxels.** `unitsPerVoxel = height × LAYOUT_SCALE / the model's own height
  in voxels`, with `LAYOUT_SCALE = 5` — the demo's own rescale. Every height in the table is a
  gasa4 height, so a fridge is 15 units against a player six across.

**The model owns its size and a placement does not scale it**, which is the one real departure
from the sibling: there, `createProp({height})` resized the model per instance. Every model is
centred on its own origin by the generator, because `figureDistance` measures the collision box
from the placement point with no offset — the alternative is every placement knowing how tall
the thing is.

### The mesher could not draw a thin model, and Phase 8 is what found out

**`samplesFor` sized the grid from the model's longest axis and nothing else.** The grid is
cubic and its spacing comes from the longest axis, so a sword — eight units long, seven tenths
of a unit thick — got samples one unit apart and no sample of the field landed inside the
blade. The mesher returned no triangles for it. The file read perfectly, the model loaded, the
prop was invisible, and its collision box was a box around nothing.

**This is not an exotic case.** A coin lying flat, a manhole cover, a sheet of paper, a shelf —
anything thin in a world that also has a car. All three thin models in this table were
discovered by modelling them thinner than the spacing and watching them stop existing, and the
first response was to thicken them, which made the sword a club and the manhole fifteen
centimetres thick.

**The fix is one line in `samplesFor`:** enough samples across the *thinnest* axis for a thin
part to be a solid, whatever its length asks for. `MIN_SAMPLES_ACROSS_THIN` is three, because
two is the arithmetic minimum for a sign change and three is what marching cubes needs to put a
face on it. The cost is bounded by `maxSamplesPerAxis`, and a model too thin to fit is meshed
at the cap — thin because it asks to be, which is visible.

The count is `forLongest × 3 / shortest`. **Written the other way round it comes out smaller
than the number it is compared against, the maximum never moves, and the fix does nothing at
all while looking as though it works.** It was written that way first.

Then the sword's blade went back to one voxel of a fourteen, the coins went back to discs, and
the manhole cover went back to ten centimetres. The one test that would notice the revert is in
`make-snack-models.test.ts`: it asserts the table still *contains* something thinner than the
spacing, because a table of thick boxes would pass everything else with the fix removed.

### Three things this phase got wrong first

- **`size` was declared *and* derived, and they disagreed on a dozen models.** The scale came
  from `size[1]` while the parts were the model, so a shelf written with a full extent where a
  half-extent belonged came out twice as deep, and a burger modelled with a spherical bun was
  40% tall and stretched every other part of itself to match. **`size` is gone**; the scale is
  derived from the parts' own height and every model now comes out at exactly the height it
  asked for. The test that replaced it asks whether a model is *shaped like the thing it is*,
  which is the only question left when there is no declared extent to disagree with.
- **The files on disk and the table were not compared.** Dropping `plate` — in the sibling's
  table, never attached by the source demo — left its `.sdfmod` behind. The generator writes what
  it is told and never deletes, which is right; comparing the two sets is the test's job.
- **The archives were not reproducible.** A zip entry carries a last-modified time, `jszip`
  filled it in with the clock, and regenerating churned all forty files. Every entry is now
  stamped with the zip epoch. Found by a test that built the same model twice and found four
  bytes different.

### `tools/run.ts`, and why it exists

**Plain `node --experimental-transform-types` cannot import this workspace's packages.** `@
big-mesh-studios/sdf`'s `exports` is `"./src/index.ts"` and that file writes `./primitives`,
which `moduleResolution: "bundler"` resolves and Node's ESM loader does not — so a tool that
imports `serialiseOperations` fails at the first import. `place-reference.ts` runs under plain
Node because it reads sources as text rather than executing them, which is the better design for
what it does but no good for a generator that needs the real writer.

Vite is already a dependency, so `tools/run.ts` is a fifteen-line `ssrLoadModule` runner. `tsx`
is not a dependency, and adding one for a tool would be a change to the workspace for the sake
of a script. It loads the tool and calls its exported `run`, which is why the generator exports
a named function instead of working on import: a test can import the table without writing files.

## Phase 9 — The demo — done

`src/places/demo/snack.ts` (plus `snack-combos.ts` and `snack-tables.ts`), registered in
`demos.ts` as `snack` with all 39 generated models. **Pure script, no engine work** — every
mechanism it needs landed in Phases 1–8.

### What the port had to say differently

- **The structure is explicit boxes.** The sibling hands a `region` a list of `{kind: "box", id}`
  in block coordinates and the world stamps it; `buildNeighbourhood()` is that translation, in
  world units, with the sibling's numbers times ten — one voxel was two gasa4 units and this port
  is five times the sibling's scale, so a voxel is ten. The `road` primitive becomes a box with
  its width folded in, and the glowstone panels become four real `createLight`s, which is the
  whole of what replaced voxel block-light.
- **A placement is a model's *centre*.** Phase 8 puts a model's origin at the middle of its box,
  so standing a fridge on the floor means adding half its height. `HALF` in `snack-tables.ts` is
  that number, and it is the one thing the port could not derive from the sibling.
- **Items have no display names.** An item is a name and a count, so `ITEM_NAMES` is a map the
  script keeps itself so a toast can say "Bloxy Cola".
- **One id space**, so the sibling's `prop-remove` is `removeEntity` and its `npcId` event field
  is `entityId`.
- **Fire is a light.** There is no particle system, so six flickering point lights stand in for
  `fire-figures.ts`, driven from `onTick`. `MAX_DRAWN_LIGHTS` is eight against four panels and six
  fires, so nearest-first selection decides — the plan's risk 1, unchanged and now visible.

### Two duplicate-id refusals, which are this engine being stricter

Both were caught by a test rather than by eye, and both are places the sibling's host was happy:

- **`cookEgg` re-issued `createProp` with `stove-item` still standing.** The sibling's host takes
  a second `createProp` with the same id as the new one; here an `entity-add` for a live id is
  refused whole. It is now `removeEntity` then `place`, which says "change what is standing
  there" explicitly.
- **`cashierBreak` re-created the cashier** rather than moving him. Same refusal. It is now a
  `moveEntity`, which is also the honest description: the cashier walking outside is a transform,
  not a second arrival.

### The budget the demo actually uses

The house, the store, the drive, the roofs, the panels and the props come to **well under the
operation budget** — `demos.test.ts` checks every shipped place against
`MAX_OPERATIONS_PER_PLACE`, and the snack demo is no exception. The zones are the six rooms; the
lights are four panels plus, only during a fire, six flames.

### The tests

`demos.test.ts` grows a `snack` entry in its `DEMO_PLACES` loop, which checks the place **runs
clean**: no refusals, something built at load, no runaway, reproducible, disposes twice. That
loop needed two things added for this demo: the `DEMO_PLACES` count, and a `FigureSet` with a
model for every name — a demo that stands forty props cannot be loaded into a world with no model
source, and meshing the real 39 files once per load, twenty loads deep, would be a slow test of
the wrong thing.

`src/places/demo/snack.test.ts` is the **behaviour**: 19 tests ported from the sibling's 27, one
per ending and one per machine. All thirteen endings are exercised except the two that need a
fire to reach the player. The sibling tests that are *not* ported are the ones about its own
machinery — the voxel plan, chunk block-light, the model manifest — and none of them has a
counterpart here.

---

## After Phase 9 — every place was building at the planet's core

**The demos were written when the world was a height field.** `getHeightAt(0, 0)` was the ground
and every demo is authored against it. When the game's base field became a planet
(`app.tsx`'s `GAME_BASE_FIELD`, radius 136000 centred on the origin) `sculpt.terrainHeight`
started returning `undefined` — correctly, because "the surface above a column" is not a question
a sphere answers — and the place host fell back to zero. So every built-in place built at
`y ≈ 0`:

- the planet's surface is at `y ≈ 135990`, and the player spawns at `y ≈ 135996`;
- `bridge` builds at `y = 24`, `lookout` at `y = 90`, `conveyor` at `y ≈ 0`, `snack` at
  `getHeightAt(0,0) + 10 = 10`;
- all of them a hundred and thirty-five thousand units inside the planet, invisible from the
  surface and never meshed.

**Nothing caught it.** Every demo test stubs `terrainHeight: () => 0`, which is exactly the value
the demos were wrong to trust, so the tests and the demos agreed with each other and disagreed
with the world.

### The fix, and what it is for

**A place can now ask where the ground is and get an answer.** `src/world/surface-height.ts`
answers a height field from the field itself and, for a planet, **traces the vertical through
`(x, z)`** from above the surface to the first solid point and bisects to the crossing — the same
question `Game.spawnOnTheSurface` asks along the local up, written for a column because that is
the shape `getHeightAt(x, z)` has. `app.tsx` binds it to this world's field and sea and passes it
as the host's `terrainHeight`, so **`getHeightAt` in any place script is now the surface** — a
demo, a place out of a zip, or one written in the editor.

The trace is its own module because the thing that broke is exactly the thing that should be
testable without a renderer: `surface-height.test.ts` checks it against a synthetic sphere — the
radius over the pole, `sqrt(R² − x²)` off it, the crossing to better than a hundredth of a unit,
a height field left untraced, an empty column at zero, and a column that misses the planet.

`DemoPlace` gains an optional `spawn` — the field a place's manifest already carries — so an
author states where the player goes. Absent means the ground above the origin, computed from the
same query the script gets, so the two cannot disagree about where the ground is.

The five demos now build on the surface: `snack` already asked `getHeightAt(0, 0)`, and `bridge`,
`lookout`, `conveyor` and `lanterns` were each offset by it. Their tests are unaffected because
the stub world reports zero, which is what makes the offset a no-op in a test and a fix in the
game.

### The second flat-world constant: a zone could not exist on the planet

**Loading the demo in the running game reported `zone-add refused: has a part outside -100000 to
100000`.** `MAX_ZONE_SIZE` is documented as *"the largest a zone's box may be on any axis"*, and
the `box` field check used it as the bound on each **corner's magnitude** — which coincides with
an extent bound only for a box near the origin. On the planet the surface is at `y ≈ 136000`, so
a zone two hundred units across had corners a hundred and thirty-six thousand units out and was
refused whole. No place on the planet could have a zone.

The fix separates the two: **a corner is a coordinate**, bounded by `MAX_COORDINATE` (1e7) like
every other coordinate a place provides, and **the extent is what `MAX_ZONE_SIZE` is for**,
checked per axis. The same field kind serves media, so they were broken the same way and are
fixed by the same change.

**The test the suite was missing** is in `demos.test.ts`: every shipped place is loaded at the
planet's own surface height, `y = 135990`, and asked for no refusals and for figures above the
ground. The loop above it loads at `y = 0`, which is what the demos assumed and is exactly why
neither this nor the floor offset was caught.

### Starting on the surface

The demo's floor was `getHeightAt(0, 0) + 10` — one voxel above the ground — while the app puts
the player at `ground - halfSize - 1`, which is *below* that floor: the player started four units
inside the floor slab. **The `+ 10` was double-counting.** The sibling's plan already places its
floor at the top of the row-32 slab, so the house floor and the outdoor ground are the same
height; the floor is the terrain's own surface. It is `FLOOR = GROUND_Y` now.

## Risks

1. **`MAX_DRAWN_LIGHTS = 8`** against 4 glowstone panels plus up to 6 fires. Nearest-first
   selection means the closest 8 win; a fire across the house may not light. Leave it and
   record it, or raise it at a shader-uniform cost.
2. **Figure meshes and teardown order.** `app.tsx` already has a careful
   `dropPlace` → `session.dispose()` ordering comment; the `Group` has to join it.
3. **`splitColourBoundaries` is wired only into sdf-modeller's marching-cubes path**, not
   spacescape's chunk mesher. Figures get it; the terrain does not. A fine line to draw for
   now — say so in ADR 0048 rather than quietly widening it.
4. **Publishing stays refused.** `makePlaceRecord` refuses a project carrying models. Keep
   it; the demo is a built-in.

## The thirteen endings to port

`Sleep`, `Chips`, `Wake up Dad`, `Orange`, `Sword`, `Sandvich`, `Patty`, `Toothpaste`,
`Breakfast`, `Flood`, `Freezer`, `Fire`, `Shoplifting`.

## Verifying

```
npx tsc --noEmit
npx vitest run src/places/ src/figures/
pnpm place-reference:check
cd ../.. && npx prettier --check "apps/spacescape/src/places/**" "docs/adr/**"
```

Do not run the monorepo-wide suite — see `AGENTS.md` and `places-plan.md`'s closing note.
