# Resolution-independent paint — plan

Replacing the UV atlas with a sparse 3D colour field on the model.

This is a working plan, not a decision record. Decisions actually taken have their own ADR;
this file is the order of the work and the state of it, so that anyone picking it up —
including whoever's context got summarised — can tell what is done, what is next, and what
was measured rather than assumed.

Supersedes nothing. `textured-painting-plan.md` remains the record of the atlas design and of
why it was built; this is the replacement.

---

## The problem being solved

Paint is welded to `REFERENCE_VOXEL_SIZE = 0.25` (`src/unwrapping/unwrap.ts:99`), which is
pinned by **unwrap wall-clock, not fidelity** — the same file's own comment says so. Measured:

| triangles | xatlas |
| --------- | ------ |
| 9,740     | 1.4 s  |
| 38,732    | 11.6 s |
| 84,044    | 74 s   |

Roughly quadratic, so the reference can never be made finer. That one constant decides chart
layout, seam positions, stroke precision on curved surfaces, `DRIFT_LIMIT`
(`src/unwrapping/bake.ts:103`), `PARALLEL_EPS` — literally sized to 0.25-unit triangles
(`src/mesh/triangle-bvh.ts:98`) — and the rebake resample density (`bake.ts:308`).

What resolution _should_ be is a quality knob. Today it is a correctness constraint.

### What is already correctly decoupled

Not everything here is broken, and these must stay decoupled:

- The **viewport** resolution slider has no influence on paint (`bake.test.ts:92` asserts it).
- The brush raycasts the **reference** mesh, not the display mesh (`src/view/brush-hit.ts:52`).
- Brush width is in **world units**, converted to texels at stamp time.

## The theory

**Texture Functions / octree textures.** Paint becomes a function of 3D position rather than of
a parameterisation. The shader samples a colour field at `positionWorld` — which
`ModelMaterial` already computes (`src/view/model-material.ts:179-180`) — with hardware trilinear
filtering.

Prior art, all of it the same idea:

- **DeBry, Gibbs, Petty, Robins, SIGGRAPH 2002** — _Painting and Rendering Textures on
  Unparameterized Models._ The founding statement: remove the 2D parameterisation, store the
  texture in 3D space as a sparse adaptive octree.
- **Benson & Davis, SIGGRAPH 2002** — _Octree Textures._
- **Lefebvre, Hornus & Neyret, GPU Gems 2 Ch. 37** — GPU implementation. §37.2 is literally
  _"Application 1: Painting on Meshes"_: a 3D brush of centre + radius writing a weighted sum
  into leaves. "The mesh does not need to be parameterized."
- **Kniss et al. 2005** (GPU), **Lacoste et al. 2007** (appearance-preserving).
- **UniTEX, CVPR 2026** — the learned generalisation, a _Texture Function_: "a continuous
  volumetric representation that maps any 3D point to a texture value based solely on surface
  proximity, independent of mesh topology." The field idea without the neural network.

`randoms-3d-paint`'s voxel field **is** this theory. Its contribution to that repository was
not conceptual; the two bugs below are why it looked like a dead end.

### Why it is genuinely better, not differently awkward

|                                     | UV atlas (today)                                            | 3D field                                                 |
| ----------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------- |
| Texel density across the surface    | Varies per chart — that is what an unwrap is                | Uniform everywhere, absolute world units                 |
| Change tessellation                 | xatlas repacks globally, every chart can renumber, 1.4–74 s | Re-rasterise from the journal, milliseconds              |
| Detail lost when resolution changes | Lost — rasterised once at one size                          | None — the journal is exact, resolution is a raster time |
| Resolution is                       | A correctness constraint                                    | A quality knob                                           |

That last row is the whole prize.

## Architecture

```
PaintJournal ──rasterise──▶ PaintField ──upload──▶ sampler3D @ positionWorld
  (truth)      (derived)     (cache)                 (display)
```

**`PaintJournal`** — flat typed arrays, one record per dab: centre (3 × f32, **part-local**),
tangent frame, radius (f32, world units), hardness (f32), RGBA8, partId (u32), strokeId (u32).
~40 bytes a dab. The only durable paint state.

**`PaintField`** — sparse bricked grid: 8³ bricks in 10³ padded slots (**the gutter is not
optional** — trilinear needs it), a free list, a 128³ indirection array. Voxel size is an
absolute world constant and a user setting.

**`Rasterise`** — a pure function of `(journal, parts)`. Replays dabs in journal order,
transforms part-local → world, writes each disc with its falloff. No accumulated state.

### Memory: what sparsity actually buys

Brick count is surface area ÷ brick face area; each 10³ slot is 4 KB.

A 5-unit sphere is ~78 units² of surface:

