// Where a part's panels stand in the figure, drawn as the planes they are: each
// of the six sides at the end of the axis it looks along, each cut's two faces
// where that cut divides the part, and every one of them showing the drawing
// made on it.
import { Dimensions3D } from "@big-mesh-studios/maths";
import {
  axisSides,
  facingAxis,
  partDimensions,
  readSectionFace,
  sideKinds,
  standAs,
  type Figure,
  type Part,
  type PartPlacement,
} from "@big-mesh-studios/stacker/renderer";
import { Group, Side } from "@random-mesh/rmsl/scene";
import { SIDE_MASK } from "./constants";
import { alongTheCut } from "./cut-plane";
import { drawingFlip, drawingPicture } from "./panel-drawing";
import { panelTable } from "./panels";
import { spanAcross, StandingPlane } from "./standing-plane";
import { sideMaskToHex } from "./utils/utils";

/** The planes standing at one part, in the groups that carry them to it. */
interface PartPlanes {
  group: Group;
  /**
   * The passes of the planes buried in the figure that are drawn over whatever
   * covers them. They stand in a group of their own, drawn before every panel,
   * so a panel in front of one of those planes paints over its showing through.
   */
  ghosts: Group;
  /** The planes themselves, one per panel, drawn against the figure's depth. */
  panels: Group;
  /** One plane per panel, in the order `panelTable` lays the panels out. */
  planes: StandingPlane[];
}

/**
 * The panels of every part of a figure, standing where they bound and divide
 * it, each showing what has been drawn on it.
 *
 * The six sides stop at the figure, which is where they stand: a side is seen
 * from outside the part, and what is drawn on it is the surface of the model
 * there. A cut's faces are buried in the middle of the part, so they show
 * through whatever stands in front of them.
 *
 * Whoever holds one puts `group` into the space the figure's parts are placed
 * in, and calls `sync` whenever the figure, its drawings or where its parts
 * stand change.
 */
export class DebugPlanes {
  readonly group = new Group();
  private readonly entries: PartPlanes[] = [];

  constructor() {
    // Nowhere until the debug view is asked for.
    this.group.visible = false;
  }

  get visible(): boolean {
    return this.group.visible;
  }

  set visible(visible: boolean) {
    this.group.visible = visible;
  }

  /**
   * Brings the planes in step with the figure: a set of them at each part,
   * standing as that part stands.
   *
   * @param placements Where the parts stand, in the order `figure.parts` holds
   * them.
   */
  sync(figure: Figure, placements: PartPlacement[]): void {
    while (this.entries.length > figure.parts.length) {
      this.group.remove(this.entries.pop()!.group);
    }

    figure.parts.forEach((part, index) => {
      let entry = this.entries[index];

      if (entry === undefined) {
        const ghosts = new Group();
        const panels = new Group();
        const group = new Group();

        group.add(ghosts, panels);
        this.group.add(group);
        entry = { group, ghosts, panels, planes: [] };
        this.entries[index] = entry;
      }

      standAs(entry.group, placements[index]);
      this.standPanels(entry, part, figure.palette);
    });
  }

  /** Stands one plane at each of `part`'s panels, showing the drawing on it. */
  private standPanels(
    entry: PartPlanes,
    part: Part,
    palette: Figure["palette"],
  ): void {
    const table = panelTable(part);
    const dimensions = partDimensions(part);
    /** The volume the part is marched in, which is what its panels bound. */
    const volume = Dimensions3D.normalize(dimensions);

    while (entry.planes.length > table.kinds.length) {
      const gone = entry.planes.pop()!;

      entry.panels.remove(gone.panel);

      if (gone.ghost !== undefined) {
        entry.ghosts.remove(gone.ghost);
      }
    }

    table.kinds.forEach((panel, index) => {
      let plane = entry.planes[index];

      if (plane === undefined) {
        // The six sides come first and a cut's faces after them, so what a
        // plane at this place shows is the same panel through every edit.
        plane = new StandingPlane({ showThrough: index >= sideKinds.length });
        entry.panels.add(plane.panel);

        if (plane.ghost !== undefined) {
          entry.ghosts.add(plane.ghost);
        }

        entry.planes[index] = plane;
      }

      const drawnLike = table.side(panel);

      if (drawnLike === undefined) {
        return;
      }

      const axis = facingAxis[drawnLike];
      const high = drawnLike === axisSides[axis][1];
      const face = readSectionFace(panel);
      const cut = face === undefined ? undefined : part.sections[face.cut];

      plane.lie(axis, {
        ...spanAcross(volume, axis),
        at:
          cut === undefined
            ? // A side bounds the volume at one end of the axis it looks along,
              // which is half of it either side of the middle it is marched about.
              (high ? 1 : -1) * (volume[axis] / 2)
            : alongTheCut(dimensions, cut),
      });

      // A drawing is seen from where the side it is drawn the way of looks at
      // the part, which for a cut's two faces is one of them each way.
      plane.facing = high ? Side.FrontSide : Side.BackSide;
      plane.grid = sideMaskToHex(SIDE_MASK[drawnLike]);
      plane.show(
        drawingPicture(table.bitmap(panel), palette, drawingFlip(drawnLike)),
      );
    });
  }
}
