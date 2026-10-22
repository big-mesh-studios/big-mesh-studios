# 0057 — A place may bake ambient occlusion into its chunks

## Context

The animal hospital is a room. Its floor meets four walls at right angles, its ceiling meets them
again, and its waiting-room chairs stand on the floor. The renderer draws all of it with one
directional sun, one moon, a flat ambient and a fixed table of point lights. **None of them casts
a shadow**, and none of them knows that a corner is a corner: the floor at the foot of a wall is
lit by the same ambient as the middle of the room, and the join is a hard colour edge with no
darkness in it. The eye reads the edge but not the space.

A screen-space pass could find the crease from depth, and a shadow map could darken under the
chairs. Both are renderer work that this application does not have: there is no depth pre-pass,
`@random-mesh/rmsl` has no shadow-map path in use here, and the fourth byte of every vertex is
already the material id (ADR 0048), so there is no vertex channel to put an occlusion value in.

What the mesher does have is the **field** and each vertex's normal. Ambient occlusion is a
property of the geometry — how enclosed a point is — and the field answers exactly that question
at any point in space. ADR 0046's colour cut already established the pattern: a pass that runs
after meshing, inside a reopened field region, on the mesh the mesher just built.

## Decision

**`MeshResolution` gains `bakeOcclusion?: number`, a strength from 0 to 1 and off by default.
When it is set, a chunk's mesh is passed to `bakeAmbientOcclusion` after `splitColourBoundaries`,
which multiplies each vertex's RGB by the occlusion at that vertex and leaves the material byte
alone.**

- **Four rays, one reach each, at 45° from the normal.** The pass builds a tangent basis from the
  normal, casts four rays evenly around it, and takes one sample per ray at a **normal** distance
  of 2.5 times the place's finest sample spacing. The ray is longer than the reach by
  `1 / cos 45°`; measuring against the ray length instead would make a flat plane answer less than
  the reach and darken every flat surface, so the reach is the comparison. A plane answers the
  reach and stays bright, a convex edge answers more and stays bright, and a concave corner answers
  less in proportion to how close the other surface is.
- **The scale is the finest LOD's sample, not the current one's.** A band scaled to the chunk's own
  level would double when the mesh coarsened and the LOD switch would change the shading as well
  as the silhouette. The finest spacing also makes the band a property of the place: at 3.2 units
  it is a skirting board's width.
- **After the colour cut, not before.** `splitColourBoundaries` decides where a colour changes by
  comparing the four bytes at the ends of an edge. A vertex darkened first would disagree with its
  neighbour on a single-colour surface, so the cut would run along every gradient in the occlusion
  and turn a smooth wall into a patchwork of small triangles. The cut sees the field's exact
  colours; occlusion is a multiplier on the finished mesh.
- **The region is grown before the pass.** The field's candidate cache serves a declared region
  exactly and rebuilds when a point strays outside it. The rays reach up to `2.5 × √2` samples past
  a vertex, so `beginRegion` is given the chunk's samples grown by that distance; otherwise the
  cache would be rebuilt for every vertex that sampled beyond the chunk.
- **The shade is clamped at 40% of the colour.** A fully enclosed vertex should read as a dark
  corner, not as a black hole; the clamp is the floor of the term, and `1` is the strongest
  strength. The value is a number rather than a boolean because the right amount is a look, and
  0.5–0.8 leaves the palette readable.
- **`animal-hospital`'s manifest sets `"bakeOcclusion": 0.8`.** It is the place that showed the
  problem, it already asks for sharp normals and the colour cut, and its interior is the case the
  pass is for.

## Consequences

**It costs about seven per cent of chunk time and nothing in geometry.** Measured on the hospital
level at the manifest's 3.2-unit spacing, LOD 0, best of three runs on the device this was written
on — the ratios are the point, not the milliseconds:

|                   | Without  | With     | Ratio  |
| ----------------- | -------- | -------- | ------ |
| Time              | 5,317 ms | 5,666 ms | 1.066× |
| Triangles         | 120,248  | 120,248  | 1.000× |
| Vertices          | 115,444  | 115,444  | 1.000× |
| Material ids seen | 3        | 3        | —      |

The pass makes four field calls per vertex on top of the mesher's own samples, and the mesh is
unchanged: everything it does is in the colour buffer. The measured ratio is the reason the reach is
one sample rather than two: a second reach per ray is another four calls a vertex for a gradient a
few units further from the wall, and the eye reads the corner from the first.

**The shade is baked, so it does not move when the sun does.** That is the right trade for ambient
occlusion, which is a property of the geometry, and the point lights still move over it. What it
does not give is anything that depends on the view or on light direction — a chair still casts no
shadow on the floor, and a room whose geometry changes must be re-meshed to change its shading.
The chunk's build already re-meshes on a geometry change, so that is the existing contract.

**The colour cut and the occlusion agree about a crease.** `splitSharpNormals` duplicates a crease
vertex and gives each copy its face's normal, so the floor's copy measures the wall above it and
the wall's copy measures the floor below. An averaged normal would have pointed into the room and
seen neither surface; running occlusion before the sharp split would have thrown that away.

**The term multiplies the albedo, not the light.** The material pattern is multiplied in afterwards,
so a brick wall keeps its courses and gets darker in the corner. It also means a painted patch is
darkened by the geometry around it, which is what a bake should do.

## Alternatives

- **Screen-space ambient occlusion.** Rejected for now: it needs a depth pass and a second full-screen
  draw, it is temporally noisy on a moving camera, and it would not survive the chunk being uploaded
  and used as a collision mesh without a second source of truth. The vertex bake is geometry's answer
  and costs one pass when the chunk is built.
- **A shadow map for the point lights.** Rejected as a larger change than the problem: one cube map
  per light, a new material path, and a bias problem at every wall; and it still would not darken an
  ambient corner that no light reaches.
- **A second vertex attribute or a fifth colour byte.** Rejected because the renderer's layout is
  fixed at twenty bytes (ADR 0003) and the colour's fourth byte is the material (ADR 0048). Adding a
  channel for a term that can be baked into the colour changes the layout for every chunk and every
  model to carry a number the shader would only multiply in.
- **A full hemisphere of samples.** Rejected on cost: the four rays already separate a crease from a
  plane, and the places that need this are boxes and rooms rather than sculpted curvature. A place
  with a curved surface gets a coarser answer, which is the same trade the mesher already makes with
  its sample spacing.
- **Computing it before the colour cut.** Rejected because the cut compares exact bytes; the
  ordering is the whole of why the two passes can both be on.
- **A per-place boolean rather than a strength.** Rejected because the amount is a look that changes
  with the palette and the lights, and because a strength of 0 is the same request as absent — one
  number says both.
