import { describe, expect, it } from "vitest";
import { Matrix3, Mesh } from "@random-mesh/rmsl/scene";
import { Matrix3x3 } from "@big-mesh-studios/maths";
import { rotateMesh, voxelCellEdges } from "./voxel-preview-scene";

// The world-to-model rotation the CPU voxel picker follows its ray along,
// replicated from VoxelPreviewView.getWorldToModel: turn the world down to the
// model by -pitch about x then -(yaw + spin) about y.
const worldToModelOf = (
  yaw: number,
  pitch: number,
  spin: number,
): Matrix3x3 => {
  const yawMatrix = Matrix3x3.rotationY(-(yaw + spin));
  const pitchMatrix = Matrix3x3.rotationX(-pitch);
  return Matrix3x3.multiply(yawMatrix, pitchMatrix);
};

const closeTo = (a: ArrayLike<number>, b: ArrayLike<number>, eps = 1e-6) => {
  for (let i = 0; i < a.length; i++) {
    expect(Math.abs(a[i] - b[i]), `element ${i}`).toBeLessThan(eps);
  }
};

// The material's ray origin is normalMatrix * cameraPosition, where
// normalMatrix (as uploaded to GL) must equal the picker's world-to-model
// matrix or the pick would land off the voxel.
const materialWorldToModel = (mesh: Mesh): number[] =>
  new Matrix3().getNormalMatrix(mesh.matrixWorld).toArray();

describe("voxel preview scene", () => {
  it("turns the mesh so its world-to-model matches the picker's matrix", () => {
    const mesh = new Mesh();
    for (const [yaw, pitch, spin] of [
      [Math.PI / 4, Math.PI / 6, 0],
      [0, 0, 0],
      [-2.1, 1.2, 0.7],
      [Math.PI, Math.PI / 2 - 0.01, 3],
    ]) {
      rotateMesh(mesh, yaw, pitch, spin);
      mesh.updateMatrixWorld(true);
      closeTo(materialWorldToModel(mesh), worldToModelOf(yaw, pitch, spin));
    }
  });

  it("traces the 12 edges of a voxel's cell", () => {
    // Cell 0 is anchored at -dimensions/2, so with a 10 voxel cube each cell
    // is 0.1 wide and voxel (0, 0, 0) sits in [-0.5, -0.4]^3.
    const edges = voxelCellEdges(
      { width: 10, height: 10, depth: 10 },
      [0, 0, 0],
    );
    expect(edges.length).toBe(12 * 6);
    // Float32 storage makes the corners approximate, so compare with slack.
    for (let i = 0; i < edges.length; i++) {
      expect(Math.abs(Math.abs(edges[i] + 0.45) - 0.05)).toBeLessThan(1e-6);
    }
    // Every cell corner is the endpoint of three edges.
    const corners = new Map<string, number>();
    for (let s = 0; s < 12; s++) {
      for (const o of [0, 3]) {
        const key = `${edges[s * 6 + o]},${edges[s * 6 + o + 1]},${edges[s * 6 + o + 2]}`;
        corners.set(key, (corners.get(key) ?? 0) + 1);
      }
    }
    expect(corners.size).toBe(8);
    for (const count of corners.values()) {
      expect(count).toBe(3);
    }
  });
});
