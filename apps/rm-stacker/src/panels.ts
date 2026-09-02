// The drawings of one part as the editor lays them out and draws on them: its
// six sides, and the two faces of each cut across it. A face is drawn the way
// the side it parallels is drawn, so everything that lays out, mirrors or
// measures a side does the same for a face by asking which side that is.
import { Bitmap, Dimensions3D, Vector2D } from "@big-mesh-studios/maths";
import {
  axisSides,
  facingAxis,
  panelBitmap,
  panelSide,
  partDimensions,
  readSectionFace,
  sectionFaceKind,
  sideKinds,
  sideKindSet,
  type DimensionKind,
  type PanelKind,
  type Part,
  type Section,
  type SideKind,
} from "@big-mesh-studios/stacker/renderer";
import { OPPOSING_SIDE, SIDE_AXES, SIDE_MASK } from "./constants";
import type { Block } from "./mirror";
import { sideMaskToCSS, sideMaskToHex } from "./utils/utils";

/** The drawings of one part, and how each of them is turned. */
export interface PanelTable {
  /** Every panel, in the order they are laid out: the six sides, then each cut's two faces. */
  kinds: PanelKind[];
  /** The drawing `panel` names, or undefined where the part has no such panel. */
  bitmap(panel: PanelKind): Bitmap | undefined;
  /** Which of the six sides `panel` is drawn the way of. */
  side(panel: PanelKind): SideKind | undefined;
  /**
   * The panel opposite `panel`, which a mark is carried onto when it is
   * mirrored: the side that looks the other way, or the other face of the same
   * cut, which is the other side of the same plane.
   */
  opposing(panel: PanelKind): PanelKind | undefined;
  /**
   * The face at the other end of the stretch of the axis `panel` bounds: the
   * two of them carve one run of voxels between them, so what one of them takes
   * away leaves the other's drawing there with no voxel to sit on.
   *
   * Across an uncut axis that is the side facing the other way. A cut divides
   * the axis, and each stretch is then bounded by the faces at its own ends —
   * the left and the face closing the run before the cut, then the face opening
   * the run after it and the right. The two faces of one cut are never a pair:
   * they bound the stretches either side of it, which is what lets one be
   * carved away and the other left standing.
   */
  across(panel: PanelKind): PanelKind | undefined;
}

/**
 * Every face bounding `axis`, in the order they stand along it: the side at its
 * low end, each cut's two faces, then the side at its high end. Taken in pairs
 * from the low end, each pair closes one stretch of the axis.
 */
function facesAlong(part: Part, axis: DimensionKind): PanelKind[] {
  const [low, high] = axisSides[axis];

  const cuts = part.sections
    .map((section, cut) => ({ section, cut }))
    .filter(({ section }) => section.axis === axis)
    .sort((one, other) => one.section.at - other.section.at);

  return [
    low,
    ...cuts.flatMap(({ cut }) => [
      sectionFaceKind(cut, "before"),
      sectionFaceKind(cut, "after"),
    ]),
    high,
  ];
}

/**
 * Where a cell on `panel` lands on the face at the other end of the run it
 * carves, or undefined where there is no such face.
 *
 * The two look at the part from opposite directions, so one of the two axes
 * they are drawn across counts up the other way about — the front's leftmost
 * column is the back's rightmost, and the top's first row is the bottom's last.
 */
export function cellAcrossTheRun(
  table: PanelTable,
  panel: PanelKind,
  position: Vector2D,
): { panel: PanelKind; position: Vector2D } | undefined {
  const across = table.across(panel);
  const drawing = table.bitmap(panel);
  const drawnLike = table.side(panel);

  if (
    across === undefined ||
    drawing === undefined ||
    drawnLike === undefined
  ) {
    return undefined;
  }

  if (table.bitmap(across) === undefined) {
    return undefined;
  }

  return {
    panel: across,
    position:
      drawnLike === "top" || drawnLike === "bottom"
        ? { x: position.x, y: drawing.height - position.y - 1 }
        : { x: drawing.width - position.x - 1, y: position.y },
  };
}

