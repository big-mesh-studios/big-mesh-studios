import { SIDE_AXES } from "./constants";
import { Bitmap, Dimensions3D } from "./maths";
import type { Alignment3D, SideAxis, SideKind, Sides } from "./types";

export interface ResizeOptions {
  from: {
    sides: Sides;
    dimensions: Dimensions3D;
  };
  to: {
    dimensions: Dimensions3D;
    alignment: Alignment3D;
  };
}

/**
 * Re-frames every side for `toDimensions`, keeping the pixels that still fall
 * inside the box and leaving newly exposed pixels transparent.
 *
 * `growEnds` names the end of each changed model axis that the change is
 * applied at, so dragging the front panel's left edge pins its drawing to the
 * right edge instead of resampling it. Panels that look at that axis from the
 * other direction take the change at the mirrored end of their image, which is
 * what keeps the six panels describing the same box.
 */
export const resizeSides = ({ from, to }: ResizeOptions): Sides => {
  const computeOffset = ({ dimension, flipped }: SideAxis) => {
    const growsAtImageStart = (to.alignment[dimension] === "min") !== flipped;
    return growsAtImageStart
      ? to.dimensions[dimension] - from.dimensions[dimension]
      : 0;
  };

  const resizeSide = (kind: SideKind): Bitmap => {
    const axes = SIDE_AXES[kind];
    const source = from.sides[kind];
    const target = Bitmap.create(
      to.dimensions[axes.x.dimension],
      to.dimensions[axes.y.dimension],
    );

    const offset = { x: computeOffset(axes.x), y: computeOffset(axes.y) };

    // The overlap between the old bitmap and the new one, in new-bitmap cells.
    const start = { x: Math.max(0, offset.x), y: Math.max(0, offset.y) };
    const end = {
      x: Math.min(target.width, offset.x + source.width),
      y: Math.min(target.height, offset.y + source.height),
    };
    const rowLength = Math.max(0, end.x - start.x);

    for (let y = start.y; y < end.y; y++) {
      const sourceOffset = (y - offset.y) * source.width + (start.x - offset.x);
      target.data.set(
        source.data.subarray(sourceOffset, sourceOffset + rowLength),
        y * target.width + start.x,
      );
    }

    return target;
  };

  return {
    front: resizeSide("front"),
    back: resizeSide("back"),
    left: resizeSide("left"),
    right: resizeSide("right"),
    top: resizeSide("top"),
    bottom: resizeSide("bottom"),
  };
};
