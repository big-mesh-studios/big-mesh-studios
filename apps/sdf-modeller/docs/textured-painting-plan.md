# Textured painting — plan

Adding an optional painted texture to a figure: bake texture coordinates into the mesh, then let
a person draw on the model in the viewport with a brush that rasterises into the texture through
those coordinates.

This is a working plan, not a decision record. Decisions that were actually made have their own
ADR; this file is the order of the work and the state of it, so that anyone picking it up —
including whoever's context got summarised — can tell what is done, what is next, and what was
measured rather than assumed.

---

## Decisions already taken

These came out of a conversation and are settled. Do not reopen without reason.

| Question                                              | Answer                                                                                                                                                                                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What happens to UVs when the model changes?           | **Pin and transfer.** Unwrap once against a snapshot mesh; every rebuilt mesh's vertices inherit the coordinates of the nearest point on the previous surface. An explicit "rebake UVs" action, with a drift warning. |
| Where does the brush live?                            | **3D viewport only.** Draw on the model; the stroke is rasterised in UV space at the hit point.                                                                                                                       |
| How does a texture interact with a part's own colour? | **Modulate, with a toggle.** `lerp(partColour, texture, blend)` so a tinted texture respects each part's colour.                                                                                                      |
| Is the vertex layout allowed to grow?                 | **No.** 20 bytes a vertex whenever no texture is in use.                                                                                                                                                              |

## Constraints that shaped the whole design

These are facts about the codebase, not choices. Each one narrows what is possible.

1. **`ChunkMesh` stays byte-identical.** `packages/meshing/src/chunk-mesh.ts` is
   `positions` + `normalOct` + `colours` + `indices`, `VERTEX_BYTES = 20`. UVs are a **parallel
   array the app owns**, passed alongside the mesh and never inside it. `reportMesh`,
   `splitColourBoundaries`, voxelscape and spacescape are all unaffected, and **no
   `FORMAT_VERSION` bump** — existing `.sdfmod` files keep opening.

2. **ADR 0048 says "No UVs, and no textures."** It has to be answered, not worked around. See
   M0. ADR 0033's manifest gains a field.

3. **rmsl has no partial texture upload.** `needsUpdate` is a whole-image `texImage2D`
   (`@random-mesh/rmsl/dist/scene.js:1546-1582`); there is no `texSubImage2D` anywhere in the
   package. A 1024² RGBA texture is 4 MB **per upload**. So: uploads coalesce to one per animation
   frame, and 2048² is off the table until rmsl gains sub-image upload (worth an upstream issue).

4. **There is no ray-versus-triangle code anywhere in the repository** — M1 adds it. The repo's
   whole spatial-query story was sphere-tracing an SDF field (`packages/picking`), DDA over voxels
   (voxelscape), and an AABB BVH over CSG _operations_ (`packages/csg/src/bvh.ts`).

5. **`meshModel` is deterministic** — `HELD` scratch is reset before use, vertex order is fixed by
   integer grid loops, no `Math.random`/`Date`. Useful, but not sufficient: xatlas repacks globally,
   so a 2-unit move of one part can renumber every chart. Hence pinning.

## Not inherited from `randoms-3d-paint`

That repository was the origin of the idea but contributes **no reusable code**. Its entire
unwrap is ~15 lines in a Solid `createMemo` (`src/App.tsx:364-390`) calling CDN-loaded
`xatlas-three`, with the returned `Atlas` discarded and no error handling. Its "paint" is 3D voxel
painting into a `sampler3D`: strokes in world space, no 2D brush, no UV readback anywhere.

So this is _adopt xatlas, and the bake idea_ — not a port. Two things worth not copying from it:
its bake never sets `colorSpace` (paint reads too dark), and its `readRenderTargetPixels` →
canvas → data-URL → `TextureLoader` round-trip is unnecessary here.

---

## M1 — Triangle queries — **DONE**

`apps/sdf-modeller/src/mesh/`

- `triangle-bvh.ts` — median-split BVH over a `ChunkMesh`'s triangles. `intersectRay(ray)` →
  `{ triangle, vertices, point, weights, distance }`; `closestPoint(point)` →
  `{ …, distance }`. Two-sided (meshes draw `DoubleSide`), Möller–Trumbore, Ericson region walk
  for closest point.
