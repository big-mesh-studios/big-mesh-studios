// The wireframe drawn round the voxel the pointer meets.
import {
  Line2NodeMaterial,
  LineSegments2,
  LineSegmentsGeometry,
} from "@random-mesh/rmsl/scene";
import { Vector3D, type Dimensions3D } from "@big-mesh-studios/maths";
import { boxEdges, voxelCellEdges } from "../voxel-preview-scene";
import type { VoxelPick } from "./volume-picker";

/**
 * A crisp white, a couple of device pixels wide.
 */
const COLOUR = 0xffffff;
const LINE_WIDTH = 2;

/**
 * How much bigger than the cell the wireframe is drawn, on each side of it.
 *
 * The model's own faces are where they are, and a line drawn exactly on the cell
 * they bound would be inside them and lose the depth test. Drawing the box a
 * little outside its own cell puts every edge in front of the surface it belongs
 * to, without a depth offset — which the scene graph here has no way to express.
 * A fraction of a cell is far too small to see as a box that does not fit.
 */
const OVERSIZE = 0.02;

/**
 * A box drawn round one voxel of a model.
 *
 * It stands nowhere in the scene of its own: its edges are traced in the model's
 * own space, the same cell layout the geometry is built on, so it is made a
 * child of the group the model is drawn with and inherits its place and turn.
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
   * Traces the cell `pick` names, on the group the model is drawn with. Draws
   * nothing where the pointer met nothing.
   */
  trace(
    dimensions: Dimensions3D,
    host: object,
    pick: VoxelPick | undefined,
  ): void {
    if (pick === undefined) {
      this.lines.visible = false;
      return;
    }

    if (this.lines.parent !== host) {
      this.lines.parent?.remove(this.lines);
      (host as { add(child: object): void }).add(this.lines);
    }

    const geometry = this.lines.geometry;
    geometry.setPositions(oversizedCell(dimensions, pick.voxel));

    // setPositions swaps in fresh instance attributes whose needsUpdate flag is
    // false, so the renderer would keep drawing the previous pick's edges. Flag
    // them so the next frame uploads the new cell.
    geometry.attributes.instanceStart.needsUpdate = true;
    geometry.attributes.instanceEnd.needsUpdate = true;
    this.lines.visible = true;
  }
}

/**
 * The 12 edges of a voxel's cell, grown about its own middle by `OVERSIZE` a
 * side so that they stand in front of the faces they trace.
 */
const oversizedCell = (
  dimensions: Dimensions3D,
  voxel: [number, number, number],
): Float32Array => {
  const edges = voxelCellEdges(dimensions, voxel);
  const low = { x: Infinity, y: Infinity, z: Infinity };
  const high = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (let at = 0; at < edges.length; at += 3) {
    low.x = Math.min(low.x, edges[at]);
    low.y = Math.min(low.y, edges[at + 1]);
    low.z = Math.min(low.z, edges[at + 2]);
    high.x = Math.max(high.x, edges[at]);
    high.y = Math.max(high.y, edges[at + 1]);
    high.z = Math.max(high.z, edges[at + 2]);
  }
  return boxEdges(
    Vector3D.create(low.x - OVERSIZE, low.y - OVERSIZE, low.z - OVERSIZE),
    Vector3D.create(high.x + OVERSIZE, high.y + OVERSIZE, high.z + OVERSIZE),
  );
};
