import { Object3D, Quaternion, Side, Vector3 } from "@random-mesh/rmsl/scene";
import { Dimensions3D, Vector3D } from "@big-mesh-studios/maths";
import type { FigureMeshes } from "@big-mesh-studios/stacker/renderer";

// The CPU voxel picker builds its ray with a pinhole camera whose focal length
// is 2 (see rayMarcher in shaders-shared). A perspective camera with this
// vertical fov emits exactly those rays, so the click picker and the rendered
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

/**
 * How far the material pushes a voxel's surface away from the camera when
 * writing depth, in window-depth units, so the picked voxel's outline passes
 * the depth test against the surface it is drawn on. The volume sits in a
 * shallow slice of the depth range, so this is a fraction of a voxel and is not
 * visible — but it has to exceed the depth span of the line's screen-space
 * ribbon or the outline shimmers.
 */
export const OUTLINE_DEPTH_BIAS = 0.0001;

export const FOV = 2 * Math.atan(0.5) * (180 / Math.PI);
export const NEAR = 0.1;
export const FAR = 100;

/**
 * Lights every part of a figure the way this editor lights one, and sets the
 * depth bias the picked voxel's outline is drawn against.
 *
 * The meshes carry a figure's shape and know nothing about how it should look,
 * because the world lights the same figure by its own sun. This is what the
 * editor asks for, and it is asked for on every frame because a part added
 * since the last one arrives with a material of its own to be told.
 *
 * @param unlit Whether to show the colours flat rather than lit.
 */
export const lightFigure = (meshes: FigureMeshes, unlit: boolean) => {
  for (const material of meshes.materials) {
    material.lightDir = [LIGHT_DIR.x, LIGHT_DIR.y, LIGHT_DIR.z];
    material.lightColour = [LIGHT_COLOUR[0], LIGHT_COLOUR[1], LIGHT_COLOUR[2]];
    material.ambientColour = [
      AMBIENT_COLOUR[0],
      AMBIENT_COLOUR[1],
      AMBIENT_COLOUR[2],
    ];
    material.depthBias = OUTLINE_DEPTH_BIAS;
    material.unlit = unlit;
    // The marcher casts its rays at the faces of the box a part is drawn in, so
    // a camera taken inside that box has none in front of it to cast at and the
    // part goes out of sight. Drawing the far faces as well leaves it something
    // to cast at from within.
    material.side = Side.DoubleSide;
  }
};

const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);

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

/**
 * Turns what a figure is drawn as to the orientation the world-to-model matrix
 * (used by both the CPU voxel picker and the material's ray origin) describes:
 * its world rotation is the inverse of that matrix, so its world-to-model — the
 * inverse of its world matrix — is exactly what the picker follows its ray
 * along.
 *
 * The turn goes on the whole figure rather than on any one part, so the parts
 * keep their places against each other however it is turned.
 */
export const rotateFigure = (
  figure: Object3D,
  yaw: number,
  pitch: number,
  spin: number,
  pitchQuaternion = new Quaternion(),
  yawQuaternion = new Quaternion(),
) => {
  pitchQuaternion.setFromAxisAngle(X_AXIS, pitch);
  yawQuaternion.setFromAxisAngle(Y_AXIS, yaw + spin);
  figure.quaternion.copy(pitchQuaternion.multiply(yawQuaternion));
};
