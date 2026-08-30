# A model is made of parts, each placed at a root

The editor drew one box. `createStacker` held a single `sides`, `dimensions`
was read off it, and everything else followed: the six panels, the preview's one
mesh, the picker, every command, the file. A drawing that is to be animated
later needs to come apart first — a head that can turn, an arm that can swing —
so a model is now a **figure** of several **parts**, each a box of its own with
a **root** saying where it sits.

`Part` and `Figure` live in `packages/stacker/src/data.ts` beside `Model`, which
still means one box: voxelscape reads models and had no reason to change.

## A tree in the data, a list in the interface

A part names a `parent`. `composeRoot` walks that chain and sums the roots, so a
hand can one day inherit an arm's turn. Nothing in the editor sets a parent:
parts are added at the top level and shown as a flat list.

The parentage is carried now because it is cheap to carry and expensive to
retrofit — the file format, the placement maths and the undo history would all
have to change again to gain it. The interface is flat because nesting is only
worth showing once there is a rotation to inherit, and there is not yet.

`composeRoot` stops where it finds a parent the figure does not hold, or a cycle.
Parentage is not validated anywhere else, so it places every part somewhere
rather than refusing to draw a figure that got into a state nobody can see.

## A root is whole voxels; a pivot need not be

A root is where a part's pivot sits, in whole voxels from its parent's pivot. It
is whole voxels because that is what a voxel editor is for: parts meet flush,
nothing lands on a half cell, and the picker's arithmetic stays integral.

A part's pivot — the point inside its own box that the root places, and that a
turn will one day turn about — is **not** held to whole voxels, because it
defaults to the middle of the box and a box with an odd extent has its middle
half a voxel in. That default is what makes a figure of one part come out
centred on the origin exactly where a lone model has always been drawn.

## One voxel size across a figure

This is the part that is not obvious. `Dimensions3D.normalize` scales a box so
its own longest axis is one, and the marcher walks the volume in that space. Per
box, that is what a lone model wants. Across parts it is unusable: an eight-voxel
part and a twenty-voxel part come out the same size on screen, and a voxel means
a different distance in each, so the parts cannot be placed against each other at
all.

`figurePlacement` gives a figure one voxel size, worked out from the box every
part together fills, and scales each part's box back up by its own longest axis
to undo the per-box normalize. A voxel is then a voxel wherever it is drawn, and
a figure fills about as much of the view as a single model does — so the camera
distance, `boxSize`, and the thumbnail's framing all keep working unchanged.

Parts are placed from the figure's **origin**, not from the middle of the box
they fill. Centring on that box would mean that dragging one part slid every
other part sideways under the pointer to keep the figure centred.

## Drawing a figure belongs to the package, not to either application

`FigureMeshes` — the group of boxes a figure is drawn as, placed by
`figurePlacement` — sits in `packages/stacker` beside `solveVoxels` and
`VoxelModelMaterial`, not in the editor that first needed it. Drawing a model is
what that package is for, and the world will draw figures too.

Putting it in the editor had already produced a third copy of the same handful
of lines: `remote-monsters` and `held-item` each hand-rolled the upload of a
volume, a palette and the two extent uniforms that go with them. That is now
`bakeVolume`, and all three call it.

Nothing in the package decides how a figure _looks_. The editor lights it under
fixed studio light so a listing's picture matches the canvas; the world lights
the same figure by a moving sun, tints it under weather, and flashes a monster
red when it is hit. `FigureMeshes` therefore carries only what the model
determines — geometry, placement, volume, palette — and exposes `materials` for
a caller to say the rest. The editor says it in `lightFigure`, next to the light
constants it uses.

## A folder per part in the file

`saveFigure` writes each part's six pngs to a folder named after it, plus a
`parts.json` holding the roots, pivots and parentage, plus the one `palette.png`
they all address. `loadFigure` reads a file without a `parts.json` as a single
part called `body` pivoting on its own middle, so every model saved before this
opens unchanged, colour-format migration and all.

A part's name is its folder name, so `saveFigure` refuses a name holding a slash
and refuses two parts sharing a name — either would write one part's drawings
over another's.

## Consequences

- **`load` hands back only a figure's first part.** It keeps its signature and
  its meaning of one box, which is what voxelscape's `remote-monsters` and
  `held-item` read. A multi-part model published today therefore appears in the
  world as its first part alone. What is left to change is those two call sites:
  reading with `loadFigure` and drawing with `FigureMeshes` rather than a mesh
  apiece. Until then, publishing a figure and expecting a monster to wear all of
  it will disappoint.
- **Every drawing command names its part.** An undo can be taken long after the
  selection has moved on, and the name is what lands it on the drawing it was
  made against. A command read back from a history written before this carries no
  part and is dropped, as `Command.fromJSON` already drops any shape it does not
  recognise.
- **Only the selected part is picked in the preview.** The picker returns which
  voxel a ray met and not how far along it, so with several parts in the way
  there is nothing to say which answer is nearest. Choosing a part is the part
  list's job. Giving the marcher a distance to return would let a click choose a
  part, and is what that would take.
- **The arrows appear only once a figure has a second part.** A lone part's root
  has nothing to be measured against, and dragging it would only slide the whole
  drawing and rescale the view.
- **The voxel size is derived from the figure's extent, so growing a figure
  rescales the view slightly.** It is what keeps a figure framed like a lone
  model. If it proves distracting, the alternative is a fixed voxel size with the
  existing wheel zoom doing the framing.
