// Everything needed to draw a voxel model: the shapes it is described by, the
// solver that packs it into the bytes a material reads, the marcher that walks it,
// the material itself, the size of the box it is drawn inside, and the group of
// boxes a figure of several parts is drawn as — either kept in step with an edit,
// or baked once and drawn as many copies as are wanted.
//
// The mesher and its material are here beside the marcher rather than only under
// `./mesh`, because the two ways of drawing a figure stand side by side and a
// caller reaching for one of them is reaching for the other. `FigureMeshes` draws
// a figure by marching each part's volume; `MeshFigureMeshes` draws the same
// figure as triangles merged from the same volume, which costs once when a part
// changes rather than once a frame for every pixel covering it.

export {
  axisSides,
  centrePivot,
  composePose,
  composeRoot,
  dimensionAxes,
  dimensionKinds,
  facingAxis,
  panelBitmap,
  panelSide,
  partDimensions,
  readSectionFace,
  sectionFaceKind,
  sideAxes,
  sideDirections,
  sideKinds,
  sideKindSet,
  turnAngles,
  turnMatrix,
} from "./data";
export type {
  Axis,
  DimensionKind,
  Figure,
  Model,
  PanelKind,
  Part,
  Section,
  SectionFaceKind,
  SideKind,
  Sides,
} from "./data";
export {
  keyAfter,
  keyAt,
  keyBefore,
  keysFor,
  lastFrame,
  movesNothing,
  NO_MOTION,
  poseAt,
  poseFigure,
  START_FRAME,
  withKey,
  withoutKey,
} from "./motion";
export type { Ease, Key, Motion, PartKeys, Pose } from "./motion";
export { solveVoxels, encodePalette, packedFaces } from "./solver";
export type { ViewSpec } from "./solver";
export { marchVolume } from "./march";
export type { MarchVolumeNodes } from "./march";
export { VoxelModelMaterial } from "./material";
export { VoxelMeshMaterial } from "./material-mesh";
export { boundsCentre, boxSize, figurePlacement, fitVoxelSize } from "./box";
export type {
  FigureBounds,
  FigureFraming,
  FigurePlacement,
  PartPlacement,
} from "./box";
export {
  applyFraming,
  bakeVolume,
  BakedFigure,
  FigureCopy,
  FigureMeshes,
  solveFigure,
  solvePart,
  standAs,
  voxelReach,
} from "./figure-meshes";
export type { BakedPart, SolvedPart } from "./figure-meshes";
export { DRAIN_BUDGET_MS, MeshFigureMeshes } from "./figure-meshes-mesh";
export {
  allChunks,
  chunkAt,
  chunkCounts,
  chunkExtent,
  chunkKey,
  chunkOrigin,
  createMeshBuilder,
  dirtyChunks,
  faceIndexOf,
  meshChunk,
  meshChunkFaces,
  normalOfFaceIndex,
  panelCellBounds,
  wholeModel,
  CHUNK_SIZE,
  VERTEX_BYTES,
  type CellBounds,
  type ChunkIndex,
  type ChunkMesh,
  type ChunkSize,
  type FaceSource,
  type MeshBuilder,
  type PanelRect,
} from "./mesh";
