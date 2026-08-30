# Defer superchunk merges the camera cannot see

A chunk-boundary crossing re-merges and re-uploads whole superchunks on the
main thread: `rebuildSuperchunk` concatenates each member's cached arrays
(`appendArrays`) and converts them to typed arrays for the GPU
(`setGeometryData`/`toF32`) every time the superchunk's membership changes or
a member's build lands. Both costs scale with the superchunk's geometry, and a
scroll touches most of the ~tens of superchunks in the window even though the
player only looks at a fraction of them.

A CPU profile of walking forward showed exactly this: `appendArrays` alone was
the single largest main-thread cost, and a 20-second walk produced ~39 long
tasks totalling ~8 seconds of main-thread blocking. The same walk after this
change produced ~18 long tasks totalling ~2.5 seconds.

## Decision

`TriangleRenderer.tick` now extracts the camera's view frustum once per frame
(the six planes of `projectionMatrix * matrixWorldInverse`, Gribb–Hartmann)
and skips the merge+upload for any dirty superchunk whose cell box does not
intersect it. Skipped superchunks stay dirty, so they rebuild the frame the
camera turns onto them.

This is the merge-time half of viewport culling. The draw-time half was
already happening: each superchunk mesh is a `Mesh` with `frustumCulled`
defaulting to true, so three.js does not issue draw calls for superchunks the
frustum test rejects. The freeze was the merging, not the drawing.

## Considered options

- **Reduce the geometry instead (fewer cloud blocks).** The cloud band is
  62% of the window's triangles (~1.05M of ~1.7M). Cutting it would shrink
  both the merge cost and the per-frame draw cost, but it changes what the
  world looks like, and the frustum deferral removes most of the freeze
  without changing a voxel.
- **Merge in a worker.** Rejected by ADR 0016: the main thread must keep the
  merged arrays anyway to append later members incrementally, so the merge
  would move to a worker and the concatenated result back again for no win.
- **Only upload in a worker, keep the concat on the main thread.** The GPU
  upload must run on the main thread (it is a WebGL call), and the concat is
  the larger half of the cost.

## Consequences

- A scroll's entering shell merges only the superchunks in front of the
  camera; the ones behind and beside stay dirty until looked at. A camera turn
  onto a deferred superchunk rebuilds it that same frame, so the world appears
  there a frame later at worst.
- `renderer.triangleCount` (the `/render:triangles` readout) now counts the
  geometry actually uploaded, not the whole window: ~0.4M at spawn facing
  forward instead of ~1.7M, rising as the player looks around.
- The view-projection used is one frame stale (the camera's `matrixWorldInverse`
  is recomputed during the render pass that follows `tick`); a frame of lag is
  immaterial to deciding what to hide.
