# 0056 — A place cuts its triangles at a colour boundary

## Context

`~/GitHub/spacescape-places/animal-hospital` is a blue wall on a green floor. The mesh holds a
colour per vertex, and the rasteriser interpolates between vertices, so every triangle that
touches the join is drawn as a **ramp**: the wall's blue bleeds onto the floor, and the floor's
green climbs the wall, for about a cell's width. It is the same defect ADR 0046 fixed in the
modeller, and the pass that fixed it there has existed since: `splitColourBoundaries` bisects
`Field.colourAt` along each disagreeing edge and cuts the triangle where the rule actually
flips, so each triangle carries one colour and the seam follows the shape.

Spacescape never called it. The chunk mesher wrote a colour per vertex and handed the mesh to
the renderer. ADR 0046 says why the pass was marching-cubes-only: a Surface Nets edge floats up
to half a cell off the surface, so a crossing found along it is near the surface rather than on
it. ADR 0055 changed the premise for a hard place: QEF placement puts the crease's vertices on
the crease, which is exactly where a hard colour change belongs, and the flat parts of a place
— floors, walls, counters — are planes whose vertices and edges lie on the surface by
construction.

## Decision

**`MeshResolution` gains `splitColours?: boolean`, default off. When it is on, a chunk's mesh
runs the modeller's `splitColourBoundaries` pass after `splitSharpNormals`.**

- **The same pass, not a second one.** It is exported from `packages/meshing`, keys on all four
  colour bytes (so a material boundary is cut too), and already runs on every `.sdfmod` model.
  The chunk path needed a call, scratch held across chunks, and the candidate cache reopened
  for the bisections.
- **Opt-in per place.** A single-colour place pays one scan of the index buffer and no field
  calls, which is why the default could be on; a painted landscape has colour boundaries on
  most chunks and would pay field calls and triangles, which is why it is not.
- **Sharp first, then colour.** `splitSharpNormals` duplicates a triangle's three corners per
  side of a crease. Running the colour cut first would leave the shading pass averaging a fan
  clipped by the seam, which is the ordering ADR 0046 records for models.
- **The cut is a bisection on the edge, never a per-triangle centroid.** Giving a triangle its
  centroid's colour is sharp and wrong by up to half a cell; the cut tracks the boundary inside
  the triangle and is exact at a crease, where the boundary is an edge of the geometry.
- **`animal-hospital.json`'s manifest sets `"splitColours": true`.** It is the place that
  reported the defect, and it already sets `sharpEdges`, which is the case the cut is sharpest
  in.

## Consequences

**The blend is gone, and it costs about five per cent of chunk time and eight per cent of
triangles.** Measured on the real level's six occupied chunks at the manifest's own 3.2-unit
spacing, LOD 0, on the device this was written on — so the ratios matter and the absolute
numbers do not:

|                   | No cut   | Cut      | Ratio |
| ----------------- | -------- | -------- | ----- |
| Time              | 6,476 ms | 6,828 ms | 1.05× |
| Triangles         | 152,412  | 164,814  | 1.08× |
| Vertices          | 123,367  | 146,587  | 1.19× |
| Blended triangles | 6,164    | 0        | —     |

The triangle and vertex growth is concentrated on the colour joins, as the pass intends: a
triangle with no cut edge is emitted untouched and shares every vertex it already had.

**The seam is safe because both chunks run the same rule on the same edge.** A crossing is a
pure function of the two endpoints it lies between, canonicalised by index order before it is
searched, and two same-level chunks share the world cells on their seam. The seam test pins the
two chunks' boundary positions on the shared column to each other.

**`boundaryEdges` in a mesh report can rise.** A cut that lands on an edge the chunk already
leaves open subdivides it, so the open perimeter has more edges while being the same perimeter.
Manifoldness, winding and enclosed volume are unchanged, and those are the properties the pass
is answerable for.

**A place that sets it without `sharpEdges` still gets a cut, but a blunter one** — the surface
is beveled by half a cell and the seam follows the bevel. That is still sharper than the ramp,
and it is why the two settings are independent rather than one implying the other.

**Mid-surface colour boundaries are now exact too**, not only creases: a painted patch on a flat
floor is cut where `colourAt` flips rather than staircased or blended. On a curved surface in a
sharp place the cut is as accurate as the surface's own sampling, which is the same assumption
the mesher already makes everywhere.

## Alternatives

- **Give every triangle one colour from its centroid.** Rejected by ADR 0046 and still wrong:
  the seam becomes a staircase, and half a cell at a place's 3.2-unit spacing is 1.6 units.
- **Recolour the sharp-normal duplicates from the field and cut nothing.** That fixes a crease
  exactly, because the duplicates are already one per side, and it would be cheaper. Rejected
  because it does nothing for a colour boundary that is not a crease, and place levels paint
  patches as well as build walls. The cut is the general answer, and the crease is its easiest
  case rather than its only one.
- **Do it in the shader with flat interpolation.** Unavailable in `@random-mesh/rmsl`, and it
  would fix the viewport while leaving the mesh itself holding a gradient — the argument ADR
  0046 already made.
- **Cut every place, including the landscape.** Rejected as the default for the same measurement
  the option exists for: the landscape's painted tiles would pay the pass on every chunk for a
  boundary the player is looking at from far away.