| voxel | bricks | field       | texels/unit |
| ----- | ------ | ----------- | ----------- |
| 0.08  | 153    | **0.6 MB**  | 12          |
| 0.05  | 491    | **2.0 MB**  | 20          |
| 0.02  | 3,066  | **12.3 MB** | 50          |
| 0.01  | 12,266 | 49 MB       | 100         |

A **dense** grid at 0.02 is 62 MB, so the brick indirection is what makes fine detail affordable
at all. Realistic presets are 0.08 / 0.05 / 0.02; 0.01 is out of reach on a phone.

Note the existing brush ladder starts at 0.05 world units (`src/ui/brush-panel.tsx:42`), which at
0.02 voxels is 1.25 voxels across. **The width ladder must be expressed against voxel size** or
the fine brushes alias. See M6.

## The memory leak, and why it is structural here

| `randoms-3d-paint`                                                                                                                                                  | Why it leaks        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `operations.ts:152` pushes a `Paint` op per dab; `operations.ts:668` inserts a BVH node + 2 `Box3` into a `Map` never pruned. `remove()` at `:698` is **dead code** | Append-only op list |
| Those ops are `dirtyTrackingEnabled: false`, so `operations.ts:190` early-returns and they **never render a pixel** — pure garbage that also serialises to disk     | Double bookkeeping  |
| `colourData` is write-only; `:563` and `:602` do not clear it, so a carved-away brick **resurrects ancient paint**                                                  | No erase path       |
| `lock()` moves 648 MiB per dab, unlock deferred to a `requestAnimationFrame` that can never fire, permanently wedging the worker                                    | Ownership dance     |

None of that is inherent to a volumetric field. It is modelling paint as **CSG operations** when
paint is not CSG. Here:

- No op list. Dabs are preallocated typed arrays.
- The field is derived, so clear is `fill(0)` over a region.
- No buffer transfer; CPU and GPU hold the same `Uint8Array`.
- **Undo** is "truncate the journal, re-rasterise the AABB of the removed strokes" — not the
  4 MB atlas snapshot `stroke-recorder.ts:109` costs per stroke.

## Culling dead dabs

A dab that cannot affect the result is skipped. Three tiers.

**Tier 0 — byte-identical write elision.** During rasterise, a write producing the same RGBA
bytes already present marks the dab dead. This is the exact reported symptom — paint red over
red a thousand times, and 999 writes are literal no-ops. Cost: one 4-byte compare per voxel.

**Tier 1 — backward-walk occlusion.** One extra pass over the affected region, journal order
reversed. First backward writer wins; only a dab whose falloff reaches **full** alpha claims, so
`hardness: 1` claims its whole disc and `hardness: 0.5` only its core. Partial coverage correctly
leaves the earlier dab alive. Cost: one `Uint8` per voxel over the region, freed after.

**Tier 2 — save-time compaction.** On write, drop dabs dead against the whole journal and
renumber. Safe specifically because undo history does not survive a save.

### Three rules that are load-bearing

1. **Never delete from the journal during a session.** Culling is a pure function of the journal
   evaluated at rasterise time. If dab 5 is dropped because dab 9 covers it and the user then
   undoes dab 9, dab 5 must return.
2. **Rasterise always starts from a cleared region.** Tier 0's "identical" is only meaningful
   replaying from empty. For an incremental re-rasterise, clear the AABB first.
3. **Culling is deterministic and applied everywhere** — field, saved file and thumbnail must
   agree, or one project rasterises two ways.

**No "N redundant dabs" readout.** Decided; not doing it.

## Paint follows its part

Dabs store a **part-local** centre and a `partId`; rasterise applies the part's current matrix.
Moving a part re-rasterises. Nothing smears, nothing drifts, and `DRIFT_LIMIT`, `reproject`,
chart-seam handling and `transferUvs` all disappear.

Two open items:

- **Part occlusion.** If part B moves in front of part A, A's paint must not show through.
  Rasterise should write only where the dab's part actually wins the CSG fold — `Field.colourAt`
  (`packages/csg/src/field.ts:273`) already performs that evaluation. This is the one genuinely
  new piece of geometry logic. **Spike it before committing to M4.**
- **Field bounds.** Grid is world-AABB fixed at first bake. A part dragged outside it triggers a
  re-allocate plus re-rasterise — same event as today, milliseconds instead of seconds.

## The brush hit: broad phase, then analytic refine

**Not** "replace the BVH with a sphere tracer" — that regresses at grazing incidence, where the
documented worst case is ~600 steps (`packages/picking/src/picker.test.ts:183-201`).

1. `bvh.intersectRay(ray)` → coarse hit, unchanged, ~50 µs.
2. Two or three gradient-descent steps along `field.gradient` from there → point exact to
   `epsilon`, **at any resolution**.

This is what `packages/sdf/src/primitives.ts:29-46` already describes. Frame from
`onbFromDirection` (`packages/core/src/vec3.ts:171`), already exported and already in production
use in `apps/spacescape`.

