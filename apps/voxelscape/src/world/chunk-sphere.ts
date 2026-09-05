// The block window: keeps a fixed-size ball of `WorldBlock`s — one per
// chunk cell within `radius` chunks of the player's cell, `yRadius` chunks
// above and below it — centred on the player in every axis. When the player
// crosses a chunk boundary, cells that leave the ball are evicted and cells
// that enter claim their slot (same slot, new data) rather than allocating
// fresh ones. Owns the `FillClient` that generates each cell's terrain,
// offline when the worker is available.
import {
  BLOCK_WORLD,
  VOXEL_SIZE,
  buildBlockShell,
  chunkCellOf,
  type BlockQuery,
  type Dim3,
  type WorldBlock,
} from "./level-data";
import { FillClient } from "./fill-client";
import type { EditLayer } from "./edit-layer";
import type { TerrainConfig } from "./noise";
import type { BorderSizes, FillStoreFn } from "./voxel-store";

export interface CellCoord {
  x: number;
  y: number;
  z: number;
}

export const cellKey = (c: CellCoord): string => `${c.x},${c.y},${c.z}`;

/**
 * Every integer lattice cell within `radius` squared of `center` — the set
 * of chunks the window holds. The Y extent is `yRadius` (default `radius`,
 * a regular ball), so the window can be flattened vertically — a squashed
 * ball — when there is nothing worth streaming far above and below the
 * player. Ordered in `x`, then `y`, then `z`.
 */
export const sphereCells = (
  center: CellCoord,
  radius: number,
  yRadius = radius,
): CellCoord[] => {
  const out: CellCoord[] = [];
  const r2 = radius * radius;
  const ky = radius / yRadius;
  for (let x = -radius; x <= radius; x++) {
    for (let y = -yRadius; y <= yRadius; y++) {
      for (let z = -radius; z <= radius; z++) {
        if (x * x + z * z + (y * ky) ** 2 <= r2) {
          out.push({ x: center.x + x, y: center.y + y, z: center.z + z });
        }
      }
    }
  }
  return out;
};

/** How many cells a window of these `radius` and `yRadius` values holds. */
export const cellsInSphere = (radius: number, yRadius = radius): number =>
  sphereCells({ x: 0, y: 0, z: 0 }, radius, yRadius).length;

/**
 * The level of detail a cell is generated at, from its euclidean distance in
 * chunks from the player's cell. Cells within three chunks — out past the
 * fog's start, so everything the player can clearly see — stay at full
 * resolution; the shell from three to four chunks, which the fog hides
 * heavily, is one level coarser; anything beyond the ball's edge would be
 * coarsest. Each level doubles the voxel size, so a block's voxel count drops
 * by eight per level.
 */
export const lodAt = (cell: CellCoord, center: CellCoord): number => {
  const dx = cell.x - center.x;
  const dy = cell.y - center.y;
  const dz = cell.z - center.z;
  const distanceSquared = dx * dx + dy * dy + dz * dz;
  if (distanceSquared <= 9) {
    return 0;
  }
  if (distanceSquared <= 16) {
    return 1;
  }
  return 2;
};

/**
 * The voxel size of each of a cell's six neighbours, as its seam faces cull
 * against them. A neighbour built at a different level of detail has a
 * different voxel size, which the border of the block the sphere fills uses
 * to keep the shared boundary hole-free; the exact size is `VOXEL_SIZE`
 * doubled per level of detail.
 */
export const borderSizesOf = (
  cell: CellCoord,
  center: CellCoord,
): BorderSizes => {
  const at = (dx: number, dy: number, dz: number): number =>
    VOXEL_SIZE *
    (1 << lodAt({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz }, center));
  return {
    px: at(1, 0, 0),
    nx: at(-1, 0, 0),
    py: at(0, 1, 0),
    ny: at(0, -1, 0),
    pz: at(0, 0, 1),
    nz: at(0, 0, -1),
  };
};

export interface ChunkSphereParams {
  /** Chunk radius of the window in X and Z. */
  radius: number;
  /**
   * Chunk radius of the window in Y, defaulting to `radius` (a regular
   * ball). Smaller than `radius` flattens the window vertically, bounding
   * the pool to the terrain around the player instead of a full ball of
   * stone above and below it.
   */
  yRadius?: number;
  terrain: TerrainConfig;
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
  /**
   * Called just before a slot's current voxel data is discarded: an evicted
   * cell, or one refilled in place at a new level of detail. The slot still
   * answers for its old cell here, so the caller can snapshot anything worth
   * keeping (resting fluid) into the edit overlay before it is gone.
   */
  onBlockRelease?: (index: number) => void;
  customFillStore?: FillStoreFn;
  customFillStoreUrl?: string;
  /** Applied to each block after its terrain is generated (see `FillClient`). */
  editLayer?: EditLayer;
}

/**
 * Requests a window's chunk data from a `FillClient` — every cell at
 * startup through `fillFrom`, then the cells each scroll reveals — and
 * keeps the ball (flattened to `yRadius` in Y) centred on the player.
 * `blocks` stays the same array reference across scrolling, so anything
 * holding onto it (e.g. `RendererSwitch`) sees updates in place.
 */
export class ChunkSphere {
  readonly blocks: WorldBlock[];
  readonly radius: number;
  readonly yRadius: number;
  /**
   * Resolves a world point to the block whose cell contains it. Backs the
   * terrain queries (height, collision), which must stay O(1) per call.
   */
  readonly query: BlockQuery;

