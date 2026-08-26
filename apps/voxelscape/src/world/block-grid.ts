import {
  BLOCK_WORLD,
  buildBlockShell,
  type Dim3,
  type WorldBlock,
} from "./level-data";

export interface BlockGridParams {
  blocksPerSide: number;
}

/**
 * A `blocksPerSide x blocksPerSide` window of `WorldBlock`s, each tagged with
 * its integer grid coordinate. The constructor only allocates them — every
 * block starts as air, and `WorldRing` is what asks for their terrain, both
 * for the initial fill and for the slots a scroll reveals.
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
          grid.x * BLOCK_WORLD[0],
          0,
          grid.z * BLOCK_WORLD[2],
        ];
        this.blocks.push(buildBlockShell({ center }));
        this.worldGrid.push(grid);
      }
    }
  }
}
