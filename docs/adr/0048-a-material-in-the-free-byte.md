# 0048 — The colour's free byte carries a material, and materials are procedural

## Context

ADR 0046 settled how a surface gets exactly one colour: a byte per channel, per vertex, and the
mesh is cut along every boundary. What it did not settle is what a surface is _made of_.

The demo that forced the question is a house. Voxelscape's `get-a-snack-at-4-am` is built out of
voxels with tiles — brick, greystone, ice, wood, grass, dirt, glowstone — and every one of those
is a texture. Here there is nothing to texture it with:

- **There is no UV channel.** `ChunkMesh` is `position` + `normalOct` + `colour` + an index,
  twenty bytes a vertex, and ADR 0033 settled that layout. A surface nets mesh of a smooth field
  has no natural parameterisation to project a UV from, and inventing one — a triplanar unwrap, a
  per-primitive UV — is the beginning of a texturing system.
- **There is no texture in the model either.** A `.sdfmod` is `manifest.json` and `model.bin`,
  where `model.bin` is a list of operations and an operation's whole of its appearance is three
  colour bytes. `MANIFEST_COLOURS` exists and is a palette the editor panel shows; it is not a set
  of maps.
- **The material id has to survive the worker.** Anything the mesher needs is decided on the
  operations, crosses the thread boundary by structured clone, and comes back on the mesh. So it
  has to be in the operation, which means in the shared file format.

And then there is the byte that makes the whole thing cheap.

## Decision

**`Operation.material` is a small integer, and it rides the fourth byte of the vertex colour —
the one the format already reserves and does not read.**

`packages/meshing/src/chunk-mesh.ts` has said so since it was written:

> ```
> colour     unorm8x4      4 B  its colour, plus a lane kept for a face index
> ```
>
> `ChunkMesh.colours` — _Four bytes a vertex: the colour, and a lane left free._

That lane currently carries opacity, which ADR 0028 records as "carried in the file, not read by
the field", and which `SurfaceMaterial` does not read either: `buildFragmentBody` takes
`varying("vColour", "vec4").xyz`. So the byte is free, and using it costs **no vertex bytes at
all** — `VERTEX_BYTES` stays 20, which was the deciding fact against adding a fourth attribute.

- **`Operation.material?: number`**, zero meaning "none", and `FORMAT_VERSION` is **4**. A byte
  appended to a fixed-width record is exactly the case where a lenient reader does the most
  damage, so the reader refuses versions 1, 2 and 3 rather than sliding every operation's
  parameters by one byte and arriving at plausible numbers.
- **Zero and absent are the same claim.** The writer stores a missing material as zero and the
  reader turns a stored zero back into absent, so `material === 0` and `material === undefined`
  cannot mean different things to two readers. `makeOperation` leaves the field off rather than
  writing it, for the same reason it leaves `colour` off rather than defaulting it white.
- **The material id reaches the fragment stage in that lane**, and a fragment shader chooses a
  pattern from it — brick, plaster, wood, tile, concrete — as an analytic function of world
  position and world normal. **Zero is "no material", and that is the overwhelming majority of
  the world**: every figure, and most of the landscape.
- **No UVs, and no textures.** Triplanar, hard-axis-selected rather than blended, because a
  blended axis selection smears a brick course across the corner it is turning.

## Consequences

**A flat-coloured world costs exactly what it costs today.** Material zero is the identity in the
pattern chain, and the chain is selected on a per-vertex value that is constant over almost every
triangle in the scene, so the branch is coherent and the common path does no work.

**The pattern functions are the whole cost, and they are unrolled.** A material id read from a
varying cannot index a uniform table in GLSL, so each pattern is evaluated and the results are
selected between: `MAX_MATERIALS` triplanar evaluations in the worst case per fragment. That is
the reason the count is small and the reason adding a material is a measured event rather than a
free one. It is the one part of this work with a real performance risk and the one thing that
should be measured before the set grows.

**A material boundary is now a colour boundary, and gets cut.** ADR 0046's `splitColourBoundaries`
already keys on all four bytes, so a brick wall meeting a plaster wall is cut on the geometry
rather than blended across a triangle — for free, on marching cubes. Note the limit it inherits:
that pass only runs on the marching cubes path, so the landscape's surface nets chunks do not
get it. Figures are meshed with marching cubes and do.

**`.sdfmod` version 1 files will not open.** `serialiseOperations` reads and writes one version
and refuses the rest, so a model saved by an older build needs re-saving. That is the cost of the
format bump and it is why the bump happened now rather than after a second format had grown up
around the old one.

**The material vocabulary is not in `packages/csg`.** The operation carries an integer because it
crosses into a meshing worker and the table it indexes lives in a renderer; a string would put two
vocabularies in one format and make a disagreement between them a parse failure rather than a wrong
colour. `apps/sdf-modeller` does not yet offer a way to set one, deliberately: its models are props
and NPCs, which are material zero, and the materials that matter are on the buildings, which a
place script writes.

## Alternatives

- **A fourth vertex attribute, `material unorm8`.** Rejected: 21 bytes a vertex instead of 20,
  every chunk buffer in the world grows by 4%, and it reopens ADR 0033's vertex-size decision to
  re-derive a number the format already reserves.
- **Texture mapping, with a triplanar UV generated in the shader.** Rejected: it is the same
  triplanar arithmetic with a sampler in the middle, and it needs an image per material shipped
  beside the place. Procedural brick is twenty lines of `fract` and `smoothstep`.
- **Put the material in `Operation.colour`, as a colour-keyed lookup.** Rejected: colour is
  resolved by nearest-own-surface (ADR 0031) and two different materials may share a colour; a
  key that is a colour cannot distinguish them.
- **Carve the material out of `Operation.opacity`, which is also unread.** Rejected, narrowly: it
  would have avoided the format bump, and it would have overloaded a field that a future soft
  paint blend is going to want. One byte in a shared format is a smaller claim than redefining
  what an existing field means.
- **Give every primitive its own material and let the field resolve it the way it resolves colour.**
  That is what happens, and it is the same rule — ADR 0031's "nearest own surface" — so the two
  cannot disagree about which operation won.
