// The drawings of one part as the editor lays them out and draws on them: its
// six sides, and the two faces of each cut across it. A face is drawn the way
// the side it parallels is drawn, so everything that lays out, mirrors or
// measures a side does the same for a face by asking which side that is.
import { Bitmap, Dimensions3D, Vector2D } from "@big-mesh-studios/maths";
import {
  axisSides,
  panelBitmap,
  panelSide,
  partDimensions,
  readSectionFace,
  sectionFaceKind,
  sideKinds,
  type DimensionKind,
  type PanelKind,
  type Part,
  type Section,
  type SideKind,
} from "@big-mesh-studios/stacker/renderer";
import { OPPOSING_SIDE, SIDE_AXES } from "./constants";

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
  };
}
