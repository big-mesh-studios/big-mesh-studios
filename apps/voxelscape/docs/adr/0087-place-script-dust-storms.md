# A place script drives a dust storm of a fixed shape

The dusty-trip demo chased the driver with a `field` push that had no body: a
box shoving the player, drawn nothing. A storm is the whole point of the game,
so this decision adds a scripted storm effect the script steers — where it
stands, how it is turned and sized, and how thick its dust reads — with two
fixed shapes it may name. It is deliberately not the weather system: weather is
an environment schedule keyed to the day-night clock and applies to the whole
scene, where a storm is placed by one script and belongs to it.

```ts
// effects.ts
| { tag: "storm"; payload: { id; kind?; x; z; y?; yaw?; width?; height?;
                             depth?; intensity?; color?; spin? } }
| { tag: "storm-remove"; payload: { id } }
```

## One shader, and a seamless fBm texture

`VoxelStorm` draws every storm from one billboard shader whose uniforms the
shapes set, the same shape the fire, explosion, and particle renderers use: a
fixed fan of large quads whose motion runs entirely in the vertex shader, each
recycling on `mod(time + offset, life)` and drifting on a baked vector. The
fragment samples a Perlin fBm texture twice at different scales and scrolls for
the dust. The texture is baked once from the terrain's own `PerlinNoise2D`,
whose lattice repeats every 256 units and whose every octave divides that, so
mapping one whole period across the image makes it tile without a seam.
Sampling a texture rather than evaluating fBm per pixel keeps a screen-filling
storm's fragment cost to two taps.

## A wall or a funnel

`kind` names one of two shapes, the same fixed vocabulary the particle kinds
use, so a place never supplies a shader or an image. A `wall` spreads its quads
over a slab the storm's width, height, and depth size — the advancing haboob the
demo wants. A `funnel` sets them on a cone wide aloft and narrow at the ground
and turns them about its axis by `spin`. Both read dense at the base and thin
toward the sky, so a storm settles into the horizon rather than ending in a
line.

## A storm is moved, not restarted

A storm is dispatched again every tick with the same id, so the renderer keys it
and updates its position, heading, scale, and thickness in place. Unlike a
particle emitter, which a newer `at` relights, a storm's animation keeps
running: an advancing front is one continuous churn, not a new storm each step.

## Considered options

- **A new particle kind.** Rejected: the particle renderer's geometry is a small
  fan with a radial gradient and no wall to orient; a storm needs its own slab,
  cone, and noise, so it is its own effect and renderer.
- **Driving the storm through the weather controller.** Rejected: weather is a
  global environment schedule, not a thing one script places and moves, and a
  storm needs a position a script sets each tick.
- **Folding the push into the storm.** Rejected: a `field` already carries the
  push a script wants, and keeping the storm purely visual keeps the two
  vocabularies independent.
- **Evaluating fBm in the shader instead of a texture.** Rejected: over a
  screen-filling wall the per-pixel hash and octaves cost more than two taps, and
  a baked tile is deterministic and directly testable.

## Consequences

- `storm`/`storm-remove` join the vocabulary; the lib gains a `createStorm`
  handle whose `move` re-places the storm and whose `remove` takes it down.
- A script can now build a pursuing dust wall or a tornado, bounded in size and
  count, out of the same effect path as everything else.
- The weather system is untouched; a Dust storm and a weather storm are separate
  things with separate controls.
