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

## The coordinates are the file's own

A `.cvox` file stores `.vox` coordinates unchanged, so it inherits that format's
convention: x to the right, y up, z toward the viewer. That is already the
convention the ray marcher in this repository uses, so a model is written and
read back with no conversion at all. This was checked rather than assumed: the
format's own `3x3x3` and `chr_knight` examples were read and compared against the
matching `.vox` files, and all three hundred and ninety-eight of the knight's
coordinates agree with no axis flipped, where a z-flip would have agreed with
about half.

Note that the format's own specification annotates the size of z as "gravity
direction", which would imply z counts down rather than toward the viewer. The
files its author wrote disagree with that, and the files are followed.

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