Crucially the brush then **reads no coordinates off a triangle**, so `uvAt`'s barycentric
interpolation (`src/view/brush-hit.ts:105-120`) and the whole chart invariant go away.

## The gate: rmsl partial upload

Confirmed absent: **zero** `texSubImage2D` / `texSubImage3D` in
`@random-mesh/rmsl@1.15.1`. `dist/scene.js:1562` issues a full `texImage3D` on every
`needsUpdate`, so a 12 MB field is 12 MB per frame during a drag.

`rmsl` is `big-mesh-studios/rmsl` — **in this organisation** — so this is a local change, not an
upstream negotiation. `docs/textured-painting-plan.md` already calls it "worth an upstream issue";
that note is now stale.

Until it lands, coalesce uploads to stroke-end only. That is acceptable because
`src/app.tsx:896-899` already establishes that the model is not touched mid-stroke.

## What gets deleted

`unwrap.ts` · `unwrap-worker.ts` · `unwrap.worker.ts` · `uv-transfer.ts` · `reference-file.ts`
(`texture.bin`) · `paint-surface.ts` · `stroke-recorder.ts` · the 4 MB per frame upload ·
`transferUvs` at ~700 ms a rebuild (`triangle-bvh.ts:66-79`) · `DRIFT_LIMIT` and the
drift-warning UX · charts, seams and `stroke-recorder.ts:141-164`'s seam-join logic.

`TriangleBVH` survives as the broad phase. `bake.test.ts:92-107`'s "the viewport's resolution
changes and the paint does not move with it" becomes true at every resolution, unconditionally.

**`xatlas-wasm` and `unwrap-client.ts` are NOT deleted.** See below.

## xatlas stays — for export, not for painting

**Keep the `xatlas-wasm` dependency and `unwrap-client.ts`.** They are demoted, not removed.

The reason is that a 3D field cannot be written to a file format. **glTF, OBJ+MTL, FBX, USD and
3MF-with-textures all require a UV atlas plus an image**; there is no volumetric texture slot in
any of them. The moment this app exports to a textured format — and a figure modeller that can
paint but not share its painting is half a tool — somebody needs a parameterisation, and xatlas
is already here and already working.

Today nothing needs it. No file in `src/print/` imports anything from `src/unwrapping/`,
`PrintSolid` has no UV field, and `ChunkMesh` has no UV field (see "Confirmed non-constraints"
below). **That is a statement about the present, not a reason to delete the capability.**

### The division of labour this implies

|                  | Live                                       | Export                            |
| ---------------- | ------------------------------------------ | --------------------------------- |
| Parameterisation | **none** — paint is a function of position | xatlas, on demand                 |
| Source of truth  | `PaintJournal`                             | `PaintJournal`                    |
| Storage          | `PaintField` (3D, sparse)                  | PNG atlas, regenerated per export |
| Cost             | every frame                                | once, per export                  |

The export bake is GPU Gems 2 Ch. 37 **§37.2.4**, "Converting the Octree Texture to a Standard
2D Texture", and its trap is worth writing down now: rendering the mesh into UV space while
sampling the field by 3D position produces bleeding, because bilinear filtering at the coarse
mip levels pulls in samples from **outside** the 2D triangles. Adding a few border pixels does
not fix it. The chapter's fix is push-pull extrapolation — collapse the whole mip chain into
one image with alpha as the transparency coefficient, then let the GPU regenerate the levels.

So: **the atlas becomes a derived, disposable export artefact.** Bake on demand, write the PNG,
throw it away. Nothing about painting is tied to it, and the expensive part of the current
design — unwrapping at 1.4–74 s during a live editing session — happens only when somebody
asks for a file.

## Confirmed non-constraints

Verified, so no one re-litigates them:

- **The atlas is not load-bearing for the existing print path.** No file in `src/print/` imports
  anything from `src/unwrapping/`. `PrintSolid` (`src/print/three-mf.ts:98`) has no UV field,
  `ChunkMesh` (`packages/meshing/src/chunk-mesh.ts:33`) has no UV field, and `model-mesh.ts`
  contains zero occurrences of texture/uv/atlas. That export is a pure function of `Part[]`.
  `docs/textured-painting-plan.md:493` already calls painted-colour-in-export a non-goal.

  **This is why the atlas can leave the live path. It is not why the unwrapper should be
  deleted** — see "xatlas stays — for export, not for painting" above.

- **The SDF is evaluable at arbitrary resolution today.** `Field.distance` /
  `Field.gradient` (`packages/csg/src/field.ts:214`, `:247`) satisfy `PickField` structurally,
  and `pickPart` already sphere-traces this modeller's own field per tap
  (`src/view/pick-part.ts:165`) at `epsilon = 0.125` — finer than the 0.25 mesh.
- **`sampler3D` already exists** in the rmsl GLSL, WGSL and WASM backends, and `positionWorld`
  is already a fragment input.
