# A script drives a solid prop itself, carrying riders at its own velocity

A car a player steers had no way to be said. Solid props already carry a rider
through the surface-velocity seam, but a prop only moves by a `motion` sampled
from the shared clock or a `conveyor` fixed at placement, and neither responds
to a player's input. This decision lets a script set a prop's position and
velocity itself, so a place can build a drivable body — a car, a boat, a mine
cart — from the props it already has, carrying whoever stands on it.

```ts
// effects.ts
| { tag: "prop"; payload: { ...; velocity?: { vx; vy; vz } } }

// voxelscape.d.ts
interface FigureMove extends FigurePlacement {
  live?: boolean;
  vx?: number;
  vy?: number;
  vz?: number;
}
```

## A driven prop is a motion whose pose the script computes

The host already stores each prop's feet, heading, and a `motion`; the
`propPose` read reports the motion's offset and its velocity, and the world
folds that velocity into the solid box the player stands on. A script-driven
prop is the same read with a zero offset and the velocity the script last set:
`PropHandle.move({ x, z, y, yaw, vx, vy, vz })` re-sends the placement carrying
a velocity, the host stores it, and `propPose` returns a still pose whose
`vx`/`vy`/`vz` are that velocity. Nothing downstream changes — the renderer
draws the prop where it was placed, and the player's physics reads the same
`SolidBox` velocity a moving platform offers, so a rider is carried by a car the
way they are carried by a lift.

## Velocity is set, not integrated

The host does no physics for a driven prop: it records where the script put the
prop and how fast the script says it is going. The script owns the model — an
arcade car's throttle, steering, ground following, and wall checks are its own
code over the read surface (`getHeightAt`, `getSolidAt`, `raycast`). That keeps
the deterministic, clock-sampled shape every other moving part has and avoids a
second stateful simulation in the trusted side. It also means a car moves at the
cadence the script ticks at, so a place that wants a smooth one re-arms its
`timer` quickly.

## Considered options

- **A `motion` path the input steers along.** Rejected: a motion is a fixed
  polyline sampled from the clock, so it cannot answer a steering wheel that
  turns this frame.
- **A `conveyor` the script rewrites each tick.** Rejected: a conveyor is a
  fixed surface velocity, and writing a new `prop` effect every tick would log
  an effect per frame where the pose already reports velocity for free.
- **A host-level vehicle body with an owner tier in the engine.** Deferred, not
  rejected: it is the owned tier the monsters were removed from, and the script
  still needs to own the game's own rules — fuel, damage, seats — so the engine
  body would only move the same computation behind the sandbox boundary.
- **A rigid-body solver.** Deferred: a driven prop is kinematic, and a solver
  is the separate physics gap a tossed crate or a tumbling tire would open.

## Consequences

- The `prop` effect gains `velocity` and `FigureMove` gains `vx`/`vy`/`vz`;
  `ScriptedProp` stores the velocity and `propPose` reports it with a still
  offset.
- A place script can now build a drivable car, a boat, or a cart out of solid
  seat props, carrying riders through the seam moving platforms already use.
- A driven prop is not yet replicated: in a multiplayer place every peer runs
  the script but only the driver's own peer computes the input, so a car needs
  the owner-broadcast a live NPC has before peers agree on where it is. That is
  recorded as the next extension, not built here.
