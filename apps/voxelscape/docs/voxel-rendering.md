# How a voxel becomes a pixel

Read out of the modules that do it at 4759ddc by `pnpm rendering`.
Every number below is the one the code declares, not a note about it.

## The path

```mermaid
graph TD
  world_noise["world/noise.ts<br/>answers the height and the flatness of any world column"]
  world_voxel_store["world/voxel-store.ts<br/>holds one block's voxels, border included, and fills them from the terrain"]
  world_cave_fill["world/cave-fill.ts<br/>carves the caves out of a filled column"]
  world_lava_fill["world/lava-fill.ts<br/>pours the lava that sits in the deep ones"]
  world_tree_fill["world/tree-fill.ts<br/>stands the trees on the surface it finds"]
  world_light_store["world/light-store.ts<br/>holds the two light channels shadowing those voxels"]
  world_sky_light["world/sky-light.ts<br/>drops skylight down every column and spreads it sideways"]
  world_block_light["world/block-light.ts<br/>spreads the light emitters give off"]
  renderers_plane_merge["renderers/plane-merge.ts<br/>covers one plane of like faces with as few rectangles as it can"]
  renderers_superchunk["renderers/superchunk.ts<br/>one superchunk's merged geometry: each member's run, and what the card holds of it"]
  renderers_mesh["renderers/mesh.ts<br/>sweeps a block for exposed faces and writes the quads they become"]
  renderers_vertex_format["renderers/vertex-format.ts<br/>what a vertex weighs, and which lane of it holds which of the small numbers"]
  renderers_growable["renderers/growable.ts<br/>the typed arrays a mesh is accumulated into, and reused for the next block"]
  world_fill_mesh_worker["world/fill-mesh-worker.ts<br/>does all of the above for a batch of blocks, off the main thread"]
  world_fill_client["world/fill-client.ts<br/>asks for blocks, lends the arrays they are filled into, and adopts what comes back"]
  renderers_mesh_client["renderers/mesh-client.ts<br/>asks for a mesh on its own, for a block whose voxels an edit changed"]
  renderers_atlas["renderers/atlas.ts<br/>the sheet of tiles a face's texture is cut from"]
  renderers_triangle_renderer["renderers/triangle-renderer.ts<br/>joins blocks into superchunks, uploads them, and draws them"]
  renderers_occlusion["renderers/occlusion.ts<br/>decides which superchunks the last probe proved hidden"]
  render_create_render_loop["render/create-render-loop.ts<br/>the frame: advance the world, then draw it"]
  render_perf_probe["render/perf-probe.ts<br/>times each stage of that frame and counts what moved"]
  render_adaptive["render/adaptive.ts<br/>lowers the resolution when frames stop fitting"]
  world_voxel_store --> world_cave_fill
  world_voxel_store --> world_lava_fill
  world_voxel_store --> world_noise
  world_cave_fill --> world_noise
  world_lava_fill --> world_noise
  world_tree_fill --> world_noise
  world_tree_fill --> world_voxel_store
  world_light_store --> world_voxel_store
  world_sky_light --> world_noise
  world_sky_light --> world_light_store
  world_sky_light --> world_voxel_store
  world_block_light --> world_light_store
  world_block_light --> world_sky_light
  world_block_light --> world_voxel_store
  renderers_superchunk --> renderers_growable
  renderers_superchunk --> renderers_mesh
  renderers_superchunk --> renderers_vertex_format
  renderers_mesh --> renderers_atlas
  renderers_mesh --> renderers_growable
  renderers_mesh --> world_voxel_store
  renderers_mesh --> world_light_store
  renderers_mesh --> renderers_plane_merge
  renderers_mesh --> renderers_vertex_format
  world_fill_mesh_worker --> world_voxel_store
  world_fill_mesh_worker --> world_light_store
  world_fill_mesh_worker --> renderers_mesh
  world_fill_mesh_worker --> renderers_atlas
  world_fill_client --> world_fill_mesh_worker
  world_fill_client --> renderers_mesh
  world_fill_client --> renderers_atlas
  world_fill_client --> world_noise
  world_fill_client --> world_voxel_store
  world_fill_client --> render_perf_probe
  renderers_mesh_client --> renderers_atlas
  renderers_mesh_client --> render_perf_probe
  renderers_mesh_client --> renderers_mesh
  renderers_triangle_renderer --> renderers_atlas
  renderers_triangle_renderer --> renderers_mesh
  renderers_triangle_renderer --> renderers_superchunk
  renderers_triangle_renderer --> renderers_mesh_client
  renderers_triangle_renderer --> renderers_vertex_format
  renderers_triangle_renderer --> render_perf_probe
  renderers_triangle_renderer --> renderers_occlusion
  render_create_render_loop --> render_adaptive
  render_create_render_loop --> render_perf_probe
```

An arrow is an import, so it points from a module to one it reads —
which is the reverse of the way the data flows.

## What a block is

