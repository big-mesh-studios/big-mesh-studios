# Place script motion is declared once and sampled from the shared clock

A game needs props that move on their own: a plank that slides back and forth,
a turntable, a toilet roll tumbling down the stairs. The place interpreter
(ADR 0027) runs the guest only when a step is owed — a fact arrived, a timer
fired — never once per frame (ADR 0036), so the guest cannot walk a platform
frame by frame. This decision picks how motion happens when the script cannot
be asked every frame.

## A motion is a spec, and a pose is a pure function of it

`prop` and `npc` gained an optional `motion`: a polyline `path` of offsets from
the figure's declared position, a `loop` mode (`once`, `loop`, `pingpong`), a
`durationMs`, an optional `ease`, and an optional `spin` about a world axis
driven by time (`turnsPerSecond`) or by distance travelled
(`degreesPerMeter`). The host stores the spec; the trusted side samples
`poseAt(spec, clockMs)` every frame.

The pose is a pure function of the spec and the shared clock. Every peer
applies the same `motion` effect from the same script step, so every peer has
the same spec, and sampling the same clock gives the same offset without
anything being replicated. This is the same shape the day-night clock already
has (ADR 0026): a deterministic function neither peer has to tell the other
about.

## A solid motion is collision and carrying, not just drawing

A prop with `solid` and a motion is a platform. The world samples its pose into
the collision box: the box gained a `yaw` (the vertical-axis part of the spin)
and the point test turns the query back by it, so a turned platform is met
where it now sits. The box also carries the pose's velocity, and the player's
physics adds the velocity of the surface under their feet each frame, so a
player on a moving plank rides it instead of sliding off the back. A visual
spin about any axis is applied to the drawn figure as a rotation after its
heading.

## Considered options

- **Step the interpreter every frame so the script moves its own props.**
  Rejected: it runs creator code on every frame of every peer for motion that
  is entirely predictable, and it makes the script's own mutable position —
  not the event log — the source of where a platform is.
- **Replicate each moving entity's pose over the mesh.** Rejected: it
  reintroduces the ownership and dead-reckoning machinery monsters need (ADR 0013) for state that is identical on every peer by construction, and pays
  network cost for a deterministic function.
- **Have the script re-issue a `prop` effect with a new position on each
  timer.** Rejected: it is chatty, its motion is as coarse as the timer, and a
  timer that drifts makes two peers' platforms disagree by more than a clock.

## Consequences

- `SolidBox` gained `yaw` and a velocity, and `PlayerWorld` gained a
  `surfaceVelocityAt` seam, so carrying is client-local physics against a box
  whose pose every peer agrees on.
- Only linear carrying and vertical-axis rotation are implemented. A platform
  that tilts, or a turntable that turns a player standing on it, is not yet
  supported.
- Motion is sampled from the host's clock. In the running application that is
  the wall clock, which peers do not synchronize; a moving platform a player
  stands on therefore needs a peer-agreed place clock before a `multi` place
  can use one, and that clock is a later decision.
