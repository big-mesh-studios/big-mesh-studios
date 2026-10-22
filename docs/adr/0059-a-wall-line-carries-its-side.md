# 0059 — A wall line carries its side

## Context

A walls item is a list of polylines, and each polyline was centred on itself: the drawn line ran
through the middle of the wall. That is the right default when somebody draws a plan from nothing,
but not when they trace a reference image. An image has **lines on it**, and a traced line is an
edge of a wall, not its centre. The person drawing wants the line they can see to stay put and the
wall to grow away from it on the side the building actually occupies.

The animal hospital showed the cost of not having the parameter. Its outer envelope had been
shifted outward by half the wall thickness **in the level data**, with a miter join so the traced
line became the inner face. That worked, but it made the file disagree with the picture it was
traced from: editing a point meant editing an offset point, and the two exterior notches narrower
than the wall thickness had to be chamfered by hand because the data miter folded through itself.
The inner partitions could not use the same trick at all — several are shared by rooms on both
sides, so there is no single outward direction for the data to encode.

The winding of a polyline does not answer the question either. A closed outer loop has an inside,
but two collinear internal walls can have their rooms on opposite sides, so a rule that inferred
"outward" from the point order would be wrong for exactly the lines that need it most.

## Decision

**`LevelWalls` gains `sides?: readonly WallSide[]`, one entry per line, where a side is `centre`
(the default), `left` or `right`.** `left` and `right` are relative to the direction the line's
points run. A side puts the whole wall on that side, so the drawn line becomes the wall's
**opposite face**; `centre` keeps the wall straddling the line as it always did.

- **One side per line, not per segment.** A polyline is one traced run. A person tracing a wall
  face draws along it once, and a side that changed at every vertex would be a second drawing
  task. A line that genuinely changes sides can be split into two lines.
- **Absent means every line is centred.** A file written before this exists reads unchanged,
  `wallsCentre` and `wallParts` default each missing side to `centre`, and the wall editor's side
  controls write the array only when at least one line leaves the centre. There is no format
  version bump: old files are valid, and an old build refuses a new file that uses a field it
  does not know under the existing unknown-key rule.
- **The array is parallel to `lines` when it is present.** `parseLevelPlan` refuses a length
  mismatch and an unknown side rather than letting a side silently attach to the wrong line.
  Deleting a segment keeps the array parallel: a whole line loses its entry, and a line split in
  the middle gives both halves the side the original had.
- **The line is the face, and the box moves by half the thickness.** In `wallParts`, the run's
  right-hand axis is `ez`; `left` offsets the box's middle by `-halfThickness × ez`, and `right`
  by `+halfThickness × ez`. The inner face therefore lands exactly on the stored points.
- **Outside corners are closed by extending the side boxes, not by offsetting the data.** A side
  wall on the outside of a turn would otherwise leave a notch the size of the wall thickness.
  Each segment extends along its own line by `thickness / tan(turn / 2)`, capped at two
  thicknesses so a shallow turn on a hand-drawn curve cannot fire a miter spike across the plan.
  A side wall on the **inside** of a turn needs no extension: its boxes already overlap. A closed
  line treats its first and last segment as adjacent at the closing vertex.
- **The bounds and the pick box are the wall boxes.** `wallsBounds` now takes the eight corners
  of every box, including thickness, side offset and corner extension, so a click hits what was
  drawn rather than the centreline. `wallsCentre` uses the same bounds, which keeps the item's
  stored `at` consistent with its geometry.
- **The picked segment's line can be given a side in the wall editor.** In the segment select
  sub-mode the floating controls show **Centre / Left / Right** for the line the picked segment
  belongs to; choosing one writes the line's entry and rebuilds the wall. The properties panel
  deliberately does **not** grow a side control per line: a traced plan can have dozens of lines,
  and a list of selects is harder to relate to the drawing than the segment under the pointer.
  A first insert's draft has no stored `sides` array yet, so it shows no side buttons; an edit
  offers them while its draft still has the stored item's line count.
- **The animal hospital's outer line returns to its traced points and takes `right`.** The old
  data offset is removed, the two chamfers are restored, and the accepted look is produced by
  the engine instead of by edited coordinates. The cut-outs stay where the shifted wall put them,
  because the inner face has not moved.

## Consequences

**A traced line can now be the face of a wall without editing points.** The level file keeps the
reference geometry, a redraw starts from what the picture shows, and internal walls can choose a
side explicitly instead of relying on a winding rule that shared walls defeat.

**The side is a property of the whole line.** A polyline that is the face on one side and the
centre on another has to become two lines. That is a deliberate limit: the alternative is a side
per segment, which is a much larger format and a much less obvious thing to draw. The selected
segment is only how a line is reached in the editor; it does not give each segment its own side.

**A side wall's outside corners are slightly approximate on shallow turns.** The extension is
capped at two thicknesses. At a right angle it is exact; on a curve it leaves a small outside
notch rather than a spike. The inner face is still exactly the drawn line, which is the surface a
person sees from inside and the one the parameter is for.

**The format is forward-incompatible only for files that use it.** A build before this reads a
file with `sides` as an unknown field and refuses the level whole, which is the rule ADR 0017
sets for every level field. A file without sides is unchanged.

**The stored `at` moves for a side wall.** It is the middle of the solid, not the middle of the
line, so a side offset changes it even though the traced line did not. Nothing builds from `at`;
it is the item's answer to "where are you" for the list, the selection and the highlight.

## Alternatives

- **Keep shifting the points in the level data.** Rejected because it makes the file disagree
  with the reference it was traced from, needs a miter in the data that folds on narrow notches,
  and cannot represent a shared internal wall with rooms on both sides.
- **Infer the outward side from the polyline's winding.** Rejected: it works for a closed outer
  boundary and fails for the internal walls that motivated the parameter. Two collinear walls can
  have their rooms on opposite sides, so no winding rule can choose for both.
- **A side per segment.** Rejected for the first version: a traced run is one line, a side that
  changes at a vertex is a split line in disguise, and the file would need one entry per edge
  rather than one per drawn line. It remains available later if a real plan needs it.
- **Offset the data at read time, with a miter.** This is the current trick moved into the
  loader. It still cannot answer for the internal shared walls, and it hides the choice in a
  derived coordinate rather than recording it.
- **Mitre every corner exactly, with no cap.** Rejected because a hand-drawn curve is a chain of
  shallow turns, and an exact miter at a nearly straight turn is a long spike. The cap keeps the
  wall near the line; the inside face is unaffected.
