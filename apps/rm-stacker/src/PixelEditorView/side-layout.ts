import { Bitmap, Dimensions3D, Vector2D } from "@big-mesh-studios/maths";
import {
  axisSides,
  sideAxes,
  type PanelKind,
  type Part,
  type Sides,
  type SideKind,
} from "@big-mesh-studios/stacker/renderer";
import { panelTable } from "../panels";
import { intersectSide, keysOf } from "../utils/utils";

const PADDING = 6;
export const LABEL_HEIGHT = 3;

export type SidePositions = Record<SideKind, Vector2D>;

/** Where each of a part's drawings sits on the editor canvas. */
export type PanelPositions = Partial<Record<PanelKind, Vector2D>> &
  SidePositions;

/**
 * Where each side sits on the editor canvas: the four side panels form a
 * horizontal band around the front panel, with top and bottom above and below
 * it. Pure in its dimensions so a resize can ask where a panel would end up.
 */
export const computeSidePositions = ({
  width,
  height,
  depth,
}: Dimensions3D): SidePositions => ({
  front: { x: 0, y: 0 },
  left: { x: -(depth + PADDING), y: 0 },
  right: { x: width + PADDING, y: 0 },
  back: { x: width + depth + PADDING * 2, y: 0 },
  top: { x: 0, y: -(depth + PADDING + LABEL_HEIGHT) },
  bottom: { x: 0, y: height + PADDING + LABEL_HEIGHT },
});

/**
 * Where every drawing of `part` sits: the six sides in their band, and each
 * cut's two faces on a row of their own below it, the face closing the run
 * before the cut beside the one opening the run after.
 *
 * The cuts stand under the net rather than in it because the net is the six
 * faces of a box unfolded, and a cut is not one of them: it stands inside.
 */
export function computePanelPositions(
  part: Part,
  dimensions: Dimensions3D,
): PanelPositions {
  const positions: PanelPositions = computeSidePositions(dimensions);
  const table = panelTable(part);

  // Under the bottom panel, which hangs its own depth and a label below the
  // front, and clear of that label.
  let y =
    dimensions.height +
    PADDING +
    LABEL_HEIGHT +
    dimensions.depth +
    LABEL_HEIGHT +
    PADDING;

  part.sections.forEach((section, cut) => {
    const [across, down] = sideAxes[axisSides[section.axis][0]];

    for (const [index, panel] of table.kinds
      .filter((kind) => kind.startsWith(`section-${cut}-`))
      .entries()) {
      positions[panel] = { x: index * (dimensions[across] + PADDING), y };
    }

    y += dimensions[down] + LABEL_HEIGHT + PADDING;
  });

  return positions;
}

/**
 * Resolves a canvas-space position to whichever of the six sides it falls on,
 * for what only the box itself answers for — dragging an edge to resize it.
 */
export function intersectSides({
  sidePositions,
  worldPosition,
  sides,
}: {
  sidePositions: SidePositions;
  worldPosition: Vector2D;
  sides: Sides;
}) {
  for (const kind of keysOf(sides)) {
    const sidePosition = sidePositions[kind];
    const side = sides[kind];
    const relativePosition = Vector2D.sub(worldPosition, sidePosition);

    const intersection = intersectSide({ position: relativePosition, side });

    if (intersection) {
      return { kind, ...intersection };
    }
  }
}

/** Resolves a canvas-space position to whichever of a part's drawings it falls on. */
export function intersectPanels({
  positions,
  worldPosition,
  table,
}: {
  positions: PanelPositions;
  worldPosition: Vector2D;
  table: { kinds: PanelKind[]; bitmap(panel: PanelKind): Bitmap | undefined };
}) {
  for (const kind of table.kinds) {
    const position = positions[kind];
    const side = table.bitmap(kind);

    if (position === undefined || side === undefined) {
      continue;
    }

    const relativePosition = Vector2D.sub(worldPosition, position);
    const intersection = intersectSide({ position: relativePosition, side });

    if (intersection) {
      return { kind, ...intersection };
    }
  }
}
