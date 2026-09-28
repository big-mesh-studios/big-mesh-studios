import { describe, expect, it } from "vitest";
import { Matrix3, Mesh } from "@random-mesh/rmsl/scene";
import { Matrix3x3 } from "@big-mesh-studios/maths";
import {
  framedVoxelSize,
  rotateModel,
  voxelCellEdges,
} from "./voxel-preview-scene";

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

describe("framedVoxelSize", () => {
  // The sphere a figure turns inside touches the sides of the view when its
  // world radius is the camera's distance times the sine of the angle it is
  // seen through — half the field of view, up and down, on a square canvas.
  const touching = (distance: number) => distance * Math.sin(Math.atan(0.5));

  it("draws the figure large enough to fill the view and no larger", () => {
    const reach = 12;
    const spans = framedVoxelSize(reach, 3, 1) * reach;

    expect(spans).toBeLessThan(touching(3));
    expect(spans).toBeGreaterThan(touching(3) * 0.8);
  });

  it("draws it larger the further back the camera stands", () => {
    expect(framedVoxelSize(12, 6, 1)).toBeCloseTo(
      2 * framedVoxelSize(12, 3, 1),
    );
  });

  it("frames a canvas taller than it is wide on its width", () => {
    const narrow = framedVoxelSize(12, 3, 0.5);

    expect(narrow).toBeLessThan(framedVoxelSize(12, 3, 1));
    expect(narrow * 12).toBeLessThan(touching(3) * 0.5);
  });

  it("frames a canvas wider than it is tall on its height", () => {
    expect(framedVoxelSize(12, 3, 2)).toBe(framedVoxelSize(12, 3, 1));
  });

  it("draws a figure with nothing in it at one voxel to the unit", () => {
    expect(framedVoxelSize(0, 3, 1)).toBe(1);
  });
});

describe("voxel preview scene", () => {
  it("turns the mesh so its world-to-model matches the picker's matrix", () => {
    const mesh = new Mesh();
    for (const [yaw, pitch, spin] of [
      [Math.PI / 4, Math.PI / 6, 0],
      [0, 0, 0],
      [-2.1, 1.2, 0.7],
      [Math.PI, Math.PI / 2 - 0.01, 3],
    ]) {
      rotateModel(mesh, yaw, pitch, spin);
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

describe("framing a model in the view", () => {
  // What the preview hands a framing: the model read in the units of the box the
  // ray marcher walks, which has the model's own longest axis made one. The box
  // is `boxSize(dimensions)`, so that is what the model is measured in — a model
  // of twenty voxels and one of eight are both about one unit across.
  const framed = (reach: number, distance: number, aspect = 1) =>
    framedVoxelSize(reach, distance, aspect);

  /**
   * The margin a framed model is drawn inside: the model reaches this much of
   * what the view would hold at the same angle, which is what is left over
   * around it. It is the sine of the angle the view is seen through rather than
   * its tangent, because a sphere that fills the view touches the sides of it
   * rather than passing through their middle.
   */
  const fills = (reach: number, distance: number, aspect = 1) => {
    const halfAngle = Math.atan(0.5 * aspect);
    return (
      (reach * framed(reach, distance, aspect)) /
      (distance * Math.sin(halfAngle))
    );
  };

  it("fills the same share of the view whatever the model's own size", () => {
    // This is the whole of it: a model is normalised before it is framed, so a
    // knight twenty voxels across and a beetle eight across take up the same
    // share of the screen. A framing measured in voxels rather than in the box's
    // own units would make the larger one vanish.
    const small = fills(0.4, 3);
    const large = fills(0.55, 3);
    expect(large).toBeCloseTo(small, 6);
  });

  it("leaves room around the model rather than filling the view to its edges", () => {
    // Nine tenths of what the view holds at that angle, and no more.
    expect(fills(0.5, 3)).toBeCloseTo(0.9, 6);
  });

  it("is unchanged by how far off the camera stands", () => {
    // A framing holds however the model is turned, and the distance only decides
    // how much of it is visible, not how large it is drawn.
    expect(fills(0.5, 3)).toBeCloseTo(fills(0.5, 7), 6);
  });

  it("draws a model smaller on a view with less room across it", () => {
    // A canvas taller than it is wide has less room across it than up it, and is
    // framed on the narrower of the two, or a model would run off the sides.
    expect(framed(0.5, 3, 0.5)).toBeLessThan(framed(0.5, 3, 1));
    // The margin it is drawn inside is the same either way: what changes is how
    // large the model is, not how much room is left around it.
    expect(fills(0.5, 3, 0.5)).toBeCloseTo(fills(0.5, 3, 1), 6);
  });

  it("is a voxel to the unit for a model with nothing in it", () => {
    expect(framed(0, 3)).toBe(1);
  });
});
