import type { VoxelTileConfig } from "./atlas";
import type { WorldBlock } from "../world/level-data";
import {
  buildBlockMesh,
  buildWaterMesh,
  type MeshArrays,
  type MeshBuildRequest,
  type MeshBuildResult,
} from "./mesh";

/**
 * How many block meshes to hand the workers per drain, in total; the workers
 * do the heavy lifting, so the main thread only pays for wrapping the requests.
 */
const MAX_BUILDS_PER_DRAIN = 12;

/** How many mesh workers to run: a small pool parallelizes the burst of builds a sphere scroll queues. */
const workerCount = (): number => {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.hardwareConcurrency !== "number"
  ) {
    return 2;
  }
  return Math.max(1, Math.min(4, navigator.hardwareConcurrency));
};

/** The geometry of a chunk that holds no surface: nothing to draw. */
const EMPTY_MESH: MeshArrays = {
  positions: [],
  normals: [],
  uvs: [],
  indices: [],
};

export interface MeshClientParams {
  /**
   * The blocks a build reads voxel data from, indexed the same way as every
   * index passed in and reported back. Shared with the caller, not copied, so
   * a build reads whatever block occupies that slot at the time it runs.
   */
  blocks: WorldBlock[];
  /**
   * Called with a block's freshly built geometry, from the workers and from
   * the main-thread fallback alike. Results for data that has since been
   * replaced never reach it.
   */
  onMeshBuilt: (index: number, terrain: MeshArrays, water: MeshArrays) => void;
  /** How many builds one `drain` hands the workers, in total. Defaults to twelve. */
  buildsPerDrain?: number;
  /**
   * Supplies the worker that builds the meshes. Defaults to a pool of
   * `hardwareConcurrency`-bounded module workers; a caller that hands over
   * one worker (or nothing) gets a single worker (or the main-thread fallback)
   * instead.
   */
  createWorker?: () => Worker | undefined;
}

/**
 * Turns blocks' voxel data into triangle geometry off the main thread,
 * falling back to building on the calling thread if the worker is unavailable
 * or errors.
 *
 * Each block carries a generation counter, bumped whenever its data or the
 * tiles change. A result is applied only if the generation it was requested
 * at is still current, so a build that finishes after the data it read has
 * been replaced is dropped rather than drawn.
 */
export class MeshClient {
  private readonly blocks: WorldBlock[];
  private readonly onMeshBuilt: (
    index: number,
    terrain: MeshArrays,
    water: MeshArrays,
  ) => void;
  private readonly buildsPerDrain: number;

  /** How many times each block's mesh has been invalidated. */
  private readonly generation: number[];
  /** Blocks whose mesh no longer matches their data, waiting to be built. */
  private readonly pending = new Set<number>();
  /** The generation each block's outstanding worker request was made at. */
  private readonly inFlight = new Map<number, number>();
  /**
   * The face tile rectangles baked into each vertex's texture coordinates,
   * empty until the atlas is read. A mesh built while it is empty is textured
   * from nothing, which is why `setTiles` invalidates every block.
   */
  private readonly tilesById = new Map<number, VoxelTileConfig>();
  private readonly workers: Worker[] = [];
  private workerAvailable = true;
  private warnedWorkerError = false;
  private nextWorker = 0;

  constructor(params: MeshClientParams) {
    this.blocks = params.blocks;
    this.onMeshBuilt = params.onMeshBuilt;
    this.buildsPerDrain = params.buildsPerDrain ?? MAX_BUILDS_PER_DRAIN;
    this.generation = new Array(params.blocks.length).fill(0);

    const count = params.createWorker === undefined ? workerCount() : 1;
    for (let i = 0; i < count; i++) {
      try {
        const worker =
          params.createWorker === undefined
            ? new Worker(new URL("./mesh-worker.ts", import.meta.url), {
                type: "module",
              })
            : params.createWorker();
        if (worker === undefined) {
          this.workerAvailable = false;
          break;
        }
        worker.onmessage = (ev) => {
          this.onWorkerMessage(ev.data as MeshBuildResult);
        };
        worker.onerror = () => {
          this.onWorkerError(worker);
        };
        this.workers.push(worker);
      } catch {
        if (this.workers.length === 0) {
          this.workerAvailable = false;
        }
        break;
      }
    }
  }

