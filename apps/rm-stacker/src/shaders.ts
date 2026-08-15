import {
  uAmbientColour,
  uBack,
  uBottom,
  uCameraPosition,
  uDimensions,
  uFront,
  uLeft,
  uLightColour,
  uLightDir,
  uPalette,
  uResolution,
  uRight,
  uTop,
  uUnlit,
  uVoxelCount,
  uWorldToModel,
  vUv,
} from "./shaders-shared";

// The uniform and varying slot names the ray marcher in shaders-shared uses.
// The GPU material (VoxelPreviewMaterial) compiles its own shader from the
// same source at runtime, while the CPU voxel picker is precompiled at build
// time — this module bridges the two by name.
export default {
  uFront: uFront.name,
  uBack: uBack.name,
  uLeft: uLeft.name,
  uRight: uRight.name,
  uTop: uTop.name,
  uBottom: uBottom.name,
  uResolution: uResolution.name,
  uDimensions: uDimensions.name,
  uVoxelCount: uVoxelCount.name,
  uLightDir: uLightDir.name,
  uLightColour: uLightColour.name,
  uAmbientColour: uAmbientColour.name,
  uCameraPosition: uCameraPosition.name,
  uWorldToModel: uWorldToModel.name,
  uPalette: uPalette.name,
  vUv: vUv.name,
  uUnlit: uUnlit.name,
};
