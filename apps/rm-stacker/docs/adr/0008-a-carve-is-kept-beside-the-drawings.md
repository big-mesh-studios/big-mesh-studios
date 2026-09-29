# A carve made from inside the view is kept beside the six drawings, not on them

A part is six drawings, and the six drawings are the whole of what the panels
edit. They are also a constrained way of holding a shape: each side's silhouette
carves away the run of voxels along the axis it looks down, so what six
silhouettes can express is one shape per axis, and anything varying along one
needs a cut across it ([ADR 0002](./0002-sections.md),
[ADR 0004](./0004-a-cut-drawn-as-boxes.md)).

The flight view asks a question the panels cannot. It puts a camera inside the
model and asks what is behind that face, and a press answers by putting a voxel
in one cell or taking one out. Where that voxel is kept is what this settles.

It is kept in a second thing. A part grows an edit volume, sitting beside its six
drawings, applied over the volume those six solve to. The drawings go on saying
what they said.

## Why not back onto the drawings

A silhouette is a whole side, not a cell, so a carve written onto one is not a
change to a face — it is a change to every drawing whose silhouette the carve
alters, made to agree on the rule that a stroke on one face has to be answered on
the other. The person made one edit inside a model and every panel they have open
moves underneath them.

Worse, it cannot be done at all in the case the flight view exists for. A carve
into the inside of a hollow changes no silhouette, because no silhouette
describes the inside. The one edit this view makes most natural — opening a
window in a wall by cutting a hole through it — is the one the drawings have
nowhere to record.

## Considered options

- **Back onto the six drawings.** Rejected above: it rewrites a description
  rather than adding to it, and it cannot hold a carve inside a hollow at all.
- **The whole figure becomes a volume, as the other editor has it.** Rejected: that
  is voxel-beetle's decision, recorded in voxel-beetle/docs/adr/0001-a-volume-not-six-drawings.md,
  and it turned down keeping a volume beside the sides precisely because the
  sides would be a second description that could disagree. This is not a claim
  that six drawings are a good way to hold a model — that file says the opposite
  for itself, and holds it well. The panels are the drawing surface this editor
  is built around, and a flight camera is not a reason to replace them.
- **Each carve as a part of its own.** Rejected: a part carries a box, a root and
  a pose, so one voxel added from inside would become a transform somebody has to
  keep still, and a hollow would be a part with a hole in the middle of its own
  box.
- **Resolve the edits into the six drawings on save.** Rejected: the file would
  then mean something different from what the editor holds, and the two would
  drift the first time a part was saved and loaded.

## Consequences

- **The panels do not show a hand edit.** The six drawings are what the panels
  show, and a carve is in neither of them. A part holding one is marked
  hand-edited, in the parts panel and in the flight HUD, and that mark is the
  only place the fact is visible. Somebody editing six faces should not have
  those faces change because a carve was made elsewhere.
- **A carve stays inside the part's own box.** The box is all the room a part
  has, and a cell outside it is nowhere to put a voxel. So the crosshair offers
  no placement there and says so by drawing itself blocked, rather than taking a
  press and doing nothing. A part that fills its own box cannot be built on at
  all, which is a real limit and the price of a part being a box.
- **Everything that reads a model reads the carve too.** The preview, the
  crosshair, the 3MF export and the sprite stack all read the solved volume,
  which is the six drawings with the edit volume applied over them —
  `applyEdits` runs after the sides are solved, so there is one volume and not
  two answers to the same question. A reader that wants the drawn shape and not
  the built-on shape can read the sides and stop.
- **The file carries them beside the drawings.** A `.cvox` holds six drawings and
  an edit volume per part, and a reader that ignores the edit volume reads the
  part as it was drawn on the panels.
- **Taking a carve back is a command over the edit, not over ink.** A command
  names the part, the cell of that part's own box, and the palette index it went
  to — a voxel by its own coordinates rather than by a panel and a cell of that
  panel, because a voxel is a cell of the box and the six drawings and the edit
  disagree about it at once. So one history takes a carve back whether it was
  made by a press, by the keyboard or by a thumb button.