- **`renderer.gl` is public** (`scene.js:1326`), so a sub-image escape hatch is available if the
  clean change to rmsl is not.

---

## Phases

### M0 — Brush colour picker — **DONE**

`ColourPicker` (`src/ui/colour-picker.tsx`) was fully built and wired only into the transform
panel. The brush panel had palette swatches and nothing else, so painting was single-colour.

- Host `ColourPicker` + `PaletteRow` in a `createPopover` popover in `src/ui/brush-panel.tsx`,
  following the transform panel's pattern (`transform-panel.tsx:265-289`).
- Keep the palette swatch row inline — it is the fast path.
- Unrelated to the architecture below; landed first because it unblocks people now.

### M1 — Partial 3D upload

**Not the critical path, as originally written.** Corrected 2026-10-12 after finding that
`rmsl` cannot be changed from this workspace: it is a separate repository with uncommitted work
on `fix/js-inline-fn-and-index`, and `sdf-modeller` consumes it through the pnpm catalog
(`"@random-mesh/rmsl": "1.15.1"`), so any change to it has to be published before it lands here.

M2 and M3 do not need it — neither uploads per frame. **This must land before M4**, which is the
first phase that uploads a whole field every frame while a stroke is being drawn.

**Preferred: a real change to rmsl.** The clean home for this is `bindTexture`
(`rmsl/dist/scene.js:1543-1582`), which already branches on `t.needsUpdate`; a dirty sub-box on
the texture plus a `texSubImage3D` for 3D textures is a small, obviously-correct change. Write
it there and publish. Do not duplicate it here.

**Interim: an app-side escape hatch.** `WebGLRenderer.gl` is public (`scene.js:1326`) and the
renderer's `textures` map is an ordinary class field (`scene.js:1306`), so the `WebGLTexture`
handle is reachable. A helper can issue `texSubImage3D` for the dirty brick box and leave
`needsUpdate` alone, so `bindTexture` skips its whole-image upload entirely.

**Must feature-detect and fall back**, because it depends on a private field name:

- `textures` is a `Map` on the renderer instance and holds the texture → use the escape hatch.
- Otherwise → full `needsUpdate` upload, which is what happens today.

**The fallback is viable on its own**, which is why this is a phase and not a blocker: a 0.05
voxel field is **2 MB** against today's 4.15 MB atlas, so full upload is already _half_ the
bandwidth of what the app does now. Only 0.02 voxels (12.3 MB) actually need sub-image.

### M2 — `PaintJournal` + `PaintField`

**DONE.** `src/unwrapping/paint-journal.ts`, `paint-field.ts`, `paint-rasterise.ts`, 45 tests.

- `PaintJournal` — flat typed arrays, ~44 bytes a dab. Strokes are three separate counters
  (`ends`, `openStart`, `length`), **not** one array whose last entry doubled as the length: the
  first version did that, and appending to an open stroke overwrote the marker saying where the
  _previous_ stroke ended, so the stroke before the one being drawn became un-undoable — silently,
  because the dab count still looked right. There is a test for it.
- `PaintField` — 8³ bricks in 10³ slots, a free list and a 64³ indirection array. Pool size is
  a **parameter**, because 16³ slots is 16 MB and a test suite making twenty fields makes 320 MB
  of it, which is enough to take a test worker out on a phone.
- The **border is a duplicate of the brick's own edge voxels**, not cross-brick writes. This was
  the second real design correction: cross-brick writes allocate a shell of neighbouring bricks
  for every brick painted — 27× the allocations for the same result — and they write the
  _neighbour's_ value into the gutter rather than a copy of the boundary voxel, which is not what
  a sampler near the edge reads.
- `rasterise(journal, field, place)` — a pure function. `place` is supplied by the caller so
  this file knows nothing about parts; it is how M5's occlusion rule skips a dab.
- **Tier 0 culling** — `PaintField.set` returns whether it changed anything, and `rasterise`
  reports `live`. Repainting a colour over itself is a dead dab.
- **Two limits fail differently, on purpose.** Too few _slots_ drops a write and says `false` —
  a stroke past the edge of a large model loses its outermost millimetre rather than throwing
  mid-drag. Too small a _grid_ throws at construction, because a brick past the grid's edge
  would alias onto the ones at the start: paint appearing on the wrong side of the model.

### M3 — Display

**DONE.** `src/view/model-material.ts`, `src/view/model-material.test.ts`.

- `ModelMaterial` takes **two `sampler3D`s** — the pool and the indirection — plus two
  uniforms, `fieldOrigin` and `fieldExtent`. Everything else in the mapping is a module
  constant on both sides of the shader.
- **Sampled at `positionWorld`, which the material already computed for lighting.** There is no
  `uv` varying on this path at all. That is the line the whole change turns on: the atlas
  needed a `uv` varying _because_ it could not answer "what colour is at this point" any
  other way.