/**
 * `block` where it lands on the face at the other end of the run it carves. The
 * axis that counts up the other way about there swaps the block's ends over, so
 * its corners are taken back to the lower and the higher of the two.
 */
export function blockAcrossTheRun(
  table: PanelTable,
  block: Block,
): Block | undefined {
  const min = cellAcrossTheRun(table, block.panel, block.min);
  const max = cellAcrossTheRun(table, block.panel, block.max);

  if (min === undefined || max === undefined) {
    return undefined;
  }

  return {
    panel: min.panel,
    min: Vector2D.min(min.position, max.position),
    max: Vector2D.max(min.position, max.position),
  };
}

/**
 * The cut a knife makes across `part`, at `at` voxels from the low end of
 * `axis`, or undefined where there is nothing there to cut: a place outside the
 * box, or one the part is already cut at.
 *
 * Both faces start as copies of the faces already closing that stretch of the
 * axis — the sides at its ends, or the faces of the cuts either side of this
 * one — so the part comes out of the cut exactly the shape it went in. What the
 * cut buys is that the two stretches can be carved apart from here on.
 */
export function cutSection(
  part: Part,
  axis: DimensionKind,
  at: number,
): Section | undefined {
  const extent = partDimensions(part)[axis];

  if (at < 1 || at > extent - 1) {
    return undefined;
  }

  const across = part.sections.filter((section) => section.axis === axis);

  if (across.some((section) => section.at === at)) {
    return undefined;
  }

  const [low, high] = axisSides[axis];

  const opening =
    across
      .filter((section) => section.at < at)
      .sort((one, other) => other.at - one.at)[0]?.after ?? part.sides[low];
  const closing =
    across
      .filter((section) => section.at > at)
      .sort((one, other) => one.at - other.at)[0]?.before ?? part.sides[high];

  return {
    axis,
    at,
    before: Bitmap.clone(closing),
    after: Bitmap.clone(opening),
  };
}

/**
 * Which of a part's axes a line drawn across a panel cuts, and where the cut
 * stands: in voxels from the low end of that axis, with the plane sitting
 * before that index.
 *
 * A panel's two image axes each carry one of the part's, counted up from
 * whichever end that panel looks at it from — the front panel's top row is the
 * top of the part, which is the high end of its height. So a line lying before
 * a panel's row `line` stands that far from the low end of the axis when the
 * panel counts the same way about, and that far from the high end when it does
 * not.
 *
 * @param axis Which of the panel's own image axes the line divides: `y` for a
 * line drawn across the panel, `x` for one drawn down it.
 * @param line Where the line lies, in cells from the panel's top left corner.
 */
export function cutFromPanelLine({
  drawnLike,
  axis,
  line,
  dimensions,
}: {
  drawnLike: SideKind;
  axis: keyof Vector2D;
  line: number;
  dimensions: Dimensions3D;
}): { axis: DimensionKind; at: number } {
  const { dimension, flipped } = SIDE_AXES[drawnLike][axis];
  const extent = dimensions[dimension];

  return { axis: dimension, at: flipped ? extent - line : line };
}

/**
 * Where a cut across `axis` at `at` crosses a panel drawn like `drawnLike`:
 * which of the panel's image axes the line runs against, and how far along that
 * axis it lies, in cells from the panel's top left corner. Undefined for a
 * panel the cut does not cross, which is one that does not span its axis.
 *
 * This is `cutFromPanelLine` the other way about: a panel counting its axis up
 * from the end the part counts down from has the line measured from its far
 * side.
 */
