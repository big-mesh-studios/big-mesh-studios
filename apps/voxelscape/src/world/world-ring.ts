import { BLOCK_WORLD, resetLevel, type WorldBlock } from "./level-data";
import type { Vector3D } from "../utils/maths";
import { FillClient } from "./fill-client";
import type { BlockGrid } from "./block-grid";
import type { EditLayer } from "./edit-layer";
import type { TerrainConfig } from "./noise";
import type { FillStoreFn } from "./voxel-store";

export interface WorldRingParams {
  blockGrid: BlockGrid;
  terrain: TerrainConfig;
  surfaceOnly: boolean;
  /**
   * Called whenever a slot's voxel data is ready to be reflected on screen —
   * during the initial fill, or when a ring-scroll refill lands.
   */
  onBlockChanged: (index: number) => void;
  /**
   * Called when the ring steps and a slot now represents a different world
   * position, before its new data has arrived.
   */
  onBlockReposition: (index: number, center: Vector3D) => void;
  customFillStore?: FillStoreFn;
  customFillStoreUrl?: string;
  /** Applied to each block after its terrain is generated (see `FillClient`). */
  editLayer?: EditLayer;
}

/**
 * Keeps a `BlockGrid`'s window centred on the player, requesting the newly
 * revealed slots' voxel data from a `FillClient` as it scrolls.
 */
export class WorldRing {
  private readonly blocks: WorldBlock[];
  private readonly worldGrid: { x: number; z: number }[];
  private readonly onBlockReposition: (index: number, center: Vector3D) => void;
  private readonly fillClient: FillClient;

  // Keeps the ring window centred on the player's block.
  private centerBlockX = 0;
  private centerBlockZ = 0;

  constructor(params: WorldRingParams) {
    this.blocks = params.blockGrid.blocks;
    this.worldGrid = params.blockGrid.worldGrid;
    this.onBlockReposition = params.onBlockReposition;

    this.fillClient = new FillClient({
      terrain: params.terrain,
      surfaceOnly: params.surfaceOnly,
      blocks: this.blocks,
      onBlockChanged: params.onBlockChanged,
      editLayer: params.editLayer,
      customFillStore: params.customFillStore,
      customFillStoreUrl: params.customFillStoreUrl,
    });
  }

  /**
   * Moves the ring window one block step in the given direction: the whole
   * trailing column or row teleports to the leading edge and each is refilled
   * at its new center. Stepping only one block would let the window drift
   * off-centre when walking along a single axis.
   */
  private stepRing(dx: number, dz: number): void {
    const changed = new Set<number>();
    if (dx !== 0) {
      let min = Infinity;
      let max = -Infinity;
      for (const g of this.worldGrid) {
        if (g.x < min) {
          min = g.x;
        }
        if (g.x > max) {
          max = g.x;
        }
      }
      const from = dx > 0 ? min : max;
      const to = dx > 0 ? max + 1 : min - 1;
      for (let i = 0; i < this.worldGrid.length; i++) {
        if (this.worldGrid[i].x === from) {
          this.worldGrid[i].x = to;
          changed.add(i);
        }
      }
    }
    if (dz !== 0) {
      let min = Infinity;
      let max = -Infinity;
      for (const g of this.worldGrid) {
        if (g.z < min) {
          min = g.z;
        }
        if (g.z > max) {
          max = g.z;
        }
      }
      const from = dz > 0 ? min : max;
      const to = dz > 0 ? max + 1 : min - 1;
      for (let i = 0; i < this.worldGrid.length; i++) {
        if (this.worldGrid[i].z === from) {
          this.worldGrid[i].z = to;
          changed.add(i);
        }
      }
    }
    const changedIndices: number[] = [];
    const changedCenters: Vector3D[] = [];
    for (const i of changed) {
      const center: Vector3D = {
        x: this.worldGrid[i].x * BLOCK_WORLD.x,
        y: 0,
        z: this.worldGrid[i].z * BLOCK_WORLD.z,
      };
      this.blocks[i].center = center;
      // reposition both renderers' meshes for this slot; the triangle
      // renderer also clears its geometry there to avoid flashing the old
      // block's surface at the new location
      this.onBlockReposition(i, center);
      // clear the raymarch level so no stale terrain renders at the new spot
      // while the fill worker regenerates it (the block is at the fogged ring
      // edge, so the brief empty window is hidden)
      resetLevel(this.blocks[i].level);
      this.blocks[i].level.broadTexture.needsUpdate = true;
      this.blocks[i].level.texture.needsUpdate = true;
      changedIndices.push(i);
      changedCenters.push(center);
    }
    this.fillClient.requestFill(changedIndices, changedCenters);
  }

  scrollToPlayer(playerX: number, playerZ: number): void {
    const blockX = Math.floor(playerX / BLOCK_WORLD.x);
    const blockZ = Math.floor(playerZ / BLOCK_WORLD.z);
    while (this.centerBlockX !== blockX) {
      this.stepRing(Math.sign(blockX - this.centerBlockX), 0);
      this.centerBlockX += Math.sign(blockX - this.centerBlockX);
    }
    while (this.centerBlockZ !== blockZ) {
      this.stepRing(0, Math.sign(blockZ - this.centerBlockZ));
      this.centerBlockZ += Math.sign(blockZ - this.centerBlockZ);
    }
  }

  dispose(): void {
    this.fillClient.dispose();
  }
}
