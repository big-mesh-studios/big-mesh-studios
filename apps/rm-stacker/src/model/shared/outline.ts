import { Line2NodeMaterial, LineSegments2, LineSegmentsGeometry } from "@random-mesh/rmsl/scene";
import { Dimensions3D } from "../../maths";

// The picked voxel's outline: a crisp white wireframe, a couple of device
// pixels wide. The material's fragDepth bias (see material.ts) keeps it in
// front of the voxel face it sits on.
const OUTLINE_COLOUR = 0xffffff;
const OUTLINE_LINE_WIDTH = 2;

export type Outline = {
  mesh: LineSegments2;
  setPicked(dimensions: Dimensions3D, voxel: readonly [number, number, number] | undefined): void;
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

/**
 * The 12 edges of a voxel's cell in model space, as `LineSegmentsGeometry`
 * positions (one `(xyz xyz)` start/end pair per edge). The cell layout matches
 * the ray marcher in shaders-shared, which anchors cell 0 at `-dimensions / 2`
 * (see its `cellOrigin` mapping), so the outline encloses exactly the voxel
 * the marcher renders and the CPU picker returns.
 */
export const voxelCellEdges = (
  dimensions: Dimensions3D,
  voxel: [number, number, number],
): Float32Array => {
  const normalized = Dimensions3D.normalize(dimensions);
  const half = {
    x: normalized.width / 2,
    y: normalized.height / 2,
    z: normalized.depth / 2,
  };
  const cellSize = {
    x: normalized.width / dimensions.width,
    y: normalized.height / dimensions.height,
    z: normalized.depth / dimensions.depth,
  };
  const min = {
    x: cellSize.x * voxel[0] - half.x,
    y: cellSize.y * voxel[1] - half.y,
    z: cellSize.z * voxel[2] - half.z,
  };
  const max = {
    x: min.x + cellSize.x,
    y: min.y + cellSize.y,
    z: min.z + cellSize.z,
  };
  const corners = [
    [min.x, min.y, min.z],
    [max.x, min.y, min.z],
    [max.x, max.y, min.z],
    [min.x, max.y, min.z],
    [min.x, min.y, max.z],
    [max.x, min.y, max.z],
    [max.x, max.y, max.z],
    [min.x, max.y, max.z],
  ] as const;
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ] as const;
  const positions = new Float32Array(edges.length * 6);
  edges.forEach(([a, b], i) => {
    positions.set(corners[a], i * 6);
    positions.set(corners[b], i * 6 + 3);
  });
  return positions;
};
