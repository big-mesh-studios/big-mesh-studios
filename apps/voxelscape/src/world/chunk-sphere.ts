// The spherical block window: keeps a fixed-size ball of `WorldBlock`s —
// one per chunk cell within `radius` chunks of the player's cell — centred
// on the player, in every axis. When the player crosses a chunk boundary,
// cells that leave the ball are evicted and cells that enter claim their
// slot (same slot, new data) rather than allocating fresh ones. Owns the
// `FillClient` that generates each cell's terrain, offline when the worker
// is available.
import {
  BLOCK_WORLD,
  buildBlockShell,
  chunkCellOf,
  resetLevel,
  type BlockQuery,
  type Dim3,
  type WorldBlock,
} from "./level-data";
import { FillClient } from "./fill-client";
import type { EditLayer } from "./edit-layer";
import type { TerrainConfig } from "./noise";
import type { FillStoreFn } from "./voxel-store";

export interface CellCoord {
  x: number;
  y: number;
  z: number;
}

export const cellKey = (c: CellCoord): string => `${c.x},${c.y},${c.z}`;

/**
 * Every integer lattice cell within euclidean `radius` of `center`: the set
 * of chunks the window holds. Ordered in `x`, then `y`, then `z`.
 */
export const sphereCells = (center: CellCoord, radius: number): CellCoord[] => {
  const out: CellCoord[] = [];
  const r2 = radius * radius;
  for (let x = -radius; x <= radius; x++) {
    for (let y = -radius; y <= radius; y++) {
      for (let z = -radius; z <= radius; z++) {
        if (x * x + y * y + z * z <= r2) {
          out.push({ x: center.x + x, y: center.y + y, z: center.z + z });
        }
      }
    }
  }
  return out;
};

/** How many cells a spherical window of this `radius` holds. */
export const cellsInSphere = (radius: number): number =>
  sphereCells({ x: 0, y: 0, z: 0 }, radius).length;

export interface ChunkSphereParams {
  /** Chunk radius of the spherical window. */
  radius: number;
  terrain: TerrainConfig;
  surfaceOnly: boolean;
  /**
   * Called whenever a slot's voxel data is ready to be reflected on screen —
   * during the initial fill, or when a scroll-revealed cell's fill lands.
   */
  onBlockChanged: (index: number) => void;
  /**
   * Called when a slot takes a different world position (scroll), before its
   * new data has arrived.
   */
  onBlockReposition: (index: number, center: Dim3) => void;
  customFillStore?: FillStoreFn;
  customFillStoreUrl?: string;
  /** Applied to each block after its terrain is generated (see `FillClient`). */
  editLayer?: EditLayer;
}

/**
 * Requests a spherical window's chunk data from a `FillClient` — every cell
 * at startup through `fillFrom`, then the cells each scroll reveals — and
 * keeps the ball centred on the player. `blocks` stays the same array
 * reference across scrolling, so anything holding onto it (e.g.
 * `RendererSwitch`) sees updates in place.
 */
export class ChunkSphere {
  readonly blocks: WorldBlock[];
  readonly radius: number;
  /**
   * Resolves a world point to the block whose cell contains it. Backs the
   * terrain queries (height, collision), which must stay O(1) per call.
   */
  readonly query: BlockQuery;

  private readonly cells: CellCoord[] = [];
  private readonly cellIndex = new Map<string, number>();
  private readonly free: number[] = [];
  private readonly onBlockReposition: (index: number, center: Dim3) => void;
  private readonly fillClient: FillClient;

  private centerCell: CellCoord = { x: 0, y: 0, z: 0 };

