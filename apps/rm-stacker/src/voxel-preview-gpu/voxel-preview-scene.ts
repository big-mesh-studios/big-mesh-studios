import { Mesh, Quaternion, Vector3 } from "@random-mesh/rmsl/scene";
import { Dimensions3D } from "../maths";

// The CPU voxel picker builds its ray with a pinhole camera whose focal length
// is 2 (see rayMarcher in shaders-shared). A perspective camera with this
// vertical fov emits exactly those rays, so the click picker and the rendered
// preview agree no matter where the model is turned.
export const FOV = 2 * Math.atan(0.5) * (180 / Math.PI);
export const NEAR = 0.1;
export const FAR = 100;

const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);

/**
 * The size of the box bounding the volume, matching the box the ray marcher
 * intersects in shaders-shared: the volume (normalized) padded by one voxel on
 * each side, so rasterizing it limits the fragment shader to the pixels that
 * could possibly land on a voxel.
 */
export const boxSize = (dimensions: Dimensions3D) => {
  const normalized = Dimensions3D.normalize(dimensions);
  const scale = (axis: number, count: number) => axis * (1 + 2 / count);
  return {
    width: scale(normalized.width, dimensions.width),
    height: scale(normalized.height, dimensions.height),
    depth: scale(normalized.depth, dimensions.depth),
  };
};

/**
 * Turns the mesh to the orientation the world-to-model matrix (used by both
 * the CPU voxel picker and the material's ray origin) describes: the mesh's
 * world rotation is the inverse of that matrix, so its world-to-model — the
 * inverse of its world matrix — is exactly what the picker follows its ray
 * along.
 */
export const rotateMesh = (
  mesh: Mesh,
  yaw: number,
  pitch: number,
  spin: number,
  pitchQuaternion = new Quaternion(),
  yawQuaternion = new Quaternion(),
) => {
  pitchQuaternion.setFromAxisAngle(X_AXIS, pitch);
  yawQuaternion.setFromAxisAngle(Y_AXIS, yaw + spin);
  mesh.quaternion.copy(pitchQuaternion.multiply(yawQuaternion));
};
