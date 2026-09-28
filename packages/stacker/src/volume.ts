import {
  Bitmap,
  Dimensions3D,
  Vector2D,
  Vector3D,
} from "@big-mesh-studios/maths";

// A model is a box of voxels here rather than a set of drawings: the volume
// itself, the planes it is edited through, and the packed form its material
// marches. `packVolume` lives beside the packing loop it shares its bit layout
// with, and is re-exported rather than written twice.
export { packVolume } from "./solver";

/** One of a volume's three axes, named as the vectors that address it name it. */
export type Axis = "x" | "y" | "z";

/** The axis each extent of a box is measured along. */
export const dimensionAxes = {
  width: "x",
  height: "y",
  depth: "z",
} as const satisfies Record<keyof Dimensions3D, Axis>;

/** How many cells of a box lie between two planes across one axis. */
export const dimensionCount = {
  x: (dimensions: Dimensions3D) => dimensions.width,
  y: (dimensions: Dimensions3D) => dimensions.height,
  z: (dimensions: Dimensions3D) => dimensions.depth,
} as const satisfies Record<Axis, (dimensions: Dimensions3D) => number>;

/**
 * A box of voxels, one palette index per voxel and `Bitmap.EMPTY` where nothing
 * is there. The indices are laid out a plane at a time and a row within a plane,
 * so a voxel at `(x, y, z)` sits at `z * width * height + y * width + x`.
 */
export interface Volume {
  dimensions: Dimensions3D;
  voxels: Uint8Array;
}

/** How many voxels a box holds, which is also how long its array has to be. */
export function volumeLength(dimensions: Dimensions3D): number {
  return dimensions.width * dimensions.height * dimensions.depth;
}

/** An empty box: every cell of it `Bitmap.EMPTY`. */
export function createVolume(dimensions: Dimensions3D): Volume {
  return {
    dimensions: { ...dimensions },
    voxels: new Uint8Array(volumeLength(dimensions)).fill(Bitmap.EMPTY),
  };
}

/** Where the voxel at `(x, y, z)` sits in the array of a box these dimensions. */
export function volumeOffset(
  dimensions: Dimensions3D,
  x: number,
  y: number,
  z: number,
): number {
  return z * dimensions.width * dimensions.height + y * dimensions.width + x;
}

/** Whether `(x, y, z)` is a voxel of a box these dimensions. */
export function volumeContains(
  dimensions: Dimensions3D,
  x: number,
  y: number,
  z: number,
): boolean {
  return (
    x >= 0 &&
    y >= 0 &&
    z >= 0 &&
    x < dimensions.width &&
    y < dimensions.height &&
    z < dimensions.depth
  );
}

/** The palette index of the voxel at `(x, y, z)`. */
export function readVoxel(
  volume: Volume,
  x: number,
  y: number,
  z: number,
): number {
  return volume.voxels[volumeOffset(volume.dimensions, x, y, z)];
}

/** Puts `index` in the voxel at `(x, y, z)`. */
export function writeVoxel(
  volume: Volume,
  x: number,
  y: number,
  z: number,
  index: number,
): void {
  volume.voxels[volumeOffset(volume.dimensions, x, y, z)] = index;
}

/** Whether anything at all has been put in the box. */
export function volumeIsEmpty(volume: Volume): boolean {
  return !volume.voxels.some((index) => index !== Bitmap.EMPTY);
}

/**
 * The smallest box that encloses every voxel with something in it, or undefined
 * for a box with nothing in it. A model drawn in the corner of a large box is
 * framed on what it is rather than on the space it was given.
 */
export function filledBounds(
  volume: Volume,
): { low: Vector3D; dimensions: Dimensions3D } | undefined {
  const { dimensions, voxels } = volume;
  const low = Vector3D.create(
    dimensions.width,
    dimensions.height,
    dimensions.depth,
  );
  const high = Vector3D.create(-1, -1, -1);

  for (let z = 0; z < dimensions.depth; z++) {
    for (let y = 0; y < dimensions.height; y++) {
      for (let x = 0; x < dimensions.width; x++) {
        if (voxels[volumeOffset(dimensions, x, y, z)] === Bitmap.EMPTY) {
          continue;
        }
        low.x = Math.min(low.x, x);
        low.y = Math.min(low.y, y);
        low.z = Math.min(low.z, z);
        high.x = Math.max(high.x, x);
        high.y = Math.max(high.y, y);
        high.z = Math.max(high.z, z);
      }
    }
  }

  if (high.x < 0) {
    return undefined;
  }

  return {
    low,
    dimensions: {
      width: high.x - low.x + 1,
      height: high.y - low.y + 1,
      depth: high.z - low.z + 1,
    },
  };
}

