// Everything needed to draw a voxel model: the shapes it is described by, the
// solver that packs it into the bytes the material reads, the marcher that
// walks it, the material itself, the size of the box it is drawn inside, and
// the group of boxes a figure of several parts is drawn as — either kept in
// step with an edit, or baked once and drawn as many copies as are wanted.
export {
  axisSides,
  centrePivot,
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
export { solveVoxels, encodePalette } from "./solver";
export type { ViewSpec } from "./solver";
export { marchVolume } from "./march";
export type { MarchVolumeNodes } from "./march";
export { VoxelModelMaterial } from "./material";
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
