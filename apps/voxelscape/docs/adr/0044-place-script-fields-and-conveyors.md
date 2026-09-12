# Fields push, quicksand slow, and a conveyor carries like a platform

An obby needs air the player cannot simply jump through, sand that grips their
feet, and a floor that moves them sideways without being a platform they ride.
This adds three related bits of movement vocabulary: a `field` effect that
carries a region of space with one of two air behaviours, and a `conveyor`
room that a prop's surface can carry the player across.

## The field effect owns regions, not points

A `field` names a box in feet coordinates (`min` to `max`) and one of two
kinds:

- **push** — an air volume carrying the player toward a target velocity:
  `vx`/`vz` pull them sideways, `vy` pulls them up or down. All three are
  optional so a fan can blow sideways without touching the fall, and an
  updraft can hold without dragging; at least one must be non-zero, because a
  field that pushes nothing does nothing.
- **quicksand** — a volume that slows the player's walking (`speedScale`, down
  to zero) and caps how fast they sink (`sink`). No velocities allowed; it
  changes how the player moves under their own power, not what pushes them.

The trusted side sums every push standing on the player's centre and takes the
worst quicksand, so overlapping fields compose rather than fight: a fan
pointing into quicksand still slows the player, but the fan's horizontal pull
still works.

## The player reads a medium; the world supplies it

Like ground height and air, the player's motion asks its world for the field
"standing at the player's centre" (`mediumAt`) once per frame, so the
horizontal and vertical branches agree on what acts on them. A push is ramped
toward — horizontally against the same target-velocity ramp movement already
uses, vertically with `moveTowards` — so entering a fan accelerates rather
than snaps. A quicksand's sink clamps the fall from below, holding the player
to the sand's rate instead of full gravity.

The player physics knows only velocities; what a field is — a fan, a wind
tunnel, a pool of sand — stays in the script. The world's voxel editor cannot
dig a field up out of a block: they are authored, never carved.

## A conveyor is a platform's floor doing the carrying

A `conveyor` carried on a prop's surface (`{ vx, vz }`) makes the standing
surface move the player sideways with the speed named, the same feet-and-
velocity seam that carries them on a moving platform. It is mutually exclusive
with the prop's own motion: a moving prop has no need of a second floor
velocity, and letting both write the same velocity would pick a winner
silently.

## Considered options

- **Make quicksand a kind of push with a sink clamp.** Rejected: a push
  composes with the player's walk by adding to it, while quicksand _scales_
  the walk and clamps the fall — two different algebra, so two kinds.
- **Sample a field as a point test per voxel, or test the player's box against
  every field each frame.** Rejected: `mediumAt` keeps the cheap read on the
  trusted side, and one sample per frame is enough for volumes meant to be
  large compared with the player.
- **Have the script stream push velocities at the player.** Rejected: the
  script says where the air behaves and how a surface conveys; the physics
  resolves it. Streaming would hand the frame-by-frame mechanics to the rules
  tier that reads it.
- **Reuse the prop's `motion` for a conveyor.** Rejected: motion moves the
  box (a platform you ride) while a conveyor only moves what stands on it; a
  box doing both would have to choose.

## Consequences

- `field`, `field-remove`, and `conveyor` join the vocabulary; `fieldBoxes`
  are re-built from the fields whenever they change, and a `field-remove`
  forgets the id like any other removal.
- Pushes clamp to `MAX_FIELD_SPEED` and quicksand sinks to `MAX_FIELD_SINK`
  each axis, so a field cannot fling the player at an unbounded speed; the
  conveyor's surface speed clamps the same way.
- A conveyed prop keeps its world position; only the player standing on it
  moves, so the conveyor stays where it was placed.
