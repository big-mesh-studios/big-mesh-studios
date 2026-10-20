# 0055 — QEF vertex placement where the geometry has hard edges

## Context

ADR 0003 chose naive Surface Nets for the streamed landscape and recorded one cost it was
willing to pay: "Sharp corners are slightly rounded. … It does not matter here, because the
field comes from smooth primitives and smooth booleans and there is no voxel grid to be blocky
in the first place." It rejected Dual Contouring because it "needs normals at every cell-edge
crossing as input, and this project has no such data — the field is a function, evaluated on
demand, and evaluating a gradient per sample to feed the mesher is the cost surface nets
avoids."

A place like `animal-hospital` is the case that premise did not cover. Its walls are oriented
`Box` operations, its floor is a `Polygon` prism, and nothing in the level carries `softness`.
The field has genuine 90° creases, and the mesher rounds every one of them: a Surface Nets
vertex is the mean of its cell's edge crossings, so it lands between the two planes. At the
place's 3.2-unit sample a wall 8 units thick gets a visible chamfer, and the averaged vertex
normals then shade it as a curve. The result is the "soft clay" look rather than a building.

## Decision

**Where a place asks for it, a crossing cell's vertex is the minimizer of the quadratic error
function of its edge crossings' normals — Dual Contouring's vertex placement — and sharp
triangles are split into flat-shaded copies.**

- **The topology does not change.** Dual Contouring and Surface Nets both emit one vertex per
  crossing cell and one quad per sign-changing primal edge. Only the point inside the cell
  moves. The seam rule, the LOD overlap (ADR 0035), the cell gate, the marker, lanes,
  `positionAt` and the broad pass all stay exactly as they were.
- **It is opt-in, per place.** `MeshResolution.sharpEdges` is an angle in degrees; absent means
  the old behaviour byte for byte. The animal hospital's manifest names `35`. The setting
  travels in `ModelMessage` already, so no protocol change was needed.
- **A crossing normally takes its normal from its own cell's eight samples** — the trilinear
  interpolant's gradient, which costs arithmetic rather than field calls and is seam-safe
  because both chunks own the same eight numbers. A cell whose samples deviate from a linear
  function, or whose corners were filled by the broad pass, refines with a tetrahedral field
  difference: four samples, a quarter of the finest spacing, capped at one world unit. The
  feature test is the mixed difference of the eight corners, which is zero for a plane, about a
  hundredth of a cell for a resolved sphere, and most of a cell for a box corner.
- **Geometry alone is not the whole fix.** A crease that is geometrically sharp is still lit as
  a curve when the two faces share a vertex and the rasteriser interpolates its bisector.
  `splitSharpNormals` copies the three corners of any triangle whose face normal disagrees with
  a stored corner normal by more than the angle, and writes the face normal to the copies. It
  runs after the averaged normals and before anything else duplicates a vertex.
- **The QEF is regularised and clamped.** A flat cell has a rank-one normal matrix with no single
  minimum; a small `λI` toward the crossing mean selects the nearest point on the plane. The
  solution is clamped into the cell with a ten-thousandth of a cell inset, because a box corner
  that lands exactly on a grid point would otherwise put eight coincident vertices in eight
  cells and eight zero-area quads between them.

## Consequences

**A place pays for the normals it asks for.** Only crossing cells are solved, and only the cells
a corner gradient cannot describe ask the field. The real animal hospital's heaviest LOD 0
chunk, broad pass on: 2,429 ms to 3,662 ms (1.51×), 929,529 to 1,252,185 field samples, 39,397
to 72,715 vertices, and the same 77,728 triangles. The corner-gradient path alone is 1.16×;
the extra samples are the feature cells and the cells touching a broad-pass fill. The vertex
growth is the sharp-normal split, concentrated on creases.

**The landscape does not opt in.** The default resolution has no `sharpEdges`, so the streamed
world keeps Surface Nets and its cost. The water mesher and the planet patch mesher also stay
centroid: water is smooth and its material computes normals radially, and a planet patch is a
smooth sphere with no hard feature to preserve.

**Props are not affected.** A `.sdfmod` figure is one bounded model meshed by `meshModel`, and
it keeps marching cubes at its own fine resolution. A new `MeshMode` for DC would be a second
decision, not this one.

**The old limitations remain.** DC does not make a mesh manifold where Surface Nets was not, and
a sharp vertex is allowed to move only inside its cell, so a solid thinner than a cell can still
fold. Manifold DC and intersection-free contouring are substantial extensions and were not
needed for the place geometry this was measured on.

**A QEF vertex can be near-coincident with its neighbour across a crease.** That is what a
sharp edge looks like at a finite sample: two faces meeting at a line. The inset keeps the
vertices distinct; the normal split gives each side its own shading.

## Alternatives

**Leave Surface Nets and split normals only.** The shading would become hard, but the silhouette
and the chamfer stay rounded — a hard-lit bevel rather than a crease.

**Refine the place's sample grid.** `MAX_MESH_SAMPLES` caps a 320-unit chunk at 2.5-unit
spacing, so the best available refinement moves the bevel from 3.2 to 2.5 units and costs about
twice the samples. The corner is still a corner cut off inside a cell.

**Marching cubes.** Its vertices sit on true edge crossings, so it follows the field more
closely, but a box corner is still sliced off inside the cell; it has more triangles, and it
needs Lengyel's transition cases to cross an LOD boundary.

**Dual Contouring as a second mesher.** A separate `ChunkMesher` would duplicate the seam rule,
the overlap, the gate and the broad pass to change one arithmetic expression. The option lives
inside `surfaceNets` because the topology was never what made corners round.

**Analytic gradients for every primitive.** The principled long-term answer, and cheaper than
four field samples a crossing. It would need a derivative for all nine primitives plus the
polygon, and a gradient fold that agrees with the distance fold at every boolean, which is a
larger change than the one this decision needed.
