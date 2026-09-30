# A motion's spin may hinge on an edge and end at a bounded angle

A door that swings open on its hinges is a turn about an edge, not about the
figure's middle, and it settles at an angle of 90 degrees rather than winding
on forever. The spin a `prop` or `npc` declares over the shared clock
(ADR 0039) could do neither: it turned about the model's own origin, and its
rate — `turnsPerSecond` or `degreesPerMeter` — never stopped rising.

## `pivot` moves the axis off the figure's middle

`MotionSpin` gained an optional `pivot`, an offset in world units from the
figure's feet-centre origin in its own frame before `yaw`. `MotionPose` carries
it through as `spinPivot`, and the renderer holds that point still: the drawn
figure is translated by the difference between where the hinge stood and where
the spin has carried it, so a door turns on its edge. No pivot keeps the old
behaviour, turning about the origin.

## `turns` is a bounded angle, not a rate

`MotionSpin` gained an optional total `turns` applied over the motion's eased
progress, so `loop: "once"` comes to rest at exactly that angle — a 90-degree
door asks for `0.25` — and `loop: "pingpong"` swings back and forth. It takes
the place of a rate, and the validator refuses a spin that names both.

## Consequences

- A place script opens a door by re-issuing its `prop` effect with a `once`
  motion that has `turns` and `pivot`; the effect's `startAfterMs` is anchored
  to the triggering fact's clock so every peer swings in phase.
- Collision still reads only the vertical-axis part of the angle, so a hinged
  solid would be met at its centre rather than its swung body. Doors stay
  `solid: false` with a separate barrier while shut, which is the shape the
  original already uses.
- A hinge on a moving figure is not carried: the pivot rides the figure's
  declared heading and spin, not a path it is walking.
