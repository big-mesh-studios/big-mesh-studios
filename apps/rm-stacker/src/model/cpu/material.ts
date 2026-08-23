import type { UniformNode } from "@random-mesh/rmsl";
import type { Builder } from "@random-mesh/rmsl/scene";
import { DataTexture } from "@random-mesh/rmsl/scene";
import type { CellSource } from "../shared/shaders-shared";
import { solvedVolumeCellSource } from "../shared/shaders-shared";
import { VoxelMaterialBase } from "../shared/material";

/** Marches a volume already solved (and packed) on the CPU. */
export class SolvedVolumeVoxelMaterial extends VoxelMaterialBase {
  voxelTexture = new DataTexture(new Uint8Array(4), 1, 1, 1);

  private voxelsUniform?: UniformNode<"usampler3D">;

  protected setupSamplers(b: Builder): void {
    this.voxelsUniform = b.sampler("uVoxels", "usampler3D", () => this.voxelTexture);
  }

  protected makeCellSource(): CellSource {
    return solvedVolumeCellSource(this.voxelsUniform!);
  }
}