- The atlas path is **untouched and still live**, because the brush does not write to a field
  until M4. Both produce the same straight-alpha RGBA, so the blend after the sample is written
  once — two copies of that arithmetic would be two copies of the `pow(0.0, 2.2)` bug it is
  there to guard.
- `PaintField.ensureTextures()` builds the two `DataTexture`s once and hands out the same
  `Uint8Array`s the field writes, so there is no copy and no repack.

#### Two things testing caught that reading did not

1. **The blend uniform was on the atlas branch only.** A material with a field and no atlas
   had no `blendUniform`, the fragment body skipped the whole mix, and the model came out its
   plain part colour — **with no error anywhere**, which is exactly what an unpainted model
   looks like. It now belongs to whichever source exists.
2. **The sample was being re-evaluated five times.** rmsl's node graph has no common-subexpression
   elimination: every _use_ re-emits the subgraph. The sample is used five times (`.xyz` ×3
   for the stroke colour, `.w` ×2 for coverage) and each evaluation is a grid read plus a pool
   read — **ten dependent 3D texture reads a fragment** on a phone, from a line that reads like
   it samples once. Fixed by `.toVar()` on the result and on the indirection read; there is now
   a test that counts the `texture(` occurrences, because nothing else in the build would notice.

The emitted GLSL was read end to end to confirm the arithmetic: `uvw = (world - origin)/extent`,
`brick = floor(uvw * 64)`, `(brick + 0.5)/64` for the cell centre, `tile = info.xyz * 255`,
`* SLOT + 1.5 + cellLocal * BRICK`, `/ poolDim`. The `1.5` is the border: cell `n` holds voxel
`n - 1`, so the first voxel's centre is half a texel past cell one.

### M4 — Brush

**DONE, and wired to the app. Untested by eye.**

- `src/view/field-hit.ts` — **raycast as a broad phase, then three Newton steps against the
  field.** Neither alone is right: a sphere trace is exact at any resolution but has no step
  bound (six hundred on a grazing ray, which is where a brush cursor spends its time), and a
  triangle raycast lands on a facet — up to half of one 0.25-unit voxel off. The point is
  resolved to `BRUSH_EPSILON = 0.01` and the normal comes from the field's gradient rather than
  from the facet. This is what makes a stroke land where a person aimed, which everything in M2
  and M3 is built on.
- `src/unwrapping/paint-brush.ts` — a drag becomes dabs. **Dabs are spaced by distance, not by
  pointer event**, because an event is a rate rather than a place: spacing by event would put
  dense dabs where somebody drew fast. The cap of 256 steps per event is for a pointer _jump_,
  which is a teleport rather than a stroke — without it a drag leaving the canvas would paint a
  chord through the inside of the figure.
- `src/unwrapping/paint-cull.ts` — **Tier 1, the backward walk.**
- The width ladder is **not yet** expressed against voxel size. Still owed.

#### Three bugs the cull's tests caught

1. **The walk claimed one voxel per dab.** It broke out of all three loops as soon as it found
   one unclaimed voxel — true of "is this dab visible", irrelevant to "which voxels does it
   cover for the ones behind it". So every dab claimed exactly one voxel, every dab after the
   first found a free one, and **nothing was ever reported dead**. The two questions are
   separate and have to be asked separately.
2. **The region was in world units and indexed by voxel.** No voxel index falls inside a box
   measured from a different origin, so every dab came back dead — the failure mode is _too
   much_ culling, which is the dangerous direction, and it was only caught because the test
   asked what the answer should be.
3. **Opacity was folded into the radius a dab covers**, so a translucent dab covered nothing
   _and_ counted as dead — a dab plainly painting half a disc reported as invisible. What a dab
   writes and what it hides are different questions; `solidPaint` and `solidClaim` are now
   separate.

#### The invariants the cull rests on, all tested

- Nothing is ever removed from the journal. A culled dab is needed again the moment the stroke
  covering it is undone.
- Only **full alpha** occludes. Straight-alpha leaves `1 - a` of what was under a dab of alpha
  `a`, so a soft brush used twice would lose paint the moment culling was switched on — which
  is the most common thing a soft brush is for.
- One uncovered voxel is enough to keep a dab, however small.
- A `hardness` below 1 claims only its solid core, so a soft rim cannot hide anything.
- The scratch buffer is cleared over the region it was given, so a reused buffer cannot inherit
  claims from a wider previous call.

#### What is wired, and what it changed

- `app.tsx` holds the journal, the field and the folded SDF. The brush raycasts the last one and
  the rasteriser writes the first into the second.
- **`startBake` is gone, and so is the unwrap on picking up the paint tool.** That was a
  1.4–74 s wait before the first mark, paid every time somebody picked the brush up. Nothing
  triggers an unwrap now.
