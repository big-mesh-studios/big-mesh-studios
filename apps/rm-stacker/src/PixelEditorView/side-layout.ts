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
import { panelLineFromCut, panelTable } from "../panels";
import { intersectSide, keysOf } from "../utils/utils";

const PADDING = 6;

/** How tall the box carrying a panel's name or a slice's number is, in cells. */
export const LABEL_HEIGHT = 2;

/** What a label is written in, at the size a cell is drawn. */
export const LABEL_FONT = "1.25px sans-serif";

/** How much clear space a slice's box leaves around the faces standing in it. */
const SLICE_PADDING = 2;

/** How wide the little box carrying a slice's number is. */
const NUMBER_WIDTH = 4;

/** How large the space is that a slice's number is taken hold of by. */
const MARKER_SIZE = 3;

/**
 * How close two numbers may stand in one lane, and how much further out the
 * next lane is. Cuts stand a whole voxel apart at the closest, so this is what
 * says that two a voxel apart step into different lanes and two a couple of
 * voxels apart do not.
 */
const MARKER_LANE = 2;

/**
 * How large the circle a slice's number is drawn in is, in cells.
 *
 * Less than half a lane, so that two numbers standing as close as one lane
 * allows still have clear space between them — enough for the line of a cut
 * standing between the two of them to be seen passing through. It is smaller
 * again than the box the number is taken hold of by, which stays a size a
 * finger can find.
 */
export const MARKER_RADIUS = 0.8;

export type SidePositions = Record<SideKind, Vector2D>;

/** Where each of a part's drawings sits on the editor canvas. */
export type PanelPositions = Partial<Record<PanelKind, Vector2D>> &
  SidePositions;

/** A box on the canvas, in cells, both corners inside it. */
export interface Box {
  min: Vector2D;
  max: Vector2D;
}

/**
 * `box` with the space the net leaves around its panels added to it.
 *
 * What stands in that space belongs to what is inside the box — the name under
 * a panel, the numbers of the cuts crossing it, the tab a slice carries — so
 * bringing a panel into view without it would be bringing the drawing alone
 * and leaving out everything saying what it is.
 */
