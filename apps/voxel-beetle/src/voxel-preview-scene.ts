import { Object3D, Quaternion, Vector3 } from "@random-mesh/rmsl/scene";
import { Dimensions3D, Vector3D } from "@big-mesh-studios/maths";
import type { VoxelMeshMaterial } from "./voxel-mesh-material";

// The CPU voxel picker builds its ray with a pinhole camera whose focal length
// is 2 (see FOCAL_LENGTH in picking/volume-picker). A perspective camera with
// this vertical fov emits exactly those rays, so the click picker and the drawn
// preview agree no matter where the model is turned.
/**
 * How the model is lit, wherever it is drawn. The preview and the small picture
 * a published model carries are two different renderers — one on the graphics
 * card, one walking rays on the processor — and a model that came out looking
 * differently lit in a listing than on the canvas would look like a different
 * model.
 */
export const LIGHT_DIR = Object.freeze(
  Vector3D.normalize(Vector3D.create(0.4, 0.7, 0.8)),
);
export const LIGHT_COLOUR = Object.freeze([1.0, 0.97, 0.9]);
export const AMBIENT_COLOUR = Object.freeze([0.35, 0.35, 0.4]);

/** Half the camera's field of view, up and down, in radians. */
const HALF_FOV = Math.atan(0.5);

export const FOV = 2 * HALF_FOV * (180 / Math.PI);
export const NEAR = 0.1;
export const FAR = 100;

/** How much of the room across the view a framed figure leaves around itself. */
const FRAMING_MARGIN = 0.9;

/**
 * How much of the drawn world one voxel takes up for a model framed to the
 * view: one whose voxels reach `reach` voxels from the point the camera looks
 * at, seen from `distance` away on a canvas `aspect` times as wide as it is
 * tall.
 *
 * The model turns about the point the camera looks at, so what has to fit in
 * the view is the sphere the model turns inside, and a framing holds however
 * it is turned afterwards. A sphere that fills the view touches the sides of
 * the view rather than the plane through its middle, which is why this is a
 * sine of the angle it is seen through and not a tangent.
 *
 * A canvas taller than it is wide has less room across it than up it, and is
 * framed on the narrower of the two.
 *
 * @param reach How far the model reaches from that point, in voxels, which
 * `volumeReach` measures. A model with nothing drawn in it reaches nowhere and
 * so gives nothing to divide by: it is drawn at one voxel to the unit.
 */
export const framedVoxelSize = (
  reach: number,
  distance: number,
  aspect: number,
): number => {
  if (reach <= 0) {
    return 1;
  }

  const halfAngle = Math.min(HALF_FOV, Math.atan(Math.tan(HALF_FOV) * aspect));
  return (FRAMING_MARGIN * distance * Math.sin(halfAngle)) / reach;
};

/**
 * Lights a model the way this editor lights one, and sets the depth bias a
 * picked voxel's outline is drawn against.
 *
 * A material carries the model's shape and knows nothing about how it should
 * look, because the world lights a model by its own sun. This is what the
 * editor asks for, and it is asked for on every frame because a material made
 * since the last one arrives with its own to be told.
 *
 * @param unlit Whether to show the colours flat rather than lit.
 */
export const lightMaterial = (material: VoxelMeshMaterial, unlit: boolean) => {
  material.lightDir = [LIGHT_DIR.x, LIGHT_DIR.y, LIGHT_DIR.z];
  material.lightColour = [LIGHT_COLOUR[0], LIGHT_COLOUR[1], LIGHT_COLOUR[2]];
  material.ambientColour = [
    AMBIENT_COLOUR[0],
    AMBIENT_COLOUR[1],
    AMBIENT_COLOUR[2],
  ];
  material.unlit = unlit;
};

const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);

/**
 * The 12 edges of a box between two opposite corners, as `LineSegmentsGeometry`
 * positions: one `(xyz xyz)` start/end pair per edge.
 */
export const boxEdges = (min: Vector3D, max: Vector3D): Float32Array => {
  // The eight corners in the order every box's are: the near face, then the far
  // one, each walked once round. The twelve edges join them in the same order
  // whichever box this is.
  const corners = [
    [min.x, min.y, min.z],
    [max.x, min.y, min.z],
    [max.x, max.y, min.z],
    [min.x, max.y, min.z],
    [min.x, min.y, max.z],
    [max.x, min.y, max.z],
    [max.x, max.y, max.z],
    [min.x, max.y, max.z],
  ];
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
  ];
  const positions = new Float32Array(edges.length * 6);
  edges.forEach(([a, b], i) => {
    positions.set(corners[a], i * 6);
    positions.set(corners[b], i * 6 + 3);
  });
  return positions;
};

/**
 * The 12 edges of a voxel's cell in model space, as `LineSegmentsGeometry`
 * positions (one `(xyz xyz)` start/end pair per edge). The cell layout is the one
 * the mesher lays its vertices out on, which anchors cell 0 at
 * `-dimensions / 2`, so the outline encloses exactly the voxel the picker
 * returns and the geometry fills.
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
  const min = Vector3D.create(
    cellSize.x * voxel[0] - half.x,
    cellSize.y * voxel[1] - half.y,
    cellSize.z * voxel[2] - half.z,
  );
  return boxEdges(
    min,
    Vector3D.create(min.x + cellSize.x, min.y + cellSize.y, min.z + cellSize.z),
  );
};

/**
 * Turns the model to the orientation the world-to-model matrix (used by both the
 * CPU voxel picker and the material's ray origin) describes: its world rotation
 * is the inverse of that matrix, so its world-to-model — the inverse of its
 * world matrix — is exactly what the picker follows its ray along.
 */
export const rotateModel = (
  model: Object3D,
  yaw: number,
  pitch: number,
  spin: number,
  pitchQuaternion = new Quaternion(),
  yawQuaternion = new Quaternion(),
) => {
  pitchQuaternion.setFromAxisAngle(X_AXIS, pitch);
  yawQuaternion.setFromAxisAngle(Y_AXIS, yaw + spin);
  model.quaternion.copy(pitchQuaternion.multiply(yawQuaternion));
};
