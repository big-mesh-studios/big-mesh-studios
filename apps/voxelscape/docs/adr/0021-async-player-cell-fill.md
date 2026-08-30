# Fill the player's cell off the main thread on scroll

The block under the player used to be filled synchronously on the calling
thread both at startup and on every chunk-boundary scroll, so collision data
existed under them before physics ran. At startup the worker has a real start
cost to pay — ADR 0012 measured several seconds to load its module graph
against a few hundred milliseconds a block — so the first block is still
filled here. By scroll time that cost has been paid: the workers are warm, and
the only reason the player's cell stayed on the main thread was that same
sentence stretched to a case where it no longer applies. Walking crosses a
chunk boundary every ~128 world units, and each crossing ran a full noise fill
on the main thread — the one un-budgeted, per-crossing stall left in chunk
generation.

## Decision

`ChunkSphere.scrollTo` now hands every entering cell — the player's included —
to the fill worker pool. The entering cells are ordered nearest-first, so the
player's cell leaves for a worker first and is the first of that worker's
batch to land.

`createVoxelWorld` tracks which slots hold terrain for the cell they currently
answer for: a slot joins the set when its fill lands and leaves when it is
repositioned to a fresh cell. That set backs `cellReady(x, y, z)` on the
world, and the composer gates the player's physics on it — the same mechanism
the initial load already uses for `spawnDrawn`. Between a scroll repositioning
the player's cell and that cell's fill landing — a round trip on a warm
worker, a frame or two — the player holds still instead of falling through a
cell that holds nothing.

The startup path is unchanged: `fillFrom` still generates the spawn block
synchronously, because that is the one place the worker's start cost is real
(ADR 0012, ADR 0016).

## Considered options

- **Keep the synchronous scroll fill.** Rejected: it is the only
  un-budgeted, per-crossing main-thread stall left in chunk generation. The
  game already holds the player for the initial fill; holding them for a
  warm-worker round trip on a scroll costs nothing visible.
- **Fall back to the analytic height field while the player's cell loads.**
  Rejected: `solidAt`/`groundHeightAt`/`inWaterAt` are voxel queries with no
  analytic analogue — only `heightAt` has one — so this would be a per-query
  special case for one brief window and would still leave the avatar without
  ground contact. Gating physics reuses the mechanism the loading screen
  already establishes.

## Consequences

- A chunk-boundary crossing no longer runs a full noise fill on the main
  thread; the recurring stutter of walking is gone.
- The player's physics is gated on the cell they stand in holding data. In
  the gap — one to two frames on a warm worker — the player is held in place
  exactly as during the initial load.
- `ChunkSphere` gains `slotAt(x, y, z)` — the slot for a cell — backing its
  `query` and the composer's `cellReady`.
- This supersedes the scroll-time half of ADR 0016's consequence that "the
  block under the player is filled synchronously so collision data exists
  under them before the frame advances"; the startup half stands.
