// Which voxel a point on the preview meets, asked of the same ray marcher the
// preview is drawn with.
//
// The camera emits exactly the rays the picker builds (see `FOV` in
// voxel-preview-scene), so a point on the canvas and the voxel drawn under it
// cannot come to disagree.
import { Dimensions3D, type Vector3D } from "@big-mesh-studios/maths";
import shaders from "../shaders";
import { voxelPicker } from "./voxel-picker";

/** The voxel a point met, in the model's own axes. */
export interface VoxelPick {
  voxel: [number, number, number];
}

export interface ModelPickView {
  /** The packed volume the material marches. */
  voxels: Uint8Array;
  dimensions: Dimensions3D;
  /** How the model is turned, as its world-to-model rotation, column by column. */
  worldToModel: ArrayLike<number>;
  /** Where the camera stands, in world space. */
  camera: Vector3D;
  /** The canvas, in drawing-buffer pixels. */
  resolution: { x: number; y: number };
  /** The point on the canvas, in the same pixels. */
  uv: { x: number; y: number };
}

/** The voxel under a point of the canvas, or nothing where there is none. */
export function pickModel(view: ModelPickView): VoxelPick | undefined {
  const normalized = Dimensions3D.normalize(view.dimensions);

  const hit = voxelPicker({
    uniforms: {
      [shaders.uResolution]: [view.resolution.x, view.resolution.y],
      [shaders.uDimensions]: [
        normalized.width,
        normalized.height,
        normalized.depth,
      ],
      [shaders.uVoxelCount]: [
        view.dimensions.width,
        view.dimensions.height,
        view.dimensions.depth,
      ],
      [shaders.uLightDir]: [0, 0, 1],
      [shaders.uLightColour]: [1, 1, 1],
      [shaders.uAmbientColour]: [0, 0, 0],
      [shaders.uCameraPosition]: [view.camera.x, view.camera.y, view.camera.z],
      [shaders.uWorldToModel]: Array.from(view.worldToModel),
      [shaders.uUnlit]: false,
    },
    varying: {
      vUv: [view.uv.x / view.resolution.x, view.uv.y / view.resolution.y],
    },
    textures: {
      [shaders.uVoxels]: {
        data: view.voxels,
        width: view.dimensions.width,
        height: view.dimensions.height,
        depth: view.dimensions.depth,
      },
      [shaders.uPalette]: {
        data: new Uint8Array(32 * 4).fill(255),
        width: 32,
        height: 1,
      },
    },
  });

  const [x, y, z] = hit;
  if (x < 0 || y < 0 || z < 0) {
    return undefined;
  }
  return { voxel: [x, y, z] };
}
