# A cut is stored as two faces and drawn as more boxes

[ADR 0002](./0002-sections.md) settled what a cut is to whoever draws one: the
six sides go on describing the outer shape, uncropped, and the part gains two
more drawings at the plane. It turned down the other arrangement — breaking the
part in two and letting each half keep six sides of its own — because breaking
apart takes half of every drawing away to somewhere else.

That was a decision about what a part is made of. It is not a decision about
what a renderer draws. The stretches a part's cuts leave along its three axes
are a grid, and one cell of that grid is a box like any other: bounded on every
axis by the pair of faces closing its own stretch, and holding no cut inside it.
A renderer may draw a part as that grid of boxes. The drawings are shared
between them, not split, so nothing about how a part is held has to change for
it.

## The six-panel rule is what a marcher wants

A ray marcher can work a part's shape out for itself from the panels, without a
volume being solved for it first: a voxel is there when all six of the drawings
facing it have something at the cell that looks at it, and its face colours come
from those same six. Nothing in that depends on a neighbouring voxel, so there
is nothing to work out ahead of time and the panels can be handed over as they
are — one small texture each, holding the palette indices a panel already
stores.

A cut breaks that rule for the part as a whole. Which two drawings bound a run
of an axis is no longer "the sides at its ends" but "the pair closing the
stretch this voxel falls in", and a marcher reading the part as one box would
have to be told where every cut stands and walk to the right pair before it
could sample anything.

Read as a grid of boxes, the rule comes back exactly as it was. Every box has
six bounding drawings and no cut inside it, so a marcher inside one asks the
same six questions it asks of an uncut part. Where the cuts stand is settled
before anything is drawn, by which boxes were emitted and how large each of them
is.

## Sharing panels, not splitting them

A box takes its six drawings from the ones the part already holds. Along the
axis a cut divides, the box is bounded by that cut's face at one end — the face
closing the run before it, or the one opening the run after — and by the side at
the end of the axis where no cut stands between. Along the two axes it does not
divide, the box is bounded by the part's own sides, over the sub-rectangle its
stretch covers: the top drawing of a box that spans the first five widths is the
part's top drawing, read across those five widths and the whole depth.

So a box refers to six drawings and carries where it starts along each axis. A
marcher inside it adds that start to the cell it is at before it samples, and
reads the same texture every other box holding that drawing reads. Nothing is
copied, and no drawing is cropped.

That is what keeps the two readings from pulling against each other. Stored, a
part is six sides and two faces per cut — a sum, so a cut costs two drawings
wherever it stands. Split into boxes and stored that way, a part would be six
drawings per box, and the boxes are a product: one cut on each of the three axes
makes eight boxes and forty-eight fragments where the part holds twelve
drawings, and every drawing that crosses a cut would be broken into pieces to
paint on separately.

## What it costs: boxes rather than a walk

A part is drawn as many boxes as the grid has cells — one for an uncut part,
three for two cuts across one axis, eight for a cut across each. Each box is
rasterised and marched on its own, so a part with cuts is more draw calls than a
part without.

Against that, each box is smaller and a ray crosses less of it, and a marcher
inside one does no work at all to find out which drawings bound it. The
alternative is one box for the whole part and a marcher that carries the cuts:
a list of where they stand along each axis, walked per sample, and a way of
naming which face pair a stretch takes. That is the arrangement this decision
turns down for a renderer that reads panels.

It is not turned down for a renderer that solves. Walking the stretches once on
the processor and carving a volume from them is the same segmentation done
ahead of time, and that is what the renderer does today.

## Consequences

- **The renderer standing today is unaffected.** It solves each part into a
  volume, carving every stretch with the pair of faces that close it, and draws
  that volume as one box. This decision says how a renderer that reads the
  panels themselves should take a cut, so that a second attempt at one does not
  have to put the cuts into the shader.
- **A part's boxes overlap where they are padded.** The box a part is marched
  inside reaches a voxel past its volume on every side, so two boxes either side
  of a cut cover the same sliver of the plane between them. Each marches only
  its own stretch and writes the depth of the surface it finds, so what is seen
  there is whichever voxel stands nearer the camera, which is the same answer a
  single volume gives.
- **Panels are area where a volume is volume.** A part fifteen voxels each way
  is three thousand three hundred and seventy five cells solved into a volume,
  and one thousand three hundred and fifty across its six drawings; at thirty
  two voxels each way it is thirty two thousand seven hundred and sixty eight
  against six thousand one hundred and forty four. Whatever holds a model in
  quantity — the world drawing a monster, a figure holding a frame of an
  animation per moment of it — holds less of it this way, and by a wider margin
  the larger the model.
- **A cut per slice is a box per voxel.** The far end of the dial 0002
  describes — an axis cut between every pair of slices, which is any volume at
  all — is one box for every voxel under this reading. Cuts are for the shapes
  six sides cannot hold, and a part that wants a drawing per slice wants a
  volume rather than a grid of boxes.
- **The picker follows the marcher.** Picking a voxel walks the same shape the
  fragment shader draws, so a renderer that reads the panels has a picker that
  reads them too, over the same boxes and with the same stretch offsets.