- The panel lost its **Rebake** button — there is nothing to rebake — and its readout now says
  the field's resolution rather than an atlas's size and chart count.
- Undo is a journal truncation plus a re-rasterise. The atlas's 4 MB before-bytes snapshot per
  stroke has no equivalent, because there are no bytes underneath a dab.
- A field is made **on the first stroke and attached to the material then**, via a new
  `ModelView.attachField`. There is nothing to size a field by until something has been painted,
  and attaching changes what the material samples, so it costs a recompile — the same price
  `attach` already paid.

#### Sizing, and one number that was wrong twice

`PAINT_VOXEL` is **0.05 world units** and `PAINT_TILES` is **12**, a 7 MB pool. The first cut was
0.02 and 19 tiles: **27 MB allocated before the first mark**, and the test suite — which builds a
few fields — ran the worker out of memory doing it. Twelve a side is 1728 bricks against the
~500 a 5-unit sphere needs, so there is still 3× the headroom for half the money.

`PAINT_REACH` is the indirection grid's ceiling (25.6 units at this resolution) and is **checked
rather than assumed**: `PaintField.over` throws on a box the grid cannot address, because a brick
past the edge would alias onto the ones at the start. A model too large for it gets no field and
says so in the file notice instead of throwing in the middle of a drag.

#### Four more bugs, all found by using it

4. **The brush was raycasting the viewport mesh — and that is what stopped it working.** The
   atlas raycast a _reference_ mesh meshed at a fixed 0.25; the field path was pointed at the
   **viewport** mesh, which is meshed at whatever the resolution slider says. At a coarse setting
   it was too sparse to hit, so the brush stopped finding the surface entirely and the ring and
   the paint both went quiet. **The mesh is now gone from the paint path**: `fieldHit` sphere-
   traces the field, which is exactly what select-mode picking already does with a held field and
   already works. The viewport resolution no longer has any say in where a stroke lands — which is
   the claim of the whole exercise, arriving four phases late.
5. **The ring was hidden for the duration of every drag.** `standCursor` returned early while
   `dragging`, so the one thing a person aims with was unavailable exactly while they were
   aiming, and it stayed where it was before the press. A stroke looked broken because the ring
   froze.
6. **A thrown paint stroke vanished.** `grabPaint` is called with `void`, so an exception was an
   unhandled rejection and the app looked inert. It is wrapped now and reports through the file
   notice.
7. **A stroke only appeared when the finger came up.** `PaintBrush.moveTo` appended to the
   journal and `rasterise` ran only in `finish`, so a stroke drew nothing for its whole length
   and then appeared in one go. The journal is still the truth and the field is still derived —
   the mistake was only _when_ the derivation ran. `rasterise` now takes a range, and `moveTo`
   writes the dabs it has just added, so the painting on screen is the painting so far.
8. **The panel says how many dabs the journal holds.** This is the diagnostic that would have
   saved two of these rounds: whether the number moves while somebody paints separates "the brush
   is not finding the surface" from "the brush is painting and the picture is not updating" in
   one glance, and both look identical without it.

#### Still not done

- **The width ladder is still in absolute world units.** The smallest brush is 0.05 across, which
  at a 0.05 voxel is **one voxel**. See "Appearance, 2026-10-13" below for what the antialiasing
  now does to it and why the floor still wants moving.
- **Part occlusion.** `place` applies the part transform and nothing else, so two parts whose
  shells share voxels can show each other's paint. M5 owns this.
- **The cull is not called.** Tier 1 is tested and ready but unwired; every dab is rasterised.
- **Partial upload is still the bandwidth story.** A stroke now uploads the whole pool every
  frame it changes. M1 removes the term; until then the pool size is what decides whether
  painting feels immediate. Note that the thinner shell below roughly halved the bricks a stroke
  touches, so the same figure now needs about half the pool it did.

### M5 — Parts, persistence, delete

- **The journal codec — DONE.** `src/unwrapping/paint-file.ts`, `paint.bin`, 16 tests plus six
  end-to-end ones in `project.test.ts`. See "Persistence, 2026-10-13" below.
- Part-local dabs + **part occlusion** (spike first).
- **Tier 2 culling** — save-time compaction.
- **Delete everything in "What gets deleted"** — but **keep `xatlas-wasm` and
  `unwrap-client.ts`**, demoted to the export path.
- **The v1 atlas migration is now the only part of this left.** A file written by an older build
  carries a `texture` field and a `texture.bin` and no `paint.bin`; it still opens, and the
  atlas still renders, because both readers are untouched. What has not been decided is whether
  that is the end of it or whether such a file should offer to convert itself into a journal on
  open — which needs an unwrap to project the atlas back through, and M7's bake is the thing
  that can do it.

### M6 — Sharpness

