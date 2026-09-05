// The wireframe drawn round the voxel the pointer meets.
import type {
  FigureMeshes,
  SolvedPart,
} from "@big-mesh-studios/stacker/renderer";
import {
  Line2NodeMaterial,
  LineSegments2,
  LineSegmentsGeometry,
} from "@random-mesh/rmsl/scene";
import { voxelCellEdges } from "../voxel-preview-scene";
import type { FigurePick } from "./figure-picker";

/**
 * A crisp white, a couple of device pixels wide. The material's depth bias
 * keeps the wireframe in front of the voxel face it sits on.
 */
const COLOUR = 0xffffff;
const LINE_WIDTH = 2;

/**
 * A box drawn round one voxel of one part.
 *
 * It stands nowhere in the scene of its own: its edges are traced in the part's
 * own space, the same cell layout the marcher walks, so it is made a child of
 * the mesh the part is drawn with and inherits that part's place and turn.
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
   * Traces the cell `pick` names, on the mesh `meshes` draws that part with.
   * Draws nothing where the pointer met nothing, or where the part it met is
   * not among the volumes being drawn.
   */
  trace(
    solved: readonly SolvedPart[],
    meshes: FigureMeshes,
    pick: FigurePick | undefined,
  ): void {
    if (pick === undefined) {
      this.lines.visible = false;
      return;
    }

    const on = solved.find((part) => part.name === pick.part);
    const host = meshes.meshFor(pick.part);

    if (on === undefined || host === undefined) {
      this.lines.visible = false;
      return;
    }

    if (this.lines.parent !== host) {
      this.lines.parent?.remove(this.lines);
      host.add(this.lines);
    }

    const geometry = this.lines.geometry;
    geometry.setPositions(voxelCellEdges(on.dimensions, pick.voxel));

    // setPositions swaps in fresh instance attributes whose needsUpdate flag is
    // false, so the renderer would keep drawing the previous pick's edges. Flag
    // them so the next frame uploads the new cell.
    geometry.attributes.instanceStart.needsUpdate = true;
    geometry.attributes.instanceEnd.needsUpdate = true;
    this.lines.visible = true;
  }
}
