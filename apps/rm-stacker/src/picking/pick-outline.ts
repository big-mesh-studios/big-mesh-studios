// The wireframe drawn round the voxel the pointer meets.
import type { SolvedPart } from "@big-mesh-studios/stacker/renderer";
import {
  Line2NodeMaterial,
  LineSegments2,
  LineSegmentsGeometry,
  type Object3D,
} from "@random-mesh/rmsl/scene";
import { voxelCellEdges } from "../voxel-preview-scene";
import type { FigurePick } from "./figure-picker";

/** A crisp white, a couple of device pixels wide. */
const COLOUR = 0xffffff;
const LINE_WIDTH = 2;

/**
 * How much bigger than the cell the wireframe is drawn, as a fraction of a cell
 * on each side. A box drawn at its cell exactly has every edge inside the solid
 * and behind the surface drawn there; a mesh has no depth bias to push that
 * surface towards the camera with, so the box is drawn outside its cell instead
 * and its edges stand in front of the surface they belong to.
 */
const OVERSIZE = 0.02;

/**
 * A box drawn round one voxel of one part.
 *
 * It stands nowhere in the scene of its own: its edges are traced in the part's
 * own space, the same cell layout the mesher lays its vertices out on, so it is
 * made a child of the group the part is drawn in and inherits that part's place
 * and turn.
 */
export class PickOutline {
  private readonly lines = new LineSegments2(
    new LineSegmentsGeometry(),
    new Line2NodeMaterial({ color: COLOUR, linewidth: LINE_WIDTH }),
  );

  constructor() {
    this.lines.visible = false;
  }

  /**
   * Traces the cell `pick` names, in the group the meshes draw that part with.
   * Draws nothing where the pointer met nothing, or where the part it met is not
   * among the volumes being drawn.
   */
  trace(
    solved: readonly SolvedPart[],
    meshes: { groupFor: (name: string) => Object3D | undefined },
    pick: FigurePick | undefined,
  ): void {
    if (pick === undefined) {
      this.lines.visible = false;
      return;
    }

    const on = solved.find((part) => part.name === pick.part);
    const host = meshes.groupFor(pick.part);

    if (on === undefined || host === undefined) {
      this.lines.visible = false;
      return;
    }

    if (this.lines.parent !== host) {
      this.lines.parent?.remove(this.lines);
      host.add(this.lines);
    }

    const geometry = this.lines.geometry;
    geometry.setPositions(voxelCellEdges(on.dimensions, pick.voxel, OVERSIZE));

    // setPositions swaps in fresh instance attributes whose needsUpdate flag is
    // false, so the renderer would keep drawing the previous pick's edges. Flag
    // them so the next frame uploads the new cell.
    geometry.attributes.instanceStart.needsUpdate = true;
    geometry.attributes.instanceEnd.needsUpdate = true;
    this.lines.visible = true;
  }
}
