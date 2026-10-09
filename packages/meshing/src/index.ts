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
 * - **`split-colour-boundaries`** — the reader's companion, cutting triangles so that each carries
 *   one colour, because a per-vertex colour is blended across a triangle by anything that draws
 *   it. It turns a model's colour gradient into a boundary on the geometry rather than a ramp in
 *   the interpolator, and it is here rather than in an application because it is the same seam and
 *   because what preserves a mesh through it — counting edges by position rather than by index —
 *   is `mesh-report`'s property rather than its own.
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
 * **A mesh with no chunk boundaries has none of that caveat, and `apps/sdf-modeller` takes
 * the whole of it.** Its model is one bounded box, so every vertex's fan is complete and the
 * average is right everywhere — and it must run before `split-colour-boundaries`, because
 * that pass duplicates each vertex on a colour boundary and gives each copy one side's
 * triangles, which is the same clipping this paragraph is about. Measured on a sphere, where
 * the field is exact and so the error is measurable rather than arguable, averaging converges
 * as the mesh is refined (1.1° mean at its finest voxel) where a gradient taken at
 * `Field`'s default step does not (2.1° at every one).
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

/**
 * **`split-colour-boundaries` is here because it is the same seam as the rest of this package.**
 * It takes a finished mesh and one callback — the colour of the surface at a point, which
 * `Field.colourAt` satisfies as it stands — and it knows nothing about chunks, colours or CSG,
 * exactly as `reportMesh` does not. What it shares with `reportMesh` specifically is the reason
 * it can do what it does: both count edges by position rather than by index, so a mesh holding
 * two vertices in one place is still one closed solid to them.
 *
 * It is a separate concern from the meshers and not inside them, for the same reason
 * `vertex-normals` is: a mesher produces a surface and has no opinion about how that surface is
 * presented, and which colours a model's parts are is not a thing `SurfaceSampler` can be asked.
 */
export {
  colourBoundaryScratchFor,
  ColourBoundaryScratch,
  CROSSING_MAX_STEPS,
  CROSSING_TOLERANCE,
  splitColourBoundaries,
  type BoundaryColour,
  type ColourBoundaryOptions,
} from "./split-colour-boundaries";

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
