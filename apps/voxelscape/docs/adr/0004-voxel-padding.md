# Cull chunk-seam faces against a per-block voxel padding

The triangle renderer was emitting spurious faces at chunk seams: under water, a
vertical wall of water between two blocks; looking through the terrain mesh,
wasteful interior dirt/grass walls. Both are the same failure — a solid or
water voxel at a block's edge emitting a face into a neighbour that is actually
solid or water.

## The old mechanism and why it failed

`TriangleRenderer` resolved seam faces by copying each neighbouring block's
live voxel store into "shells" (`extractBlockShells`/`makeShellResolver` in
`src/renderers/mesh.ts`) and sending those shells to the mesh worker. The shell
data was a snapshot taken **at mesh-build time** from the ring's current stores.
When the ring scrolls, the moved slots keep their stale pre-scroll data until
their async fill lands. A block meshed in that window baked stale shells (e.g.
"air" where the neighbour is really water or dirt) into its geometry. When the
neighbour's new data finally arrived, `onBlockChanged` rebuilt only that
neighbour — the block whose seam was built against the stale shell was never
re-meshed. The interior seam faces were persistent, not a transient pop-in.

## The padding approach

Each `VoxelStore` now carries a 1-voxel meshing border on every horizontal side
(`VOXEL_PADDING`, baked into the same `data` array). `fillStore` generates the
border with the **same world-coordinate terrain rule as the interior**, sampled
at the world positions just outside the block — which are exactly the voxel
cells the neighbouring blocks will occupy (verified: the border column's world
centre lines up with the adjacent block's boundary column). Seam resolution is
therefore deterministic from a block's own fill and correct regardless of the
neighbours' fill timing. `TriangleRenderer` ships the padded buffer to the mesh
worker; the builders read it at signed coordinates (`x`/`z` from `-1..nx`/
`-1..nz`) and never need another store.

This deletes the entire shells machinery (side/face/corner slab layouts,
`BlockGrid.lookupBlock`, `gridCoordAt`, the `BlockGridResolver`/`BlockShells`
types) — seam culling needs no neighbour data at all.

## Considered options

- **Rebuild neighbours on data change** (keep shells, re-queue an affected
  block's neighbours when any store lands). Smaller diff, but keeps the
  confusing slab-index machinery and only converges (with some transient seam
  faces) rather than being correct by construction.
- **A separate meshing-only padded buffer** that duplicates the interior.
  Rejected — two arrays holding the same voxels can drift (e.g. the future
  runtime-edit hook mutating `store.data` would silently desync meshes).
- **Treat the ring's outer edge as air** (only pad where a real neighbour
  exists). Rejected — requires the fill to know ring membership; the continue-
  the-terrain choice is simpler and the outermost ring edge is beyond fog start
  at its closest approach (fog start `FOG_DISTANCE`), so it is not visible.

## Consequences

- The ring's outer edge now reads as solid continued terrain instead of an air
  cliff in `tri` mode; the `ray` mode still treats the edge as air. Both sit at
  full fog, so the difference is not visible.
- `VoxelStore.data` is padded-sized; `get`/`set`/`sweepSurface` address the
  interior only, so the raymarch GPU chunks are byte-identical to before.
- The library's `customFillStore` hook writes through `set` and leaves the
  border as air, so a fully custom world reverts to air-edge seams; the
  runtime app only uses `fillStore`, and this is left as a documented
  limitation rather than plumbed with existence flags.
- Memory grows ~4% per block for the border (1.18 -> 1.23 MB at LOD 0).

## Status

Accepted. Amended by ADR 0016: blocks now stack vertically, so the padding
covers all six faces (the "never vertically — blocks don't stack" premise no
longer holds), `fillStore` generates the top/bottom border rows from the same
world-coordinate rule, and the mesh builders/sweeps' "below the floor is
solid / above the ceiling is air" special-cases are gone — the generated
border supplies that content. Memory per block grows ~10% (64³ -> 66³).