export function panelLineFromCut({
  drawnLike,
  axis,
  at,
  dimensions,
}: {
  drawnLike: SideKind;
  axis: DimensionKind;
  at: number;
  dimensions: Dimensions3D;
}): { along: keyof Vector2D; line: number } | undefined {
  for (const along of ["x", "y"] as const) {
    const { dimension, flipped } = SIDE_AXES[drawnLike][along];

    if (dimension !== axis) {
      continue;
    }

    return { along, line: flipped ? dimensions[axis] - at : at };
  }

  return undefined;
}

/**
 * Where every cut across `part` crosses the panel `panel`, so that a panel
 * shows the cuts standing through what is drawn on it.
 */
export function sectionLines(
  part: Part,
  panel: PanelKind,
  dimensions: Dimensions3D,
): { along: keyof Vector2D; line: number; axis: DimensionKind }[] {
  const drawnLike = panelSide(part, panel);

  if (drawnLike === undefined) {
    return [];
  }

  return part.sections.flatMap((section) => {
    const line = panelLineFromCut({
      drawnLike,
      axis: section.axis,
      at: section.at,
      dimensions,
    });

    return line === undefined ? [] : [{ ...line, axis: section.axis }];
  });
}

/**
 * The colour a cut across `axis` is drawn in: the colour of the two sides that
 * look along it, which are the sides its faces are drawn the way of. A cut is
 * then the colour of the direction it faces, wherever it is shown.
 */
export function axisColour(axis: DimensionKind): string {
  return sideMaskToCSS(SIDE_MASK[axisSides[axis][0]]);
}

/**
 * The same colour as the one number a material is given, so a cut looks the
 * same drawn as a line down a panel and stood through the model as a plane.
 */
export function axisColourHex(axis: DimensionKind): number {
  return sideMaskToHex(SIDE_MASK[axisSides[axis][0]]);
}

/**
 * What a panel is called on the canvas: one of the six sides by its own name,
 * and a section's face by the way it looks and where its cut stands, so two
 * cuts across the same axis are told apart.
 */
export function panelLabel(part: Part, panel: PanelKind): string {
  const face = readSectionFace(panel);
  const drawnLike = panelSide(part, panel);

  if (face === undefined || drawnLike === undefined) {
    return panel;
  }

  return `${drawnLike} at ${part.sections[face.cut].at}`;
}

/**
 * Puts `bitmap` in the place of the drawing `panel` names, which is how a tool
 * shows what it would draw before it is asked to draw it: the drawing under it
 * is swapped for a copy, and swapped back when the tool is done.
 */
export function writePanel(part: Part, panel: PanelKind, bitmap: Bitmap): void {
  const face = readSectionFace(panel);

  if (face === undefined) {
    part.sides[panel as SideKind] = bitmap;
    return;
  }

  const section = part.sections[face.cut];

  if (section !== undefined) {
    section[face.face] = bitmap;
  }
}

/** How `part`'s drawings are laid out, turned and paired. */
export function panelTable(part: Part): PanelTable {
  const kinds: PanelKind[] = [...sideKinds];

  part.sections.forEach((_section, cut) => {
    kinds.push(sectionFaceKind(cut, "before"), sectionFaceKind(cut, "after"));
  });

  return {
    kinds,
    bitmap: (panel) => panelBitmap(part, panel),
    side: (panel) => panelSide(part, panel),
    opposing(panel) {
      const face = readSectionFace(panel);

      return face === undefined
        ? OPPOSING_SIDE[panel as SideKind]
        : sectionFaceKind(
            face.cut,
            face.face === "before" ? "after" : "before",
          );
    },
    across(panel) {
      const face = readSectionFace(panel);
      const axis =
        face === undefined
          ? sideKindSet[panel as SideKind]
            ? facingAxis[panel as SideKind]
            : undefined
          : part.sections[face.cut]?.axis;

      if (axis === undefined) {
        return undefined;
      }

      const along = facesAlong(part, axis);
      const at = along.indexOf(panel);

      return at === -1 ? undefined : along[at % 2 === 0 ? at + 1 : at - 1];
    },
  };
}
