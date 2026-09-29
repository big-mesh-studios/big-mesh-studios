# The file is a plain `.cvox`, with nothing of this editor's in it

A model is written as [`.cvox`](https://github.com/JelleBouma/cvox): a version
chunk, then a size chunk, then the colour maps and the cubes and single voxels
that fill it. Nothing else. No palette held separately, no poses, no motions, no
name.

Each of those was something this editor could have needed to carry and, at the
size a model is, none of them is: one box of voxels with one colour a voxel is
fully described by the size chunk and the two colour maps, so a chunk of this
editor's own would hold nothing that the format does not already hold.

The format does allow application-specific chunks, and readers are told to step
over the ones they do not know, so an extension would be safe. It would also be
the only part of the file another tool could not read.

## The coordinates are the file's own, and the file is z-up

A `.cvox` file stores `.vox` coordinates unchanged. What that inherits is not what
the specification says: the format annotates the size of z as its "gravity
direction", and its author's own files are the other way round. A model in a
`.cvox` file stands on its z, with its foot at z = 0.

This was checked by reading the three published files and projecting each one
through its own three axes rather than by comparing one file with another. The
chess knight is eighteen voxels from nose to tail along x, fifteen on its z and
only eight across on its y, and along z it opens with three slices of three voxels
each — a foot and a stem — and tapers to a point of one voxel at the far end. The
castle is symmetrical about x and about y and is not symmetrical about z, and the
axis a model is not symmetrical about is the one it stands on. Those facts are
pinned in the tests that read the fixtures.

An earlier version of this file claimed the opposite, on the strength of
comparing the knight against a matching `.vox` file and finding that all three
hundred and ninety-eight coordinates agreed with no axis flipped. The files
disagree with that, and the comparison is not what settled it: the tests beside
the reader assert the orientation directly, from the shape of the model, and would
have caught the claim being wrong.

So the reader and the writer are left alone and the file's coordinates are the
file's own. What a model does with them is a separate question, answered in
[0007](./0007-a-file-is-stood-on-y.md).

## Consequences

- A model carries no name. The name lives with the file handle the browser
  remembers, which is where `rm-stacker` keeps the name of a drawing it has not
  published too.
- The whole palette is written into the cube colour map with a count of none for
  any colour no cube uses, which is how a swatch survives a trip through a file
  and is still on the palette when it opens again.
- A file using more than thirty-two colours opens with the busiest thirty-two
  kept and each of the rest standing in for the nearest kept colour, and says
  which it dropped. Thirty-two is what a packed voxel has five bits a face for,
  and what the ray marcher's palette texture is one row of.
- Three of the format's own example files are kept in
  `packages/stacker/fixtures` and are read by the tests, so a change to the
  reader is caught against bytes the format's author wrote rather than only
  against bytes this repository wrote.
