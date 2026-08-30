# Stream far chunks at a coarser level of detail

The spherical window is 257 blocks (radius 4) and every one of them was built,
filled, meshed, and drawn as a full 64³ voxel volume. The outer two shells
hold 224 of those blocks — 87% of the window — at 3–4 chunks out, where the
distance fog (`maxDistance` 480, `fogStart` 200, sphere edge ~512) has already
washed the terrain out. A scroll refills an entering cap of ~50 cells, nearly
all of them in those fogged shells, so the full-resolution fills and mesh
sweeps that dominated scroll cost were invisible to the player. The `lod`
parameter existed on `buildBlockShell`/`buildBlock` but nothing ever passed a
level above zero.

## Decision

A cell's level of detail is chosen by its euclidean distance in chunks from
the player's cell (`lodAt`): full resolution within three chunks (out past the
fog's start, so everything the player can clearly see stays sharp), one level
coarser in the shell from three to four chunks, and coarsest beyond. Each
level doubles the voxel size and quarters the voxel count per axis, so a
block is a 64³, 32³, or 16³ volume over the same 128-world-unit extent.

The level travels with the fill: `buildBlockData` and the fill-worker
protocol carry a per-block `lod`, the store adopts it (`applyLevelData`/the
synchronous fill resize `voxels`/`scale` to match the data they accept), and
`ChunkSphere` assigns each entering cell its level. A cell that stays in the
ball but crosses a ring as the player moves is refilled in place at the new
level, so terrain the player walks toward sheds its coarse voxels before it
comes into view. Edits re-apply through the existing `EditLayer` path whenever
a cell is refilled at full resolution.

### Seams between blocks of different levels

A block's meshing border is generated from the terrain function (never a
neighbour's store, per ADRs 0004/0016), and a block only ever culls its own
edge faces against its own border. At a mixed-level boundary that rule alone
leaves holes: the fine block's edge reads a fine-resolution border cell that
can disagree with the coarse neighbour's actual voxels, and the coarse block
culls its own boundary face on a coarse cell that spans fine air.

Both sides now sample, for each border cell, every cell of the finer grid
inside the coarser of the two voxels (`fillStore`'s `coarseBorderId`,
`borderSizes`): the border cell is solid only when all of them are solid,
water only when all are water, and air otherwise — air whenever the fine
detail has any air in the coarse voxel, or mixes solid with water. So a block
culls a face only against a neighbour that is genuinely solid across the whole
voxel it would sit in front of, and always draws the face wherever the
neighbour might be open: no holes, at the price of faces that are hidden
inside the coarser neighbour's solid volume. The world is a smooth column
height field, so the cases the rule is approximate about are confined to the
fogged ring.

## Considered options

- **Coarsen only the outermost fogged shell at one level.** The most
  conservative reading of "farther chunks, fewer triangles": everything within
  three chunks stays full-res, and the 3–4 chunk shell halves. Chosen — the
  earlier, tighter rings (coarse from two chunks) put visible blocky terrain
  inside the clear zone and had to be pushed back out to the fog.
- **Sample a mixed border at the coarser neighbour's resolution directly.**
  The border cell would take the coarse voxel's single id. That leaves a hole
  wherever the terrain surface cuts through the coarse voxel: the coarse voxel
  is solid as a whole, but the fine side is air above the surface, and neither
  block draws the step. The consensus sampling (air on any disagreement) is
  draw-biased instead, so the step always shows.
- **Skirt the fine block at the boundary.** Adding a strip of geometry where a
  coarser neighbour borders would need the mesh builders to know which faces
  face a coarser neighbour, and the seam rule keeps the border generation in
  one place.
- **Read the neighbour's store for seam culling.** Would break the
  no-neighbour-reads invariant that keeps border generation deterministic and
  worker-safe (ADRs 0004/0016).

## Consequences

- Held voxels drop from ~67M to ~9M: the 123 cells within three chunks at 64³,
  the 134-cell shell at 32³. A scroll's entering cap is mostly the coarse
  shell, so each of those fills and mesh sweeps costs an eighth of a full-res
  block.
- The player's own cell and everything within three chunks stays full-res, so
  collision, height sampling, and editing (always within reach) never read a
  coarse store.
- A ring-crossing refill is one more fill per scroll for cells the player is
  walking toward; without it those cells would keep the coarse level they were
  built at when they were far.
- Mixed-level seams are closed by the consensus border rule; the residual
  overdraw (faces hidden inside a coarser neighbour's solid voxels) is
  invisible, and the few approximations live in the fogged ring.
- The `lod` parameter that already existed on `buildBlock`/`buildBlockShell`
  is now used, and the fill protocol (`FillBatchRequest`) carries both the
  per-block level and the neighbour voxel sizes (`BorderSizes`) the border
  rule needs.