/**
 * How far the voxels with something in them reach from `from`, in voxels: the
 * distance to the furthest of their centres, plus half a voxel's diagonal.
 *
 * Measured over the voxels themselves rather than over the box they sit in,
 * because a drawing that fills a corner of a large box would otherwise be
 * framed as though it filled the whole of it. A box with nothing in it has no
 * reach at all.
 *
 * @param from the point it is measured from, in voxels from the box's origin
 */
export function volumeReach(volume: Volume, from = Vector3D.EMPTY): number {
  const { dimensions, voxels } = volume;
  const corner = Math.sqrt(3) / 2;
  let furthest = 0;

  for (let z = 0; z < dimensions.depth; z++) {
    for (let y = 0; y < dimensions.height; y++) {
      for (let x = 0; x < dimensions.width; x++) {
        if (voxels[volumeOffset(dimensions, x, y, z)] === Bitmap.EMPTY) {
          continue;
        }
        furthest = Math.max(
          furthest,
          Math.hypot(x + 0.5 - from.x, y + 0.5 - from.y, z + 0.5 - from.z) +
            corner,
        );
      }
    }
  }

  return furthest;
}

/**
 * The box re-framed to `to`, keeping every voxel that still falls inside it and
 * leaving the rest of the new space empty.
 *
 * `alignment` names the end of each changed extent the change is made at, so
 * dragging an edge inwards takes the voxels at that edge away, and dragging the
 * same edge outwards puts the new room at that edge rather than at the other one.
 *
 * @param alignment the end of each extent the change is made at, which is
 *   either end of the box; an extent left out is changed at its far end
 */
export function resizeVolume(
  volume: Volume,
  to: Dimensions3D,
  alignment: Partial<Record<keyof Dimensions3D, "min" | "max">> = {},
): Volume {
  const from = volume.dimensions;
  const resized = createVolume(to);

  const shiftFor = (dimension: keyof Dimensions3D) =>
    alignment[dimension] === "min" ? to[dimension] - from[dimension] : 0;

  const shiftX = shiftFor("width");
  const shiftY = shiftFor("height");
  const shiftZ = shiftFor("depth");

  for (let z = 0; z < from.depth; z++) {
    for (let y = 0; y < from.height; y++) {
      for (let x = 0; x < from.width; x++) {
        const index = volume.voxels[volumeOffset(from, x, y, z)];
        if (index === Bitmap.EMPTY) {
          continue;
        }
        const moved = Vector3D.create(x + shiftX, y + shiftY, z + shiftZ);
        if (volumeContains(to, moved.x, moved.y, moved.z)) {
          writeVoxel(resized, moved.x, moved.y, moved.z, index);
        }
      }
    }
  }

  return resized;
}

/**********************************************************************************/
/*                                     Slices                                     */
/**********************************************************************************/
/**
 * A plane through a volume, named by the two axes its cells run across and down:
 * the `xy` plane runs across x and down y, and does not vary along z. The three
 * are the cyclic set, so each is the one before it turned a quarter about.
 */
export type Plane = "xy" | "yz" | "zx";

/** The axis a plane's cells run across, and the axis they run down. */
export const planeAxes = {
  xy: ["x", "y"],
  yz: ["y", "z"],
  zx: ["z", "x"],
} as const satisfies Record<Plane, readonly [Axis, Axis]>;

/** The axis a plane does not vary along, and the one it is cut into slices by. */
export const planeSlicedAxis = {
  xy: "z",
  yz: "x",
  zx: "y",
} as const satisfies Record<Plane, Axis>;

/** How many slices a box is cut into across `plane`. */
export function planeSliceCount(
  dimensions: Dimensions3D,
  plane: Plane,
): number {
  return dimensionCount[planeSlicedAxis[plane]](dimensions);
}

/**
 * One slice of a box: the plane it lies in, how far along the axis that plane
 * does not vary it stands, and how many cells across and down it is drawn. Both
 * of a slice's axes count up from the low end of the box, so a cell at `(u, v)`
 * of a slice and a voxel at `(x, y, z)` of the box are in one fixed relation.
 */
