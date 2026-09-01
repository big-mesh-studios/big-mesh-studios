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
  /** The middle of the part's box, in voxels from the figure's origin. */
  position: Vector3D;
  /**
   * What the part's box, built at the size `boxSize` gives, is multiplied by to
   * measure it in voxels. The marcher walks a box whose own longest axis is
   * one, so a part twenty voxels across and a part eight voxels across come out
   * the same size and a voxel means a different distance in each; this is the
   * part's own longest axis, which undoes that.
   */
  scale: number;
}

/** The box a figure's parts together fill, in voxels from the figure's origin. */
export interface FigureBounds {
  /** The corner the box starts at. */
  low: Vector3D;
  /** How far the box reaches from that corner. */
  dimensions: Dimensions3D;
}

/** Where a figure's parts stand, and the box they together fill. */
export interface FigurePlacement {
  bounds: FigureBounds;
  /**
   * The box the whole figure is drawn inside: its bounds padded by one voxel on
   * each side, the way `boxSize` pads a single part's box. Whoever draws a
   * figure at a size of their own — as tall as a monster, small enough to sit
   * in a hand — measures against this.
   */
  size: Dimensions3D;
  /** One placement per part, in the order `figure.parts` holds them. */
  placements: PartPlacement[];
}

/**
 * How a figure is put in front of a camera: which point of it stands at the
 * origin, and how much of the drawn world one voxel takes up.
 *
 * A placement measures a figure in voxels and in nothing else, which leaves
 * both of these open. Whoever draws a figure holds one of these and applies it
 * to the group the parts are drawn in, so framing the figure on a different
 * point, or drawing it larger, moves that one group and leaves every part
 * standing where the placement put it.
 */
export interface FigureFraming {
  /** The point of the figure, in voxels from its origin, drawn at the origin. */
  focus: Vector3D;
  /** How much of the drawn world one voxel takes up. */
  voxelSize: number;
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
 * Where each of a figure's parts stands, in voxels from the figure's origin.
 *
 * A part's box is built in the space the marcher walks, where `Dimensions3D`'s
 * `normalize` has made the box's own longest axis one — so on its own, a part
 * eight voxels across and a part twenty voxels across come out the same size,
 * and a voxel means a different distance in each. Parts cannot be put beside
 * each other on those terms. Multiplying a part's box back up by its own
 * longest axis undoes that, and leaves every part measured in the voxels they
 * share, so a voxel is a voxel wherever it is drawn.
 *
 * Everything here is measured in voxels and in nothing else, so moving a part
 * changes that part's position and nothing about any other. How large the
 * figure is drawn, and what point of it the camera looks at, are a
 * `FigureFraming` the caller applies to the group it draws the parts in.
 */
export function figurePlacement(figure: Figure): FigurePlacement {
  const boxes = figure.parts.map((part) => {
    const dimensions = partDimensions(part);
    const low = Vector3D.subtract(composeRoot(figure, part), part.pivot);
    return { dimensions, low };
  });

  const low = Vector3D.create();
  const dimensions: Dimensions3D = { width: 0, height: 0, depth: 0 };

  for (const { axis, extent: measures } of AXES) {
    let min = Infinity;
    let max = -Infinity;

    for (const box of boxes) {
      min = Math.min(min, box.low[axis]);
      max = Math.max(max, box.low[axis] + box.dimensions[measures]);
    }

    if (boxes.length > 0) {
      low[axis] = min;
      dimensions[measures] = max - min;
    }
  }

  // Each outermost part's own box already reaches one voxel past its volume,
  // which is the padding `boxSize` gives it, so the figure's box reaches that
  // far too. A figure with no parts is drawn nowhere and so fills nothing.
  const padded = (of: number) => (boxes.length === 0 ? 0 : of + 2);

  return {
    bounds: { low, dimensions },
    size: {
      width: padded(dimensions.width),
      height: padded(dimensions.height),
      depth: padded(dimensions.depth),
    },
    placements: boxes.map((box) => ({
      position: Vector3D.create(
        box.low.x + box.dimensions.width / 2,
        box.low.y + box.dimensions.height / 2,
        box.low.z + box.dimensions.depth / 2,
      ),
      scale: longestAxis(box.dimensions),
    })),
  };
}

/** The middle of `bounds`, framing a figure on the whole of what it fills. */
export function boundsCentre(bounds: FigureBounds): Vector3D {
  return Vector3D.create(
    bounds.low.x + bounds.dimensions.width / 2,
    bounds.low.y + bounds.dimensions.height / 2,
    bounds.low.z + bounds.dimensions.depth / 2,
  );
}

/**
 * How much of the drawn world one voxel takes up for a figure that is to reach
 * `span` along its longest axis.
 *
 * A figure measured this way fills about as much of the view as a single model
 * does, whose own box is likewise its longest axis brought to one and then
 * padded.
 *
 * @param dimensions The box the figure's parts together fill, which
 * `FigurePlacement` carries as its `bounds`. A figure with no parts, or one
 * whose parts are all empty, fills nothing and so gives no span to divide by:
 * it is drawn at one voxel to the unit.
 */
export function fitVoxelSize(dimensions: Dimensions3D, span = 1): number {
  const longest = longestAxis(dimensions);
  return longest > 0 ? span / longest : 1;
}
