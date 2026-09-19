# The level editor's camera has an orbit and a no-clip style

The editor's one camera was the toolbox-style orbit control: a mouse aimed it
by right-dragging and placed shapes under the cursor. That is fine with a
mouse. On a handset it is a poor fit — the orbit point sits somewhere in the
world rather than on the camera, so a thumb that means to move the view swings
the world around instead, and the cursor has no place in a touch gesture.

## Two styles, one camera

The editor now has two controls behind the shared `CameraControl` shape. The
orbit control is unchanged. The no-clip control is the player's own
`/player:no-clip` movement — the same free-fly integrator and first-person
placement — run on a throwaway player state, so the camera that builds the
world flies through it the way a player does. It reads the game's
`InputController`, which the editor enables while the no-clip style is active,
so pointer lock, keyboard flight, touch drag-look and the joystick all arrive
without being reimplemented.

Because a first-person camera has no cursor to place under, the active tool in
no-clip mode applies at the crosshair, the same point the mobile touch cluster
already used. On a fine pointer that means click the canvas to lock the
pointer, then left-click to place at the crosshair; Esc releases the pointer
for the panels.

The style is a signal on the world's `levelEditor` handle, shown as an
Orbit / No-clip pair in the Tools panel and settable with
`/place:level-editor-camera`. A coarse pointer opens the editor in no-clip;
anything else opens in orbit.

## Considered options

- **A separate input stack inside the no-clip control.** Rejected: it would
  duplicate pointer lock, keyboard and touch handling the game already has,
  and the feel of the two cameras would drift apart.
- **Keep cursor placement in no-clip mode.** Rejected: a pointer captured for
  looking cannot also aim a cursor, and leaving it uncaptured makes the style
  the same orbit-with-a-different-pivot it was meant to replace.
- **No desktop no-clip.** Rejected: the two styles are cheap to offer side by
  side, and a trackpad or a small window benefits the same way a handset does.

## Consequences

- `NoClipCameraControl` reaches into the `player` area for `createPlayer`,
  `updatePlayer` and `placeCamera`; `tools/architecture.ts` allows the edge.
- The frame loop advances the active control and follows its `target`, which
  for no-clip is the camera's own position.
- Switching styles re-seats the incoming control from the camera's current
  pose, so the view never jumps back to the player.
- The overlay places at the crosshair when no-clip is active, and draws a
  crosshair for both a mouse and a finger; the touch cluster gains a joystick
  to fly with.
