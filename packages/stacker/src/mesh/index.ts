// Everything about drawing a voxel model as geometry: the sweep that merges
// exposed faces into rectangles, the chunking a model is cut into, and what one
// vertex of the result carries.
//
// A separate entry from `./renderer` because nothing here needs a graphics card,
// a shader graph or a scene graph: it is arithmetic over an array of palette
// indices, and it can be tested by filling a volume by hand.
export { FacePlane, type MergedRectangle } from "./face-plane";
export { Growable } from "./growable";
export {
  CHUNK_SIZE,
  chunkAt,
  chunkCounts,
  chunkExtent,
  chunkKey,
  chunkOrigin,
  createMeshBuilder,
  meshChunk,
  type ChunkMesh,
  type ChunkSize,
  type MeshBuilder,
} from "./mesher";
export { faceIndexOf, normalOfFaceIndex, VERTEX_BYTES } from "./vertex-format";
export {
  allChunks,
  dirtyChunks,
  wholeModel,
  type CellBounds,
} from "./dirty-bounds";
