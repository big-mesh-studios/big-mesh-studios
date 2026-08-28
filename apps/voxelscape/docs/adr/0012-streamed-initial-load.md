# Generate the window's terrain a block at a time, spawn block first

`BlockGrid`'s constructor used to generate all twenty-five blocks of the
window: for each one a noise fill and a surface sweep, about a hundred and
fifteen milliseconds a block, roughly three seconds in a single synchronous
loop. It ran inside `createVoxelscape`, which runs inside a component body, so
the page could not paint until every block existed. There was no loading state
because there was no frame in which to draw one.

The fill worker already existed, and `WorldRing` already used it — but only for
the slots a scroll reveals, never for the window the game starts with.

`BlockGrid` now only allocates: twenty-five empty stores and levels, about
eleven milliseconds. `WorldRing.fillFrom` generates the terrain, ordering the
slots by distance from the spawn point so the ring fills outward from under
the player's feet, and the fill worker posts each block back on its own rather
than a whole request at once, so each one is drawn as it lands.

## The first block is generated on the main thread

Starting a Web Worker and loading its module graph costs several times what
generating one block costs — measured at about five seconds against four
hundred milliseconds a block for the ones that followed. Every one of those
seconds is spent with nothing on screen, because the block the player stands in
is the one thing that has to exist before anything can be shown.

So `fillFrom` generates the nearest block on the calling thread and hands only
the remaining twenty-four to the worker, and `RendererSwitch.drawBlockNow`
meshes that block on the calling thread too, for the same reason one layer
down: the mesh worker has its own start to pay for. The page blocks for one
block instead of twenty-five, and both workers spend their start-up
concurrently with the player already walking around.

That mesh waits on the spritesheet. A mesh bakes each face's atlas rectangle
into its vertices, so one built before the atlas has been read comes out
textured from an empty list of tiles — scrambled, and scrambled is what the
player would be shown first. The atlas is a single local asset and costs a
fraction of the block, so the synchronous mesh is chained onto it.

## The player waits for ground; the world does not wait for the player

`advance` skips the player's physics until the block they spawn in is on
screen, because stepping physics over a column that holds no voxels drops them
through the air where their block is about to be. Only the physics is skipped.
The renderers' `tick` keeps running, because building a block's geometry is
something that happens in `tick` — gating the whole of `advance` on the world
being ready deadlocks against a world that becomes ready by running it.

Held back this way, the player is let in when their own block is drawn rather
than when the window is finished. The rest arrives behind fog that is already
opaque at the ring's edge, counted in by a corner readout rather than a screen
that has to be dismissed.

## Consequences

- Time from navigation to terrain on screen went from about eight and a half
  seconds to about one and a third, measured in the development server under a
  software renderer. Most of what is left is the module loading the
  development server does per request.
- `AdaptiveResolution` is held while the window is still arriving. Those frames
  cost what generating and meshing terrain costs, not what drawing the
  finished world costs, and judging them drops the resolution to fit a load
  that is about to end.
- `heightAt` falls back to the height field the terrain is generated from when
  a column reads as air, which is every column until its block lands. Without
  it the player spawns at the bottom of the world, because the spawn height is
  read before any block has been filled.
- A block is counted as loaded when the active renderer can show it, not when
  its terrain exists. In raymarch mode those are the same moment; in triangle
  mode the geometry has to be built first, and a loading screen that lifts on
  the terrain alone hands over to several seconds of empty sky.
- The synchronous fallback in `FillClient`, for when the worker cannot start,
  now generates one block per task rather than looping over all of them, so
  that path shows the loading state too instead of freezing.
