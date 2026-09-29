// Which cells of a part's box a stroke on one of its drawings has touched.
//
// An editor draws a model by painting six faces of a box, so what a change covers
// arrives as a rectangle in a drawing's own two-dimensional space and has to be
// stood back up into the box before it means anything to a mesher. Every drawing
// has a side it is drawn the way of, whether it is one of the six or a face a cut
// reveals, and that side is what says which way round it runs and which axis it
// looks down.
import { type Vector2D } from "@big-mesh-studios/maths";
import {
  dimensionAxes,
  facingAxis,
  panelSide,
  partDimensions,
  sideAxes,
  sideDirections,
  type PanelKind,
  type Part,
} from "../data";
import { wholeModel, type CellBounds } from "./dirty-bounds";

/** A rectangle of a drawing, as the low and high cells of it. */
export interface PanelRect {
  min: Vector2D;
  max: Vector2D;
}

/**
 * The cells of `part`'s box a stroke covering `rect` of `panel` may have changed.
 *
 * The rectangle is lifted onto the two axes its drawing spans, turned end for end
 * on whichever of them the side counts against, and then taken across the whole
 * of the axis the drawing looks down.
 *
 * That last part is the whole depth rather than the stretch the drawing carves,
 * which is deliberate. A face carves every voxel in the run it looks along, so a
 * stroke on the front of a part has genuinely changed all of it; a part cut
 * across that axis would carve only the run the cut leaves it standing, and
 * narrowing to that run would mean reading the cuts as well as the side.
 *
 * A panel naming a cut the part does not have describes no drawing and so no
 * change, and is answered with the whole box.
 */
export const panelCellBounds = (
  part: Part,
  panel: PanelKind,
  rect: PanelRect,
): CellBounds => {
  const dimensions = partDimensions(part);
  const side = panelSide(part, panel);

  if (side === undefined) {
    return wholeModel(dimensions);
  }

  const [acrossKind, downKind] = sideAxes[side];
  const [acrossAgainst, downAgainst] = sideDirections[side];

  const across = dimensionAxes[acrossKind];
  const down = dimensionAxes[downKind];
  const looking = dimensionAxes[facingAxis[side]];

  const low = { x: 0, y: 0, z: 0 };
  const high = { x: 0, y: 0, z: 0 };

  // A drawing is turned end for end on an axis its side counts against, so the
  // far end of the drawing is the far end of the box. Taking the min and max
  // first is what makes a rectangle given the wrong way round answer the same.
  const near = Math.min(rect.min.x, rect.max.x);
  const far = Math.max(rect.min.x, rect.max.x);
  low[across] = acrossAgainst ? dimensions[acrossKind] - 1 - far : near;
  high[across] = acrossAgainst ? dimensions[acrossKind] - 1 - near : far;

  const top = Math.min(rect.min.y, rect.max.y);
  const bottom = Math.max(rect.min.y, rect.max.y);
  low[down] = downAgainst ? dimensions[downKind] - 1 - bottom : top;
  high[down] = downAgainst ? dimensions[downKind] - 1 - top : bottom;

  low[looking] = 0;
  high[looking] = dimensions[facingAxis[side]] - 1;

  return { low, high };
};
