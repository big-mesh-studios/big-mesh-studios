// Which voxel a ray through the preview meets, walked over the volume one cell
// at a time on the processor.
//
// This used to be the same ray marcher the preview was drawn with, transpiled to
// JavaScript and run here, so that a point on the canvas and the voxel drawn
// under it could not come to disagree. Now the preview is geometry and the two
// are separate: the card decides what a fragment covers, and this decides what a
// pointer is over. They agree because the ray is built from the same camera and
// meets the same array of palette indices — not because one program is the
// translation of the other.
//
// The walk is the marcher's: enter the box, then step from one cell boundary to
// the next along whichever axis the ray crosses soonest, until a cell has
// something in it or the box is behind.
import { Bitmap, Dimensions3D, Vector3D } from "@big-mesh-studios/maths";
import { readVoxel, type Volume } from "@big-mesh-studios/stacker/volume";

/** The voxel a ray met, in the model's own axes. */
export interface VoxelPick {
  voxel: [number, number, number];
}

export interface ModelPickView {
  /** The volume the model is drawn from, and picked against. */
  volume: Volume;
  /** How the model is turned, as its world-to-model rotation, column by column. */
  worldToModel: ArrayLike<number>;
  /** Where the camera stands, in world space. */
  camera: Vector3D;
  /** The canvas, in drawing-buffer pixels. */
  resolution: { x: number; y: number };
  /** The point on the canvas, in the same pixels. */
  uv: { x: number; y: number };
}

/**
 * The length of the ray to a point of the canvas, which the perspective camera's
 * own field of view sets: it looks down its negative z with a half-height of a
 * half at one unit, which is a focal length of two. The screen position is
 * measured against the canvas's height rather than its width, so a ray keeps the
 * same angle to the view direction whatever shape the canvas is.
 */
const FOCAL_LENGTH = 2;

/** A direction so nearly along an axis that crossing it is not worth a step. */
const PARALLEL = 1e-12;

/** The voxel under a point of the canvas, or nothing where the ray meets none. */
export function pickModel(view: ModelPickView): VoxelPick | undefined {
  const { volume } = view;
  const count = {
    x: volume.dimensions.width,
    y: volume.dimensions.height,
    z: volume.dimensions.depth,
  };

  // The box the model is drawn in: its longest axis made one, centred on the
  // origin, cell 0 anchored at minus half of it. This is the framing the preview
  // and the pick outline are both built against, so a pick and the box drawn
  // round it enclose the same cell.
  const normalized = Dimensions3D.normalize(volume.dimensions);
  const half = {
    x: normalized.width / 2,
    y: normalized.height / 2,
    z: normalized.depth / 2,
  };
  const cell = {
    x: normalized.width / count.x,
    y: normalized.height / count.y,
    z: normalized.depth / count.z,
  };

  // The ray, in the model's own space: where the camera is once the turntable's
  // rotation is undone, and the way it looks from there.
  const screen = {
    x: ((2 * view.uv.x - view.resolution.x) / view.resolution.y) * FOCAL_LENGTH,
    y: ((2 * view.uv.y - view.resolution.y) / view.resolution.y) * FOCAL_LENGTH,
  };
  const m = view.worldToModel;
  const turn = (x: number, y: number, z: number): Vector3D =>
    Vector3D.create(
      m[0] * x + m[3] * y + m[6] * z,
      m[1] * x + m[4] * y + m[7] * z,
      m[2] * x + m[5] * y + m[8] * z,
    );
  const origin = turn(view.camera.x, view.camera.y, view.camera.z);
  const direction = Vector3D.normalize(
    Vector3D.subtract(turn(screen.x, screen.y, -FOCAL_LENGTH), origin),
  );

  // Where the ray enters the box and where it leaves, held to the ray's own
  // start so that one beginning inside the box enters where it begins.
  let enter = 0;
  let leave = Infinity;
  const axes = ["x", "y", "z"] as const;
  for (const axis of axes) {
    const along = direction[axis];
    if (Math.abs(along) < PARALLEL) {
      if (origin[axis] < -half[axis] || origin[axis] > half[axis]) {
        return undefined;
      }
      continue;
    }
    const to = (plane: number) => (plane - origin[axis]) / along;
    const near = along > 0 ? to(-half[axis]) : to(half[axis]);
    const far = along > 0 ? to(half[axis]) : to(-half[axis]);
    if (near > enter) {
      enter = near;
    }
    if (far < leave) {
      leave = far;
    }
  }
  if (enter > leave) {
    return undefined;
  }

  const entered = Vector3D.add(
    origin,
    Vector3D.multiplyScalar(direction, enter),
  );
  const step = {
    x: Math.abs(direction.x) < PARALLEL ? 0 : Math.sign(direction.x),
    y: Math.abs(direction.y) < PARALLEL ? 0 : Math.sign(direction.y),
    z: Math.abs(direction.z) < PARALLEL ? 0 : Math.sign(direction.z),
  };

  // The cell the ray enters, and how far along the ray each axis is from that
  // cell's far boundary — the boundary the ray will cross next.
  const at = { x: 0, y: 0, z: 0 };
  const toBoundary = { x: 0, y: 0, z: 0 };
  const stride = { x: 0, y: 0, z: 0 };
  for (const axis of axes) {
    const index = Math.floor((entered[axis] + half[axis]) / cell[axis]);
    if (Math.abs(direction[axis]) < PARALLEL) {
      // The ray runs along this axis and never crosses one of its boundaries, so
      // it is never the one to step on. Settled here rather than left to divide
      // by a near-zero, which would leave a NaN that no comparison can order.
      at[axis] = index;
      toBoundary[axis] = Infinity;
      stride[axis] = Infinity;
      continue;
    }
    at[axis] = direction[axis] > 0 ? index : index - 1;
    const low = -half[axis] + at[axis] * cell[axis];
    const boundary = direction[axis] > 0 ? low + cell[axis] : low;
    toBoundary[axis] = (boundary - entered[axis]) / direction[axis];
    stride[axis] = cell[axis] / Math.abs(direction[axis]);
  }

  // Crossing all three axes needs at most three steps a cell, so this is a bound
  // the walk reaches only if the arithmetic above has gone wrong.
  const limit = 3 * (count.x + count.y + count.z) + 3;
  for (let walked = 0; walked < limit; walked++) {
    if (
      at.x >= 0 &&
      at.y >= 0 &&
      at.z >= 0 &&
      at.x < count.x &&
      at.y < count.y &&
      at.z < count.z &&
      readVoxel(volume, at.x, at.y, at.z) !== Bitmap.EMPTY
    ) {
      return { voxel: [at.x, at.y, at.z] };
    }

    if (toBoundary.x <= toBoundary.y && toBoundary.x <= toBoundary.z) {
      at.x += step.x;
      toBoundary.x += stride.x;
    } else if (toBoundary.y <= toBoundary.z) {
      at.y += step.y;
      toBoundary.y += stride.y;
    } else {
      at.z += step.z;
      toBoundary.z += stride.z;
    }
  }
  return undefined;
}
