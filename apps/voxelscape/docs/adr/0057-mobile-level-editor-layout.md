# The level editor lays its panels in a sheet on a narrow screen

The editor's overlay put a fixed 340px panel of controls beside the canvas
through `Split`. On a phone that panel took the whole width and left a sliver
of world to draw on, the 8px divider was too small to grab with a thumb, and
every tab, field and stepper was sized for a mouse.

## The panels become a sheet below the canvas

A screen the panel cannot stand beside — narrower than 720px, or touched with
a coarse pointer — stacks the editor instead: the canvas pane fills the space
above, and the same four panels sit in a sheet below it. One tab picks the
panel (Tools, Shapes, Properties, Plan), and a chevron folds the sheet down to
its tab row so the canvas can take the whole screen. The canvas is the shared
world canvas pinned to whichever pane is showing, so the pin is re-measured
when the arrangement changes rather than only on first mount.

The trigger is the width **or** the pointer, not the width alone: a phone held
sideways is wider than the threshold but still has no mouse. The layout is
also deliberately orientation-independent. Import and Export open the native
file browser, which leaves fullscreen and can hand the device back in portrait,
so the sheet does not assume the landscape lock ADR 0055 sets on fullscreen.

Every control grows to a 44px minimum target under a coarse pointer, and the
sheet, the touch cluster and the hint each keep clear of the display's safe
area.

## Considered options

- **Keep the split and let the side panel collapse.** Rejected: it still
  spends width on a toggle rather than the canvas, and the divider stays a
  poor touch target.
- **A full-screen panel reached by a button.** Rejected: it gives up seeing
  the canvas and the controls at once, which placing a shape needs.
- **Resize the sheet by dragging.** Rejected in favor of the chevron: a drag
  is interrupted by the file browser and by an orientation change, and a
  toggle survives both.
- **Trigger the sheet on width alone.** Rejected: a landscape phone is wide
  but still all thumbs, and would keep the mouse-sized layout.

## Consequences

- `LevelEditorOverlay` branches on the editor's `mobile` signal between the
  split and the stacked layout; `LevelEditorSheet` holds the tabbed panels.
- `createLevelEditor` exposes `coarsePointer` and `mobile` beside `narrow`.
- The panels stay mounted while their tab is hidden, so switching tabs keeps
  the plan text and the shape list's scroll.
- The overlay also publishes `--level-editor-panel-height`, so the console's
  anchored panel can be moved for a sheet rather than a side panel. That move
  is left as a follow-up: the console's own full-screen breakpoint already
  covers the narrow case.
