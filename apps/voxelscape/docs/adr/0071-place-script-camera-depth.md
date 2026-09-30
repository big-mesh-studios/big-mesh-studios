# A camera shot can narrow its view and shake

A cutscene could move where the camera was and what it looked at, and nothing
about how it looked: a zoom, a punch-in, or the shake of an explosion were
beyond a script. This decision lets a `camera` effect and each shot of a
`cutscene` name a field of view and a shake, sampled by the world's camera
director alongside the move it already plays.

```ts
// cutscene.ts's CameraShot gains
fov?: number;
shake?: number;
```

## The field of view is a fourth value the sequence interpolates

`cutscenePoseAt` already runs the eye, the look, and the move over the shared
clock; the field of view moves the same way. A shot with no `fov` keeps the one
before it, so only the shots that change it say so, and the starting view is
the camera's current one, captured when the sequence begins. When the sequence
ends the director restores that starting view, so a cutscene cannot leave the
player zoomed.

## Shake is a voice-tier wobble read off the shared clock

The amplitude a shot names is carried on its pose, and `create-voxelscape`
offsets the eye by a sine of the shared clock scaled by it before looking at
the target. Using the shared clock rather than `Math.random` keeps the wobble
identical for everyone watching the same shot, and the camera is per-player, so
no wobble is ever replicated. It is added after the pose is sampled, so the
pure sequence stays pure and testable without a camera.

## Considered options

- **A separate `camera-shake` effect.** Rejected: a shake belongs to the shot
  that wants it, and a separate effect would need its own end condition and its
  own way to compose with a running shot.
- **Bake shake into the pose as an offset.** Rejected: it would make
  `cutscenePoseAt` depend on a clock and a random source, and the sequence is
  the one part of the camera that is easy to test because it is a pure function.
- **Drive the field of view from the HUD or a player setting.** Rejected: the
  zoom is part of what a script is showing, like the move and the look.

## Consequences

- `CameraShot` and the `camera` payload gain `fov`/`shake`, bounded and
  validated like every other effect field.
- The camera director sets `camera.fov` from the pose and restores the starting
  view when the sequence ends.
- A script can now build zooms, impact shake, and tight shots out of the camera
  vocabulary it already had.