  constructor(params: ChunkSphereParams) {
    this.radius = params.radius;
    this.onBlockReposition = params.onBlockReposition;

    const initial = sphereCells({ x: 0, y: 0, z: 0 }, params.radius);
    this.blocks = initial.map((cell) => {
      const center: Dim3 = [
        cell.x * BLOCK_WORLD[0],
        cell.y * BLOCK_WORLD[1],
        cell.z * BLOCK_WORLD[2],
      ];
      this.cells.push({ x: cell.x, y: cell.y, z: cell.z });
      return buildBlockShell({ center });
    });

    this.query = (worldX, worldY, worldZ) => {
      const [cx, cy, cz] = chunkCellOf(worldX, worldY, worldZ);
      const slot = this.cellIndex.get(cellKey({ x: cx, y: cy, z: cz }));
      return slot === undefined ? undefined : this.blocks[slot];
    };

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
   * Requests terrain for every cell of the window, nearest (`x`, `y`, `z`)
   * first, so the ball fills outward from under the player's feet. Results
   * land one block at a time through `onBlockChanged`.
   *
   * @returns The slot containing (`x`, `y`, `z`) — the one asked for first.
   */
  fillFrom(x: number, y: number, z: number): number {
    const center = chunkCellOf(x, y, z);
    this.centerCell = { x: center[0], y: center[1], z: center[2] };
    const cells = sphereCells(this.centerCell, this.radius);
    for (let i = 0; i < this.blocks.length; i++) {
      this.cells[i] = cells[i];
      this.cellIndex.set(cellKey(cells[i]), i);
      const c: Dim3 = [
        cells[i].x * BLOCK_WORLD[0],
        cells[i].y * BLOCK_WORLD[1],
        cells[i].z * BLOCK_WORLD[2],
      ];
      this.blocks[i].center = c;
      this.onBlockReposition(i, c);
      resetLevel(this.blocks[i].level);
      this.blocks[i].level.broadTexture.needsUpdate = true;
      this.blocks[i].level.texture.needsUpdate = true;
    }

    const order = this.blocks.map((_, index) => index);
    order.sort(
      (a, b) =>
        this.distanceSquared(a, x, y, z) - this.distanceSquared(b, x, y, z),
    );
    const [nearest, ...rest] = order;
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

  private distanceSquared(
    index: number,
    x: number,
    y: number,
    z: number,
  ): number {
    const [bx, by, bz] = this.blocks[index].center;
    return (bx - x) ** 2 + (by - y) ** 2 + (bz - z) ** 2;
  }

  /**
   * Keeps the window centred on the player: when they cross a chunk boundary,
   * the cells that leave the ball are evicted and the cells that enter claim
   * the freed slots. The player's own new cell is generated on the calling
   * thread so collision data exists under them before the frame advances.
   */
  scrollTo(x: number, y: number, z: number): void {
    const [cx, cy, cz] = chunkCellOf(x, y, z);
    if (
      cx === this.centerCell.x &&
      cy === this.centerCell.y &&
      cz === this.centerCell.z
    ) {
      return;
    }
    const next = sphereCells({ x: cx, y: cy, z: cz }, this.radius);
    const nextKeys = new Set(next.map(cellKey));

    for (const [key, slot] of this.cellIndex) {
      if (!nextKeys.has(key)) {
        this.cellIndex.delete(key);
        this.free.push(slot);
        resetLevel(this.blocks[slot].level);
        this.blocks[slot].level.broadTexture.needsUpdate = true;
        this.blocks[slot].level.texture.needsUpdate = true;
      }
    }

    const entering: number[] = [];
    const playerKey = cellKey({ x: cx, y: cy, z: cz });
    let playerSlot = -1;
    for (const cell of next) {
      const key = cellKey(cell);
      if (this.cellIndex.has(key)) {
        continue;
      }
      const slot = this.free.pop();
      if (slot === undefined) {
        throw new Error("[ChunkSphere] window pool exhausted");
      }
      this.cells[slot] = cell;
      this.cellIndex.set(key, slot);
      const c: Dim3 = [
        cell.x * BLOCK_WORLD[0],
        cell.y * BLOCK_WORLD[1],
        cell.z * BLOCK_WORLD[2],
      ];
      this.blocks[slot].center = c;
      // reposition both renderers' meshes for this slot; the triangle
      // renderer also clears its geometry there to avoid flashing the old
      // block's surface at the new location
      this.onBlockReposition(slot, c);
      resetLevel(this.blocks[slot].level);
      this.blocks[slot].level.broadTexture.needsUpdate = true;
      this.blocks[slot].level.texture.needsUpdate = true;
      entering.push(slot);
      if (key === playerKey) {
        playerSlot = slot;
      }
    }

    this.centerCell = { x: cx, y: cy, z: cz };

    if (entering.length === 0) {
      return;
    }
    // Fill nearest-first so the terrain the player is walking toward appears
    // before the cap behind them; the player's own cell still comes first.
    const order = entering
      .map((slot) => slot)
      .sort(
        (a, b) =>
          this.distanceSquared(a, x, y, z) - this.distanceSquared(b, x, y, z),
      );
    if (playerSlot >= 0) {
      // The block under the player has to exist before physics reads it.
      const rest = order.filter((slot) => slot !== playerSlot);
      this.fillClient.fillNow(playerSlot);
      this.fillClient.requestFill(
        rest,
        rest.map((index) => this.blocks[index].center),
      );
    } else {
      this.fillClient.requestFill(
        order,
        order.map((index) => this.blocks[index].center),
      );
    }
  }

  dispose(): void {
    this.fillClient.dispose();
  }
}
