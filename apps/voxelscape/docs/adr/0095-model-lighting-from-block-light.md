# A model is lit by the block light where it stands

The Get a Snack at 4 AM store is lit by four glowstone panels set into its roof
(ADR 0094), and the block-light flood that lights its floor reached the
countertop, the shelves and the walls but not one thing standing in the room: the
cashier, the customer, the Dad, the chips on the counter, or the item in the
player's own hand. Every custom material in this program is handed its lighting
explicitly — the terrain shader reads the world's two light channels, and the
voxel-model material reads three day-night uniforms — and nothing joined the two.
This decision is the join, and the one shape question it had to answer.

## A model reads the same channel the terrain is meshed from

`getWorldBlockLight` reads a world point out of the `LightStore` the mesher bakes
its per-vertex brightness from, so a figure and the floor under it are shaded
from one set of numbers rather than two that only agree by construction. It
resolves a world point to a voxel and reads the padded channel, exactly as
`getWorldBlockId` and `isSolidAt` already resolve one to a voxel id — the light
query belongs beside them for the same reason, so all four agree on which voxel a
point is in. Anything outside the loaded blocks reads 0, and so does a sealed
room's exterior: a figure in the open is as dark as the ground it stands on.

Sky light is not read. A model's daylight already arrives as the sun direction
and the sun and ambient colours its material is given every frame, and the world
has no separate thing to say about it beyond that.

## The world's light arrives from above, and wraps

A flat multiplier is what the terrain does with block light — `max(lighting *
brightness, blockBright)` — and mirroring that exactly was the first answer here.
It is wrong for a model. At 4 AM the sun term is near zero and the panel term is
0.47 to 0.80, so the `max` discards the lambert term for every fragment and the
figure becomes a flat silhouette: a lit floor still reads, because its tile
texture carries the detail, but a lit character does not, because its shading was
the only thing describing its form.

So block light is a second directional term rather than a floor:

```
albedo * (ambient + sunColour * N·L + blockLevel * wrap(N·up))
```

`N` is the surface normal the ray march already computes for the sun, and `up` is
a constant. The ray march had the normal to hand and the alternative threw it
away. A figure under a panel now has its head and shoulders caught and its jaw
and undersides darker, and a figure in the open is unchanged, because the term is
zero wherever no emitter reaches.

`wrap` is a half-Lambert remap, `0.5 + 0.5 * N·up`, and it is remapped again so
that its floor is 0.3 rather than 0. A plain `N·up` reaching nothing on a face at
right angles was tried first and is wrong for what these models are made of: a
character is very nearly all side faces, and a shelf is very nearly all front, so
under it a lit store held figures with black faces and black shelf boards. The
floor is the bounce — a room lit from a bright ceiling throws enough light back
up onto what stands under it that nothing reads as a hole. The cost is that the
term is not physically a light at all; the 0.3 is chosen, not derived.

The direction is fixed rather than per figure, and that is a real compromise. A
material set is shared by every figure wearing a model (below), so the direction
cannot be one uniform per figure without a set per figure; and the light store
records a level per voxel and no direction at all, so even a set per figure would
have nothing to aim with. A fixed overhead direction is right for a light fitting
in a ceiling, which is what this decision is for, and wrong for a lava pool on
the floor, which will light the underside of a figure as though the pool were
above it.

## A look and a light level each cost a material set

A model's materials are baked once and shared by every figure wearing it, which
is what keeps a hundred zombies of one model cheap. A uniform on a material is
therefore a uniform on all of them, and neither a tint nor a light level can
vary per figure on the shared set. The renderer already solved this for tints by
caching a set per distinct look; the light extends the same cache to a set per
combination of look and level, keyed by both, so a tinted figure standing in a
different light does not multiply the sets against each other. Sets are made as
each combination is first drawn, and a set for a hit is made the first time a
figure in that combination is hit, so a place nobody hits never pays for the
second set it will not draw.

Sixteen levels times the looks a demo actually uses is the ceiling, and the
program is shared across all of them, so no combination recompiles a shader.

The held item is not one of these sets: an item's material belongs to that item
alone, so it takes the level at the player directly.

## A player-worn model was never given the time of day

`playerFigures` was ticked every frame and never had `applyLighting` called on
it, so a worn model sat at the material's defaults — sun overhead, white, 0.2
ambient — at noon and at midnight alike, while the NPCs beside it tracked the
sun. The omission is fixed here, in the same place the held item's light is fed,
because a model that now reads the world's light and not the time of day would
still be wrong whenever the two disagree.

## Considered options

- **The terrain's own `max()` brightness floor.** Rejected: it discards the
  lambert term entirely at night, which is the flat-silhouette problem this
  decision exists to avoid. It stays right for the terrain, whose block light
  is baked per vertex and whose surfaces carry their own detail.
- **Adding the level to `ambientColour`.** Rejected: no shared package changes,
  but `diffuse` then only modulates the sun, which is below the horizon at 4 AM,
  and a figure in the sun next to a panel comes out brighter than the floor it
  stands on.
- **Scene `PointLight`s and rmsl's light collection.** Rejected: rmsl's
  `collectLights` reaches `MeshLambertMaterial` and `MeshStandardMaterial` and
  not a custom `NodeMaterial`, so `VoxelModelMaterial` would need a light pass
  of its own; and `lightsSignature` is folded into the pipeline cache key, so
  adding or removing a light recompiles every standard-material shader. A torch
  placed in a room would cost a stutter. This is also why ADR 0073's scripted
  lights reach nothing but player cubes, and that record is left standing.
- **A warm tint for glowstone light.** Rejected: the channel is monochrome, and a
  warm cashier against a neutral-white floor would read as a mismatch rather
  than as the same light.
- **A light query exposed to place scripts.** Not part of this decision. A
  monster that avoids light is a different question with a different answer, and
  it wants its own record rather than riding in on this one.

## Known limits

- A model takes one light sample, at the point its mesh is centred. The mesher
  smooth-lights terrain per vertex from a two-by-two corner patch, so a figure is
  flatter across a room than the floor it stands on. Sampling per hit point is
  possible — the ray march already has the hit point — but it needs a light
  texture bound to the material, which is a much larger change than this one.
- Remote players are drawn with `MeshStandardMaterial` and are lit by the scene,
  so they take neither the block light nor the time of day. Lighting them is the
  point-light path rejected above, and wants its own decision.
- An emitter radiates to all six of its neighbours, so a panel set into a roof
  one voxel thick also lights the open air above the building and the far side of
  its own walls. That is what an emitter in a wall does, and the store's roof is
  one voxel thick, so the building's exterior is faintly lit. It is left as it
  is: the interior is what the panels are for, and thickening the roof to stop
  the spill would spend voxels to hide a glow.