- `uv-transfer.ts` — `transferUvs(surface, uvs, target)` → `{ uvs, drift, unmatched }`.
- `triangle-bvh.test.ts` (28 tests), `uv-transfer.test.ts` (8 tests).

Both queries allocate nothing internally; scratch is module-level and the class is documented
non-reentrant. A hit is only committed to the held result when it beats the one already held.

### What M1 measured, and what it cost to find

**Two real bugs, both found by measuring rather than reading.** Both were silent — every
correctness test passed throughout.

1. **`entry` returning `Infinity` for a miss broke the ray traversal.** `Infinity > Infinity` is
   `false`, so until the ray found something, a box it _missed_ compared equal to the limit and
   was descended into instead of skipped. Every ray was a walk of the whole tree: **700 µs a
   query, 7257 node pops and 9854 triangle tests**. Fixed by returning `-1` for a miss — a
   negative answer cannot be confused with a distance. Now ~55 µs.
2. **Ordering ray children by entry distance degenerates.** Every box the ray has already entered
   reports an entry of zero, and that is most of them, so the two children tie and the traversal
   becomes "always descend into the left child" — a walk with backtracking, not a search. Ordering
   by the box **centre's parameter along the ray** fixed it.

Two changes that _looked_ right and were not, both reverted:

- The zero-direction slab case cannot be handled by a reciprocal — `0 * Infinity` is `NaN`, and a
  `NaN` compares false against both bounds. It is handled by testing the axis directly.
- Ordering the **point** query's children by box centre instead of box distance made it _worse_,
  35 µs → 61 µs. The ray's case is not symmetric; the two queries keep different keys. Measured,
  and the finding is in the code comment so nobody "fixes" it back.

### Measured cost

Sphere of radius 4 meshed at `budgetFor(0.125)` — 38,732 triangles, 19,368 vertices, 28,311 nodes,
depth 14, leaves of 2–4. **On a phone-class ARM CPU under Vitest:**

|                | on surface          | 5% off surface |
| -------------- | ------------------- | -------------- |
| `closestPoint` | 34 µs               | 58 µs          |
| `intersectRay` | ~50 µs (from 1.05r) | —              |

`LEAF_TRIANGLES = 4` was chosen by sweeping 4/8/16/32 against both queries; 4 won on both.

**Consequence for M3:** one transfer is one `closestPoint` per vertex. At ~35 µs that is roughly
**700 ms for a 19k-vertex mesh on this machine** — so the transfer **must run in a worker and be
debounced**, which M2/M3 already provide for. On desktop hardware expect roughly 3–5× better. If
it still proves too slow, the lever is **spatial coherence**: marching-cubes vertex order is grid
order, so consecutive vertices are about one voxel apart, and seeding each query with the previous
hit's triangle would collapse the traversal. That is deliberately _not_ in M1 — it complicates the
API and may not be needed.

The tree was separately verified sound: no triangle outside its node's box, no duplicate or
missing triangle in `order`, left child always `node + 1`.

---

## M0 — ADR

**Do this before M4**, not at the start of the work.

- `docs/adr/0050-…` — answers ADR 0048's "No UVs, and no textures" directly. Four sections
  (`## Context` / `## Decision` / `## Consequences` / `## Alternatives`), reasoning-heavy, honest
  about cost, cross-referenced by number — follow 0046 and 0048.
- Update the `docs/adr/README.md` index table and the "what is decided so far" narrative.
- Note in Consequences that 0048's "triplanar, hard-axis-selected" reasoning does **not** carry
  over: a painted image is not a procedural material.

## M2 — The unwrapper (the one new dependency) — **DONE**

`apps/sdf-modeller/src/unwrapping/`

- `unwrap.ts` — the adapter. Declares the slice of xatlas it uses, `unwrapMesh(xatlas, mesh,
options)`, and `loadXAtlas()` as a **dynamic** import.
- `unwrap-worker.ts` — the protocol and `runUnwrap`, with the loader injected so it has no
  runtime dependency and no WebAssembly to load.
- `unwrap.worker.ts` — the four-line Vite boundary.
- `unwrap-client.ts` — the promise wrapper, with a main-thread fallback for no worker.
- `unwrap.test.ts` (11 tests, **against the real library**), `unwrap-worker.test.ts` (7, stubbed).

