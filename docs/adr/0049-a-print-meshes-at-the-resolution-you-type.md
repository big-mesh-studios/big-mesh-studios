# 0049 — A print meshes at the resolution you type, on a thread of its own

## Context

ADR 0032 sent a model out as a 3MF and fixed `PRINT_VOXEL_SIZE` at `0.125`, on the reasoning
that _"finer than the `0.25` preview default, coarser than the `0.0625` fine end where sampling
stops being what limits the surface and the cost is about seven million samples."_

Two things have turned out to be wrong with that, and both were only visible once somebody
measured.

**`0.125` is coarse, and nobody had looked.** The reasoning was about the _ratio_ between three
numbers rather than about the result. Measured on the application's own default model — a capsule
two and a bit units long — at `PRINT_VOXEL_SIZE` and at the numbers around it:

```text
  voxel   samples   triangles   time      peak RSS
  0.25    26        1,752       0.08 s      93 MB
  0.125   55        9,264       0.16 s     103 MB    what ADR 0032 chose
  0.0625  113       42,112      1.1 s      188 MB    the viewport's finest
  0.03125 228       177,056     7.5 s      439 MB    twice the viewport's finest
  0.02    361       450,308     37.6 s   1,101 MB
  0.015625 462       742,184     60.0 s   2,447 MB
```

Fifty-five samples across a figure is nine thousand triangles. ADR 0032 called that _"a few
thousand triangles, which every slicer handles"_ — which is true of the slicer and says nothing
about the surface, and a curve resolved at fifty-five samples has visible facets on it. The cost
that was supposed to rule out `0.0625` was quoted for a model that _"fills the budget"_, which
this one does not come close to.

**And the number that decides the cost is not the voxel size.** `samplesFor` asks for
`longestAxis / voxelSize` and clamps it at `maxSamplesPerAxis`, which `DEFAULT_BUDGET` sets at 96. So for any model longer than `voxelSize · 96` — at `0.0625`, anything over six units — the
setting is a _request that is silently refused_. A twenty-unit model is meshed at 96 samples at
every setting the viewport offers, including its finest, and the slider looks like it does
nothing. The clamp is right for a rebuild that has to land while a finger is down. It is the
wrong answer for a file somebody is about to send to a printer, and the reason nothing said so
is that it is not an error anywhere.

## Decision

### The default is `0.0625` and the range reaches twice as far

`PRINT_VOXEL_SIZE` is gone and `DEFAULT_PRINT_VOXEL_SIZE` is `0.0625`: the viewport's own
finest. Four and a half times the triangles of `0.125` for a second, and — the reason it is that
particular number rather than something between — **it is the mesh somebody has already looked
at** by dragging the resolution slider to the end. The finest preview and the default print are
the same mesh, which is the property ADR 0030's default mesher was chosen for.

The fine end is `0.03125`, twice the viewport's finest, at seven and a half seconds and four
hundred megabytes. Somebody who is about to print rather than about to look will wait for that.

### The control is a number, and it says what it will cost

`PRINT_RESOLUTIONS` is offered as a **number field**, not a slider, and the reason is the table
above: **the model's own size is half of what a resolution costs.** The same typed number is a
one-second print of a two-unit model and an eleven-second print of a twenty-unit one, so a
control showing only the number cannot tell somebody what they have chosen. `printEstimate` works
out the sample count, the triangle count and the duration from `meshRegion` — the same call the
export itself makes, so the number is the number rather than an approximation of it — and the
field says them underneath itself.

That is also what makes a free-form number safe, because of the next point.

### The ceiling is 256 samples a side, and it is what the control is bounded by

`PRINT_MAX_SAMPLES_PER_AXIS` is 256 rather than the viewport's 96. **It is the number that
bounds an export's memory and time**, and it is what turns "how fine can you make this" from a
question with a crash at the end of it into one with a fixed worst case: at 256 a side the mesh
is about seventeen million samples, eleven seconds and five hundred megabytes, for any model at
any setting. At 512 it is a hundred and thirty million and two and a half gigabytes — a tab a
phone kills outright, with the model still unsaved in it.

So the field's floor is `0.015625`, which on any model over two units long produces exactly the
same file as anything coarser because the ceiling has already answered. **It is offered anyway**,
because a control that silently ignores what somebody typed into it is worse than one that says
what it did — and `printEstimate` says it, in the words _"capped at 256"_, which is the only
place in the whole stack where that clamp is ever visible.

### The meshing is in a worker, and the interface draws a bar

At the fine end the export is seven and a half seconds of arithmetic, and the main thread is the
only thread this application has. A page that stops painting for seven and a half seconds reads
as a crash rather than as work.

**Only the meshing crosses, not the writer.** Measured on the same model at `0.03125`: 7,520 ms
to mesh, 41 ms to reduce the colours and stand the model on the bed, 392 ms to write and zip the
3MF. Moving `jszip` into the worker would cost four percent of the wait and would make the worker
import the module whose whole reason for existing is to keep that library off the first frame.
So the worker takes a model and a resolution and gives back a mesh; the main thread does
everything else to it exactly as before.