  private onWorkerMessage(msg: MeshBuildResult): void {
    const requestedAt = this.inFlight.get(msg.id);
    if (requestedAt === undefined) {
      return;
    }
    this.inFlight.delete(msg.id);
    if (requestedAt !== this.generation[msg.id]) {
      return; // the block changed after this request was sent
    }
    this.onMeshBuilt(msg.id, msg.terrain, msg.water);
  }

  private onWorkerError(failed: Worker): void {
    const stillAlive = this.workers.filter((w) => w !== failed);
    this.workers.length = 0;
    this.workers.push(...stillAlive);
    if (this.workers.length === 0) {
      this.workerAvailable = false;
    }
    if (!this.warnedWorkerError) {
      this.warnedWorkerError = true;
      console.warn(
        "[mesh] worker errored; falling back to the remaining workers or the main thread",
      );
    }
    // The builds the dead worker had in flight are owed and will not be
    // delivered; put them back on the queue for a live worker or the main
    // thread to redo.
    for (const index of this.inFlight.keys()) {
      this.pending.add(index);
    }
    this.inFlight.clear();
  }

  /**
   * Marks a block's mesh stale without asking for a new one, so a build
   * already in flight for it is dropped when it lands. For a slot that has
   * moved and has no data yet to build from.
   */
  invalidate(index: number): void {
    this.generation[index]++;
  }

  /** Marks a block's mesh stale and queues a rebuild from its current data. */
  requestBuild(index: number): void {
    this.generation[index]++;
    this.pending.add(index);
  }

  /**
   * Builds one block's mesh on the calling thread, before returning, and
   * takes it off the queue. For the block that has to be on screen before the
   * player is let in: starting the worker and loading its modules costs
   * several times what building a single mesh costs, so a mesh that waits for
   * that start arrives seconds after one built here.
   */
  buildNow(index: number): void {
    this.pending.delete(index);
    this.buildOnThisThread([index]);
  }

  /**
   * Hands the next few queued blocks to the workers, or builds every queued
   * block here if there isn't one. Called once a frame.
   */
  drain(): void {
    if (this.workers.length === 0 || !this.workerAvailable) {
      const queued = [...this.pending];
      this.pending.clear();
      this.buildOnThisThread(queued);
      return;
    }
    let sent = 0;
    for (const index of this.pending) {
      if (this.inFlight.has(index)) {
        continue;
      }
      if (!this.hasSurfaceData(index)) {
        // A chunk whose derived level is empty (fully buried rock or upper
        // air) can never expose a face, so don't round-trip it through a
        // worker's full-volume sweep.
        this.pending.delete(index);
        this.onMeshBuilt(index, EMPTY_MESH, EMPTY_MESH);
        continue;
      }
      this.send(index);
      this.pending.delete(index);
      if (++sent >= this.buildsPerDrain) {
        break;
      }
    }
  }

  /**
   * Replaces the tile rectangles and queues every block, because each one's
   * texture coordinates are baked into the geometry it was built with.
   */
  setTiles(voxelTiles: VoxelTileConfig[]): void {
    this.tilesById.clear();
    for (const tile of voxelTiles) {
      this.tilesById.set(tile.id, tile);
    }
    for (let index = 0; index < this.blocks.length; index++) {
      this.requestBuild(index);
    }
  }

  private buildOnThisThread(indices: number[]): void {
    const tiles = [...this.tilesById.values()];
    for (const index of indices) {
      if (!this.hasSurfaceData(index)) {
        this.onMeshBuilt(index, EMPTY_MESH, EMPTY_MESH);
        continue;
      }
      const store = this.blocks[index].store;
      this.onMeshBuilt(
        index,
        buildBlockMesh(store, tiles),
        buildWaterMesh(store),
      );
    }
  }

  /** Whether the block's derived GPU level holds any stored voxel. */
  private hasSurfaceData(index: number): boolean {
    const broad = this.blocks[index].level.broadData;
    for (let i = 0; i < broad.length; i++) {
      if (broad[i] !== 0) {
        return true;
      }
    }
    return false;
  }

  private send(index: number): void {
    this.generation[index]++;
    this.inFlight.set(index, this.generation[index]);
    const store = this.blocks[index].store;
    const request: MeshBuildRequest = {
      id: index,
      voxels: store.voxels,
      scale: store.scale,
      data: store.data.slice(),
      tileRects: [...this.tilesById.values()],
    };
    const worker = this.workers[this.nextWorker % this.workers.length];
    this.nextWorker++;
    worker?.postMessage(request, [request.data.buffer]);
  }

  dispose(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
  }
}
