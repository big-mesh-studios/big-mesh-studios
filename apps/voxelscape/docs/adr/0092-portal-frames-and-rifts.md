# A portal is an obsidian frame around a shader-drawn rift

The Lobby's walk-in doorways were voxel arches of greystone with a brick lintel,
a spark emitter, and a light. That read as a doorway but not as the nether
portal the Lobby is modelled on. A portal is now an obsidian frame around a
**rift**: a flat, translucent, animated sheet whose violet churns across it.

## The surface is a shader, not a texture

The nether portal's signature is a purple field that swirls. That is a fragment
shader's job, not a block's or a sprite's, so the world gained a new scripted
visual — the `rift` effect, drawn by `VoxelRifts` — alongside the dust storm and
the decal. Each rift is one quad, `width` by `height`, turned about the vertical
axis; the shader samples the same seamless Perlin fBm texture the storm bakes,
but through a rotation whose angle grows with radius and with time. The
differential rotation is what reads as a churn rather than a scroll, and two
taps at different scales give the coarse and fine motion the portal's two
texture layers have. The sheet is normal-blended and left translucent, so the
frame and the far side stay faintly visible through it.

The vocabulary stays fixed, as the storm's and decal's do: a script says where
the rift stands, how large it is, how it is turned, how fast it churns, and what
colour it is, and the world owns the look. Choosing to draw it with a shader
rather than shipping an image keeps that look in code, where the colour and the
speed can be parameters and no artist asset has to exist for a portal to be
placed.

## The frame is a block, so the doorway can be seen and not walked around

The frame is a one-voxel-thick ring of obsidian — two posts and a lintel, open
to the ground — built in `onPlan` like any other structure. It is solid, so the
player walks through the hole and the frame stops them anywhere else; the rift
itself carries nothing, so crossing it is crossing the zone the script already
watched. Obsidian had to exist as a voxel for this, and its tile is generated at
load and injected onto the end of the atlas the way the wool colours are, rather
than added to the shipped sheet: one block's look, not a drawing.

## Considered options

- **Keep the greystone arch, only recolour the glow.** Rejected: the arch
  shape and the particle swirl were the parts that read as "not a nether
  portal", not the colour.
- **Draw the churn with a shipped portal image.** Rejected: it puts an art
  asset between a creator and a working portal, and the engine's vocabulary is
  numbers over looks everywhere else — a storm names a shape, not a shader.
- **Make the frame out of black wool, which already exists.** Rejected: wool
  is fabric, generated for cloth, and is not in the plan vocabulary; obsidian
  is the block a portal frame actually wants, and its generation is the same
  kind of code the wool colours already use.
- **A portal-shaped effect instead of a generic rift.** Rejected: the engine
  should draw a translucent churning sheet, which a doorway happens to use; the
  doorway itself is the Lobby's **Portal**, already a script-level idea of a
  frame, a **Rift**, and a zone.

## Consequences

- `src/world/scripted-rift.ts` is the record, `src/renderers/voxel-rifts.ts`
  the shader and reconciler; the `rift`/`rift-remove` effects, the `createRift`
  helper, and the host and console lists carry it the way the storm's do.
- `VOXEL_OBSIDIAN` is a new block id, with a generated tile injected by
  `procedural-obsidian.ts` and the `obsidian` name added to a plan's block
  vocabulary.
- The Lobby's `onPlan` builds nine obsidian frames and its first tick opens
  nine rifts, each with the same violet, a glow light, a spark emitter, and its
  demo's label above the lintel.
