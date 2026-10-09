# 0046 — A triangle carries one colour, and the mesh is cut to put it there

## Context

ADR 0028 put a colour on an `Operation`, and ADR 0031 decided which operation's colour a point
gets: the one whose own surface is nearest. Both of those are about a **point**, and a mesh stores
colour per **vertex**, and a vertex is a point. So far so good.

The problem is the third step, which nobody had written down. `ChunkMesh.colours` is four bytes a
vertex, and the rasteriser interpolates between them. So a red sphere unioned with a blue box comes
out with a **gradient** across every triangle spanning the crease — not because the rule is wrong
but because a rule with a genuine edge in it is being handed to an interpolator.

Three places in the repository had already worked around this rather than fixed it:

- `apps/sdf-modeller/src/print/quantise.ts` opens by saying that colours arrive per vertex and a
  printer has filaments, that two `Paint` operations meeting give "a _gradient_ across every
  triangle between them", and that every interpolated value is a distinct 24-bit colour. Its
  answer was a nearest-colour snap to a four-slot palette, because there was nothing better
  available.
- `apps/sdf-modeller/src/print/three-mf.ts` writes `p1`, `p2` and `p3` per triangle and falls back
  to the group's first colour for a corner the group does not hold, with a comment naming the
  exact case: "That is the case a blend produces at its edges, where two kept colours meet."
- The viewport had no workaround at all, and simply showed the ramp.

The obvious fix is to give each triangle a single colour. That is sharp, and it is wrong by up to
half a cell: deciding a triangle's colour from its centroid puts the boundary on the triangulation
rather than on the shape, so the seam is a staircase. On a figure somebody is looking at closely,
half a cell is visible.

## Decision

**Cut the triangles where the field says the boundary is, so each triangle carries one colour and
the seam follows the boundary rather than the mesh.**

Concretely, `packages/meshing/src/split-colour-boundaries.ts` does this:

1. For every mesh edge whose endpoints carry different colours, **bisect along the edge** to find
   where `Field.colourAt` actually flips. The predicate is "still the first endpoint's colour",
   which is bracketed at the outset and needs no monotonicity to converge — the rule is
   categorical and has no zero for a linear solve to find.
2. **Re-cut every triangle that has such an edge** at those points: one region per arc of its
   boundary, each fan-triangulated from a single colour.

So the mesh already knew the answer everywhere; the pass only stops the interpolator blurring
between vertices and puts the seam where the field changes.

### Two invariants, and they are the whole design

**A crossing is a pure function of the two endpoints it lies between.** Each edge is canonicalised
to its endpoints in index order _before_ it is searched, so the search does not depend on which
triangle asked, and both triangles sharing an edge record one crossing between them. Everything
follows from that.

**`reportMesh` counts edges by rounded world position, not by index.** It already did, and for a
reason that had nothing to do with colour: a chunked landscape mesh is watertight while holding two
vertices in one place, because chunking produces them on purpose (`mesh-report.ts`, and ADR 0003).
De-indexing is therefore invisible to it. `boundaryEdges`, `nonManifoldEdges`,
`inconsistentEdges` and `volume` are unchanged by the pass, and ADR 0030's guarantee survives it.

### Why every disagreeing edge is cut, and never declined

A crossing landing within `CROSSING_TOLERANCE` of an endpoint is **clamped just inside the edge**,
not refused. Refusing it is what the first version did, and it opened 112 holes in a sphere: an
edge left uncut on both of its triangles, while a triangle on the other side of its _other_ edges
had been cut, is a triangle naming an edge no other triangle names. Refusing an edge also leaves a
triangle with exactly one cut edge, and such a triangle cannot be partitioned at all.

Clamping makes the rule unconditional and the whole of the special-case handling goes with it. It
also fixes the **grid-aligned boundary**, which is not rare: a marching cubes vertex lies on a
grid-aligned coordinate unless it is on an edge running along that axis, so a colour boundary
falling between two sample planes puts every vertex entirely on one side and puts the boundary
exactly on the triangulation. The mesh is _already_ sharp there, and 144 triangles of a sphere
still blend across their width — which is why the bail asks whether any **triangle** has
differing corners rather than whether any **vertex** does.

### Three crossings are four pieces

