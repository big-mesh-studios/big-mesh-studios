# A finger paints and two fingers pan

The rule is short: with a tool in hand, one finger draws; two fingers move the
view, whatever the tool is in hand. With nothing in hand, one finger moves the
view. A mouse draws with a paint tool, and cannot ask for a second pointer, so
there is no second-finger case for it to decide.

It is a function of the tool, how many fingers are down and what the pointer is,
and it lives on its own in `src/touch.ts` with a table of cases beside it.

## Why the second finger always wins

A pinch cannot mean to draw, and there is nothing a second finger can add to a
stroke already running: two of the same finger's cells and one of another's
describe the same line. So the stroke is handed over rather than refused, which
is also what `rm-stacker` had to do by hand — its pan control already re-anchors
whenever the number of fingers on it changes, precisely so that the first frame
of a new pinch measures rather than jumps.

## Considered options

- **The canvas is camera-only on a coarse pointer, and on-screen buttons apply
  the tool**, which is what the world does
  (`apps/voxelscape/docs/adr/0054-touch-controls.md`). Its canvas is a game
  world where a thumb that pauses before dragging breaks a block, so the two
  gestures genuinely compete. A slice editor's canvas has one job and the tool
  is chosen deliberately from a tab, so the competition the world had to solve
  does not arise here, and a button held over a one-pixel cell is worse to aim
  with than the cell itself.
- **A second finger during a stroke is refused**, which is what `rm-stacker`
  does. That means a stroke cannot be interrupted to pan without lifting, and
  lifting is what commits it.
- **Any second finger pans, and the tool is re-read when the first lifts.** Same
  rule, without the handover mid-gesture: the finger that went down second would
  be the one holding the view when the first left.

## Consequences

- The rule is pure and has no browser in it, so it is tested as a table rather
  than by hand. The suite runs in node, and a rule that could only be checked by
  touching a screen would be one nobody would check.
- The slice being drawn is never changed by a single finger dragging across the
  canvas. A press on the strip beside the drawing steps to another slice, and a
  wheel with shift held steps through them, so a thumb that drifts towards the
  strip while painting cannot scroll the model underneath it.
- The compact layout is triggered by `(pointer: coarse), (max-width: 760px)`
  rather than by width alone, because a phone held sideways is wide and is still
  all thumbs (`apps/voxelscape/docs/adr/0057-mobile-level-editor-layout.md`).
