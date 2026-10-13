import {
  uAmbientColour,
  uCameraPosition,
  uClickUv,
  uDimensions,
  uLightColour,
  uLightDir,
  uPalette,
  uResolution,
  uUnlit,
  uVoxelCount,
  uVoxels,
  uWorldToModel,
} from "./shaders-shared";

// The uniform slot names the ray marcher in shaders-shared uses. The GPU
// material (VoxelPreviewMaterial) compiles its own shader from the same source
// at runtime, while the CPU voxel picker is precompiled at build time — this
// module bridges the two by name.
export default {
  uVoxels: uVoxels.name,
  uResolution: uResolution.name,
  uDimensions: uDimensions.name,
  uVoxelCount: uVoxelCount.name,
  uLightDir: uLightDir.name,
  uLightColour: uLightColour.name,
  uAmbientColour: uAmbientColour.name,
  uCameraPosition: uCameraPosition.name,
  uWorldToModel: uWorldToModel.name,
  uPalette: uPalette.name,
  uClickUv: uClickUv.name,
  uUnlit: uUnlit.name,
};