export const withPadding = (box: Box): Box => ({
  min: { x: box.min.x - PADDING, y: box.min.y - PADDING },
  max: { x: box.max.x + PADDING, y: box.max.y + PADDING },
});

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
  /** The little box at the corner opposite, which takes the cut away. */
  remove: Box;
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
      // A square standing on the corner opposite, the tab's own height across.
      remove: {
        min: { x: box.max.x - LABEL_HEIGHT, y: box.min.y - LABEL_HEIGHT },
        max: { x: box.max.x, y: box.min.y },
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

/**
 * How far out from the panel each of a row of numbers standing at `at` is put,
 * counted in lanes, so that no two in one lane stand closer than `spacing`.
 *
 * Two cuts can stand a single voxel apart, which is closer than two numbers can
 * be drawn side by side — and moving one along the edge would take it off the
 * cut it belongs to. They step out from the panel instead, the way the teeth of
 * a zip pass each other: near lane, far lane, near lane again. Each number
 * stays on its own cut, and the lane it stands in is the least it can take.
 *
 * @param at Where each of them stands along the edge, in that order.
 */
export function zipLanes(at: number[], spacing: number): number[] {
  /** Where the last number put in each lane stands. */
  const lastInLane: number[] = [];

  return at.map((position) => {
    const free = lastInLane.findIndex((last) => position - last >= spacing);
    const lane = free === -1 ? lastInLane.length : free;

    lastInLane[lane] = position;

    return lane;
  });
}

/** A slice's number, standing beside the cut where it crosses a panel. */
export interface SliceMarker {
  cut: number;
  number: string;
  axis: DimensionKind;
  /**
   * Where the cut meets the edge of the panel the number stands outside, so
   * that the line the cut is drawn as can be carried out to the number.
   */
  at: Vector2D;
  /**
   * Where it stands. The number is drawn as a circle inside this, and taken
   * hold of anywhere in it, which leaves a little room around the circle for a
   * finger that lands beside it. Two of these can lie over each other where the
   * cuts are close; a press goes to whichever number it landed nearest.
   */
  box: Box;
}

/**
 * A numbered box outside each of the six sides, wherever a cut crosses it, so
 * that a cut can be followed from the drawing it stands through to the faces it
 * reveals — and taken hold of, to bring those faces into view.
 *
 * A cut drawn down a panel is marked above that panel and one drawn across it
 * to its left, which is where the net leaves room. Numbers too close together
 * to be drawn side by side step out from the panel instead, so that each stays
 * on the cut it belongs to, and however many lanes that takes stand together in
 * the middle of the space beside the panel.
 */
export function computeSliceMarkers(
  part: Part,
  dimensions: Dimensions3D,
  positions: PanelPositions,
): SliceMarker[] {
  const markers: SliceMarker[] = [];
  const half = MARKER_SIZE / 2;

  for (const side of sideKinds) {
    const panel = positions[side];

    const crossings = part.sections.flatMap((section, cut) => {
      const line = panelLineFromCut({
        drawnLike: side,
        axis: section.axis,
        at: section.at,
        dimensions,
      });

      return line === undefined ? [] : [{ cut, section, ...line }];
    });

    for (const along of ["x", "y"] as const) {
      // In the order they stand along the edge, which is the order the lanes
      // are handed out in.
      const inOrder = crossings
        .filter((crossing) => crossing.along === along)
        .sort((one, other) => one.line - other.line);

      const standing = inOrder.map((crossing) => panel[along] + crossing.line);
      const lanes = zipLanes(standing, MARKER_LANE);
      // Where the near lane stands, so that the lanes taken together are
      // halfway across the space between this panel and the next: one lane
      // stands in the middle of it, and two either side of the middle.
      const nearest = PADDING / 2 - (Math.max(0, ...lanes) * MARKER_LANE) / 2;

      inOrder.forEach((crossing, index) => {
        const middle = standing[index];
        const out = nearest + lanes[index] * MARKER_LANE;

        const min =
          along === "x"
            ? { x: middle - half, y: panel.y - out - half }
            : { x: panel.x - out - half, y: middle - half };

        markers.push({
          cut: crossing.cut,
          number: `${crossing.cut + 1}`,
          axis: crossing.section.axis,
          at:
            along === "x"
              ? { x: middle, y: panel.y }
              : { x: panel.x, y: middle },
          box: { min, max: { x: min.x + MARKER_SIZE, y: min.y + MARKER_SIZE } },
        });
      });
    }
  }

  return markers;
}

/** A panel's name, standing under the panel it names. */
export interface PanelLabel {
  panel: PanelKind;
  /**
   * The space the name is taken hold of by: as wide as the panel it names. A
   * name too long for its panel is written wider than this, and the part of it
   * hanging past either end is only writing.
   */
  box: Box;
  /** The panel itself, which is what taking hold of its name brings into view. */
  panelBox: Box;
}

/**
 * Where each of `part`'s panels is named, so that a name can be taken hold of
 * to bring the panel it names into view — the same way a slice's number brings
 * the slice into view.
 */
export function computePanelLabels(
  part: Part,
  positions: PanelPositions,
): PanelLabel[] {
  const table = panelTable(part);

  return table.kinds.flatMap((panel) => {
    const at = positions[panel];
    const drawing = table.bitmap(panel);

    if (at === undefined || drawing === undefined) {
      return [];
    }

    return [
      {
        panel,
        box: {
          min: { x: at.x, y: at.y + drawing.height },
          max: {
            x: at.x + drawing.width,
            y: at.y + drawing.height + LABEL_HEIGHT,
          },
        },
        panelBox: {
          min: at,
          max: { x: at.x + drawing.width, y: at.y + drawing.height },
        },
      },
    ];
  });
}

/** Which slice's numbered tab `worldPosition` falls on, where it falls on one. */
export function intersectSliceLabels(
  slices: SliceLayout[],
  worldPosition: Vector2D,
): SliceLayout | undefined {
  return slices.find((slice) => boxHolds(slice.label, worldPosition));
}

/** Which slice's box for taking the cut away `worldPosition` falls on. */
export function intersectSliceRemoves(
  slices: SliceLayout[],
  worldPosition: Vector2D,
): SliceLayout | undefined {
  return slices.find((slice) => boxHolds(slice.remove, worldPosition));
}

/** Which panel's name `worldPosition` falls on, where it falls on one at all. */
export function intersectPanelLabels(
  labels: PanelLabel[],
  worldPosition: Vector2D,
): PanelLabel | undefined {
  return labels.find((label) => boxHolds(label.box, worldPosition));
}

/** Which numbered box `worldPosition` falls on, where it falls on one at all. */
export function intersectSliceMarkers(
  markers: SliceMarker[],
  worldPosition: Vector2D,
): SliceMarker | undefined {
  const reachOf = (marker: SliceMarker) =>
    Math.hypot(
      (marker.box.min.x + marker.box.max.x) / 2 - worldPosition.x,
      (marker.box.min.y + marker.box.max.y) / 2 - worldPosition.y,
    );

  return markers
    .filter((marker) => boxHolds(marker.box, worldPosition))
    .sort((one, other) => reachOf(one) - reachOf(other))[0];
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
