import { describe, expect, it } from "vitest";
import { voxelPicker } from "./voxel-picker";
import shaders from "./shaders";
import { voxelCellEdges } from "./voxel-preview-scene";

const makeSolidTexture = (
  width: number,
  height: number,
  depth: number,
  solid: number[][],
) => {
  const data = new Uint8Array(width * height * depth * 4);
  for (const [x, y, z] of solid) {
    const o = (z * width * height + y * width + x) * 4;
    data[o + 3] = 0b11000000;
  }
  return { data, width, height, depth };
};

const palette = () => {
  const data = new Uint8Array(32 * 4);
  for (let i = 0; i < 32; i++) {
    data[i * 4 + 0] = 255;
    data[i * 4 + 1] = 255;
    data[i * 4 + 2] = 255;
    data[i * 4 + 3] = 255;
  }
  return data;
};

describe("voxel picker to outline", () => {
  it("returns the front-layer voxel for a tap on the front and traces it there", () => {
    // 10x10x10 volume, one solid voxel at the front (+z) layer, one at the back.
    // A vUv of (0.52, 0.52) points the ray at the front face of cell (5, 5, 9).
    const dims = { width: 10, height: 10, depth: 10 };
    const voxels = makeSolidTexture(10, 10, 10, [
      [5, 5, 0],
      [5, 5, 9],
    ]);
    // Identity world-to-model, camera on +z, so the front layer is z = 9.
    const picked = voxelPicker({
      uniforms: {
        [shaders.uResolution]: [500, 500],
        [shaders.uDimensions]: [1, 1, 1],
        [shaders.uVoxelCount]: [10, 10, 10],
        [shaders.uLightDir]: [0, 0, 1],
        [shaders.uLightColour]: [1, 1, 1],
        [shaders.uAmbientColour]: [0, 0, 0],
        [shaders.uCameraPosition]: [0, 0, 3],
        [shaders.uWorldToModel]: [1, 0, 0, 0, 1, 0, 0, 0, 1],
        [shaders.uUnlit]: false,
      },
      varying: { vUv: [0.52, 0.52] },
      textures: {
        [shaders.uVoxels]: voxels,
        [shaders.uPalette]: { data: palette(), width: 32, height: 1 },
      },
    });
    expect(Array.from(picked)).toEqual([5, 5, 9]);
    const edges = voxelCellEdges(dims, [5, 5, 9]);
    const z = Array.from(edges).filter((_, i) => i % 6 === 2 || i % 6 === 5);
    expect(Math.min(...z)).toBeCloseTo(0.4);
    expect(Math.max(...z)).toBeCloseTo(0.5);
  });
});
