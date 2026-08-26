import {
  BLOCK_WORLD,
  buildBlock,
  type Dim3,
  type WorldBlock,
} from "./level-data";
import type { TerrainConfig } from "./noise";
import type { FillStoreFn } from "./voxel-store";

export interface BlockGridParams {
  blocksPerSide: number;
  terrain: TerrainConfig;
  surfaceOnly: boolean;
  customFillStore?: FillStoreFn;
}

/**
 * A `blocksPerSide x blocksPerSide` window of `WorldBlock`s, each tagged with
 * its integer grid coordinate, built synchronously in the constructor.
 * `WorldRing` owns moving the window and refilling slots as it scrolls;
 * `blocks`/`worldGrid` stay the same array references across that scrolling,
 * so anything holding onto them (e.g. `RendererSwitch`) sees updates in place.
 * `worldGrid` is `WorldRing`'s windowing state, kept private from everyone else.
 */
export class BlockGrid {
  readonly blocks: WorldBlock[] = [];
  readonly worldGrid: { x: number; z: number }[] = [];

  constructor(params: BlockGridParams) {
    const n = params.blocksPerSide;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const grid = {
          x: i - (n - 1) / 2,
          z: j - (n - 1) / 2,
        };
        const center: Dim3 = [
          grid.x * BLOCK_WORLD.x,
          0,
          grid.z * BLOCK_WORLD.z,
        ];
        const block: WorldBlock = buildBlock({
          center,
          terrain: params.terrain,
          surfaceOnly: params.surfaceOnly,
          customFillStore: params.customFillStore,
        });
        this.blocks.push(block);
        this.worldGrid.push(grid);
      }
    }
  }
}
