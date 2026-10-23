# Dual Contouring for hard edges in place geometry

## Why

`~/GitHub/spacescape-places/animal-hospital` is built from hard booleans: its walls are
oriented `Box` operations, its floor is a `Polygon` prism, and no item in
`animal-hospital.json` carries `softness`. The field therefore has genuine 90° creases.

The mesher is naive Surface Nets. A cell's vertex is the **mean of its edge crossings**
(`packages/meshing/src/surface-nets.ts:895-975`), so a crease vertex lands between the two
planes and the corner is chamfered by roughly one cell. At the place's LOD0 spacing of 3.2
world units, a wall 8 units thick gets a visible bevel. Vertex normals are then averaged from
the incident faces (`apps/spacescape/src/mesh/chunk-mesher.ts:418-435`), which shades the
chamfer as a smooth curve. Together they produce the "soft clay" look.

ADR 0003 predicted the rounding ("Sharp corners are slightly rounded") and rejected Dual
Contouring because it needs normals at edge crossings. That premise is now wrong for place
geometry: the field is still a function, gradients are only needed at crossings, and the
geometry actually has hard booleans. This plan promotes DC but keeps Surface Nets' topology.

## Decisions

1. **Opt-in per place.** `MeshResolution` gains an optional `sharpEdges` angle (degrees).
   Present enables QEF vertex placement and sharp-normal splitting; absent preserves current
   behaviour exactly. The animal-hospital manifest gets `"sharpEdges": 35`.
2. **Props are untouched.** `.sdfmod` figures keep marching cubes at their fine resolution.
   No new `MeshMode`, no change to `readModelFile`.
3. **The external manifest is edited** at
   `~/GitHub/spacescape-places/animal-hospital/manifest.json`.
4. **Connectivity is unchanged.** DC and Surface Nets both emit one vertex per cell and one
   quad per sign-changing primal edge. Seam ownership, `extra` LOD overlap, `cellGate`,
   `marker`, lanes, `positionAt`, and the broad pass all stay as they are.
5. **No warped grid opts in.** The mesher supports QEF on a warp given field normals, but
   `PatchMesher` (the planet) keeps centroid placement — it is a smooth sphere with no hard
   feature to preserve — and the water mesher does not opt in either.

## Phase 0 — Pin the defect

- Add a synthetic hard-crease field (two half-spaces or two boxes, with an analytic gradient)
  and a box-corner field.
- Mesh through the real chunk mesher at a place-like resolution.
- Assert Surface Nets bevels the crease/corner by roughly half a cell.
- Add the corresponding DC assertions (red until Phase 2).

## Phase 1 — Hermite normal plumbing

`packages/meshing/src/surface-nets.ts`:

- Add to `SurfaceNetsParams`:
  - `normalAt?: (x, y, z) => readonly [number, number, number]`
  - `vertexPlacement?: "centroid" | "qef"` (default `"centroid"`)
- In the cell loop, collect each crossing's world position and normal into preallocated
  scratch arrays instead of only accumulating `sumX/sumY/sumZ`.
- If `vertexPlacement === "qef"` and `normalAt` is absent, throw.
- Keep the centroid path byte-identical for every existing caller.

## Phase 2 — QEF solver and vertex placement

New `packages/meshing/src/qef.ts`:

- Let `m` be the crossing mass point, `q_i = p_i - m`.
- `A = Σ n_i n_iᵀ`, `b = Σ n_i (n_i · q_i)`.
- Solve `(A + λI) d = b`; place the vertex at `m + d`.
- 3×3 closed-form solve (Cramer) with determinant/finiteness guard; fall back to `m`.
- `λ ≈ 1e-4` relative to `A`'s trace initially (Boris' bias strength of `0.01` corresponds
  to roughly `1e-4` per axis).
- Clamp the result into the cell AABB with a tiny inset so vertices cannot land exactly on a
  shared cell face and collapse a quad.
- If clamping proves visually poor, upgrade to Boris' constrained face/edge/corner QEF.

Wire into `apps/spacescape/src/mesh/chunk-mesher.ts`:

- When `resolution.sharpEdges` is present, pass
  `normalAt: (x, y, z) => this.field.gradient(x, y, z, step)`.
- `step` is about a quarter of the finest place sample size, not the field's default 1.0.
- Use the same step for boundary normals in `resolveNormals`.
- Do **not** derive normals from the chunk's sample buffer: the padding cell would make
  neighbouring chunks disagree and crack the seam.

## Phase 3 — Sharp normals for shading

New `packages/meshing/src/sharp-normals.ts`, modelled on `split-colour-boundaries.ts`:

