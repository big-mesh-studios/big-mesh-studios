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

/** Where a figure's parts stand, and how big a voxel is across all of them. */
export interface FigurePlacement {
  /** How much of the drawn space one voxel takes up, in every part alike. */
  voxelSize: number;
  /** The box every part of the figure together fills, in voxels. */
  extent: Dimensions3D;
  /**
   * The box the whole figure is drawn inside: its extent at the figure's voxel
   * size, padded by one voxel on each side the way `boxSize` pads a single
   * model's box. Whoever draws a figure at a size of their own — as tall as a
   * monster, small enough to sit in a hand — measures against this.
   */
  size: Dimensions3D;
  /** One placement per part, in the order `figure.parts` holds them. */
  placements: PartPlacement[];
}

/** The largest of a box's three extents. */
const longestAxis = (dimensions: Dimensions3D) =>
  Math.max(dimensions.width, dimensions.height, dimensions.depth);

/** Each axis a figure is measured along, beside the extent that measures it. */
const AXES = [
  { axis: "x", extent: "width" },
  { axis: "y", extent: "height" },
  { axis: "z", extent: "depth" },
] as const;

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
 * @param voxelSize How much of the drawn space one voxel is to take up, for a
 * caller drawing the figure at a size of its own. A drag holds the size the
 * arrow was measured against for as long as it runs: measured afresh, a part
 * carried outwards makes every voxel in the figure smaller, so the part being
 * dragged would lag behind the arrow pulling it and the parts standing still
 * would slide the other way. Left out, the size is the one that fits the figure
 * into the space a single model is drawn in.
 */
export function figurePlacement(
  figure: Figure,
  voxelSize?: number,
): FigurePlacement {
  const boxes = figure.parts.map((part) => {
    const dimensions = partDimensions(part);
    const low = Vector3D.subtract(composeRoot(figure, part), part.pivot);
    return { dimensions, low };
  });

  const extent: Dimensions3D = { width: 0, height: 0, depth: 0 };

  for (const { axis, extent: measures } of AXES) {
    let min = Infinity;
    let max = -Infinity;

    for (const { dimensions, low } of boxes) {
      min = Math.min(min, low[axis]);
      max = Math.max(max, low[axis] + dimensions[measures]);
    }

    extent[measures] = boxes.length === 0 ? 0 : max - min;
  }

  const span = longestAxis(extent);
  // A figure with no parts, or one whose parts are all empty, gives no span to
  // scale by; anything drawn for it is drawn at one voxel to the unit.
  const drawnVoxel = voxelSize ?? (span > 0 ? 1 / span : 1);
  // Each outermost part's own box already reaches one voxel past its volume,
  // which is the padding `boxSize` gives it, so the figure's box reaches that
  // far too. A figure with no parts is drawn nowhere and so fills nothing.
  const padded = (of: number) =>
    boxes.length === 0 ? 0 : (of + 2) * drawnVoxel;

  return {
    voxelSize: drawnVoxel,
    extent,
    size: {
      width: padded(extent.width),
      height: padded(extent.height),
      depth: padded(extent.depth),
    },
    placements: boxes.map(({ dimensions, low }) => ({
      position: Vector3D.create(
        (low.x + dimensions.width / 2) * drawnVoxel,
        (low.y + dimensions.height / 2) * drawnVoxel,
        (low.z + dimensions.depth / 2) * drawnVoxel,
      ),
      scale: drawnVoxel * longestAxis(dimensions),
    })),
  };
}
