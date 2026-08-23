import { describe, expect, it } from "vitest";
import { Matrix3, Mesh } from "@random-mesh/rmsl/scene";
import { Dimensions3D, Matrix3x3 } from "../../maths";
import { boxSize, rotateMesh } from "./scene";

// The world-to-model rotation the CPU voxel picker follows its ray along,
// replicated from VoxelPreviewView.getWorldToModel: turn the world down to the
// model by -pitch about x then -(yaw + spin) about y.
const worldToModelOf = (yaw: number, pitch: number, spin: number): Matrix3x3 => {
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

  it("sizes the box to the volume padded by one voxel on each side", () => {
    for (const dimensions of [
      { width: 10, height: 10, depth: 10 },
      { width: 16, height: 8, depth: 4 },
      { width: 1, height: 1, depth: 1 },
    ]) {
      const n = Dimensions3D.normalize(dimensions);
      const size = boxSize(dimensions);
      expect(size.width).toBeCloseTo(2 * (n.width / 2 + n.width / dimensions.width));
      expect(size.height).toBeCloseTo(2 * (n.height / 2 + n.height / dimensions.height));
      expect(size.depth).toBeCloseTo(2 * (n.depth / 2 + n.depth / dimensions.depth));
    }
  });
});