- Input: a finished `ChunkMesh` with resolved normals and an angle threshold.
- Compute each triangle's geometric face normal.
- If any corner's stored normal differs from the face normal by more than the threshold,
  duplicate the triangle's three vertices and write the face normal to the copies.
- Otherwise keep the original indices and shared vertices.
- Return the input mesh unchanged when nothing needs splitting.
- Run after `resolveNormals` and before any colour split.
- Start with per-triangle duplication. If vertex counts become a problem, dedupe by
  `(original vertex, normal cluster)`.

Wire into `SurfaceNetsChunkMesher.mesh`, after `resolveNormals` and before `finish`:
`const built = this.builder.finish(); return sharp ? splitSharpNormals(built, angle, scratch) : built;`

## Phase 4 — Configuration

`apps/spacescape/src/mesh/mesh-resolution.ts`:

- `readonly sharpEdges?: number` on `MeshResolution`.
- Validate a finite number in a sensible range (e.g. 1..90).
- Include it in `sameMeshResolution`, or changing the setting will not re-mesh.
- `MeshResolution` already travels in `ModelMessage`, so no protocol change.

`~/GitHub/spacescape-places/animal-hospital/manifest.json`:

```json
"mesh": {
  "lodSampleSizes": [3.2, 6.4, 16],
  "sharpEdges": 35
}
```

## Phase 5 — Measure, verify, document

- Extend `apps/spacescape/tools/mesh-profile.ts` with `--sharp` and a box-heavy model.
- Compare chunk time at LOD 0/1/2; target ≤ 1.7× baseline at LOD 0, with the corner-only
  path at about 1.2× as the floor and the feature refinement as the trade.
- Run the meshing and spacescape suites, especially:
  - one-big-chunk vs tiled seam tests,
  - LOD seam tests,
  - broad-pass byte-identical tests,
  - water/gate/patch tests.
- New tests:
  - DC crease and corner sharpness,
  - QEF vertex containment and degenerate fallback,
  - sharp-normal split on a box and no split on a sphere,
  - `sameMeshResolution` sees a changed angle,
  - a two-box wall/floor fixture at place resolution.
- Visual check in the places editor: wall/floor, wall/wall, door cut-outs, ceiling, chunk
  boundaries, LOD transitions.
- Add ADR 0055 recording the reversal of ADR 0003's cost decision, the topology decision,
  the shading split, and what remains unsolved (thin-feature non-manifoldness,
  self-intersection, warped grids staying centroid).
- Update `packages/meshing/src/index.ts` and `SurfaceNetsParams` docs.

## Acceptance criteria

- A synthetic 90° crease is within ~0.15 samples of the analytic crease with DC, versus
  roughly half a sample with Surface Nets.
- Wall/floor and wall/wall junctions are hard lines in the editor, with no visible chamfer.
- Smooth terrain does not become faceted; the split threshold only fires on real creases.
- Tiled chunks still produce identical triangles by position.
- Water, gates, planet patches, picking and collision are unchanged.
- Chunk time increase stays within the agreed budget (measured 1.5–1.7× on the heaviest
  hospital chunk).

## Risks

- QEF can spike outside the cell: clamp plus mass-point bias; constrained QEF if needed.
- QEF can self-intersect thin walls: same class of limitation as Surface Nets; inspect the
  8-unit walls at 3.2-unit samples.
- Sharp splitting increases vertex count: measure; dedupe later if required.
- Chunk-boundary shading must stay consistent: boundary vertices already use the field
  gradient from the same world position on both sides.
- The crease may fall exactly on a sample plane: if the clamp leaves a tiny bevel, consider
  embedding the wall base a fraction of a sample into the floor in the level file as a last
  resort.

## What landed

