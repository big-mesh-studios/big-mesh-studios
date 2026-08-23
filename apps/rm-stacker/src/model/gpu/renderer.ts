import { createVoxelRenderer } from "../shared/create-voxel-renderer";
import { PANEL_PAIR_KINDS, toPanelPairTextures } from "../shared/panel-textures";
import type { ModelRenderer } from "../types";
import { PanelPairVoxelMaterial } from "./material";

/**
 * Marches the model's six drawn panels directly, a facing pair to a texture:
 * solidity along the ray is resolved in the fragment shader rather than from
 * a volume solved up front.
 */
export function createGpuModelRenderer(canvas: HTMLCanvasElement): ModelRenderer {
  const material = new PanelPairVoxelMaterial();
  return createVoxelRenderer(canvas, material, (material, _dimensions, sides) => {
    const pairs = toPanelPairTextures(sides);
    PANEL_PAIR_KINDS.forEach(kind => {
      const pair = pairs[kind];
      const texture = material.panelPairTextures[kind];
      texture.image = pair.data;
      texture.width = pair.width;
      texture.height = pair.height;
      texture.needsUpdate = true;
    });
  });
}
