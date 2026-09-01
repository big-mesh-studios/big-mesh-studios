import { Dimensions2D, Vector2D } from "@big-mesh-studios/maths";
import { Mirror } from "./types";

/** A run of cells along one axis of a panel, from `low` to `high` inclusive. */
interface Span {
  low: number;
  high: number;
}

/** A block of cells on a panel, from its low corner to its high one inclusive. */
export interface Rectangle {
  min: Vector2D;
  max: Vector2D;
}

/** Neither axis reflected: a stroke lands only where the pointer put it. */
export const NO_MIRROR: Mirror = Object.freeze({ x: false, y: false });

/**
 * `span` together with its reflection about the middle of an axis `extent`
 * cells long, or `span` alone when the axis is not being mirrored or when the
 * reflection covers the same cells — a span already centred on that middle
 * reflects onto itself.
 */
function mirrorSpans(mirrored: boolean, extent: number, span: Span): Span[] {
  const reflected = {
    low: extent - 1 - span.high,
    high: extent - 1 - span.low,
  };

  if (
    !mirrored ||
    (reflected.low === span.low && reflected.high === span.high)
  ) {
    return [span];
  }

  return [span, reflected];
}

/**
 * Every cell a mark at `position` covers on a panel of `dimensions`: the cell
 * itself first, then its reflection along each axis the mirror names, and the
 * diagonally opposite cell when it names both. No cell is listed twice, so a
 * mark on the middle column or row of a panel with an odd number of cells is
 * still drawn once.
 */
export function mirrorPositions(
  mirror: Mirror,
  dimensions: Dimensions2D,
  position: Vector2D,
): Vector2D[] {
  const xs = mirrorSpans(mirror.x, dimensions.width, {
    low: position.x,
    high: position.x,
  });
  const ys = mirrorSpans(mirror.y, dimensions.height, {
    low: position.y,
    high: position.y,
  });

  return ys.flatMap((y) => xs.map((x) => ({ x: x.low, y: y.low })));
}

/**
 * Every block a rectangle covers on a panel of `dimensions`, reflected the same
 * way `mirrorPositions` reflects a single cell. Reflected blocks can overlap the
 * one that was drawn; they all carry the same colour, so the overlap paints the
 * same cells twice rather than fighting over them.
 */
export function mirrorRectangles(
  mirror: Mirror,
  dimensions: Dimensions2D,
  rectangle: Rectangle,
): Rectangle[] {
  const xs = mirrorSpans(mirror.x, dimensions.width, {
    low: rectangle.min.x,
    high: rectangle.max.x,
  });
  const ys = mirrorSpans(mirror.y, dimensions.height, {
    low: rectangle.min.y,
    high: rectangle.max.y,
  });

  return ys.flatMap((y) =>
    xs.map((x) => ({
      min: { x: x.low, y: y.low },
      max: { x: x.high, y: y.high },
    })),
  );
}