| Area             | Where                                                      | What                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| QEF solver       | `packages/meshing/src/qef.ts`                              | Regularised 3×3 solve relative to the crossing mean; if the minimum leaves the cell, a constrained face/edge/corner solve picks the best boundary point, and a field residual rejects a boundary candidate that moves further off the zero set. Falls back to the mean on a degenerate solve, with a ten-thousandth inset.                                                                                                                                   |
| Vertex placement | `packages/meshing/src/surface-nets.ts`                     | `vertexPlacement: "centroid" \| "qef"` and `normalAt`; one vertex per cell and one quad per edge as before. Works for both separable and warped grids. The default remains `"centroid"`.                                                                                                                                                                                                                                                                     |
| Hermite normals  | `packages/meshing/src/surface-nets.ts`                     | A crossing takes its normal from its own cell's eight samples: the trilinear interpolant's gradient, free and seam-safe. A cell whose samples deviate from linear (or touch a broad-pass fill) refines with a central field difference — six samples, a quarter of the finest spacing, capped at one unit. It was four tetrahedral samples; the hospital's wall/ceiling junction measured that as up to 1.9 units off the zero set, versus 0.26 for central. |
| Sharp shading    | `packages/meshing/src/sharp-normals.ts`                    | `splitSharpNormals` duplicates the three corners of any triangle whose face normal disagrees with a stored corner normal by more than the threshold, and writes the face normal to the copies. Returns the input unchanged when there is nothing to cut.                                                                                                                                                                                                     |
| Opt-in           | `apps/spacescape/src/mesh/mesh-resolution.ts`              | `sharpEdges?: number`, validated 0 < degrees ≤ 90 and compared by `sameMeshResolution`; carried in `ModelMessage` already.                                                                                                                                                                                                                                                                                                                                   |
| Manifest         | `~/GitHub/spacescape-places/animal-hospital/manifest.json` | `"sharpEdges": 35` under `mesh`.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Profile          | `apps/spacescape/tools/mesh-profile.ts`                    | `--sharp [degrees]` profiles the same path.                                                                                                                                                                                                                                                                                                                                                                                                                  |

### Measurements

The real animal-hospital level, meshed at LOD 0 (100 samples a side, 3.2 units) through
`createLevelApplier` and the real `Field`, broad pass on, best of three runs. Chunk `(-1, 0)`
is the heaviest of the five that hold the building:

|               | Plain    | Sharp     | Ratio |
| ------------- | -------- | --------- | ----- |
| Time          | 2,429 ms | 3,662 ms  | 1.51× |
| Vertices      | 39,397   | 72,715    | 1.85× |
| Triangles     | 77,728   | 77,728    | 1.00× |
| Field samples | 929,529  | 1,252,185 | 1.35× |

Earlier runs ranged from 1.5× to 1.7×; the corner-gradient path alone is 1.16×, and the extra
field samples are the feature cells and cells touching a broad-pass fill. Triangles are
unchanged; the vertex growth is the sharp-normal split, concentrated on creases. The test
fixture's wall is embedded two units into the floor, because two solids that touch exactly have
an internal zero plane in `min`; the animal hospital's wall base is exactly on its floor top but
does not land on a sample plane, so its sign is solid on both sides and no sheet is produced.

### Feature pass after the first plan

The first QEF used a four-point tetrahedral normal at feature crossings. A close-up of the
hospital's wall/ceiling junction measured that as leaving vertices up to **1.88 units off the
zero set**, with a visible fin. The normal is now a six-point central difference at the same
step: the wall-region worst case fell to **0.26 units**, the fin disappeared, and the sharp
chunk cost did not move measurably (the extra samples are paid only at feature crossings).

The QEF itself is now constrained rather than independently clamped. When the unconstrained
minimum leaves the cell, it minimizes on each of the six faces and keeps the best boundary
point; a field residual rejects a boundary candidate that would move further off the zero set.
On the hospital wall region the worst measured residual moved from **0.262 to 0.242 units**.
This is a real but small improvement. It does **not** remove the cell-sized staircase along a
flat boundary; that is a topology problem (one vertex per cell), not a vertex-placement one.
The next geometry route is therefore one of: local adaptive refinement, or exact planar
geometry for hard level items. Keep the one-vertex-per-cell topology as a separate decision.

### Tests added

- `packages/meshing/src/qef.test.ts` — plane, crease, corner, degenerate normals, clamping,
  cell-face inset, constrained face solve.
- `packages/meshing/src/surface-nets.test.ts` — QEF corner and edge sharpness, vertex
  containment, tiled-versus-whole seam, plane fallback, corner-gradient placement and its
  seam, feature refinement, refusal without normals and for a warped cheap-grid cell.
- `packages/meshing/src/sharp-normals.test.ts` — flat triangle untouched, crease split, colours
  and positions copied, selective split, degenerate triangle untouched.
- `apps/spacescape/src/mesh/sharp-edges.test.ts` — wall/floor fixture, vertex on the crease,
  every crease triangle flat-shaded, smooth sphere unsplit.
- `apps/spacescape/src/mesh/mesh-resolution.test.ts` — angle validation and comparison.
- `apps/spacescape/src/mesh/model-field.test.ts` — the model-message path with a box.
- `apps/spacescape/src/places/place-file.test.ts` — manifest accepts and refuses the angle.

### Deferred

- Deduplicating split vertices by `(vertex, normal cluster)`; the current per-triangle copy is
  simple and the measured growth is acceptable.
- QEF for props/figures (`meshModel`), which remain marching cubes.
- Manifold DC, intersection-free contouring, and analytic SDF gradients.
