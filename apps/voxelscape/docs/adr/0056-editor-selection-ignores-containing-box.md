# The level editor does not select a box the camera is inside

A creator carves a workspace by stamping an air-filled box over the ground, then
builds structures inside the space it clears. Selecting one of those structures
with the camera still within the carved box was impossible: selection takes the
nearest shape whose expanded bounds the ray crosses, and a ray that starts
inside a box enters it at distance zero, so the surrounding box always won.

## A box containing the ray's origin is skipped

`pickShape` tests each shape's expanded bounds against the camera ray. When the
shape is a `box` and its world-space bounds contain the ray's origin — the
editor camera's position — the shape is left out of the running, so the ray
reaches the structures built inside it. The creator selects the enclosing box
again by moving the camera outside it, where its near face is the first thing
the ray meets as before.

Only boxes are skipped. A house, staircase, or ramp is a union of boxes whose
combined bounds include the empty space around the geometry, so a camera inside
those bounds is usually not inside the structure; skipping them would make a
shape unselectable from within its own footprint.

## Considered options

- **Skip any shape whose bounds contain the camera.** Rejected: a house's
  bounds are mostly air, so standing in its doorway would hide it from
  selection.
- **Ignore the ray's distance-zero hit rather than testing containment.**
  Rejected: it is the same test expressed less directly, and it would also
  apply to non-box shapes.

## Consequences

- `pickShape` gains a containment test over the same world-space bounds it
  already computes for the slab intersection.
- Selection of nested boxes depends on the camera's position: to select an
  enclosing box, the camera has to leave it.