- Voxel size as a quality setting: 0.08 / 0.05 / 0.02.
- If still not sharp enough: distance-to-dab-edge in the alpha channel, reconstructed
  analytically in the shader. This is the distance-field-text technique (Unreal's SDF text,
  GPU Gems 2 Ch. 12) and it buys detail **below** voxel size.

### M7 — Textured export bake

**Deferred until someone actually asks for a textured file format.** No GLB/glTF writer exists
today; do not build one speculatively.

- Bake `PaintJournal` → UV atlas on demand, using the xatlas path kept alive in M5.
- GPU Gems 2 Ch. 37 §37.2.4, including the push-pull extrapolation that stops background
  bleeding in from outside the 2D triangles.
- The output PNG is **derived and disposable**. Nothing persists it; the journal is the truth.
- This is also the answer to "paint a figure and send it somewhere" — a modeller that can paint
  but not share its painting is half a tool, so this is a real capability, not a nicety. It is
  last only because nothing needs it yet.

- **2026-10-13** — **Paint survives a save.** `paint.bin` and the manifest's optional `paint`
  field; `PaintJournal.adopt`; `readProject` returns the journal; `app.tsx` builds a field from
  the loaded model and rasterises into it. Until this, `writeProject` had **no parameter through
  which a journal could travel** and `bakeTexture` was no longer called from anywhere, so a
  painted model saved with no paint in it at all — and a model opened from an old `.sdfmod`
  re-wrote the stale atlas it arrived with, because nothing writes to `bake.surface` any more.
  Also: `resetPaint` on new-document and on open, because a field is sized to a model's bounds
  and opening a file into a session that had paint left the old field on the new model.

  Two things found while wiring it, both in the same place:

  1. **`rasteriseJournal` never cleared the field**, which is the plan's own rule 2 — "rasterise
     always starts from a cleared region" — and the one rule in the file that had not been
     applied where it said. Compositing only ever adds, so "take the last stroke off the journal
     and draw the rest" drew the rest _on top of_ the stroke that was supposed to be gone. The
     dab count fell and nothing on the model changed, which is undo appearing to do nothing.
  2. **"Clear paint" was undoable only in the crudest sense.** `clearWithUndo` handed back every
     stroke as one flat run and `redoStroke` closed it with a single `endStroke`, so undoing a
     clear made the next ctrl-z take a whole session's painting in one step. `RemovedDabs` now
     carries `strokes`, and the ends are pushed back one per removed stroke.

- **2026-10-13** — **Appearance: four defects, three of them arithmetic.** All four were found by
  measuring the field rather than by looking at it, and the measurements are in the commit.

  1. **The shader read premultiplied bytes as straight colour.** Both writers store
     `red * a + previous * (1 - a)`, which is premultiplied; `sampleField`'s consumer did
     `pow(rgb, 2.2)` and mixed by alpha, which is straight. **Correct only where a texel is
     fully opaque**, so the error scaled with how soft the brush was: a texel at a quarter
     coverage stored a quarter of the colour and came back as a quarter of the brightness
     raised to 2.2, and a texel at one coverage in 255 stored one byte and came back as
     effectively black. That is the dark halo round every stroke, and it was worst exactly where
     the brush was softest. One `div` in `model-material.ts` fixes it, for the atlas path too.
  2. **A soft brush was not soft.** Every dab composited its own falloff over the last one's, and
     compositing is multiplicative in coverage: dabs at a third of a radius apart turn a falloff
     from the hardness to the rim into a cliff. Measured across a hardness-0.5 brush of 0.25
     radius at a 0.05 voxel, the profile read `9 9 9 9 9 9 9 9 6 2 0` where `9 9 9 9 5 3 2 1 0`
     was asked for. **`rasterise` now groups a stroke and composites it once**: coverage is a
     **maximum** across the stroke's dabs, opacity is still a **product** so an airbrush held
     still still builds, and colour is a weighted average. GPU Gems 2 §37.2's accumulator with
     the coverage taken as a maximum rather than a sum.
  3. **A hard edge was a staircase.** The falloff is a step at the voxel scale, so trilinear
     filtering had one voxel to round it over and the rest was steps. The ramp is now widened to
     **a voxel and a half, capped at the brush's own radius** — a voxel and a half because voxel
     centres are a voxel apart and a one-voxel ramp can fall entirely between two of them, and
     capped because an uncapped one gives a brush narrower than the grid a ramp three times its
     own size, which is worse than the staircase.
  4. **The shell was half a world unit**, which is ten voxels at `PAINT_VOXEL` and cost three
     things at once: a dab's search box is `radius + SHELL + voxel`, so every dab scanned a 33³
     box and discarded nineteen twentieths of it; the trilinear sample averaged across the whole
     shell, mixing paint from up to half a unit away; and it was paid per unit of _painted_
     area. It is **a voxel and a half** now, which is the thinnest that cannot miss the surface
     — the brush resolves that to a fifth of a voxel. Measured on the same 200-dab journal, on
     the same machine: **~530 ms → ~55 ms, and 64 bricks → 32.** It was never modelling
     thickness; it never could, and that is why it could shrink.

  The live path needed a way to make a stroke idempotent under re-rasterisation, because a
  group written twice lands on different bytes. **`PaintTarget` is now an interface rather than a
  `PaintField`, and `PaintBrush` passes an `UnderStroke`** — the field with the stroke in progress
  rolled back out of it, remembered per voxel on first touch. `rasterise` never learns a stroke is
  open: it asks the target what is at a voxel, gets what was there before, and writes over it. A
  field built by painting is byte-identical to one built by replaying the journal once, which is
  the property the derived-field design rests on and is now a test.

