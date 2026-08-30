// Everything needed to draw a voxel model: the shapes it is described by, the
// solver that packs it into the bytes the material reads, the marcher that
// walks it, the material itself, the size of the box it is drawn inside, and
// the group of boxes a figure of several parts is drawn as — either kept in
// step with an edit, or baked once and drawn as many copies as are wanted.
export {
  centrePivot,
  composeRoot,
  partDimensions,
  sideAxes,
  sideKinds,
  sideKindSet,
} from "./data";
export type { Axis, Figure, Model, Part, SideKind, Sides } from "./data";
export { solveVoxels, encodePalette } from "./solver";
export type { ViewSpec } from "./solver";
export { marchVolume } from "./march";
export type { MarchVolumeNodes } from "./march";
export { VoxelModelMaterial } from "./material";
export { boxSize, figurePlacement } from "./box";
export type { FigurePlacement, PartPlacement } from "./box";
export {
  bakeVolume,
  BakedFigure,
  FigureCopy,
  FigureMeshes,
  solveFigure,
  solvePart,
} from "./figure-meshes";
export type { BakedPart, SolvedPart } from "./figure-meshes";