export interface Slice {
  plane: Plane;
  /** The voxel along the axis the plane does not vary along, from the low end. */
  at: number;
  /** How many cells across the slice runs. */
  width: number;
  /** How many cells down the slice runs. */
  height: number;
}

/** The slice of a box that stands `at` along the axis `plane` does not vary. */
export function sliceAt(
  dimensions: Dimensions3D,
  plane: Plane,
  at: number,
): Slice {
  const [across, down] = planeAxes[plane];
  return {
    plane,
    at,
    width: dimensionCount[across](dimensions),
    height: dimensionCount[down](dimensions),
  };
}

/** Whether a cell is inside a slice. */
export function sliceContains(slice: Slice, u: number, v: number): boolean {
  return u >= 0 && v >= 0 && u < slice.width && v < slice.height;
}

/**
 * The voxel a cell of a slice is, in the box's own axes: `u` counts across the
 * plane, `v` counts down it, and the axis the plane does not vary along is
 * wherever the slice stands.
 */
export function sliceCell(slice: Slice, u: number, v: number): Vector3D {
  const at: Record<Axis, number> = { x: 0, y: 0, z: 0 };
  const [across, down] = planeAxes[slice.plane];
  at[planeSlicedAxis[slice.plane]] = slice.at;
  at[across] = u;
  at[down] = v;
  return Vector3D.create(at.x, at.y, at.z);
}

/** The cell of a slice a voxel is, or undefined when it is not in the slice. */
export function cellSlice(
  slice: Slice,
  x: number,
  y: number,
  z: number,
): Vector2D | undefined {
  const at = Vector3D.create(x, y, z);
  if (at[planeSlicedAxis[slice.plane]] !== slice.at) {
    return undefined;
  }
  const [across, down] = planeAxes[slice.plane];
  const cell = Vector2D.create(at[across], at[down]);
  return sliceContains(slice, cell.x, cell.y) ? cell : undefined;
}

/** The palette index of the cell at `(u, v)` of a slice. */
export function readSlice(
  volume: Volume,
  slice: Slice,
  u: number,
  v: number,
): number {
  const { x, y, z } = sliceCell(slice, u, v);
  return readVoxel(volume, x, y, z);
}

/** Puts `index` in the cell at `(u, v)` of a slice. */
export function writeSlice(
  volume: Volume,
  slice: Slice,
  u: number,
  v: number,
  index: number,
): void {
  const { x, y, z } = sliceCell(slice, u, v);
  writeVoxel(volume, x, y, z, index);
}

/**
 * The cells a stroke from `from` to `to` crosses, one per cell the segment
 * passes through, so a drag paints a continuous line rather than however many
 * cells the pointer happened to land on.
 */
export function strokeCells(
  slice: Slice,
  from: Vector2D,
  to: Vector2D,
): Vector2D[] {
  const cells: Vector2D[] = [];
  const seen = new Set<string>();
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));

  for (let step = 0; step <= steps; step++) {
    const t = steps === 0 ? 0 : step / steps;
    const cell = Vector2D.create(
      Math.round(from.x + (to.x - from.x) * t),
      Math.round(from.y + (to.y - from.y) * t),
    );
    const key = `${cell.x},${cell.y}`;
    if (sliceContains(slice, cell.x, cell.y) && !seen.has(key)) {
      seen.add(key);
      cells.push(cell);
    }
  }

  return cells;
}

/**
 * The cells a mark on a slice is also drawn at when the stroke is mirrored
 * within it. A mirrored cell is one the slice's own middle reflects, rather than
 * one on the face bounding the model at the other end of the run, which is what
 * mirroring a mark on one of a model's drawings had to reach across to.
 */
export function mirrorCells(
  slice: Slice,
  cell: Vector2D,
  across: boolean,
  down: boolean,
): Vector2D[] {
  const cells: Vector2D[] = [];
  const seen = new Set<string>();

  for (const u of across ? [cell.x, slice.width - 1 - cell.x] : [cell.x]) {
    for (const v of down ? [cell.y, slice.height - 1 - cell.y] : [cell.y]) {
      const key = `${u},${v}`;
      if (!sliceContains(slice, u, v) || seen.has(key)) {
        continue;
      }
      seen.add(key);
      cells.push(Vector2D.create(u, v));
    }
  }

  return cells;
}
