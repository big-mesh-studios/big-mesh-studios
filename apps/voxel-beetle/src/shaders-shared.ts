// The nodes the editor's CPU voxel picker is built from: the uniform slots it
// shares with the GPU material, and the pinhole ray it marches. The traversal
// itself is the package's `marchVolume`, so a pick and a rendered pixel can
// never disagree about which voxel is where.
import {
  Fn,
  float,
  If,
  ivec3,
  uniformRaw,
  varying,
  vec3,
} from "@random-mesh/rmsl";
import { marchVolume } from "@big-mesh-studios/stacker/renderer";

const FOCAL_LENGTH = 2;

// The picker's uniform slots, named as the GPU material names its own, so a
// value uploaded for one reads the same in the other. shaders.ts ships the
// names to the app.
export const uPalette = uniformRaw("uPalette", "sampler2D");
export const uVoxels = uniformRaw("uVoxels", "usampler3D");
export const uResolution = uniformRaw("uResolution", "vec2");
export const uDimensions = uniformRaw("uDimensions", "vec3");
export const uVoxelCount = uniformRaw("uVoxelCount", "vec3");
export const uLightDir = uniformRaw("uLightDir", "vec3");
export const uLightColour = uniformRaw("uLightColour", "vec3");
export const uAmbientColour = uniformRaw("uAmbientColour", "vec3");
export const vUv = varying("vec2");
export const uCameraPosition = uniformRaw("uCameraPosition", "vec3");
export const uWorldToModel = uniformRaw("uWorldToModel", "mat3");
export const uUnlit = uniformRaw("uUnlit", "bool");

/**
 * The CPU voxel picker's ray: a pinhole camera at `uCameraPosition` looking
 * down -z with `FOCAL_LENGTH`, from the click's UV. `uWorldToModel` carries
 * the model's rotation, so the ray is followed in model space exactly like the
 * GPU marcher. The GPU path (VoxelPreviewMaterial) instead derives its ray
 * from the bounding box's interpolated model-space position, which matches
 * this formula when the camera's fov is 2 * atan(0.5).
 */
export const rayMarcher = () => {
  const fragmentCoord = vUv.mul(uResolution);
  const screenPosition = fragmentCoord
    .mul(float(2))
    .sub(uResolution)
    .div(uResolution.y);

  const rayOrigin = uWorldToModel.mul(uCameraPosition);
  const rayDirection = uWorldToModel.mul(
    vec3(screenPosition.x, screenPosition.y, float(-FOCAL_LENGTH)).normalize(),
  );

  return marchVolume({
    rayOrigin,
    rayDirection,
    voxels: uVoxels,
    palette: uPalette,
    dimensions: uDimensions,
    voxelCount: uVoxelCount,
    lightDir: uLightDir,
    lightColour: uLightColour,
    ambientColour: uAmbientColour,
    unlit: uUnlit,
  });
};

export const cpuVoxelPicker = Fn(() => {
  const { colour, voxelPos } = rayMarcher();
  If(colour.a.lessThan(float(0.5)), () => {
    voxelPos.assign(ivec3(-1, -1, -1));
  });
  return voxelPos;
});
