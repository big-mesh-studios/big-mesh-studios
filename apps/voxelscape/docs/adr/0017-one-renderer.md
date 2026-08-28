# Draw the world one way, with triangles

The world carried two complete rendering strategies behind a `BlockRenderer`
interface, with a `RendererSwitch` owning one of each and a `/render:mode`
command to swap between them: `RaymarchRenderer` stepped a voxel traversal per
fragment against a 3D texture of each block, and `TriangleRenderer` meshes each
block's visible faces into geometry and rasterizes it. Only the triangle
renderer was ever shown — it is what the world starts in, and reaching the other
one meant typing a console command.

We removed the ray marcher. With one way to draw a block there is nothing for a
coordinator to coordinate and no second side for an interface to have, so
`RendererSwitch` and `BlockRenderer` went with it and `createVoxelWorld` holds
the triangle renderer directly.

The larger part of the change is what stopped being needed behind it. Each
block carried a `Level`: a GPU chunk layout derived from its voxels, kept
current by `syncLevelFromStore` after every fill, every scroll of the window
and every edit, and generated in the fill worker alongside the voxels
themselves. Only
the ray marcher ever read it. It is gone, and with it the surface sweeps that
fed it, the `surfaceOnly` setting that chose what went into it, and two of the
three arrays the fill worker used to build and transfer per block.

## Consequences

- An edit now shows up only once geometry has been rebuilt for it. The ray
  marcher read a block's data live from a texture, which is why the triangle
  renderer was allowed to rebuild lazily — ADR 0001 records that split, and ADR
  0008 relied on it for the edit overlay. That lazy path is now the only path,
  for a player's own edits and for those arriving from other players alike.
- A block's world extent is read from its `VoxelStore` rather than from the
  level that used to carry it.
- The debug readout lost its fetches-per-ray figure and the heatmap the ray
  marcher's material drew to produce it. Frame timing and the triangle count
  stay.
- The world's fog distance is no longer read by anything. It was only ever
  applied by the ray marcher; the triangle renderer has always used its own
  constants, and wiring the two together would move the fog from where players
  have been seeing it. Left as it is rather than quietly changing the view.
- This supersedes ADR 0001, which introduced the seam between the two
  renderers. The reasoning there — that a hand-copied second implementation of
  the same shading drifts — is why the two were made to share an interface; it
  is answered here by there being one implementation.
