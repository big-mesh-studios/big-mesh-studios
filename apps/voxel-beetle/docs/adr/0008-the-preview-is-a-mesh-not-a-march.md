# The preview is a mesh, not a march

The preview used to draw a model by walking a ray through it: the volume packed
into a `usampler3D`, a `BoxGeometry` with the marcher's shader on it, and every
fragment of that box stepping through the volume until it met a voxel. That is
the right shape for the other three programs, which draw a model inside a world
and cannot afford to rebuild its geometry, and it was the wrong one here.

A ray marcher spends its cost per pixel, per frame, for as long as the model is
on screen. So the cost of a model is not the size of the model but the square of
its size on the canvas times sixty times a second, and it is paid whether or not
the model changed. A model of any size drew a full box's worth of fragments, of
which the ones covering empty space were the majority and did the most walking.
Loading a large model was the worst of it: the volume is uploaded whole, and on
every stroke after.

Meshing inverts the shape of that cost. The work is done once per face, when the
model changes, and the result is triangles the card draws without walking
anything. A stroke costs one or two chunks of geometry. A load costs the whole
model, and is spread over the frames that show it.

## What the mesher is, and where it lives

`packages/stacker` gained a `./mesh` entry point: `FacePlane` merges one slice's
exposed faces into as few rectangles as a greedy sweep finds, and `meshChunk`
sweeps a volume axis by axis and sign by sign to emit those faces as triangles.
It is the algorithm `voxelscape` already runs (`apps/voxelscape/src/renderers/`),
which is why the first version of it is a reduction of that one rather than a
different approach.

The reduction is in what a face has to agree about before it will merge. A
terrain face carries a tile and two light channels, so it joins a rectangle only
when all of them match across the rectangle, which costs some of the merging. A
voxel in this editor has one palette index and nothing else, so matching it is
the whole of the predicate and the merge rate is as good as the algorithm gets.

The material is not in the package. The mesher is arithmetic over an array of
palette indices and needs nothing to run; the material is a shader graph, and it
is this editor's own lighting rather than anything the other programs share. What
is shared is the vertex format, so that a mesher and the material that reads it
are pinned to each other by one module's tests.

## Cutting a model into chunks, and only rebuilding what moved

A model is cut into 32-cube chunks, each its own geometry and its own draw. A
stroke marks the chunks its cells fall in; only those are re-meshed. A load marks
every chunk and the preview builds a few per frame, so a large model appears at
once and fills in rather than holding up the first frame that would show it.

The dirty list comes from the command that _reverses_ a change, read back in the
store. Every change this editor makes has a reverse naming the same cells, so an
undo and the change it undoes are described by the same box, and the painting
loop — which writes a voxel at a time — is never asked what the geometry is. A
stroke arrives as a `Sequence` of single voxels, and the box around them is a
slab through the model rather than the model, which is the whole difference
between one chunk of rebuilding and all of them.

The bounds are widened by a cell on each side before they are mapped to chunks. A
face is culled by the voxel across it, so erasing one voxel can uncover a face
on its neighbour, and that neighbour is in another chunk precisely when the
change is near a boundary.

Cutting a model up has one real cost: a merged rectangle cannot cross a chunk
boundary, so the faces along a seam are drawn as two quads where one would do. The
tests pin this down by area rather than by count — the chunked and unchunked
meshes of a model cover the same surface, which is the property that matters, and
a count would only pin down the size of the cost rather than its absence.

The whole model being one volume in memory is what makes chunking cheap here. A
chunk reads the voxels one outside its own bounds straight out of the same array,
so a face on a boundary is culled by the chunk that owns the voxel and neither
chunk draws it twice. There is no generated border and no padding to keep in step
with a neighbour, which is the machinery `voxelscape` needs for a world of
separate chunk stores and does not apply to one model in an array.

## Picking is a walk, not a march

