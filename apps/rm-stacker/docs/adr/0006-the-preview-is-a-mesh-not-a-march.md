# The preview is a mesh, not a march

The preview of a model was drawn by marching a ray at a time through a packed
volume: one `usampler3D` texel a step, a DDA to decide which step, and a palette
lookup wherever the ray landed. It is now drawn as triangles — the same mesher
the other editor uses, run over the same packed volume the marcher read.

The reason is what each costs and when. A marcher's cost is the area the model
covers on screen, times the frame rate, paid whether or not the model changed. A
mesher's cost is once per exposed face, when the model changes. Editing a model
is not the thing that makes a preview slow; looking at a large one is, and looking
at one is most of the time spent in an editor. For a model of any size that is the
difference between a figure that turns smoothly and one that does not.

[ADR 0008 of the other editor](../voxel-beetle/docs/adr/0008-the-preview-is-a-mesh-not-a-march.md)
makes the same decision for the same reason. What follows is what is specific to
drawing a figure this way, which is that a voxel here has six colours rather than
one.

## A voxel here has a colour per face, and a plane is one face

The mesher takes a `FaceSource`: something that says whether a cell is solid and
what colour the cell's face in a given direction shows. A volume answers both with
one index, because a voxel in a volume carries one colour and every face of it
shows that. Six drawings answer them with two, because each face takes its colour
from the drawing looking at it — the front drawing for a voxel's +z face, the
top for its +y, and so on — and a solid voxel whose facing cell is empty shows
index zero, the palette's black.

The worry is that six colours per voxel means faces that must not merge, and a
merger that keeps them apart produces one quad per cell and is worse than the
marcher. It does not, and the reason is that the sweep is already partitioned by
face direction: one plane per axis, sign and slice, so every cell in a plane is a
face read the same way, and matching the palette index is the whole of the merge.
Two cells merge only when the colours they show _on the face being swept_ are
equal, and a face of another direction was never in the same plane.

This is the same reason voxelscape's greedy sweep can key on a voxel id rather
than a texture id: its plane partition makes the atlas tile a pure function of the
id it already compares. Here the same partition makes the colour a function of the
face direction, and a source free to differ face from face still sweeps a plane
whose cells all read alike.

`solver.ts` grew `packedFaces` to read the packed format as such a source. It sits
beside `solveVoxels`, which writes that layout, rather than restating the bits
somewhere the writer does not reach. Three of the six faces straddle two bytes, so
the table is a list of stretches and the mask is derived from a shift and a width
rather than written out, which is what keeps the two from disagreeing.

## The volume is unchanged, and so is the file

`SolvedPart` is what it was, and `solveVoxels` still produces it. The mesher reads
the same array the marcher read and the CPU picker still walks. Nothing about
framing, placement, the reach a figure is measured against, the cut plane, the
debug planes, the file format or the published record has changed, because none of
them care how the triangles were produced.

That is also why the old path is still here rather than deleted. `VoxelModelMaterial`,
`marchVolume`, `FigureMeshes`, `BakedFigure`, `bakeVolume` and `boxSize` are all
untouched and still exported, with their tests still passing. Reverting the default
is choosing `FigureMeshes` over `MeshFigureMeshes` in one place.

## What a stroke costs

A mesher is only cheap if a change rebuilds the part of the geometry it altered,
and a stroke on a panel of a part is a rectangle in a drawing's own two-dimensional
space. `panelCellBounds` stands that rectangle back up into the box: onto the two
axes the drawing spans, turned end for end on whichever of them its side counts
against, and across the whole of the axis it looks down. Every drawing has a side
it is drawn the way of — `panelSide` reduces a cut's face to the side it parallels,
so all seven kinds take one path — and that side is what says which way round it
runs and which axis it faces.

The facing axis comes back in full rather than as the stretch the face actually
carves, which is deliberately conservative. A face does carve every voxel in the
run it looks along, so a stroke on the front of a part has genuinely changed all
of it. On a part cut across that axis it is wider than it need be; narrowing it
would mean reading the cuts as well as the side, and nothing has needed that.

What a stroke does _not_ cost is the rest of the figure. `updateVoxels` re-packs
only the parts a change reached, matching a part to the volume it had by name, and
a pose reaches none of them: a part that is turned or moved stands somewhere else
with the same drawings, and the triangles are the ones it was already drawn with.
For a figure of several parts at a large size, that is the largest single saving in
this change — packing is proportional to the voxels, and it was happening whole on
every keystroke.

A change is read off the _reverse_ of a command, after the store has flushed. A
command says what it is about to do, and the part it names may not exist by the time
it runs; its reverse says what was undone, which is what the geometry now has to
agree with.

## Draining, rather than blocking

Stale chunks are built on a time budget rather than a fixed count per frame. A
count is right only while every chunk is the same size, and they are not: eight
chunks of a part a few cells across is a moment's work, and eight of a part two
hundred across is most of a frame. A large model therefore fills in over the frames
after it is opened rather than appearing at once, which is the price of not holding
one of those frames up.

`place` and the drain are separate, and the split is what makes a pose free.
`place` stands every part's chunks where the figure has them; the drain builds
triangles. A part's group is two groups deep, because a placement sets a group's
scale to the distance a part is drawn at, and the chunk vertices need a different
scale again — the fraction of the box's own longest axis that turns cells into
that box.

## Two things the mesh could not carry over

**The depth bias is gone.** A marched model pushed its own surface towards the
camera when writing depth, by an amount large enough for the outline of the picked
voxel to win the depth test and small enough not to be visible. A mesh has no such
push and no way to express one, so the outline is drawn a little outside the cell it
bounds instead, putting its edges in front of the surface they belong to. It costs a
hairline of overlap on the two faces it stands away from.

**Interior faces are culled.** A face whose neighbour is solid is not drawn, so the
inside of a thick or hollow model is not drawn either, and a camera _inside_ a
model would see through it. The editor's nearest camera stands 1.4 box-widths out,
so this cannot happen in practice, and the other editor's mesher has the same
property.

Two further differences are worth knowing rather than worrying about. Overlapping
parts now resolve by the real depth buffer rather than a marcher's per-pixel depth
write. And the mesh material carries the face normal into world space before
shading, so a light stands still while a part is turned; the marcher achieved the
same thing by transforming the light into each volume's own space.

## Picking is still a march

The pointer is picked by `figure-picker`, which runs the CPU marcher over the same
packed volumes, once per part, on click. That is deliberate and it was left alone.
It costs once per click rather than once per frame, and reusing it is what keeps
the pointer and the drawing from being able to disagree — the earlier arrangement
ran one marcher's source for both precisely so that a point on the canvas and the
voxel drawn under it could not come apart. Porting the other editor's DDA would
need a single-index volume a figure of six drawings does not have, and would give
up that guarantee for a cost nobody is currently paying.

`voxelCellEdges` is what the two agree through, so it is worth saying that the
anchoring is checked rather than assumed: `mesh-figure-anchoring.test.ts` places
each corner of a cell through the same group the preview places it through and
compares it against the corner the outline traces, for a cube, for an odd-extent
box, and for a box that is not the same on all three axes.
