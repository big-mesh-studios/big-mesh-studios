import { Bitmap, Dimensions3D, Vector2D } from "@big-mesh-studios/maths";
import {
  axisSides,
  sectionFaceKind,
  sideAxes,
  sideKinds,
  type DimensionKind,
  type PanelKind,
  type Part,
  type Sides,
  type SideKind,
} from "@big-mesh-studios/stacker/renderer";
import { panelLineFromCut } from "../panels";
import { intersectSide, keysOf } from "../utils/utils";

const PADDING = 6;
export const LABEL_HEIGHT = 3;

/** How much clear space a slice's box leaves around the faces standing in it. */
const SLICE_PADDING = 2;

/** How wide the little box carrying a slice's number is. */
const NUMBER_WIDTH = 4;

/** How large a slice's number is where it stands beside a cut, and how far out. */
const MARKER_SIZE = 3;
const MARKER_GAP = 1;

export type SidePositions = Record<SideKind, Vector2D>;

/** Where each of a part's drawings sits on the editor canvas. */
export type PanelPositions = Partial<Record<PanelKind, Vector2D>> &
  SidePositions;

/** A box on the canvas, in cells, both corners inside it. */
export interface Box {
  min: Vector2D;
  max: Vector2D;
}

const boxHolds = (box: Box, position: Vector2D): boolean =>
  position.x >= box.min.x &&
  position.y >= box.min.y &&
  position.x <= box.max.x &&
  position.y <= box.max.y;

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

/** How large a slice's two faces are drawn, both being the same size. */
const faceSize = (axis: DimensionKind, dimensions: Dimensions3D) => {
  const [across, down] = sideAxes[axisSides[axis][0]];
  return { width: dimensions[across], height: dimensions[down] };
};

/** One of a part's slices, as it stands on the canvas. */
export interface SliceLayout {
  /** Which cut it is, as the part lists them. */
  cut: number;
  /** What it is called on the canvas, counting from one. */
  number: string;
  axis: DimensionKind;
  /** The box its two faces and their labels stand in. */
  box: Box;
  /** The little box at that box's top left corner, carrying its number. */
  label: Box;
}

/**
 * Where each of `part`'s slices stands: a box of its own under the net of six
 * sides, holding the two faces the cut reveals side by side, the face closing
 * the run before the cut beside the one opening the run after it.
 *
 * The slices stand under the net rather than in it because the net is the six
 * faces of a box unfolded, and a cut is not one of them: it stands inside.
 */
export function computeSliceLayouts(
  part: Part,
  dimensions: Dimensions3D,
): SliceLayout[] {
  // Under the bottom panel, which hangs its own depth and a label below the
  // front, and clear of that label.
  let top =
    dimensions.height +
    PADDING +
    LABEL_HEIGHT +
    dimensions.depth +
    LABEL_HEIGHT +
    PADDING;

  return part.sections.map((section, cut) => {
    const face = faceSize(section.axis, dimensions);
    const box: Box = {
      min: { x: -SLICE_PADDING, y: top + LABEL_HEIGHT },
      max: {
        x: face.width * 2 + PADDING + SLICE_PADDING,
        y: top + LABEL_HEIGHT + SLICE_PADDING * 2 + face.height + LABEL_HEIGHT,
      },
    };

    top = box.max.y + PADDING;

    return {
      cut,
      number: `${cut + 1}`,
      axis: section.axis,
      box,
      // Standing on the box's top left corner, the way a tab stands on a folder.
      label: {
        min: { x: box.min.x, y: box.min.y - LABEL_HEIGHT },
        max: { x: box.min.x + NUMBER_WIDTH, y: box.min.y },
      },
    };
  });
}

/**
 * Where every drawing of `part` sits: the six sides in their band, and each
 * cut's two faces inside the box of the slice they belong to.
 */
export function computePanelPositions(
  part: Part,
  dimensions: Dimensions3D,
): PanelPositions {
  const positions: PanelPositions = computeSidePositions(dimensions);

  for (const slice of computeSliceLayouts(part, dimensions)) {
    const face = faceSize(slice.axis, dimensions);
    const y = slice.box.min.y + SLICE_PADDING;

    positions[sectionFaceKind(slice.cut, "before")] = {
      x: slice.box.min.x + SLICE_PADDING,
      y,
    };
    positions[sectionFaceKind(slice.cut, "after")] = {
      x: slice.box.min.x + SLICE_PADDING + face.width + PADDING,
      y,
    };
  }

  return positions;
}

/** A slice's number, standing beside the cut where it crosses a panel. */
export interface SliceMarker {
  cut: number;
  number: string;
  axis: DimensionKind;
  /**
   * Where it stands. The number is drawn as a circle inside this, and taken
   * hold of anywhere in it, which leaves a little room around the circle for a
   * finger that lands beside it.
   */
  box: Box;
}

/**
 * A numbered box outside each of the six sides, wherever a cut crosses it, so
 * that a cut can be followed from the drawing it stands through to the faces it
 * reveals — and taken hold of, to bring those faces into view.
 *
 * A cut drawn down a panel is marked above that panel and one drawn across it
 * to its left, which is where the net leaves room.
 */
export function computeSliceMarkers(
  part: Part,
  dimensions: Dimensions3D,
  positions: PanelPositions,
): SliceMarker[] {
  const markers: SliceMarker[] = [];
  const half = MARKER_SIZE / 2;

  for (const side of sideKinds) {
    const at = positions[side];

    part.sections.forEach((section, cut) => {
      const line = panelLineFromCut({
        drawnLike: side,
        axis: section.axis,
        at: section.at,
        dimensions,
      });

      if (line === undefined) {
        return;
      }

      const min =
        line.along === "x"
          ? { x: at.x + line.line - half, y: at.y - MARKER_GAP - MARKER_SIZE }
          : { x: at.x - MARKER_GAP - MARKER_SIZE, y: at.y + line.line - half };

      markers.push({
        cut,
        number: `${cut + 1}`,
        axis: section.axis,
        box: { min, max: { x: min.x + MARKER_SIZE, y: min.y + MARKER_SIZE } },
      });
    });
  }

  return markers;
}

/** Which numbered box `worldPosition` falls on, where it falls on one at all. */
export function intersectSliceMarkers(
  markers: SliceMarker[],
  worldPosition: Vector2D,
): SliceMarker | undefined {
  return markers.find((marker) => boxHolds(marker.box, worldPosition));
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