The picker was the same marcher transpiled to JavaScript and run on the processor,
so that a point on the canvas and the voxel drawn under it could not disagree. It
is now a plain DDA over the volume, about a hundred lines of arithmetic, and the
agreement it used to get from being the same program now comes from two things
that are checked instead: the ray is built from the same camera, with a focal
length matched to the perspective camera's own field of view, and the cells it
names are the cells the geometry is laid out on, which the tests assert against
the outline's own box.

Losing the "one program" guarantee is a real cost, and it is why the anchoring is
pinned twice: once in `picking/volume-picker.test.ts` for the walk, and once in
`voxel-preview-scene.test.ts` for the rotation the ray is taken back through.

## The visible differences

Two, and both are consequences of the model being geometry rather than a field a
ray crosses.

**A hollow model shows its own inside.** Drawn double-sided, a model with a tunnel
through it shows the tunnel's walls instead of a hole to the background. The ray
marcher stopped at the near surface and never saw them. This was wanted, and the
double-sided setting is what makes it work: the near face of a hollow region is
front-facing, and without it the interior would be a hole.

**The pick outline is drawn slightly larger than its cell.** It used to lean on
the material's `depthBias` to win a depth test against a surface written by the
marcher. There is no depth offset in the scene graph here, so the box is grown a
couple of percent about its own middle instead, which puts every edge in front of
the surface it traces. At that size it is not visible as a box that does not fit.

Everything else — the light, the colours, the framing, the camera — is unchanged,
because the material reads the same `LIGHT_DIR`, `LIGHT_COLOUR` and
`AMBIENT_COLOUR` the marcher's did and the geometry is laid out in the same
normalized box the framing has always measured against.

## Considered options

- **Keep the marcher and make the volume smaller.** Rejected: the cost is per
  pixel, so it does not fall with a smaller model, and the upload of the whole
  volume on every stroke is a cost of its own.
- **Mesh the whole model, rebuilt on every change.** Rejected: it is simpler, and
  a 32-cube model is a fraction of a millisecond either way, but a 255-cube model
  pays several hundred milliseconds on every stroke. The stall moves rather than
  disappearing.
- **Mesh in a Web Worker, as `voxelscape` does.** Rejected for now: it keeps a
  large load off the main thread entirely, and costs a second copy of the volume
  in the worker and a request and response protocol to maintain. The chunk budget
  already keeps a frame's meshing bounded, so this is a refinement rather than a
  fix.
- **Replace the shared `VoxelModelMaterial` for all four programs.** Rejected:
  three of them draw a model inside a world, where a figure's geometry cannot be
  rebuilt per frame, and the ray marcher is the right answer there. `march.ts` and
  `material.ts` are untouched, and `voxelscape`'s notes on the shared material
  still hold.

## Consequences

- `src/shaders.ts`, `src/shaders-shared.ts`, `src/picking/voxel-picker.ts` and
  `src/picking/voxel-picker-cpu.ts` are gone, and so is the `precompileJS` step
  in `vite.config.ts` that transpiled the picker to JavaScript. The `sampler2D`
  stub the picker used to feed its marcher, filled white because it only ever read
  a voxel position, has no replacement to need one.
- The store's `packed` signal and its `repack` go, along with the per-stroke
  `packVolume` over the whole box. The preview reads the volume directly, which is
  what the mesher takes.
- A vertex carries a palette index rather than a colour, so changing a colour in
  the palette re-uploads a texture of thirty-two texels instead of re-meshing the
  model.
- The scene graph binds no integer vertex formats, so the palette index travels as
  one lane of a `unorm8x4` and the normal is rebuilt in the shader from the face
  index in another. A vertex is sixteen bytes: a position and four lanes.
- `CHUNK_SIZE` is the one number that trades build time against draw calls, and it
  is worth revisiting for a model large enough to reach a few hundred chunks. A
  255-cube model is eight chunks a side, so 512 of them.
- Nothing here was measured on a graphics card. The reasoning is about the shape
  of the cost rather than its size, and the claim that a large model is faster to
  look at is a prediction, not a result.
