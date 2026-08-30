import { Dimensions3D, Vector3D } from "@big-mesh-studios/maths";
import { composeRoot, partDimensions, type Figure } from "./data";

/**
 * The size of the box bounding the volume, matching the box the ray marcher
 * intersects: the volume (normalized) padded by one voxel on each side, so
 * rasterizing it limits the fragment shader to the pixels that could possibly
 * land on a voxel.
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

/** Where one part's box stands when the whole figure is drawn. */
export interface PartPlacement {
  /** The middle of the part's box, in the space the figure is drawn in. */
  position: Vector3D;
  /**
   * What the part's box, built at the size `boxSize` gives, is multiplied by to
   * bring it to the figure's voxel size.
   */
  scale: number;
}

/** The largest of a box's three extents. */
const longestAxis = (dimensions: Dimensions3D) =>
  Math.max(dimensions.width, dimensions.height, dimensions.depth);

/**
 * Where each of a figure's parts stands, and how much of the drawn space one
 * voxel takes up across all of them.
 *
 * A part's box is built in the space the marcher walks, where `Dimensions3D`'s
 * `normalize` has made the box's own longest axis one — so on its own, a part
 * eight voxels across and a part twenty voxels across come out the same size,
 * and a voxel means a different distance in each. Parts cannot be put beside
 * each other on those terms. Multiplying a part's box back up by its own
 * longest axis undoes that, and multiplying by one voxel size shared across the
 * figure brings every part to the same scale, so a voxel is a voxel wherever it
 * is drawn.
 *
 * The shared voxel size is worked out from the box every part together fills,
 * so a figure takes up about as much of the view as a single model does. Parts
 * are placed from the figure's origin rather than from the middle of that box,
 * which is what lets one part be moved without the others sliding under the
 * pointer to keep the figure centred.
 *
 * @returns One placement per part, in the order `figure.parts` holds them.
 */
export function figurePlacement(figure: Figure): {
  voxelSize: number;
  placements: PartPlacement[];
} {
  const boxes = figure.parts.map((part) => {
    const dimensions = partDimensions(part);
    const low = Vector3D.subtract(composeRoot(figure, part), part.pivot);
    return { dimensions, low };
  });

  let span = 0;

  for (const axis of ["x", "y", "z"] as const) {
    const extent = { x: "width", y: "height", z: "depth" } as const;
    let min = Infinity;
    let max = -Infinity;

    for (const { dimensions, low } of boxes) {
      min = Math.min(min, low[axis]);
      max = Math.max(max, low[axis] + dimensions[extent[axis]]);
    }

    span = Math.max(span, max - min);
  }

  // A figure with no parts, or one whose parts are all empty, gives no span to
  // scale by; anything drawn for it is drawn at one voxel to the unit.
  const voxelSize = span > 0 ? 1 / span : 1;

  return {
    voxelSize,
    placements: boxes.map(({ dimensions, low }) => ({
      position: Vector3D.create(
        (low.x + dimensions.width / 2) * voxelSize,
        (low.y + dimensions.height / 2) * voxelSize,
        (low.z + dimensions.depth / 2) * voxelSize,
      ),
      scale: voxelSize * longestAxis(dimensions),
    })),
  };
}
