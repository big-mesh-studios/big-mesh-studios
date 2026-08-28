// Everything needed to draw a voxel model: the shapes it is described by, the
// solver that packs it into the bytes the material reads, the marcher that
// walks it, the material itself, and the size of the box it is drawn inside.
export { sideKinds, sideKindSet } from "./data";
export type { Axis, Model, SideKind, Sides } from "./data";
export { solveVoxels, encodePalette } from "./solver";
export type { ViewSpec } from "./solver";
export { marchVolume } from "./march";
export type { MarchVolumeNodes } from "./march";
export { VoxelModelMaterial } from "./material";
export { boxSize } from "./box";
