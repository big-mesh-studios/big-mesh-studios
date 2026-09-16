# Touch controls put every action on a button

Touch used to mine by holding a finger still on the world canvas, and the
level editor placed a shape on a canvas tap. Both shared a finger with the
gesture that turns the view, so a thumb that paused before dragging broke a
block, and a finger that nudged the camera stamped a shape.

## The look area is camera-only

A touch press on the world canvas now turns the view and does nothing else,
however long it is held. `InputSnapshot.tap` and the hold-to-dig timer are
gone; `setTouchPrimary` is what a held dig button drives, queuing `primary`
and repeating it on a cadence while the button stays down. Every world action
has its own translucent circular button, each with a centred icon: dig/strike,
place/guard, jump, and use. Use is its own button because a touch can no longer
talk to an NPC or use a held item through a canvas tap, which was the only path
it had.

The level editor's canvas is camera-only too: a mouse left-press still places
or selects under the cursor, but a finger only orbits, pans, and zooms. A
floating cluster over the canvas applies the active tool at the crosshair
through the same pick the mouse click uses, and a smaller button trades between
placing and selecting. The cluster shows only on a coarse pointer.

## Considered options

- **Keep hold-to-dig and add buttons alongside it.** Rejected: the two
  gestures share one finger, so the accidental dig stays.
- **Keep the level editor's tap-to-place.** Rejected: a tap and the start of an
  orbit are indistinguishable until the finger moves, so a small drag places a
  shape.
- **One large button whose action a smaller button toggles.** Rejected:
  digging is the common action and should not cost a mode switch first; the
  layout follows the game the two were modelled on, where firing has its own
  button.

## Consequences

- `CoarseControls` places four buttons off the bottom-right corner; the jump
  and dig buttons share the bottom row, with use and place above them.
- `src/ui/icons.tsx` holds the button glyphs, so the level editor's cluster now
  reaches into the `ui` area, which `tools/architecture.ts` permits.
- The hotbar hint tells a coarse pointer about the dig and use buttons instead
  of a hold and a tap.
