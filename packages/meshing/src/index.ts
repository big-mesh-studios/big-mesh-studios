/**
 * Meshing a field into triangles.
 *
 * ## What is here and what is not
 *
 * **Three meshers and the seam that makes them reusable.** All three take a `SurfaceSampler` — one
 * method, a distance — and return vertices through a `SurfaceOutput`. That is the whole contract, and
 * it is why a second application whose models are not chunks can be meshed by this package without
 * anything in it knowing what a chunk is.
 *
 * - **`surfaceNets`** — one vertex per cell, no table, fewer triangles. Not manifold in general, which
 *   its own test scopes and ADR 0003 records; it is what a streamed landscape wants and what a model
 *   on round numbers usually gets away with.
 * - **`marchingCubes`** — two to five triangles per cell, a 256-entry table, vertices on the true
 *   crossings. Closed and manifold unconditionally, which is what a mesh bound for a slicer needs and
 *   is the reason it exists alongside surface nets rather than instead of it.
 * - **`mesh-report`** — the reader that says which of those a finished mesh actually is. A separate
 *   reader rather than a check inside a mesher, because a mesher validating its own output shares a
 *   premise with its own bugs.
 *
 * `ChunkMeshBuilder` is the output implementation this repository uses: a twenty-bytes-per-vertex
 * packed layout, which a caller hands straight to a renderer.
 *
 * **Vertex normals are a separate concern and live beside them rather than inside them.**
 * `vertex-normals` averages a finished mesh's own face normals, which costs one pass over
 * the index buffer instead of six field evaluations a vertex. It is not automatic, because
 * the answer is wrong along a chunk boundary — where a vertex's face fan is clipped by the
 * chunk edge — and how far from the boundary it stays correct is the caller's decision, not
 * this package's: `apps/spacescape` spends a field gradient on the faces bordering a
 * different level of detail and lets everything inside average.
 *
 * **The chunk pipeline is not here.** Region arithmetic, the worker protocol, the LOD ladder and the
 * paint-tile addressing are all in `apps/spacescape/src/mesh/`, because they are that application's
 * rather than meshing's (ADR 0024). For the same reason `marchingCubes` does not define a cell
 * ownership rule: it emits per cell, so chunking it would need one, and nothing here chunks it.
 */

export {
  emitTriangle,
  scratchFor,
  surfaceNets,
  SURFACE_NETS_CELLS,
  SURFACE_NETS_GRID,
  SurfaceNetsScratch,
  type SurfaceNetsParams,
  type SurfaceOutput,
  type SurfaceSampler,
} from "./surface-nets";

export {
  marchingCubes,
  marchingCubesScratchFor,
  MARCHING_CUBES_CELLS,
  MARCHING_CUBES_GRID,
  MarchingCubesScratch,
  SAMPLE_ZERO,
  type MarchingCubesParams,
} from "./marching-cubes";

export {
  describeReport,
  reportMesh,
  WELD_PRECISION,
  type MeshReport,
  type MeshReportOptions,
} from "./mesh-report";

export {
  ChunkMeshBuilder,
  CHUNK_VERTEX_CAPACITY,
  meshBytes,
  VERTEX_BYTES,
  type ChunkMesh,
} from "./chunk-mesh";

export {
  FaceNormalScratch,
  FaceNormalWriter,
  accumulateFaceNormals,
  resolveFaceNormal,
} from "./vertex-normals";

export { Growable } from "./growable";
