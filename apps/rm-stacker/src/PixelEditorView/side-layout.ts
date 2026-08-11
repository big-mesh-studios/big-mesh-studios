import { Dimensions3D, Vector2D } from "../maths";
import { SideKind, Sides } from "../types";
import { intersectSide, keysOf } from "../utils";

const PADDING = 6;

export type SidePositions = Record<SideKind, Vector2D>;

/**
 * Where each panel sits on the editor canvas: the four side panels form a
 * horizontal band around the front panel, with top and bottom above and below
 * it. Pure in its dimensions so a resize can ask where a panel would end up.
 */
export const computeSidePositions = ({ width, height, depth }: Dimensions3D): SidePositions => ({
  front: { x: 0, y: 0 },
  left: { x: -(depth + PADDING), y: 0 },
  right: { x: width + PADDING, y: 0 },
  back: { x: width + depth + PADDING * 2, y: 0 },
  top: { x: 0, y: -(depth + PADDING) },
  bottom: { x: 0, y: height + PADDING },
});

/** Resolves a canvas-space position to whichever side's panel it falls on. */
export function intersectSides({
  sidePositions,
  position: worldPosition,
  sides,
}: {
  sidePositions: SidePositions;
  position: Vector2D;
  sides: Sides;
}) {
  for (const kind of keysOf(sides)) {
    const sidePosition = sidePositions[kind];
    const side = sides[kind];
    const position = Vector2D.sub(worldPosition, sidePosition);

    const intersection = intersectSide({ position, side });

    if (intersection) {
      return { kind, sidePosition, ...intersection };
    }
  }
}
