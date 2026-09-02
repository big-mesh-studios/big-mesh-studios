# A part is cut by sections, each revealing two faces

A part is drawn on six sides, and each of them carves the whole run of voxels
it looks down. What that describes is one shape, the same the whole way along
every axis — the intersection of three flat drawings — and there are shapes it
cannot hold at all.

The clearest is two bumps standing on opposite corners of a slab. The sides
that bound them can say the front slice is solid at the first and last column,
and at the first and last row, but they meet at four corners rather than two:
six sides always put up two bumps nobody drew. A hollow shell fails the same
way, its drawings being solid rectangles from every direction.

A **section** is a cut across one of a part's axes, at a position in voxels,
carrying the two faces the cut reveals. The solver divides each axis into the
stretches its sections leave and carves each stretch with the pair of faces
that close it — the sides at the ends of the axis where no cut stands between,
and a cut's faces where one does. A voxel takes the colour of its two faces
along an axis from that same pair.

So a part is one shape before a cut and another after it. That is what an
undercut is: a brow standing out over what is set back beneath it, a lip under
a chin, the two bumps without their ghosts. Cutting an axis between every pair
of slices would give a drawing per slice, which is any volume at all; the six
sides are the far end of the same dial, where each axis is one stretch.

## The outer shape stays the six sides; a cut adds two faces

The same voxels can be had by breaking the part in two at the plane and letting
each half keep six sides of its own. It is the same geometry — a part with one
cut and two parts sharing a plane solve to the same volume — and it is not the
same thing to have in front of you.

Breaking apart takes half of every drawing away to another part: the front you
were painting a moment ago is now two fronts on two parts, and the part you are
drawing on holds half of what it held. A section takes nothing away. The six
sides go on describing the outer shape, uncropped, exactly as they were drawn,
and the part gains two more drawings — the inner shape, at the plane, facing
outwards from either side of it.

Both are wanted. Breaking a part apart is how a figure's legs become their own
parts, to be moved and one day turned; it is a separate operation, still to be
built, and it is called **splitting** so that "section" never means a portion.

## A face is drawn the way the side it parallels is drawn

A section across the width has a face looking the way the right looks and one
looking the way the left looks; across the height, the top and the bottom;
across the depth, the front and the back. A face is drawn across the same two
axes as that side, turned the same way about, and measures the same.

That is what keeps one vocabulary rather than two. Everything that lays out,
mirrors, fills, resizes or measures a side does it for a face by asking which
side the face is drawn the way of. A face's opposite, which a mirrored stroke
is carried onto, is the other face of the same cut — the other side of the same
plane.

A face is named for the cut it belongs to and which of the two it is:
`section-0-before` closes the run before the cut, `section-0-after` opens the
run after it. That name is what the file writes it under and what a drawing
command names, so the panel and the png are one thing.

## Both faces of a new cut are copies

A face cannot start blank: an empty cell carves its whole run, so two blank
faces would carve the part away either side of the plane. It cannot start as
the cross-section either — the drawing of what is solid exactly at the plane —
because that carves away voxels the other sides were holding further along the
run.

What is safe is a copy of the face already closing that stretch of the axis: the
side at its end, or the face of the cut next to it. Two copies leave the mask
each stretch carves by exactly what it was, so a part comes out of a cut the
shape it went in. The cut is not a change to the drawing; it is room to make
one.

## Consequences

- **A model with sections read by a deployment that predates them comes out
  uncut.** The record carries the zip byte for byte, and a reader that knows
  nothing of sections ignores the extra pngs and the list that places them. What
  it draws is the shape the six sides describe, which is the shape the drawing
  started from. The same happens inside this editor for a file whose faces have
  gone missing: the cut is left out rather than read as two blank faces.
- **`parts.json` is version two.** A file written before sections lists none,
  which is every file saved until now, and reads as parts drawn on their six
  sides alone.
- **A drawing command names a panel rather than a side.** A command in a history
  written before this names a `side`, which is read as the panel of that name —
  the same drawing.
- **The panel net grows downwards.** The six sides are a box unfolded and a cut
  is not one of its faces, so the faces stand on a row of their own under the
  net rather than in it. A part with several cuts is a taller canvas.
- **The guides do not cover a face yet.** The dotted bounds showing where the
  perpendicular drawings hold a side in are worked out for the six sides only. A
  face's bounds would have to be cropped to the stretch it closes.
- **A cut the box has shrunk past is dropped.** Resizing a part re-frames its
  faces the way it re-frames the sides they parallel, and moves the cuts with
  the end the box grew at; a cut left outside the box has nowhere to stand.