|                      |                                                                 |
| -------------------- | --------------------------------------------------------------- |
| voxels a block       | 64³                                                             |
| world units a voxel  | 2                                                               |
| world units a block  | 128³                                                            |
| border voxels a face | 1, so a block's arrays are 66³ = 287,496 long                   |
| bytes a block holds  | 574,992: a byte of voxel and a byte holding both light channels |
| blocks a superchunk  | 2³, which is 256 world units a side                             |

## What a vertex carries

| attribute  | format      | numbers | bytes |
| ---------- | ----------- | ------- | ----- |
| `position` | `float32x3` | 3       | 12    |
| `packed`   | `unorm8x4`  | 4       | 4     |
| `uv`       | `float16x2` | 2       | 4     |
| **total**  |             | **20**  |

`VERTEX_BYTES` says 20, which is what the frame's upload budget
spends against. An index costs 4 bytes on top, six to a quad.

## The frame, in the order it is timed

1. `player`
2. `scroll`
3. `scrollCells`
4. `scrollEvict`
5. `scrollTeleport`
6. `scrollOrder`
7. `scrollRequest`
8. `flow`
9. `multiplayer`
10. `figures`
11. `environment`
12. `light`
13. `meshDrain`
14. `merge`
15. `rendererTick`
16. `advance`
17. `occlusion`
18. `draw`

`advance` holds every stage above it except the last two: what the probe
reports as advance is the world's whole update, and `occlusion` and `draw`
are the drawing that follows it.

## What the workers say to each other

| message    | declared in                 |
| ---------- | --------------------------- |
| `config`   | `world/fill-worker.ts`      |
| `fill`     | `world/fill-worker.ts`      |
| `fillMesh` | `world/fill-mesh-worker.ts` |
| `mesh`     | `renderers/mesh.ts`         |

## The numbers that govern it

| constant                     | value                                | where                            | what it is for                                                                                                                                                                        |
| ---------------------------- | ------------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VOXEL_SIZE`                 | `2`                                  | `world/level-data.ts`            | World units per voxel at LOD 0; each higher LOD doubles this value.                                                                                                                   |
| `CHUNK_VOXELS`               | `64`                                 | `world/level-data.ts`            | The number of voxels per axis in a `WorldBlock`, the chunk the sphere streams.                                                                                                        |
| `VOXEL_PADDING`              | `1`                                  | `world/voxel-store.ts`           | How many rows of extra voxels each block stores beyond its interior volume, on all six faces.                                                                                         |
| `MAX_WORKERS`                | `4`                                  | `world/worker-pool.ts`           | How many world workers one pool runs at most.                                                                                                                                         |
| `MAX_FILLS_PER_WORKER`       | `4`                                  | `world/fill-client.ts`           | How a drain distributes the workload: one batch per worker at a time, of at most this many slots.                                                                                     |
| `MAX_SPARE_SETS`             | `MAX_FILLS_PER_WORKER * MAX_WORKERS` | `world/fill-client.ts`           | Sets of a block's three arrays kept to lend to the next fill, per array length.                                                                                                       |
| `SUPERCHUNK_SPAN`            | `2`                                  | `renderers/triangle-renderer.ts` | Chunk cells per superchunk per axis: 2 chunks of 64³ voxels, 256³ world units.                                                                                                        |
| `MAX_UPLOAD_STALL_FRAMES`    | `45`                                 | `renderers/triangle-renderer.ts` | Frames a superchunk may keep gaining members before a partial upload is forced, and frames an edit's group of blocks may wait on each other before whatever has landed uploads alone. |
| `MAX_UPLOAD_BYTES_PER_FRAME` | `2 * 1024 * 1024`                    | `renderers/triangle-renderer.ts` | The bytes of merged geometry one frame may mark for GPU upload.                                                                                                                       |
| `GEOMETRY_POOL_FRAMES`       | `8`                                  | `renderers/triangle-renderer.ts` | Frames' worth of upload the recycled geometry pool holds.                                                                                                                             |
| `DEFAULT_OCCLUSION_INTERVAL` | `200`                                | `renderers/triangle-renderer.ts` | Frames between the hardware occlusion queries, each a readback that stalls the pipeline.                                                                                              |
| `INDEX_UPLOAD_BYTES`         | `4`                                  | `renderers/superchunk.ts`        | The bytes one index of merged geometry adds to an upload.                                                                                                                             |
| `VERTEX_BYTES`               | `20`                                 | `renderers/vertex-format.ts`     | Bytes one vertex of merged geometry occupies, position and both lanes.                                                                                                                |
| `MAX_TILE_INDEX`             | `255`                                | `renderers/vertex-format.ts`     | The largest tile index the sheet lane can hold.                                                                                                                                       |
| `MAX_BUILDS_PER_DRAIN`       | `12`                                 | `renderers/mesh-client.ts`       | How many block meshes to hand the workers per drain, in total; the workers do the heavy lifting, so the main thread only pays for wrapping the requests.                              |