- **2026-10-13** — **The width ladder's floor still wants moving, and now for a different
  reason.** The smallest brush is 0.05 across — one voxel at `PAINT_VOXEL` — and the capped
  antialiasing ramp makes that honest rather than worse: a brush narrower than the ramp degrades
  into a faint mark instead of a stepped one, which is the right failure, but it is still a brush
  nobody can aim with. M6's ladder-against-voxel-size is the fix and it is untouched.

## Risks

1. **Upload bandwidth** — the real risk for M4, mitigated by M1. The fallback is 0.05 voxels at
   2 MB, already half today's 4.15 MB atlas.
2. **Part-occlusion semantics** — the one genuinely new design decision. Spike before M5.
3. **Project format migration** — existing `.sdfmod` files carry an atlas. Cheapest honest
   answer: read v1 with the existing codec, re-rasterise into a journal on open, write v2.
4. **Field bounds vs moving parts** — a part dragged far outside the initial AABB forces a
   re-allocate. Correct and cheap, but it must not surprise.
5. **Deleting the unwrapper too eagerly** — settled above: `xatlas-wasm` stays for M7. If it is
   removed in M5 the dependency has to come back, and the export bake is the last thing written
   and the first thing wanted.

## Progress log

- **2026-10-12** — Plan written after research into both codebases and the literature.
- **2026-10-12** — M0 done: brush colour picker wired into the brush panel.
- **2026-10-12** — Correction: `xatlas-wasm` is **kept**, demoted to the M7 export bake. The
  original deletion list would have removed the only route to a textured export format.
- **2026-10-12** — M1 re-sequenced. It was written as "the critical path", which assumed rmsl
  could be changed from here. It cannot: separate repo, uncommitted work on
  `fix/js-inline-fn-and-index`, consumed through the pnpm catalog. It is now required before M4
  rather than before M2, and the plan records both the preferred fix (in rmsl) and the interim
  one (`renderer.gl` escape hatch, feature-detected).
- **2026-10-12** — M2 done. Two design corrections found by testing, both written up where the
  code is: the journal's stroke counters must be separate fields, and the brick border must be a
  self-duplicate rather than cross-brick writes.
- **2026-10-12** — Not yet done: the journal is **not serialised**. M5 owns the file format,
  and until then a painted model cannot be saved, so the atlas path stays live.
- **2026-10-12** — M3 done. Two bugs found by reading the emitted GLSL rather than the source:
  the blend uniform was declared on the atlas branch only (so a field-only material painted
  nothing, silently), and the sample was re-evaluated five times for ten texture reads a
  fragment. A test now counts the reads.
- **2026-10-12** — Three bugs found by using it, all of the same kind: **something that was
  silently doing nothing.**
  1. **The paint tool's dispatch still tested for a bake** (`app.tsx`, `onPointerDown`). A field
     is made on the first stroke, so there is never an atlas to wait for and the test was always
     false on a fresh document. Every press fell through to the select tool, which returns early
     for a non-select tool, leaving the press to the orbit controller. **One bug, two symptoms:**
     the view turned instead of painting, and nothing painted. Removing `startBake` is what made
     the condition stale — the gate outlived what it was gating.
  2. **`brush` was a plain object, so the colour picker changed nothing.** The reasoning for a
     plain object was that only the panel and the drag read it; but reading a non-reactive
     variable in JSX creates no dependency, so `brush = { ...brush, colour }` changed the value
     and drew nothing. It is now a signal. The drag takes one `untrack` snapshot at its start,
     which is the part of the original worry that was worth anything.
  3. **Every stroke rasterised the journal twice** — `finish` and then a stray
     `rasteriseJournal` — making a session quadratic in its own history.

- **2026-10-12** — M4 wired. **`pnpm dev` and paint.** `startBake` and the paint tool's unwrap
  are gone. 597 tests green, including a new end-to-end `view/paint-path.test.ts` that meshes a
  real capsule, aims a real ray at it, and checks the paint arrives where the ray went — the
  test the four pieces could not provide between them.
- **2026-10-12** — Still owed from M3/M4: the **width ladder against voxel size**, the **visual
  check**, and **part occlusion**. The first is the one a person would notice first.
