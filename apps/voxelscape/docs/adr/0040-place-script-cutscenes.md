# Cutscenes are declared camera shots the world samples

A game tells part of its story by taking the camera away from the player: a
pull-back over the school, a beat looking down a stairwell. The effect
vocabulary had only `player-place` and `player-face`, which move the body and
its eye; there was no way to put the view somewhere the player is not. This
decision adds a camera the script can direct.

## The sequence is a list of shots, sampled by the world

`cutscene` carries an ordered list of shots, and `camera` is the same thing
with one shot. A shot names where the camera goes (`at`), what it looks at
(`look`, kept from before when absent), how long the move takes (`durationMs`),
how long it holds (`holdMs`), and whether it eases. The host stores the
sequence with the shared-clock moment it began. The world, which owns the
camera, captures the live camera as the starting pose the first frame it sees
a sequence and samples `cutscenePoseAt` each frame, so the first shot moves out
of whatever the player was already looking at and each later shot moves out of
where the one before it ended. When the shots run out the world clears the
sequence and snaps the camera back to the player.

Like player placement and narration, a cutscene is the voice tier (ADR 0026):
it changes what one player sees and is never replicated.

## A cutscene takes the controls, and `player-control` takes them alone

While a sequence is running the world feeds the physics no input, puts the
wielded tool and the crosshair away, and hides the held model, so the player
watches rather than fights the camera. A game sometimes needs to take the
controls without a camera — a scripted beat the player must not walk out of —
so `player-control { locked }` is a lock of its own, independent of any
sequence.

## Considered options

- **Let the script drive the camera with repeated `camera` calls on timers.**
  Rejected: it is chatty, and a timer that drifts makes the shot's pacing
  depend on the clock rather than the sequence.
- **Give the guest the camera object and let it place it.** Rejected: the
  sandbox has no host objects at all (ADR 0027), and handing it one to mutate
  would put live state on the guest's side of the boundary.
- **Keep a held cinematic camera after the shots end.** Rejected for now: a
  camera detached from a body that can still move is a second mode to reason
  about, and every cutscene the demo needed ends by returning the player's
  view. A held camera can be added when a game asks for one.

## Consequences

- The world gained a camera director: it owns the captured starting pose and
  clears the sequence when it has played out.
- The HUD draws letterbox bars while `cutscene` is true, and the crosshair and
  aim hint are suppressed because control is locked.
- `player-control` is a separate, script-held lock, so a cutscene can end
  without releasing a lock the script set on its own.
