# Glowstone is a block a place script sets into a room it has sealed

The Get a Snack at 4 AM demo (ADR 0093) builds a convenience store with a solid
roof and no light in it, and pins the clock at 4 AM, so the shop the player
walks into to buy a snack is a black box. Lighting it needed a block that
shines, and this decision is what that block is, and the two things about the
demo's ground row that the block depends on.

## Decision

One solid voxel id, `VOXEL_GLOWSTONE = 48`, listed in `EMISSIVE_LEVEL` at
`MAX_LIGHT` beside lava and fire embers, and textured with a procedurally
generated tile on all six faces. It sits outside the fluid and lava id ranges,
so like the ember it never spreads, flows, fills a cell, or counts as a hazard.
It is named to every place script as `blocks.glowstone` and offered by the
level editor's palette, which is the minimum a block needs to be placed by a
plan shape.

A place script lights a sealed room by stamping glowstone into it as an
ordinary plan box. Nothing about the lighting path is special to it:
`buildBlock` stamps a block's structures before it fills that block's light, and
`fillBlockLight` seeds from `EMISSIVE_LEVEL` whatever it finds, so a glowstone
in a ceiling is lit as part of generating the block it sits in. No runtime
seeding, no second pass, and no light-engine work.

The demo sets four of them in the store's roof, over the freezer, the counter
and the two shelf bays, listed after the roof box. A plan is stamped in order
and the last box over a voxel is the one that holds, so a panel listed above the
roof would generate as plain wood. A test holds them to that order.

## The demo's ground row is the first row of a block

Block light is filled one block at a time, and `fillBlockLight` seeds only from
the emitters inside that block's own one-voxel padding. A building whose floor
and roof fall either side of a block boundary therefore has a lit ceiling and an
unlit floor, and the boundary is invisible in the plan: a place script that
drew a perfectly good store would get a dark one and nothing would say why.

A block is 64 voxels on a side, the spawn is at world y 0, and the block
containing it covers voxel rows -32 to 31. The demo's ground row is therefore
32 rather than the 30 it was, which puts the floor, the walls, the roof, and the
panels — rows 32 to 36 — all inside the one block. Raising it by a single voxel
was measured and does not work: at row 31 the floor still belongs to the block
below, which seeds nothing, and the store floor samples light level 0. At row 32
every interior air cell in the store is lit, from 7 in the darkest corner of the
floor to 12 directly under a panel. The props, the NPCs, the room zones, and the
three heights that sit above the floor all moved with it; the row is the one
thing in the demo that a change of this kind has to hold to, so a test reads the
compiled plan back and asserts the ground row is a block's first row.

The store also straddles a block boundary in x, at voxel 32, because it reaches
from x 24 to x 34. That one is covered by the padding: a panel at x 31 is a
column of the next block's border, so it seeds there too and its light reaches
the shelves at x 33. It is a near miss rather than a designed fit, and a wider
store would break it.

## Considered options

- **A scripted `createLight(...)` at the ceiling.** Rejected: a scripted light
  is a scene-graph point light, and the terrain material binds no scene lights
  at all, so it would shade the store's figures and props while the floor, the
  walls, and the shelves it stands against stayed black. It would also have
  needed a prop model, since a light has nothing to hang from.
- **Lava or fire embers as the light source.** Rejected: both are fire. Lava is
  a fluid that spreads and fills cells, and an ember is drawn and sounded as
  burning, so a shop ceiling made of either would be a hazard and a hazard
  report, not a light fitting. Neither reads as anything but fire.
- **Hand-painting a glowstone tile into the spritesheet.** Rejected: the sheet
  is addressed as a grid of one-size cells, and `atlasGridOf` refuses a layout
  it cannot index, so a new tile has to be authored to fit an existing cell
  exactly. Generating it follows the wool colours and the obsidian tile, and
  keeps a binary asset out of the change.
- **Moving the store west so it fits one block on every axis.** Rejected: it
  would shift the road, the parking lot, the forecourt, and every room and prop
  in the demo to fix an axis the padding already covers.
- **A weaker glowstone level, so the store stays moody.** Rejected for now at
  `MAX_LIGHT`, which is what the four-panel layout is computed against. The
  `EMISSIVE_LEVEL` value is the one lever if it reads too hot in world; the
  falloff, the placement, and the ordering all hold at any level.
