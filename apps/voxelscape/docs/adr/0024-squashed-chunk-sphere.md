# Flatten the chunk window in Y

The window is a ball of chunks `chunkRadius` (4) euclidean chunks around the
player's cell, and the ball was fruitlessly expensive. Terrain surfaces span
roughly one chunk of height (base-amplitude `64±80` world units, sea level 56,
clouds at 220): a full radius-4 ball holds 257 cells, most of them a whole
stone volume above the surface or deep underground, and every one of them is
filled, meshed, and drawn. The underground ones carry the caves the world has
no way to cull yet — hardware occlusion in the renderer library is the eventual
fix, but the loaded _region_ itself can be shrunk today.

## Decision

The window keeps its `radius` in X and Z and gains a `yRadius` (default 2, in
the world's config) in Y. A cell is held when
`dx² + dz² + (dy · radius / yRadius)² ≤ radius²`, so at `yRadius = radius` the
set is exactly the old euclidean ball and every existing test and caller
stands. The two radii thread through `sphereCells`/`cellsInSphere` and
`ChunkSphereParams`/`VoxelWorldConfig`/`VoxelscapeConfig` as `yRadius` /
`chunkRadiusY`.

At the shipped `chunkRadius` 4 and `chunkRadiusY` 2 the pool drops from 257 to
125 cells (−51%) while the horizontal reach (and so fog `maxDistance` 480 /
`fogStart` 200, camera far, and `ringRadius`) is untouched. The vertical reach
of 2 chunks (±256 world units from the player's cell) keeps the terrain
surface, the cloud band, and the caves around the player loaded whether they
are on a mountain top or at sea level.

### What stayed

- `lodAt` and `borderSizesOf` keep the euclidean ring distances, not the
  squashed metric. Full resolution within three chunks was tuned against fog
  the horizontal plane, and the vertical reach (2) is so small that every cell
  up and down is full-res anyway; only far-horizontal-plus-tall corners coarsen,
  exactly as they did in the ball.
- Superchunks are keyed by world position, so the 2x2x2 grouping is
  unaffected by which cells are loaded.
- The vertical seam at the window's top and bottom works as it always did at
  the sphere's edge: a block's meshing border is generated from the terrain
  function for the out-of-window neighbour coords, so faces at the boundary
  cull against exactly what the terrain will hold there.

## Considered options

- **Squash factor rather than a separate radius.** One `sphereSquash` in
  (0, 1] reads as "shape" rather than coverage; a plain `chunkRadiusY` names
  the vertical extent in the same units as `chunkRadius` and needs no
  conversion, so it was preferred.
- **Anisotropic fog, shorter vertical far plane.** The fog distance is one
  scalar tied to the horizontal reach, which is unchanged; shortening it would
  fog the horizon for no gain.
- **No shape change; wait for occlusion culling.** Software-only occlusion is
  not on the table, and halving the pool is a deliverable of its own.

## Consequences

- The held pool is 125 cells at startup and after every scroll: fills, mesh
  builds, superchunk memory, and the underground-cave cost all shrink roughly
  in proportion. A scroll's entering cap (about `πR²` ≈ 50 for the old ball,
  ADR 0016) is smaller too, since the window is only two cells tall.
- The vertical streaming margin narrows: `getGroundHeightBelow` scans up to
  four cells below the player's cell, while the window now holds two. A pit
  deeper than that from the player reads as void until the sphere scrolls
  down — the fall-through the window always had a margin against gets that
  margin halved. Per-frame ground under the player's own cell is unaffected,
  because the window stays centred on them.
- If a later change raises the horizontal `chunkRadius` past 4, fog and the
  camera far plane must move with it; the squash does not change that math.
- `CONTEXT.md`'s language for **Sphere**/`ChunkSphere` now says the window is
  `chunkRadius` wide and `yRadius` tall rather than a ball "in every axis".
