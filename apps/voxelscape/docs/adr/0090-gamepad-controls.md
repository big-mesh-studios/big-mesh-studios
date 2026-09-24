# Gamepad controls are polled once a frame

A Backbone One, or any controller reporting the standard mapping, is an
additional way to play: the movement, look, dig, place, jump, and use actions
the mouse, keyboard, and touch buttons already reach.

## Read beside consume, not listened for

The Gamepad API has no button events — a controller's state is whatever
`navigator.getGamepads()` returns on the frame it is read. `InputController`
therefore gains `poll(dt)`, called beside each `consume()` rather than from
it: a frame that drains no snapshot (a dead player, the level editor's orbit
camera) leaves no stick movement to apply late. A look turn is the right
stick's deflection scaled by the frame's elapsed time, so it arrives in the
same pointer-pixel units and passes through the same look sensitivity a drag
does.

A pad that reports anything but the standard mapping is ignored rather than
guessed at by button index, so a controller with a different layout cannot
strike with the wrong button. A pad that arrives or leaves is reported both by
polling and by the `gamepadconnected`/`gamepaddisconnected` events, so the HUD
can say so even while no frame is reading input.

## Considered options

- **A listener beside the key listeners.** Rejected: the Gamepad API carries
  no button state on any event; only `gamepadconnected`/`gamepaddisconnected`
  fire, and the buttons are read by polling.
- **Merge every connected pad's input.** Rejected: a player holds one pad, so
  the first standard-mapped one is read and the rest ignored.
- **Read the pad as a keyboard.** Rejected: a stick is a position, not a
  press; quantising it to key edges would lose the analogue turn and the
  hold-to-dig cadence.

## Consequences

- `src/player/gamepad.ts` reads the standard mapping and tracks the
  connection; `create-input.ts` folds its frame into the snapshot the touch
  buttons already fill. Each button's held state is tracked per source, so
  releasing the controller never clears a hold the touch button still has.
- The mapping follows the standard layout: left stick moves, right stick
  looks, A jumps, X or the right trigger digs, B uses, the left trigger places
  or guards, and the horizontal d-pad steps the hotbar.
- `EditHud` reports a connected controller, so a player knows it is live.
