# A script builds clock-driven machinery and rideable seats

A moving platform could walk a path and spin; a windmill, a bobbing lift, a
swaying gate, or a turntable a player rides facing the way it faces had no way
to be said. This decision adds an oscillation to a motion and a seat to a prop,
the last of the physics-lite vocabulary: machines built out of the shared clock,
and surfaces a player rides.

```ts
// motion.ts
oscillate?: { amplitude; periodMs; axis?; startAfterMs? }

// effects.ts
| { tag: "prop"; payload: { ...; seat?: boolean } }
```

## A machine is the clock, not a simulation

An oscillation is a sine over the shared clock added to a motion's path, so a
figure bobs or sways along an axis with no state carried between frames and no
peer computing a different answer: `poseAt` returns the offset and its own
velocity, the renderer draws it, and a solid platform's velocity reaches the
player through the surface seam a conveyor already uses. A motor is the spin a
motion already had; a spring is the oscillation; both are pure functions of the
clock, the same shape every moving platform has always been.

## A seat turns its rider to the seat's heading

A prop marked `seat` joins the solid boxes with its `seat` flag and yaw, and the
player's physics, once it finds a seat holding them up, turns the player to that
seat's heading — so a turntable, a boat, or a carriage carries a rider facing
the way it faces. The rider is already carried by the seat's velocity through
the platform seam; only the heading is new. A seat need not be solid-blocking to
a decided script, but the player must stand on it to ride it, so it is marked
solid like any platform.

## Considered options

- **A rigid-body simulation with velocity, gravity, and collision response.**
  Deferred, not built: it is stateful and driven by live collisions, which is
  the owned tier, and it is a different engine from the clock-sampled one every
  moving part in the world is. A tossed prop, a bouncing ball, and full vehicles
  need it; machinery and platforms do not.
- **A `spring`/`hinge`/`motor` effect per constraint.** Rejected: a hinge is a
  motion with a spin, a spring is a motion with an oscillation, and a motor is a
  spin at a rate — all expressible in the one motion vocabulary a script already
  passes to `createProp`/`createNpc`.
- **A seat that locks movement entirely.** Rejected for now: turning the rider
  to the seat is the visible, useful half; taking their controls away is what
  `player-control` already does if a game wants it.

## Consequences

- `MotionSpec` gains `oscillate`; `prop` gains `seat`; `boxSeatAt` joins the
  collision helpers, and `PlayerWorld` gains `getSeatYawAt`.
- A script can now build lifts, windmills, swinging gates, turntables, and
  rideable platforms out of the motion and prop vocabulary it already had.
- Dynamic bodies, impulses, bouncing, and vehicle physics remain unbuilt; they
  are recorded as the physics gap this decision leaves open.
