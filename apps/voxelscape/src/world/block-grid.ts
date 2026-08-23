import {
  BLOCK_WORLD,
  buildBlock,
  type Dim3,
  type WorldBlock,
} from "./level-data";
import type { BlockGridLookup } from "../renderers/mesh";
import type { TerrainConfig } from "./noise";

export interface BlockGridParams {
  blocksPerSide: number;
  terrain: TerrainConfig;
  surfaceOnly: boolean;
}

/**
 * A `blocksPerSide x blocksPerSide` window of `WorldBlock`s, each tagged with
 * its integer grid coordinate, built synchronously in the constructor.
 * `WorldRing` owns moving the window and refilling slots as it scrolls;
 * `blocks`/`worldGrid` stay the same array references across that scrolling,
 * so anything holding onto them (e.g. `RendererSwitch`) sees updates in place.
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
          grid.x * BLOCK_WORLD[0],
          0,
          grid.z * BLOCK_WORLD[2],
        ];
        const block: WorldBlock = buildBlock({
          center,
          terrain: params.terrain,
          surfaceOnly: params.surfaceOnly,
        });
        this.blocks.push(block);
        this.worldGrid.push(grid);
      }
    }
  }

  gridCoordAt(index: number): { x: number; z: number } {
    const g = this.worldGrid[index];
    return { x: g.x, z: g.z };
  }

  lookupBlock: BlockGridLookup = (gx, gz) => {
    for (let i = 0; i < this.worldGrid.length; i++) {
      if (this.worldGrid[i].x === gx && this.worldGrid[i].z === gz) {
        return this.blocks[i].store;
      }
    }
    return undefined;
  };
}