With two crossings the regions close into each other and tile the triangle. With three their
chords form a closed **inner triangle** the corner pieces do not cover, and the fans alone leave
its three chords each named by one triangle. The middle piece is emitted as well, and its colour is
**asked for** rather than read, because it is the one region of the pass that contains no vertex
to read from. It cannot be degenerate: three points, one in the interior of each edge of a
triangle, cannot be collinear.

### Marching cubes only

**Because the edge being cut has to be lying on the surface for a cut along it to mean anything.**
Marching cubes puts every vertex on a true crossing, so an edge between two of them runs along the
surface. Surface nets places one vertex per cell at the average of that cell's crossings — inside
the cell, and so off the surface by up to half a cell — so a crossing found along such an edge is a
crossing near the surface rather than on it.

## Consequences

**`quantise`'s reduction stops having anything to do on the print path.** A model of two coloured
parts previously carried hundreds of distinct corner colours and the reduction snapped them all to
the nearest of four. It now reports `distinct === 2`, with the parts' own colours as the palette,
and every triangle names one slot — so `three-mf.ts`'s `p1`/`p2`/`p3` fallback stops firing on
edge blends. **The reduction is not removed.** A model whose parts have similar-but-different
colours, or a mesh that reaches `quantise` from somewhere other than `printedMesh`, can still hold
more colours than a printer has filaments, and the code that handles that is correct.

**The seam is piecewise-linear: one segment per triangle.** It tracks the boundary to within the
boundary's curvature _inside_ that triangle rather than exactly. That is a different order of
small from the half-cell staircase it replaces, and it is not free.

**Under `softness > 0` there is no correct seam at all**, because the surface genuinely blends
through a soft join. The pass draws a crisp line across a smooth transition, which is the intended
reading of a colour boundary and is worth having seen once.

**Two colours a person cannot tell apart now show as a hard band.** That is the point, and it will
look like an artefact to somebody who has not expected it.

**`DEFAULT_MESH_MODE` became marching cubes.** This was decided alongside and for the same reason:
the pass only runs on marching cubes, `printedMesh` already forced marching cubes, and the
measured cost of preferring surface nets was a guess that turned out to be wrong — the two modes
are within noise of each other on time, because both spend nearly all of it in the sampling pass
and in the six field evaluations per vertex that fill the normals. See `DEFAULT_MESH_MODE` in
`apps/sdf-modeller/src/model/mesh-model.ts` for the numbers.

**The pass is skipped for a model with nothing to cut**, which is most models and every drag ghost:
it returns the mesh it was given when no triangle would blend. That bail is a scan of the index
buffer with no field calls in it, and it is the only thing that makes leaving the pass on the right
answer rather than a question.

## Alternatives

**Sample each triangle's centroid and give the triangle that one colour.** Rejected: sharp, cheap,
one field call per triangle, and wrong by up to half a cell. The boundary would sit on the
triangulation, which on a curve is a visible staircase at the resolutions this application offers.

**Interpolate the boundary as a second isosurface.** The obvious formulation — treat colour as a
scalar field and extract its zero set the way `marchingCubes` extracts the surface — needs a
_continuous_ colour field to have a zero. The rule is categorical; the nearest-surface comparison
that produces it has a zero, but the colour itself does not. This is why the search is a bisection
against the comparison rather than a linear solve on a channel.

**Do it in the shader, with `flat` interpolation on the colour varying.** Rejected for two reasons,
one practical and one decisive. `Builder.varying` takes no interpolation qualifier
(`@random-mesh/rmsl`), so it would need a change in an external package. And a flat varying fixes
the viewport only: the 3MF would still hold a colour per corner, which is the thing that reaches a
slicer.

**Widen the vertex layout to carry a face index**, which `chunk-mesh.ts` has kept a free alpha lane
for. Rejected as a three-package format change to fix something achievable by geometry, and
`quantise.ts` already shows the cost of the current layout: it counts by corner rather than by
vertex for exactly the reason that a corner is what gets printed.

**Do it for surface nets too, with the same pass.** Rejected on the geometry, not the
implementation: a surface nets edge floats up to half a cell off the surface, so the crossing found
along it is not a point on the surface. The test that holds this is
`mesh-model.test.ts`'s "leaves surface nets blending where marching cubes does not" — the two modes
produce the same two colours and differ only in whether either of them is flat.
