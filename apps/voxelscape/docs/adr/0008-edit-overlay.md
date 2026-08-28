> One consequence below no longer holds: the ray marcher that read a block's
> texture live is gone, so an edit now waits for geometry to be rebuilt. See
> [ADR 0017](./0017-one-renderer.md).

# Persistent, world-coordinate edit overlay

Voxel editing was added as a Minecraft-style break/place feature. Terrain is
procedurally generated from a seeded noise height field, so an edit is only
meaningful as a delta against that deterministic base — and a `WorldRing`
slot is the wrong home for it.

## The ring re-fills, so the store is not the truth

When the player crosses a block boundary, `WorldRing.stepRing` teleports the
trailing column of slots to the leading edge and its `FillClient` regenerates
each slot straight from `fillStore`, overwriting the `VoxelStore` and its
derived `Level`. An edit written only into a block's store therefore survives
exactly until the player walks away and the ring scrolls, then vanishes when
the slot re-fills. The `VoxelStore` JSDoc has always named itself "the hook
that future runtime voxel add/remove editing builds on" — but the hook must be
a world-coordinate overlay that outlives any one slot.

## The overlay

`EditLayer` (`src/world/edit-layer.ts`) is a sparse map keyed by absolute
LOD-0 world voxel coordinate (`VOXEL_SIZE` world units per voxel), holding the
voxel id plus an `updatedAt` timestamp. It maps 1:1 onto the block's interior
grid via `localToWorldVoxel`/`worldVoxelToLocal` (a pure bijection onto the
integer grid where a block covers `[-n/2, n/2)` voxels), so any block — now or
after a refill — can resolve which of its voxels are edited.

- Every fill path in `FillClient` (worker and synchronous) re-applies the
  overlay for the slot after terrain is generated, then re-syncs the level.
  A block's store always reflects base-terrain-plus-edits, so `getWorldHeight`
  and the picker stay correct automatically.
- `EditingController.breakBlock`/`placeBlock` record into the overlay, push
  the voxel into the containing block's store, `syncLevelFromStore`, and notify
  the renderer's `onBlockChanged` so the triangle renderer re-meshes that slot.
  The raymarch renderer reads the level's GPU texture live, so it needs nothing.
- Edits persist to IndexedDB (`src/world/edit-persistence.ts`) — one JSON
  snapshot of the whole overlay, debounced — and are re-applied to the initial
  ring after load. localStorage was rejected on size grounds: a build's worth of
  voxel diffs can grow beyond its budget, and IndexedDB keeps the door open for
  storing larger reconciled histories later.

## The meshing border

Seam faces are culled against each block's own 1-voxel `VoxelStore` border,
which `fillStore` generates deterministically. An edit at the exact boundary
row of a block will not be written into its neighbour's generated border, so a
seam face crossing an edited boundary voxel may keep a stale cull until the
neighbour re-fills. This is accepted and documented: edits near the ring are
almost always interior to a block, and propagating border edits into
neighbours is a correctness refinement rather than a blocker.

## Considered options

- **Edit directly in each block's `VoxelStore`.** Rejected: refills overwrite
  it (see above); and the atproto sync needs a coordinate-addressable record
  that isn't tied to a ring slot.
- **Maintain edits per-chunk (32³) in memory only.** Rejected for persistence:
  the layout should follow a record boundary, not drive it; a flat world-keyed
  overlay is what both the ring-apply and the chunking logic read from.

## Consequences

- `FillClient` now takes an optional `editLayer` and re-syncs a slot's level
  when the overlay intersects it; `WorldRing` forwards it from `App.tsx`.
- `EditLayer.snapshot()` is the single source fed to both IndexedDB persistence
  and atproto chunking (`groupEditsByChunk`), keeping the two serialization
  paths in sync.
- The tri renderer rebuilds a full block mesh per edited voxel (a whole-block
  re-mesh, drained while active), so heavy editing in `tri` mode costs a
  rebuild per action — acceptable for a debug-feature first pass.
