# A model is written as cubes, and the cubes are grouped by colour

`.cvox` stores cubes of one colour alongside single voxels, and a colour map says
how many of the entries that follow it take each colour in turn. The whole reason
the format exists is that a model drawn as a solid block of few colours is a few
cubes rather than a few thousand coordinates: the format's author reports a set
of MagicaVoxel examples going from two and a half million bytes to three hundred
thousand.

So the writer here packs greedily, growing a cube from a seed outwards as wide as
its row allows, then as deep as every one of those rows allows, then as far
through the box as that whole face allows, and writes what a single voxel is left
holding separately. A model that packs as loose voxels would be larger than the
zip of indexed images it replaces, which is the opposite of the point.

**The entries are grouped by colour before they are written, in the order the
colour map names its colours.** A colour map is a run-length encoding: "the first
so many are this colour, the next so many are that one". The order the packing
found the cubes in is not that order, and a file written in it gives every cube
after the first run of one colour the wrong colour. A model in a single colour
round-trips either way, so this is only ever caught by a model drawn in more than
one.

## Considered options

- **Write every voxel as a single voxel.** Rejected: a three-byte coordinate for
  a one-voxel cube is a sixth of the space, and the format's whole subject is
  the difference.
- **Greedily pack, but keep the cubes in packing order.** Rejected: this is the
  bug above.
- **Run-length encode by colour within each cube's own row.** Rejected: a cube
  has one colour by definition.

## Consequences

- `packCubes` returns entries carrying a palette index rather than a colour,
  because the packer works on what is in the volume and knows nothing about the
  palette it will be written against.
- The packing is deterministic — a fixed sweep order, no measurement of which
  arrangement would compress better — so saving the same model twice gives the
  same bytes.
