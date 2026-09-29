// What a camera in flight has under its crosshair: the voxel whose face the ray
// running out of it meets first, which way that face looks, and the empty cell
// the face points at.
//
// The ray is walked through every part's packed volume in turn, the way a
// graphics card walks a fragment shader's: from the cell the ray starts in,
// across one cell boundary at a time, always into whichever of the three cell
// boundaries the ray reaches soonest. It reads the same packed bytes the mesh is
// built from, so what it meets is what is drawn.
import { Matrix3x3, Vector3D } from "@big-mesh-studios/maths";
import {
  packedFaces,
  type PartPlacement,
  type SolvedPart,
} from "@big-mesh-studios/stacker/renderer";

/**
 * How small the ray's travel along an axis has to be before the ray counts as
 * running parallel to that axis's cell boundaries, rather than crossing them so
 * rarely that the distance to the next one is not a number.
 */
const PARALLEL = 1e-9;

/**
 * Which face of a packed voxel a ray travelling along each axis meets, in the
 * order the packing numbers them — right, left, top, bottom, front, back. A ray
 * travelling along positive x arrives at a cell through the face on its low x
 * side, which is the left one.
 */
const MET: ReadonlyArray<readonly [forwards: number, backwards: number]> = [
  [1, 0],
  [3, 2],
  [5, 4],
];

/** The outward direction of a face, as -1, 0 or 1 on each axis. */
export type FlyNormal = [number, number, number];

/** A face a ray met, and what could be put against it. */
export interface FlyFace {
  /** Which way the face looks. A ray meets a face on the side it came from. */
  normal: FlyNormal;
  /**
   * The empty cell on the far side of the face from the voxel, or undefined
   * where that cell is outside the part's box: a part's box is all it has room
   * to be drawn in, and a voxel beside it would have to be somewhere else.
   */
  place: [number, number, number] | undefined;
  /** The palette index the face shows. */
  colour: number;
}

/** A voxel a ray met, and the part whose volume holds it. */
export interface FlyPick {
  part: string;
  voxel: [number, number, number];
  /**
   * Which way the face the ray met looks, and what could be put against it, or
   * undefined where the ray began inside this voxel and met no face at all.
   */
  face?: FlyFace;
  /**
   * How far the ray travelled to reach the face, in world units. Zero where the
   * ray began inside the voxel.
   */
  distance: number;
}

/** A figure as a camera in flight is looking at it, and the crosshair's ray. */
export interface FlyPickView {
  /** Every part's volume, in the order the figure holds them. */
  solved: readonly SolvedPart[];
  /** Where each part stands in voxels, and what its box is scaled by, in that same order. */
  placements: readonly PartPlacement[];
  /** Where the crosshair stands, in the world the figure is drawn in. */
  origin: Vector3D;
  /** The way the crosshair looks, as a unit vector. */
  direction: Vector3D;
  /**
   * How far the crosshair reaches, in voxels of the figure. A part drawn at a
   * size of its own is that many of its own cells further away again, which is
   * what makes the same number of cells the same thing to reach whatever a part
   * is scaled by.
   */
  reach: number;
  /** How much of the drawn world one voxel takes up. */
  voxelSize: number;
  /** The point of the figure drawn at the middle of the view. */
  focus: Vector3D;
}

/** The cell, or undefined where it is outside a box of those dimensions. */
const inBox = (
  cell: FlyNormal,
  { width, height, depth }: { width: number; height: number; depth: number },
): FlyNormal | undefined =>
  cell[0] < 0 ||
  cell[0] >= width ||
  cell[1] < 0 ||
  cell[1] >= height ||
  cell[2] < 0 ||
  cell[2] >= depth
    ? undefined
    : cell;

/**
 * A crosshair as its reader needs it: which part it is over and what a press
 * would do there. Everything else a pick carries is a number about the geometry,
 * and two frames that picked the same voxel carry the same ones.
 */
export interface Crosshair {
  /** The part under the crosshair, or undefined where it is over nothing. */
  part?: string;
  /**
   * Whether a press would put a voxel down against the face under the crosshair.
   * A face on the part's own edge has no cell outside the box to grow into, and
   * so nowhere to put one.
   */
  places: boolean;
}

/** What a pick lets a crosshair be done to, or undefined where it met nothing. */
export const crosshairOf = (
  pick: FlyPick | undefined,
): Crosshair | undefined =>
  pick === undefined
    ? undefined
    : { part: pick.part, places: pick.face?.place !== undefined };

/** Whether two crosshairs would draw the same, however they were arrived at. */
export const sameCrosshair = (
  one: Crosshair | undefined,
  two: Crosshair | undefined,
): boolean => one?.part === two?.part && one?.places === two?.places;

const AXIS = [0, 1, 2] as const;
type Axis = (typeof AXIS)[number];

// A traversal works in three numbers a loop can walk rather than in points, and
// fills these in for one part at a time. They are held here rather than inside
// the pick because a pick walks every part in turn and never calls itself.
const partTurnBack = Matrix3x3.create();
const scratch = Vector3D.create();
const from = new Float64Array(3);
const along = new Float64Array(3);
const cell: FlyNormal = [0, 0, 0];
const extents: FlyNormal = [0, 0, 0];
const toBoundary = new Float64Array(3);
const atBoundary = new Float64Array(3);

/** The point `matrix` carries `vector` to, written into `out` as three numbers. */
const into = (matrix: Matrix3x3, vector: Vector3D, out: Float64Array): void => {
  Matrix3x3.transform(matrix, vector, scratch);
  out[0] = scratch.x;
  out[1] = scratch.y;
  out[2] = scratch.z;
};

