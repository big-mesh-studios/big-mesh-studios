# Stream chunks in a spherical window and draw them in superchunks

> Superseded in part by [ADR 0021](./0021-async-player-cell-fill.md), which
> stops filling the player's cell synchronously on scroll and gates physics on
> its fill landing instead. The startup spawn-block fill and the rest of this
> ADR stand.

The original window was a 5x5 grid of huge blocks (192x256x192 world units,
full world height) that scrolled in X/Z only, with a rectangle recycle that
teleported trailing rows and columns to the leading edge. That kept object
counts tiny (25 blocks), which is why the renderers could afford one
`WorldBlock` per `Mesh`/box.

Moving to a 64³-voxel chunk as the streamed unit changes the economics
completely. The window is now a **sphere** of chunks — every cell within
`chunkRadius` (default 4) euclidean chunks of the player's cell — so the
player can climb, fall, and fly in Y as well as walk in X/Z, and the count
jumps from 25 blocks to ~260. Two consequences follow.

## The spherical window

`WorldRing`/`BlockGrid` (a fixed rectangle, X/Z only) become `ChunkSphere`
(`src/world/chunk-sphere.ts`): a pool of `WorldBlock`s (one per cell of the
ball), a `Map<cell, slot>` resolving any world point to its owning block in
O(1) for the height/collision queries, and a free-slot stack for recycling.
On a cell crossing, cells leaving the ball are evicted (slot freed, level
reset) and cells entering claim the freed slots, re-fire the reposition
callback, and request a fill — the same recycle-in-place story as the old
ring, now in three axes. The block under the player is filled synchronously
so collision data exists under them before the frame advances.

The terrain queries (`getWorldHeight`, `getGroundHeightBelow`, `isSolidAt`,
`isWaterAt`) switch from scanning a block by X/Z footprint to resolving the
containing cell through a `BlockQuery` (the sphere's cell map), which keeps
per-frame physics at O(1) instead of O(blocks). Height queries anchor the
column search at the analytic noise height and scan the loaded cells of that
column around it.

## Padding on all six faces

`VOXEL_PADDING` previously covered only the horizontal sides (blocks never
stacked). Now chunks stack vertically, so `VoxelStore` pads all six faces and
`fillStore` generates the top/bottom border rows from the same world-coordinate
terrain function as the interior — seam faces (including the top/bottom faces
between vertically-adjacent chunks) cull against a chunk's own border, exactly
as ADR 0004 established for the horizontal ones. The `sweepSurface`/mesh
builders' "below the block floor is solid" special-cases are deleted; the
generated border supplies that content.

## Drawing in superchunks

At ~260 blocks the old one-`Mesh`-per-block triangle path would be ~520
draw calls (terrain + water) plus thousands of ray-mode boxes and materials.
`TriangleRenderer` now merges each 2x2x2 group of chunks (128³ voxels /
256³ world units, 8 chunks) into **one superchunk** mesh pair: the per-chunk
worker build is unchanged (still culled against each block's generated
border), and the renderer caches each block's built arrays, re-origins them to
the superchunk's origin, concatenates them, and uploads the merged geometry
only when the superchunk's members have all meshed. A scroll shell of a few
dozen chunks thus redraws a handful of superchunk meshes. `RaymarchRenderer`
materializes its padded box + material pair lazily, only for blocks whose GPU
level holds surface voxels, instead of allocating one per block upfront.

## Considered options

- **Keep the big blocks, only make them scroll in Y.** Rejected — a block
  spanning the world's full height cannot stream Y at all; the whole point of
  the chunked sphere is that the loaded volume follows the player in every
  axis, so tall mountains and deep shafts load and unload with the player.
- **Merge geometry in the worker** (one request per superchunk). Rejected —
  a chunk whose data changes (the common case: a scroll shell refill) would
  re-run 64 chunk sweeps instead of one, and the worker protocol would need
  membership-aware requests; concatenating cached per-chunk arrays on the
  main thread is cheaper and reuses the existing generation-counter build.
- **Keep one box/material per block in ray mode.** Rejected at scale — 260
  materials each compile their own shader and each draw is a state change;
  materializing only surface-bearing chunks bounds ray mode to the ~surface
  shell until the atlas-based world march is built.

## Consequences

- Object/draw-call counts now track the number of _superchunks_ (tens) and
  _surface chunks_ (hundreds, ray mode) rather than the number of blocks
  (~260).
- A superchunk's merged geometry is rebuilt (main-thread concat + GPU upload)
  once per dirty superchunk per frame, coalescing the burst of block results
  a scroll shell produces into a single upload each. The rebuild is
  _incremental_ and _settle-based_: a scroll's entering cells append to the
  already-uploaded arrays rather than re-joining the whole superchunk, and
  the GPU upload is deferred until the superchunk's meshing members all land
  (a six-frame stall backstop forces a partial upload when one is stuck). A
  scroll therefore pays for one upload per superchunk instead of one per
  frame per landed chunk, which is what kept the main thread from stalling
  under a scroll's entering shell.
- A scroll loads ~πR² ≈ 50 cells per chunk step (the entering cap of the
  ball), so both the fill and the mesh stages run a small pool of workers
  (`hardwareConcurrency`, capped at 4) to generate and triangulate them in
  parallel, and `ChunkSphere` requests entering cells nearest-first so the
  terrain ahead of the player appears before the cap behind them.
- Empty superchunks (fully air or fully buried rock) draw nothing: their
  meshes exist but have empty geometry, so the draw path sees a handful of
  no-op meshes.
- The world has no floor: `EditingController` no longer guards the bottom
  row of a block (it never was a floor once chunks stack).
- Ray mode remains per-block-march, not yet the world-grid DDA; it is bounded
  to surface chunks but still heavier than triangle mode at large radii.
