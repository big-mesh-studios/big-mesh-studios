import { Mesh, Quaternion, Vector3 } from "@random-mesh/rmsl/scene";
import { Dimensions3D } from "../../maths";

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

/**
 * The 12 edges of a voxel's cell in model space, as `LineSegmentsGeometry`
 * positions (one `(xyz xyz)` start/end pair per edge). The cell layout matches
 * the ray marcher in shaders-shared, which anchors cell 0 at `-dimensions / 2`
 * (see its `cellOrigin` mapping), so the outline encloses exactly the voxel
 * the marcher renders and the CPU picker returns.
 */
export const voxelCellEdges = (
  dimensions: Dimensions3D,
  voxel: [number, number, number],
): Float32Array => {
  const normalized = Dimensions3D.normalize(dimensions);
  const half = {
    x: normalized.width / 2,
    y: normalized.height / 2,
    z: normalized.depth / 2,
  };
  const cellSize = {
    x: normalized.width / dimensions.width,
    y: normalized.height / dimensions.height,
    z: normalized.depth / dimensions.depth,
  };
  const min = {
    x: cellSize.x * voxel[0] - half.x,
    y: cellSize.y * voxel[1] - half.y,
    z: cellSize.z * voxel[2] - half.z,
  };
  const max = {
    x: min.x + cellSize.x,
    y: min.y + cellSize.y,
    z: min.z + cellSize.z,
  };
  const corners = [
    [min.x, min.y, min.z],
    [max.x, min.y, min.z],
    [max.x, max.y, min.z],
    [min.x, max.y, min.z],
    [min.x, min.y, max.z],
    [max.x, min.y, max.z],
    [max.x, max.y, max.z],
    [min.x, max.y, max.z],
  ] as const;
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ] as const;
  const positions = new Float32Array(edges.length * 6);
  edges.forEach(([a, b], i) => {
    positions.set(corners[a], i * 6);
    positions.set(corners[b], i * 6 + 3);
  });
  return positions;
};