/**
 * The voxel the crosshair's ray meets first anywhere in the figure, or undefined
 * where it meets none.
 *
 * A part is asked about by turning the ray out of the world and into that part's
 * own axes: a part stands somewhere in the figure, it may be turned, and its
 * voxels are not all the same size in the world, so a ray measured in world units
 * has to be measured against the part before it can be walked cell by cell. What
 * comes back is in world units either way, so the parts a ray met are ranked by
 * how near the crosshair each of them stood.
 *
 * The walk starts at the crosshair rather than at the part's box and steps over
 * the cells outside it, so a crosshair well outside the figure still reaches it.
 *
 * @param view.reach How far the crosshair reaches, in voxels of the figure.
 */
export const pickCrosshair = (view: FlyPickView): FlyPick | undefined => {
  const reaching = view.reach * view.voxelSize;
  let nearest: FlyPick | undefined;
  let nearestDistance = Infinity;

  view.solved.forEach(({ name, dimensions, voxels }, index) => {
    const stand = view.placements[index];

    if (stand === undefined || voxels.length === 0) {
      return;
    }

    const { width, height, depth } = dimensions;

    if (width === 0 || height === 0 || depth === 0) {
      return;
    }

    extents[0] = width;
    extents[1] = height;
    extents[2] = depth;

    // One cell of this part, measured from the part's own middle, in world
    // units. A part's cells are laid out from its middle outwards, and the
    // placement has already scaled its longest side to one world unit, so this
    // is what one step along a cell axis is worth to the ray.
    const scale =
      (stand.scale * view.voxelSize) / Math.max(width, height, depth);

    if (scale <= 0) {
      return;
    }

    const faces = packedFaces(dimensions, voxels);
    Matrix3x3.transpose(stand.turn, partTurnBack);

    // Where the ray starts, and which way it points, in the part's own axes, in
    // world units — which is what `scale` is measured in, so the walk below can
    // turn world units into this part's cells. A cell's middle is half a cell in
    // from the box's own edge, so a cell index counts from the middle of the box
    // rather than from its low corner, and the ray's place among the cells is
    // measured from that low corner.
    //
    // A part's middle and the point the figure is turned about are both in
    // voxels, and a voxel is worth `voxelSize` of the world, so both are brought
    // into the world before they are subtracted from a world position.
    into(
      partTurnBack,
      {
        x: view.origin.x - (stand.position.x + view.focus.x) * view.voxelSize,
        y: view.origin.y - (stand.position.y + view.focus.y) * view.voxelSize,
        z: view.origin.z - (stand.position.z + view.focus.z) * view.voxelSize,
      },
      from,
    );
    into(partTurnBack, view.direction, along);

    for (const axis of AXIS) {
      from[axis] = extents[axis] / 2 + from[axis] / scale;
    }

    for (const axis of AXIS) {
      const pointing = along[axis];
      const one =
        Math.abs(pointing) < PARALLEL ? Infinity : scale / Math.abs(pointing);

      toBoundary[axis] = one;
      cell[axis] = Math.floor(from[axis]);
      atBoundary[axis] =
        (pointing > 0 ? cell[axis] + 1 - from[axis] : from[axis] - cell[axis]) *
        one;
    }

    // The cells between the crosshair and the box, and then the cells of the box
    // itself. A ray that has reached its reach is at the end of them.
    const steps = Math.ceil(reaching / scale) + 8;

    let travelled = 0;
    let enteredAlong: Axis | undefined;

    for (let step = 0; step < steps; step++) {
      if (
        cell[0] >= 0 &&
        cell[1] >= 0 &&
        cell[2] >= 0 &&
        cell[0] < width &&
        cell[1] < height &&
        cell[2] < depth &&
        faces.solid(cell[0], cell[1], cell[2])
      ) {
        let face: FlyFace | undefined;

        if (enteredAlong !== undefined) {
          const normal: FlyNormal = [0, 0, 0];
          normal[enteredAlong] = along[enteredAlong] > 0 ? -1 : 1;

          face = {
            normal,
            place: inBox(
              [cell[0] + normal[0], cell[1] + normal[1], cell[2] + normal[2]],
              dimensions,
            ),
            colour: faces.colour(
              cell[0],
              cell[1],
              cell[2],
              MET[enteredAlong][along[enteredAlong] > 0 ? 0 : 1],
            ),
          };
        }

        if (travelled < nearestDistance) {
          nearestDistance = travelled;
          nearest = {
            part: name,
            voxel: [cell[0], cell[1], cell[2]],
            face,
            distance: travelled,
          };
        }

        return;
      }

      // Whichever boundary the ray reaches soonest is the one it crosses next.
      if (atBoundary[0] < atBoundary[1] && atBoundary[0] < atBoundary[2]) {
        travelled = atBoundary[0];
        enteredAlong = 0;
        cell[0] += along[0] > 0 ? 1 : -1;
        atBoundary[0] += toBoundary[0];
      } else if (atBoundary[1] < atBoundary[2]) {
        travelled = atBoundary[1];
        enteredAlong = 1;
        cell[1] += along[1] > 0 ? 1 : -1;
        atBoundary[1] += toBoundary[1];
      } else {
        travelled = atBoundary[2];
        enteredAlong = 2;
        cell[2] += along[2] > 0 ? 1 : -1;
        atBoundary[2] += toBoundary[2];
      }

      if (travelled > reaching) {
        return;
      }
    }
  });

  return nearest;
};
