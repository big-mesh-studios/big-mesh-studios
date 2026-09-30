# A figure leaves as a 3MF, standing on a bed at a height in millimetres

A model could be written out as a sprite stack and nothing else: the zip of six
drawings is the whole of what this editor makes, and it is a complete and
editable description of a model. It is also a description with no size in it. A
voxel is a cell in a drawing, and a drawing is a picture, and a picture of a
creature twenty cells tall is a picture of a creature twenty cells tall in
whatever unit the reader measures pictures in. Somebody who wants one of these on
a bed is told nothing about how big it is, or what it should stand on, or what
colours its faces are.

So a figure now leaves as a second thing as well: a 3MF package, which is a solid
rather than a drawing. It is a solid made of triangles, stood on the bed, given a
height in millimetres, and coloured from the palette it was drawn in. The mesher
that draws the preview sweeps the same faces to make it, and `printFigure` is the
whole of what stands those faces up and measures them.

## 3MF rather than STL

STL is the format everybody knows and the one a slicer has always opened, and it
is a triangle soup: fifty bytes a triangle, a normal, three corners, and nothing
else in the file to say what any of it means. It carries no unit, so a slicer
assumes millimetres and a model in any other unit is silently the wrong size. It
carries no colour. It cannot say that a figure is several solids each of which
can be turned on the plate.

3MF is a zip of XML, and it says all three: `unit="millimeter"` on the model, a
colour group in the materials extension, and one object per part. It is larger
than an STL of the same model and it is not a format a person can hand-edit,
which is the job the sprite stack already does. The trade is deliberate: the file
a slicer opens says what it is, and the file an editor opens says how it was
drawn.

The geometry is not written twice for this. A part's mesh is swept in its own
voxel space and posed afterwards, so what comes out of `printFigure` is already
triangles in millimetres standing on a bed, which is exactly what a triangle soup
wants and is not tied to any of this.

## The height is asked for, because the file cannot say it

A figure has a size in voxels and no size in anything else. The export asks for
the height the whole figure should stand at, in millimetres, and measures
everything else from that: the part boxes together fill a box, and the figure is
drawn as tall as that box is measured to be.

The height is measured over the part boxes rather than over the voxels drawn in
them, which is what `figurePlacement` already measures and what a part's own
extent is. A part thirty two cells tall with ten cells of it drawn comes out
thirty two cells tall, because that is the box it was drawn on and the drawings
are what set the box. Measuring the drawn voxels instead would answer a different
question — how much ink is on the model — and would make a figure's printed size
change as an edit erased something from a corner of it.

## Stood up, and put down on the bed

A figure is drawn with `+y` up. A slicer reads `+z` up, and expects the model to
be sitting on the plate rather than halfway through it. So the figure is brought
over the origin with its underside on the bed, then turned so its up is the
printer's up, and only then measured — in that order, because standing a figure
up before shifting it would put its underside on whichever axis happened to end
up as the bed.

The turn is `(x, y, z) -> (x, -z, y)`, which is right-handed and so is a turn
rather than a mirror. That matters more than it looks: the mesher's winding is
outward, a winding a slicer reads a solid by, and standing a model up on the wrong
hand would reverse every face of it. A turn has determinant +1 and leaves the
winding alone.

## Colour is written but not required

The colours are in a `colorgroup` in the materials extension, and a triangle
names the one it shows by its position in that group. The group holds the slots
the model actually shows rather than the whole palette, so a triangle's palette
index is not an index into the group but a lookup to one — which also means a
model drawn against a palette slot nothing holds is a wrong colour rather than an
index pointing past the end of a list.

The extension namespace is declared on the model and `requiredextensions` is
deliberately not set. Declaring it is what lets a consumer read the colour;
requiring it is what makes a consumer that has never heard of colour refuse the
file. A print export that a colour-unaware slicer rejects is worse than one it
opens in grey, so the colour is offered rather than insisted on.

## A part is an object, and a name is metadata

A figure is several parts, each with its own root, turn and scale, and 3MF has an
object per solid. Each part becomes one, which is what lets a person move an arm
on the plate rather than having to re-export to move a finger.

The specification has no name on a solid of its own — naming one belongs to the
production extension — so each part's name is written as metadata against the
identifier it became, which is the only place in the file a consumer can look it
up.

## The volumes are solved apart from the scene graph

`solvePart` and `solveFigure` moved out of `figure-meshes.ts` into `solved.ts`.
They are arithmetic over arrays and have no business in a module that imports a
scene graph, and now that the export is a second reader of the same volumes,
leaving them there would mean a caller that wants the shape of a model and nothing
else — a command line, a test, a tool that reads no file and writes one — had to
pull three.js in to get at them.

## Consequences

- **The figure is the solid.** A sprite stack is a set of opaque voxels, and the
  faces of a voxel that face into another voxel are not in the export, because
  the mesher culls them for the same reason the preview does. A model drawn as a
  closed shell prints as a closed shell, which is hollow, and a model drawn as a
  solid block prints solid. That is what was drawn; it is not always what somebody
  means by a shape, and nothing here can tell the two apart.
- **Parts are meshed separately and are never joined.** Two parts that touch leave
  coincident faces, and two that overlap leave interpenetrating shells. A slicer
  unions what it is given, which is usually invisible and occasionally leaves a
  seam along where they met. Joining them would mean a boolean union over parts
  that are not on a common grid — they are turned, scaled and pivoted about their
  own middles — which is a great deal more than this export needs to be worth.
- **A turn is a turn, so a figure is never mirrored.** A part's `scale` is
  positive and its `turn` is three rotations, so nothing in a figure reverses the
  handedness of its own geometry. This is a fact about the poses as they are
  stored rather than something the export enforces.
- **The rest pose, always.** The export reads the figure as drawn and not the
  figure as the timeline is standing it at, so a printed model does not depend on
  where the transport was left. Posing a figurine deliberately is not something
  this can do; the motions are in the sprite stack beside it.
- **The size is a number, not a decision the file carries.** Two people printing
  the same figure at the same height get the same model, and the same figure
  printed at two heights gives two models. Nothing in the file records what it
  would have been otherwise, so a second print of the same figure needs the same
  number typed again.
