# A file is stood on y, and the exchange happens at the seam

A model in this editor stands on its y, and a model in a `.cvox` file stands on
its z ([0002](./0002-the-file-is-a-plain-cvox.md)). Every byte that enters or
leaves the editor is turned from one to the other on its way past, in
`src/cvox-io.ts`, so that nothing inside the editor has to know a file disagrees
with it.

The turn is a quarter turn and not a reflection: x is left where it is, the file's
y becomes the editor's z the other way up, and the file's z becomes the editor's y
as it stands. A model is therefore never turned inside out, which is what would
happen to a knight's head if the third axis were left the right way round rather
than the left way round.

## The editor is y-up already, and so is the world

Only the file disagrees. The preview's material takes its light down the y axis,
the turntable yaws about y, and a model put into the world later is stood on its
`height` there, all of which assume y is up. Standing a file on y as it is read
is what makes a model from one arrive in the same frame as a model drawn in the
editor, and it is the only thing the exchange has to achieve.

## Considered options

- **A permuted layout inside the file format's own reader and writer.** Rejected:
  the permutation is a fact about this editor's file contract, not about the
  format, and putting it in the shared package would have every consumer of the
  format silently inherit this one's convention. The reader and the writer are
  also what the three published files are tested against, and those tests mean
  "the file's own coordinates" only while the reader is a faithful one.
- **A flip in the three.js preview instead.** Rejected: the preview agrees with
  the marcher, with the world and with the world a model is put into later. A flip
  there would have to be undone again on the way out, and the model would be
  standing on z everywhere else in between.
- **Storing models on z throughout, to match the files.** Rejected: the world is
  y-up, so a model would be laid down on its way to the one place it is drawn, and
  the editor's own slice editor would be drawing a plan rather than a front.

## Consequences

- `src/cvox-io.ts` is the only place in this application that reads or writes a
  `.cvox`, and it is a mistake to reach past it. A file read anywhere else is a
  model on its side, and one read in only some of the places it is read is a model
  on its side in some places and not in others.
- The undo history holds whole models as files, so an entry put on the history
  before this exchange existed would be read back the wrong way up. Nothing was
  saved when it was made, so there was nothing to lose.
- The slice editor draws the plane's own down axis as a drawing's rows run, which
  for the `xy` plane puts the top of the model at the top of the screen. That is a
  second thing that was the wrong way round and is now the right way round, and
  the two views of a slice had been disagreeing about which way up a model is.