`xatlas-wasm` is pinned **exactly** in the catalog: 0.1.2 shipped `lib/xatlas.mjs` and 0.1.3
ships `dist/index.mjs`, so a caret range is a range over entry points rather than over bug fixes.
Its wasm is a base-256 string literal inside a single 288 kB ESM — no `?url`, no `locateFile`, no
Vite wasm plugin, no CDN. That is why `loadXAtlas` is a function.

### What M2 measured

**The unwrap is far more expensive than it looks, and this changes M3.**

| mesh             | default | `maxIterations: 2` | `maxIterations: 4` |
| ---------------- | ------- | ------------------ | ------------------ |
| 9,740 triangles  | 1.4 s   | 1.7 s              | 2.2 s              |
| 38,732 triangles | 11.6 s  | 15.9 s             | 24.5 s             |
| 84,044 triangles | 74 s    | —                  | —                  |

Roughly quadratic. **So the mesh that gets unwrapped must not be the mesh on screen** — the
reference is deliberately coarse (`REFERENCE_VOXEL_SIZE = 0.25`), and the transfer in M3 carries its
coordinates onto whatever resolution the user is looking at. Neither the transfer nor a paint
stroke can tell the difference, because both interpolate across triangles.

Other findings, all now encoded in the code:

- **`resolution` is a scale, not a size.** Asking for 1024 produced 1225x847, 1145x1202 and
  812x1270 on three meshes. Nothing may allocate the texture from the request.
- **An empty mesh does not throw.** `addMesh` succeeds and `generate` packs a 0x0 atlas with no
  charts — a plausible-looking result that would be used to size a texture. `unwrapMesh` refuses
  before the library sees it.
- **313 of a sphere's 4,872 vertices were split across charts**, so the output has more vertices
  than the input and the two are not in step. The adapter walks `xref` and takes the **bigger
  chart** of a split pair, because that is the less special side of the seam.
- **Passing the mesh's normals changed nothing** on a sphere — 6 charts either way, identical
  atlas and utilisation — for an octahedral decode pass. Not done. Worth revisiting on a model
  with hard edges.
- **Padding of 4 costs under 2% of the runtime** and stops bilinear filtering sampling across a
  seam, so it is not the library's default of 0.
- **`maxIterations` beyond 1 changed no chart count at all**, at 1.4x and 2x the time.

### One thing that did not go as planned