**Progress is a count of work units, not a stage name**, because the stage that takes the time is
one long loop. `MeshProgress` is an optional argument on both meshers' parameters and on
`meshModel`; each reports once per slice of its outer `z` loop across each of its passes, and
`done` reaches `total` exactly once so the bar can finish rather than stall at 99%. `surfaceNets`
has **three** passes rather than two — it walks the owned edges after the cells, `owned³`
iterations testing four samples each, which is the same order as either of the others and is not
a tail to leave out of the arithmetic.

### The export is two clicks, because a file dialog needs a gesture and meshing spends it

**`showSaveFilePicker` refuses to open without recent user activation**, and Chrome's throws
_`Must be handling a user gesture to show a file picker`_. Activation lasts five seconds. This
was not a hypothetical: making the export long enough to run in a worker turned it into an
immediate, reproducible failure, because the dialog was being asked for after the meshing rather
than before it. The other three pickers in this application are unaffected — Open, Save and Save
as all reach `showOpenFilePicker` synchronously inside their click handler.

So the export is **two steps**: the first press meshes and encodes, which needs no gesture and
may take as long as it takes, and the second press writes, which is a fresh gesture from a button
that has become **"Save `duck.3mf` · 24 MB"**. The bytes are held between them rather than
re-encoded, so the wait is not paid twice.

**One button that changes rather than two buttons**, because two invite pressing the wrong one
and the state that says which is right is exactly what the label carries — and the label is the
last thing read before a native dialog covers the screen, which is why the size is on it. A
`.3mf` of a finely-meshed model is tens of megabytes and somebody about to write one to a phone's
storage would rather know first.

**Changing any of the three numbers throws the file away**, because all three go into the bytes:
a file meshed at 100 mm offered after the field says 150 is the wrong file and its name does not
say so. The file also goes when the dialogue closes, since it is a `Blob` of megabytes that
nothing else refers to.

## Consequences

**A print is four and a half times heavier by default**, which is felt in the test suite: the
export tests went from about twenty seconds to about thirty, because every one of them meshes a
model. One test in `print-mesh.test.ts` meshes at the fine end and takes the suite's only
sixty-second timeout.

**The cost readout is a property of the device, not of this code.** `SECONDS_PER_SAMPLE` is six
hundred and fifty nanoseconds, measured on a phone-class ARM machine; a desktop is several times
quicker. The sentence says _"about"_ and puts the seconds last, because they are for telling a
one-second print from a ten-second one rather than for planning a print run. The triangle figure
is better founded — it fits `3.4 · samples²` to within about a tenth over a forty-fold range,
because a mesh's triangle count goes with its surface area rather than its volume — but it is
still an estimate and is labelled as one.

**`apps/spacescape` gets the progress hook and does not use it.** It is optional on both meshers
and the landscape has no need for it, which is what "optional" is for. The hook costs one
comparison per slice of the outer loop and a test in `model-mesh.test.ts` pins that the mesh is
byte-identical with and without it.

**The worker has no request id and no cancellation**, because an export is one at a time: the
button is disabled on `busy` and `attempt` serialises the file operations. A protocol that can
interleave two requests is a protocol with ids in it; this one cannot, and that is the reason
rather than an omission.

**Where `Worker` is missing the meshing runs on the main thread**, silently, and the caller
cannot tell. That is the normal path in a test and the degraded one in an old browser, and a
function that warned would be a function everybody learned to ignore. What is lost is a
progress bar that had nowhere to draw.

**The built file is megabytes of `Blob` sitting in a signal**, which is a thing the interface has
to remember to discard. It is discarded on a successful save, when any of the three export
numbers change, and when the dialogue closes — three places rather than one `onCleanup`, because
none of them is the other's event and a file that outlives its settings is a wrong file.

## Alternatives

**A slider over the interval between the ends.** Rejected for ADR 0030's reason, which still
holds: the cost is cubic in the reciprocal, so the middle of a slider's travel is a ratio nobody
can predict. The number field keeps the three measured settings one tap away through `step`, so
nothing is lost by not offering the interval as a gesture.

**A field measured in millimetres rather than world units.** Rejected because the millimetre
scale is not known until the height is applied — `standOnBed` measures the mesh and scales it —
so the field would have to change meaning as the height field changed, and the two would be
coupled by a conversion the person cannot see. World units are the unit the viewport's own
resolution control already uses and labels itself with.

**As fine as asked, with no ceiling.** Rejected on the numbers above. It is the difference
between a control with a worst case and one with a tab that dies and takes an unsaved model with
it.

**A worker per application rather than per export.** Rejected because an export happens once in
a while and its mesh is written out and thrown away; the mesher's held scratch is the only thing
worth keeping warm, and that state dies with the worker. A hundred milliseconds of module load
against seven seconds of a live page is not a trade.

**The whole export in the worker, writer included.** Rejected on the 392 ms against 7,520 ms
measurement above, and because it would put `jszip` in a second chunk for four percent of a wait.

**Keeping one click and asking for the dialog first, before meshing.** Rejected because it asks
the question in the wrong order: a person who dismisses the dialog after choosing a fine
resolution has waited nothing and gained nothing, and one who picks a destination then changes
their mind has a dialog to reopen. Which is also the shape that produces the gesture error when
the wait is long enough — the dialog must come last, and something has to follow the wait.