  private readonly cells: CellCoord[] = [];
  private readonly cellIndex = new Map<string, number>();
  private readonly free: number[] = [];
  private readonly onBlockReposition: (index: number, center: Dim3) => void;
  private readonly onBlockRelease?: (index: number) => void;
  private readonly fillClient: FillClient;

  private centerCell: CellCoord = { x: 0, y: 0, z: 0 };

  constructor(params: ChunkSphereParams) {
    this.radius = params.radius;
    this.yRadius = params.yRadius ?? params.radius;
    this.onBlockReposition = params.onBlockReposition;
    this.onBlockRelease = params.onBlockRelease;

    const initial = sphereCells(
      { x: 0, y: 0, z: 0 },
      this.radius,
      this.yRadius,
    );
    this.blocks = initial.map((cell) => {
      const center: Dim3 = [
        cell.x * BLOCK_WORLD[0],
        cell.y * BLOCK_WORLD[1],
        cell.z * BLOCK_WORLD[2],
      ];
      this.cells.push({ x: cell.x, y: cell.y, z: cell.z });
      // A shell's empty store is sized to the LOD its first cell gets, so the
      // initial allocation is no larger than the fills that follow; a slot
      // later filled at a different LOD resizes in place.
      return buildBlockShell({
        center,
        lod: lodAt(cell, { x: 0, y: 0, z: 0 }),
      });
    });

    this.query = (worldX, worldY, worldZ) => {
      const slot = this.slotAt(worldX, worldY, worldZ);
      return slot === undefined ? undefined : this.blocks[slot];
    };

    this.fillClient = new FillClient({
      terrain: params.terrain,
      blocks: this.blocks,
      onBlockChanged: params.onBlockChanged,
      editLayer: params.editLayer,
      customFillStore: params.customFillStore,
      customFillStoreUrl: params.customFillStoreUrl,
    });
  }

  /**
   * The slot holding the cell that contains a world point, or `undefined`
   * when the window does not hold that cell. Backs `query` and the caller's
   * "is this cell's data ready" check.
   */
  slotAt(worldX: number, worldY: number, worldZ: number): number | undefined {
    const [cx, cy, cz] = chunkCellOf(worldX, worldY, worldZ);
    return this.cellIndex.get(cellKey({ x: cx, y: cy, z: cz }));
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
    const cells = sphereCells(this.centerCell, this.radius, this.yRadius);
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
    const nearestLod = lodAt(this.cells[nearest], this.centerCell);
    this.blocks[nearest].targetLod = nearestLod;
    this.fillClient.fillNow(
      nearest,
      nearestLod,
      borderSizesOf(this.cells[nearest], this.centerCell),
    );
    for (const index of rest) {
      this.blocks[index].targetLod = lodAt(this.cells[index], this.centerCell);
    }
    this.fillClient.requestFill(
      rest,
      rest.map((index) => this.blocks[index].center),
      rest.map((index) => lodAt(this.cells[index], this.centerCell)),
      rest.map((index) => borderSizesOf(this.cells[index], this.centerCell)),
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

  /** The level of detail the slot's store is currently holding. */
  private lodOf(slot: number): number {
    return Math.round(Math.log2(this.blocks[slot].store.scale / VOXEL_SIZE));
  }

  /**
   * Keeps the window centred on the player: when they cross a chunk boundary,
   * the cells that leave the ball are evicted and the cells that enter claim
   * the freed slots. Every entering cell streams in through the worker pool;
   * the player's own cell is requested first, and the caller holds physics
   * until its fill lands.
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
    const next = sphereCells(
      { x: cx, y: cy, z: cz },
      this.radius,
      this.yRadius,
    );
    const nextKeys = new Set(next.map(cellKey));

    // A cell that stays in the ball keeps its slot, but the level of detail
    // it was generated at was chosen for the old distance; one whose ring
    // changed is refilled in place at the new LOD, so a cell the player
    // walks toward sheds its coarse voxels before they come into view.
    const refill: number[] = [];
    for (const [key, slot] of this.cellIndex) {
      if (!nextKeys.has(key)) {
        this.onBlockRelease?.(slot);
        this.cellIndex.delete(key);
        this.free.push(slot);
        continue;
      }
      const desiredLod = lodAt(this.cells[slot], { x: cx, y: cy, z: cz });
      if (
        desiredLod !== this.lodOf(slot) &&
        desiredLod !== this.blocks[slot].targetLod
      ) {
        this.onBlockRelease?.(slot);
        refill.push(slot);
        this.blocks[slot].targetLod = desiredLod;
      }
    }

    const entering: number[] = [];
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
      this.blocks[slot].targetLod = lodAt(cell, { x: cx, y: cy, z: cz });
      // reposition both renderers' meshes for this slot; the triangle
      // renderer also clears its geometry there to avoid flashing the old
      // block's surface at the new location
      this.onBlockReposition(slot, c);
      entering.push(slot);
    }

    this.centerCell = { x: cx, y: cy, z: cz };

    const toFill = [...entering, ...refill];
    if (toFill.length === 0) {
      return;
    }
    // Fill nearest-first so the terrain the player is walking toward appears
    // before the cap behind them; the player's own cell, being nearest, is
    // the first of the first worker's batch and lands first.
    const order = toFill.sort(
      (a, b) =>
        this.distanceSquared(a, x, y, z) - this.distanceSquared(b, x, y, z),
    );
    this.fillClient.requestFill(
      order,
      order.map((index) => this.blocks[index].center),
      order.map((index) => lodAt(this.cells[index], this.centerCell)),
      order.map((index) => borderSizesOf(this.cells[index], this.centerCell)),
    );
  }

  dispose(): void {
    this.fillClient.dispose();
  }
}