**The library's own `.d.ts` cannot be imported from this codebase.** `import type { XAtlasModule }
from "xatlas-wasm"` in `unwrap.ts` made every _other_ package fail to resolve from any file that
transitively imported it — `unwrap.test.ts` could no longer resolve `@big-mesh-studios/meshing`,
while a file with the same imports that did not reach xatlas was fine. Removing the _dynamic_
`import("xatlas-wasm")` did not help; only removing the whole import graph did.

The fix is better design regardless: `unwrap.ts` **declares the nine members it calls** and casts
the loader's return. The adapter has no compile-time dependency on the library at all, the stub in
the worker test is typed by the same interface, and the trap is documented where somebody would
otherwise put the import back.

> A device note, since it cost most of M2's time: this is Android emulated storage, where `stat`
> intermittently returns ENOENT for paths under `node_modules/@big-mesh-studios/` while `ls` and
> `readdir` succeed. TypeScript resolves symlinks with `realpath`, so the workspace links may need
> recreating before anything type-checks. Not a repository fault; nothing was committed to
> work around it.

## M3 — Reference mesh, paint surface, carrying UVs through a rebuild — **DONE**

- `src/unwrapping/paint-surface.ts` — CPU RGBA, `stamp`, `clear`, `sample`, `snapshot`/`restore`,
  and a `dirty` getter that clears itself so two readers cannot both see a change and both upload.
- `src/unwrapping/bake.ts` — the reference mesh at `REFERENCE_BUDGET`, its coordinates, the
  atlas, `carry()` for a rebuilt mesh, `rebakeTexture` which re-projects the painting through the
  old layout, and `drifted`.
- `view/model-view.ts` — `toGeometry(mesh, uvs?)` binds `uv` **only** when given one;
  `install` carries the coordinates onto the mesh it is installing.
- `view/model-material.ts` — the sampler, created only when a texture is attached, the blend
  uniform, and the sRGB decode.
- `app.tsx` — a `paint` tool whose _selection_ starts the bake.
- 17 brush tests, 15 bake tests.

### The bake is lazy, and that is the whole cost story

**Choosing the paint tool is the only thing in the application that starts an unwrap.** A model
nobody paints on carries no atlas, no coordinate array and no unwrap.

This replaced a **"Texture" button beside the mesher**, which was the obvious place for it and the
wrong one: a button labelled "Texture" invites a bake from somebody tidying up a model rather than
somebody about to draw on it, and it puts the cost where somebody can press it without meaning to.
A tool is a statement of intent.

`startBake` also **does nothing when there is already a fresh bake** — coming back to the paint
tool to check a stroke, carry on, or look from another angle should not cost a second of unwrap.
A rebake happens only when the model has drifted past `DRIFT_LIMIT`, which is a question about the
model rather than about how often the tool was picked.

**Verified in the build output**, not assumed: `index.html` preloads one chunk, and neither the
244 kB worker bundle nor the 242 kB fallback chunk containing the WebAssembly is in it or in the
main bundle. The WASM is fetched the first time somebody actually paints.

### The rest of the M3 decisions

- **The texture is allocated from the atlas's returned `width`/`height`**, never from the requested
  resolution — measured 1225x847 from a request of 1024.
- **A rebake keeps the painting.** Each new vertex's nearest point on the old reference names an
  old texel, which is written to the new coordinate. Resampled rather than blurred, because the
  old texels are already interpolated once and interpolating twice would soften a stroke somebody
  drew sharp.
- **`clear` wipes to transparent, not white**, because a part's own colour shows through wherever
  the texture is clear — a white fill would erase every part colour the moment anyone painted.
- **The sRGB decode is in the shader**, because rmsl builds no mip chain and `sampler2D` reads raw
  bytes. This is the bug the other codebase has.

### The load-bearing test

`toGeometry(mesh)` binds **no** `uv` attribute; `toGeometry(mesh, uvs)` binds one, and the other
three attributes are untouched either way. That is ADR 0048's argument for keeping the vertex at
twenty bytes, stated as an assertion.

## M4 — Rendering — **DONE**

The material work landed in M3, because a texture that cannot be seen is not a rendering
feature. **Left here: the blend toggle.** The uniform is live and defaults to 0 — modulate — and
what was missing was a control that moves it. That control is in the Paint sheet as two named
ends, **Tint** and **Replace**, named for what they do rather than for how they are computed.

**One thing that turned out to be load-bearing: the blend is passed to every install.** A rebuild
makes a new material, and a blend left on the old one would have reset on every edit — so the
toggle would have appeared to work and then sprung back the first time somebody moved a slider.
`install` now takes an options object rather than a third positional argument, which is the same
change in another form: a third positional parameter next to two booleans is a parameter list
that wants the wrong thing passed to it.

## M5 — Paint interaction — **DONE**

- `src/view/brush-hit.ts` — a screen point to a point, a face normal and an atlas coordinate, in
  one call. Pure and tested against numbers, like `move-handle.ts` is for the move tool.
- `src/view/paint-cursor.ts` — the ring, laid flat against the face and scaled rather than rebuilt.
- `src/unwrapping/stroke-recorder.ts` — a drag as stamps, a growing rectangle, the bytes undo
  needs, and the dabs redo needs.
- `src/ui/brush-panel.tsx` — size, softness, colour, the atlas readout, clear and rebake.
- `app.tsx` — `grabPaint`, `standCursor`, the `Paint` tab, and a pointermove listener so the ring
  follows a hovering pointer and not only a dragging one.
- 15 tests. **460 in the application, all passing.**

### The decisions

- **The ray goes at the reference mesh, not the mesh on screen.** The coordinates belong to the
  reference, and a stroke placed from a hit on the display mesh would be reading coordinates off
  a triangle that has none. It also means a stroke means the same thing at every resolution.
- **The atlas is written per pointer move; the model is never touched.** A stroke is dozens of
  events and is one undo entry — re-meshing per move would be forty rebuilds of a figure to show
  paint that is already in a texture.
- **Undo restores bytes; redo replays dabs.** Restoring is the only exact inverse, because
  translucent dabs overlap and removing one does not undo the other. Redo cannot rewind the
  rectangle — undo has spent those bytes — so it runs the same dabs again, which is what the
  person did.
- **The cursor follows the pointer between moves and the view between frames**, because orbit, a
  pinch and a rebuild all move the surface out from under a stationary finger.
- **The brush width is in world units and converted to texels per dab**, using the atlas's own
  `texelsPerUnit`. A brush sized in texels would change size when the resolution slider moved,
  and would be twice as wide on a large model as on a small one.
- **The brush colours come from the parts palette**, so there is one vocabulary rather than two.

### The seam bug — painting where nobody painted

The symptom was **extra marks, never missing ones**: the stroke you drew was there, and there was
a second line somewhere else in the atlas. It appeared only where the stroke crossed a seam, which
is why it read as random.

The cause was in the unwrap adapter. xatlas emits an **unwelded** mesh — a vertex on a cut exists
once per chart, each with its own atlas coordinate — and the adapter collapsed those back to one
coordinate per input vertex, keeping whichever chart was biggest. That is a defensible choice for
the _display mesh_, which wants one coordinate a vertex. For the _brush_ it is fatal: a hit is
interpolated across a triangle, and a triangle whose corners came from two charts interpolates to
a point in **neither** chart's triangle. The dab lands wherever the arithmetic put it.

**The fix is to keep the cuts open.** The unwrapper now returns both shapes — the unwelded surface
for the brush, one coordinate per display vertex for the transfer — and `TextureBake` carries the
unwelded one. Transfer gets slightly better for free: a display vertex's coordinate now comes from
the triangle that actually won the vote, rather than from a chart chosen by face count elsewhere.

**Four tests, three of them guards on the others.** "No triangle mixes charts" is a property of
xatlas's _output_, not of this code, so it would pass vacuously on a mesh the packer happened not
to cut. So there is a test asserting a sphere really is cut into more than one chart, and another
asserting the unwelded vertex count really does exceed the welded one — without those two, the
invariant is untested and looks tested.

### The second half of it — the line across the seam

With the interpolation fixed, a drag over a seam still left a stripe. A stroke is a **capsule**: a
straight run from one atlas coordinate to the next, and across two charts that run is not a path —
it crosses whatever the packer put in between. So:

- **A dab at every sample, unconditionally.** The dab is not a fallback; it _is_ the drawing. The
  mark lands wherever the finger went and no arithmetic between two samples can invent one.
- **The line only between samples in the same chart.** Within a chart the coordinates are a
  continuous map of a connected piece of the model, so a straight run is a fair approximation of
  the path. Across a seam the stroke is two marks with nothing between them — which is what the
  finger actually did, and the best a texture can do about a cut in its own geometry.

**Chart ids are saved in `texture.bin`** (four bytes a painted vertex), because a stroke broken at
a seam on a freshly baked model would rejoin itself and grow the stripe again after a reload.

**`-1` still means "unknown", and unknown joins.** A mesh with no cuts in it has one chart by
definition; refusing to join would stipple every stroke on such a mesh for no reason.

**What it cost elsewhere.** `texture.bin` now holds **two** meshes: the unwelded one the brush
uses, and the welded vertex list a reloaded file is checked against. They could have been
conflated by comparing loosely ("is every saved vertex somewhere in the fresh mesh"), which would
be smaller and wrong — a model that _grew_ keeps every vertex it had, so the loose check passes on
a file whose atlas no longer covers the new part, and the new part comes back unpainted. The exact
comparison catches that, and it is the only reason the welded list is in the file.

### Three bugs worth remembering, all silent

Every one of these passed the whole correctness suite until a test was written for it.

1. **The face normal was written into one scratch and copied from another**, so every hit reported
   the degenerate fallback and the ring would have lain against +Y everywhere. Found by a test
   asserting `normal.z > 0.9` for a ray at the front of a box.
2. **The pre-stroke copy of the atlas was taken after the first stamp.** Undo then restored every
   dab except the first — a byte-exact undo of all but one mark, which is the kind of bug that
   survives a long time being _nearly_ right. Found by a test that painted one colour, stroked
   over it, undid, and compared every byte.
3. **The growing rectangle copied a row using the new row's width rather than the old one's**, so
   it ran off the end of a row and read the next row's bytes into the middle of it. The symptom
   was a horizontal stripe that undoes wrongly and nothing else.

The recorder now takes the atlas copy before the first stamp, measures a row's overlap in the
_old_ row's terms, and splits each row into three named pieces — columns added on the left, the
overlap, columns added on the right.

## M6 — Persistence — **DONE**

Two optional entries and an optional manifest field.

- `texture.png` — `PaintSurface.toPng`, per `print/thumbnail.ts`.
- `texture.bin` — `unwrapping/reference-file.ts`. Coordinates, **the surface they were measured
  on**, and the three atlas numbers the packer produced.

### Backwards compatibility

**The whole story is one word: optional.** `PROJECT_VERSION` is still `1`, the `texture` field is
absent rather than null when there is none, and a model with no texture writes a file with
exactly the two entries it wrote before this existed — asserted as a byte-level test, because
"similar" is not a compatibility guarantee.

|                                        |                                                      |
| -------------------------------------- | ---------------------------------------------------- |
| New build, old file                    | Opens untextured.                                    |
| Old build, new file                    | Opens untextured — the field is inert, per ADR 0017. |
| Manifest names a texture, files absent | **Refused**, naming what is missing.                 |

**The version number did not move**, and the reason is written on the constant: `ids`, `coloured`
and `view` would have to be re-read by an existing build to get a _different answer_, and
`texture` is a field an existing build ignores entirely. A version that goes up whenever the
format is extended stops being a compatibility guarantee and becomes a rename.

**The one asymmetry worth stating out loud: absent is fine, present-and-wrong is not.** An absent
field means untextured. A malformed one is a file disagreeing with itself, and reading it as
untextured would open a painted model as a blank one without saying anything to anybody.

### Why the surface is saved, not just the coordinates

**Because "mesh it again and hope" is a promise a file format cannot make.** The coordinates are
per-vertex, so they mean nothing unless the vertex list they index is the same list. Meshing is
deterministic _within_ a build, so re-meshing does reproduce it — but across a change to the
mesher or the resolution ladder it will not, and the result is a file whose picture is smeared
across the model at random.

So the surface is written down and **compared against what this build meshes now**, exactly:

- **Match** — the saved coordinates are used as they are. No unwrap, no wait, exact.
- **Mismatch** — the picture is re-projected onto a fresh unwrap, and the reopen says so.

**The indices go out as well as the positions.** Re-projecting asks which _triangle_ of the old
surface is nearest a new vertex, and a bare position list can only answer nearest-_vertex_ — which
would snap re-projected detail to the coarse mesh's own tessellation. They are a third of the
file and they are the difference between a picture that survives a mesher change and one that
survives it as a blur.

**`texelsPerUnit` is saved too**, and this one is not optional tidiness. It is the unwrapper's
own arithmetic and cannot be recovered without unwrapping — so the alternative was to invent one,
and a brush sized from a made-up number is a brush of the wrong width.

### One deliberate asymmetry in the code

**The reader is given bytes; the writer is handed a `Blob`.** The caller owns the cache and knows
whether the atlas has changed; the writer is called on a debounced autosave and would otherwise
re-encode a 1225×847 PNG every second of ordinary editing. `app.tsx` holds a `textureRevision`
counter, bumped in exactly the three places the picture can change — a finished stroke, a clear, a
rebake — and `atlasPng()` encodes once per revision.

### Tests

24 in `reference-file.test.ts`, 12 more in the shared validator. **484 in the application**, 205 in
`@big-mesh-studios/csg`, both green, and `spacescape` — the other reader of these files — still
typechecks.

**The gap worth naming:** no test drives a real PNG through `readProject` and back, because this
environment has no canvas package and `getContext("2d")` returns null. Every refusal is checked
before the decode, so those tests are real, and the writer is tested end to end with a `Blob` —
but the decode itself is a thin wrapper over the platform and is the one thing here that has only
been reasoned about rather than run.

## M7 — Verify

```bash
pnpm --filter @big-mesh-studios/sdf-modeller check-types
pnpm --filter @big-mesh-studios/sdf-modeller test
pnpm --filter @big-mesh-studios/sdf-modeller build
```

---

## What this costs, and what it forecloses

- **Textured models carry a parallel 8 B/vertex UV array.** Untextured models are untouched.
- **UVs drift from geometry** between rebakes. The drift metric from M1 drives the warning; a
  rebake optionally re-projects the painted texture through the nearest-UV transfer rather than
  discarding it.
- **The atlas is only as good as the bake.** This is an SDF modeller: soft-blended and subtracted
  shapes produce charts that no unwrapper makes beautiful. Expect distortion on anything with a
  `softness` above zero.
- **3MF export is unaffected.** Painted colour will not reach the print path; `quantiseColours`
  still reads per-vertex colour. Baking paint into vertex colours for export is a deliberate
  non-goal for now.
