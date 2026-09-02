# A part is posed: turned about its pivot, drawn at a size of its own

A figure came apart into parts so that it could be animated later — a head that
can turn, an arm that can swing. What each part carried towards that was a
`pivot`, the point a turn would one day turn about, and a `parent`, so that a
hand could one day inherit an arm's turn. Neither did anything.

A part now carries a **turn**, three angles about its own axes, and a **scale**,
one number saying how large it is drawn. How a part stands in its figure is one
thing — a **pose**: where its pivot sits, how it is turned there, and how large
it is drawn, each of them carried by everything the part hangs off. A root says
where a pivot sits measured from its parent's pivot, in the voxels that parent
is drawn in and along the axes that parent is turned to, so an arm turning takes
the hand on the end of it round with it. Summing the roots, which is what
placing a part used to be, is what a pose comes to when nothing is turned or
scaled, which is every figure written before this.

## Free angles rather than quarter turns

A part could have been held to the twenty-four ways a box can sit on the grid.
That would have kept everything as it was — voxels on the grid, parts flush,
the figure's box an exact extent, the picker's arithmetic integral — and it
would have been enough to reuse a part in another orientation, a left arm made
from the right one.

It would not pose anything. An arm bent, a head tilted, a brow lowered: none of
them is a quarter turn, and posing is what the turn is for. So a turn is any
angle, and what that costs is written under Consequences.

## Three angles, and the order they are put together in

A turn is kept as three angles rather than a quaternion because three numbers
can be typed into a panel and read back out of it, and a quaternion cannot. They
are put together in a fixed order — about the part's own x, then the y that turn
leaves it with, then the z — and read back off a turn in that same order, so
that a turn made from a matrix comes back as three angles that make it again.

The order matters more than it looks. Only the first of the three angles is a
turn about the axis it is named for; the second and the third are turns about
axes the ones before them have already moved. So a ring dragged in the preview
does not add to the angle sharing its name: it makes a turn about the axis it
lies along and puts that together with the turn the part already has — after it
for a ring lying along the part's own axes, before it for one lying along the
figure's — and the three angles are read back off the result.

## One scale, not one per axis

A part is drawn at one size in every direction. Per-axis scale would let one
drawing be used long and thin in one place and short and fat in another, which
is worth something; what it costs is that a part turned and then stretched along
one axis is drawn in a way that is hard to picture and harder to undo. A single
number is what a limb wants — a hand at half the size of the arm it hangs off.

## A root falls where it likes

[ADR 0001](./0001-parts-and-roots.md) held a root to whole voxels, because
parts met flush, nothing landed on a half cell, and the picker's arithmetic
stayed integral. That was true of a figure of boxes standing square.

It is not true of one whose parts are turned. A part turned thirty degrees has
no voxel lying on the figure's grid at all, whatever its root is, so holding the
root to whole voxels no longer keeps anything flush — it only stops a part from
meeting a turned one where it touches it. The root falls where it likes, and a
drag along an arm carries the part as far as the pointer took it.

## Consequences

- **The box a figure fills is measured across the corners its parts reach**,
  rather than along their edges: a turned box no longer has its own low corner
  lowest. A figure that has been turned about therefore measures larger than the
  parts inside it, which is what the world scales a monster by and what frames
  the preview.
- **A ray follows the turn.** Picking a voxel walks each part's volume by
  turning the ray down out of the world and on through the part's own turn; the
  voxel it meets comes back out the same way. How far a figure's voxels reach,
  which frames the preview and stands the camera back for the published
  picture, takes each voxel where its part's turn and size have carried it.
- **A published model read by a deployment that predates this stands square.**
  The record carries the file byte for byte, and a reader that knows nothing of
  a turn ignores what says it. What it draws is the figure with every part
  standing where its root puts it, unturned and at its own size.
- **`parts.json` is version three.** A file that says neither a turn nor a size
  reads as parts standing square at the size they were drawn.
- **The handles come in three sets and lie along one of two sets of axes.**
  Arrows to move, rings to turn, arms to size; along the part's own axes or
  along the figure's. Only one set stands at a time, the preview being small.
- **Nothing hangs off anything yet.** The pose is composed down a chain of
  parents, and the parts list is flat with nothing to set a parent with. What
  that would take is a list that shows the nesting, and arrows that move a
  child's root along the axes its parent is turned to.
