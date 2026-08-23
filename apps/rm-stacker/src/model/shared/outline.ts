import {
  Line2NodeMaterial,
  LineSegments2,
  LineSegmentsGeometry,
} from "@random-mesh/rmsl/scene";
import { Dimensions3D } from "../../maths";
import { voxelCellEdges } from "./scene";

// The picked voxel's outline: a crisp white wireframe, a couple of device
// pixels wide. The material's fragDepth bias (see material.ts) keeps it in
// front of the voxel face it sits on.
const OUTLINE_COLOUR = 0xffffff;
const OUTLINE_LINE_WIDTH = 2;

export type Outline = {
  mesh: LineSegments2;
  setPicked(
    dimensions: Dimensions3D,
    voxel: readonly [number, number, number] | undefined,
  ): void;
};

/**
 * The picked voxel's outline, as a child mesh: its geometry is in model
 * space (the same cell layout the marcher walks), so it inherits the
 * model's rotation for free. Hidden until a pick lands.
 */
export function createOutline(): Outline {
  const mesh = new LineSegments2(
    new LineSegmentsGeometry(),
    new Line2NodeMaterial({ color: OUTLINE_COLOUR, linewidth: OUTLINE_LINE_WIDTH }),
  );
  mesh.visible = false;

  return {
    mesh,
    setPicked(dimensions, voxel) {
      if (voxel !== undefined && voxel[0] >= 0) {
        const geometry = mesh.geometry;
        geometry.setPositions(voxelCellEdges(dimensions, voxel as [number, number, number]));
        // setPositions swaps in fresh instance attributes whose needsUpdate
        // flag is false, so the renderer would keep drawing the previous
        // pick's edges without this.
        geometry.attributes.instanceStart.needsUpdate = true;
        geometry.attributes.instanceEnd.needsUpdate = true;
        mesh.visible = true;
      } else {
        mesh.visible = false;
      }
    },
  };
}
