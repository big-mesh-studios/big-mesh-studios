import type { ModelRenderer } from "../model-renderer";
import { createVoxelRenderer } from "../shared/create-voxel-renderer";
import { SolvedVolumeVoxelMaterial } from "./material";
import { solveVoxels } from "./voxel-solver";

/**
 * Solves the full voxel volume on the CPU, then ray-marches that solved
 * volume.
 */
export function createCpuModelRenderer(canvas: HTMLCanvasElement): ModelRenderer {
  const material = new SolvedVolumeVoxelMaterial();
  return createVoxelRenderer(canvas, material, (material, dimensions, sides) => {
    const voxels = solveVoxels(dimensions, sides);
    const texture = material.voxelTexture;
    texture.image = voxels;
    texture.width = dimensions.width;
    texture.height = dimensions.height;
    texture.depth = dimensions.depth;
    texture.needsUpdate = true;
  });
}
