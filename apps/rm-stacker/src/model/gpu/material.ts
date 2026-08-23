import type { Builder } from "@random-mesh/rmsl/scene";
import { DataTexture } from "@random-mesh/rmsl/scene";
import type { CellSource, PanelPairs } from "../shared/shaders-shared";
import { packedPairCellSource } from "../shared/shaders-shared";
import type { PanelPairKind } from "../shared/panel-textures";
import { VoxelMaterialBase } from "../shared/material";

// A pair of panels before its first upload: one empty cell. The renderer
// uploads every integer texture as RGBA8UI, so a cell is four bytes, holding
// the near panel's palette index in the red channel and the far panel's in
// the green.
const emptyPairTexture = () => new DataTexture(new Uint8Array(4), 1, 1);

/** Marches the six drawn panels directly — no CPU solve pass. */
export class PanelPairVoxelMaterial extends VoxelMaterialBase {
  panelPairTextures: Record<PanelPairKind, DataTexture> = {
    frontBack: emptyPairTexture(),
    leftRight: emptyPairTexture(),
    topBottom: emptyPairTexture(),
  };

  private panelPairUniforms?: PanelPairs;

  protected setupSamplers(b: Builder): void {
    // One sampler per pair of facing panels, named after both of them.
    const pair = (name: string, kind: PanelPairKind) =>
      b.sampler(name, "usampler2D", () => this.panelPairTextures[kind]);
    this.panelPairUniforms = {
      frontBack: pair("uFrontBack", "frontBack"),
      leftRight: pair("uLeftRight", "leftRight"),
      topBottom: pair("uTopBottom", "topBottom"),
    };
  }

  protected makeCellSource(): CellSource {
    return packedPairCellSource(this.panelPairUniforms!);
  }
}
