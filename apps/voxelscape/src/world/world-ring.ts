import {
  BLOCK_WORLD,
  resetLevel,
  type Dim3,
  type WorldBlock,
} from "./level-data";
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
  onBlockReposition: (index: number, center: Dim3) => void;
  customFillStore?: FillStoreFn;
  customFillStoreUrl?: string;
  /** Applied to each block after its terrain is generated (see `FillClient`). */
  editLayer?: EditLayer;
}

/**
 * Requests a `BlockGrid`'s voxel data from a `FillClient` — every slot at
 * startup through `fillFrom`, then the slots each scroll reveals — and keeps
 * the window centred on the player.
 */
export class WorldRing {
  private readonly blocks: WorldBlock[];
  private readonly worldGrid: { x: number; z: number }[];
  private readonly onBlockReposition: (index: number, center: Dim3) => void;
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
   * Requests terrain for every slot in the window, nearest (`x`, `z`) first,
   * so the ring fills outward from under the player's feet. Results land one
   * block at a time through `onBlockChanged`.
   *
   * @returns The slot containing (`x`, `z`) — the one asked for first.
   */
  fillFrom(x: number, z: number): number {
    const indices = this.blocks.map((_, index) => index);
    indices.sort(
      (a, b) => this.distanceSquared(a, x, z) - this.distanceSquared(b, x, z),
    );
    const [nearest, ...rest] = indices;
    // The nearest block is generated here, on the calling thread, and only the
    // rest are handed to the worker. Nothing can be drawn and the player
    // cannot be let in until this one block exists, and waiting for a worker
    // to start costs several times more than the block does.
    this.fillClient.fillNow(nearest);
    this.fillClient.requestFill(
      rest,
      rest.map((index) => this.blocks[index].center),
    );
    return nearest;
  }

  private distanceSquared(index: number, x: number, z: number): number {
    const center = this.blocks[index].center;
    return (center[0] - x) ** 2 + (center[2] - z) ** 2;
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
    const changedCenters: Dim3[] = [];
    for (const i of changed) {
      const center: Dim3 = [
        this.worldGrid[i].x * BLOCK_WORLD[0],
        0,
        this.worldGrid[i].z * BLOCK_WORLD[2],
      ];
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
    const blockX = Math.floor(playerX / BLOCK_WORLD[0]);
    const blockZ = Math.floor(playerZ / BLOCK_WORLD[2]);
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
