// CPU triangle-mesh extraction for the alternative (surface-mesh) renderer.
// Each block's surface is turned into a set of quads — one per exposed face —
// whose positions are in the block's local world space (centred at the origin,
// matching the placement the blocks are drawn at). UVs are baked into
// the atlas using exactly the same face→tile mapping as `rayMarchWorld`, so the
// terrain is lit and textured the same wherever a face is drawn.
//
// Seam faces between neighbouring blocks are culled by reading the block's own
// 1-voxel meshing border (`VoxelStore.padding`), which `fillStore` generates
// from the same world-coordinate terrain function as the interior. The border
// always matches what the neighbour will contain, so no worker needs a
// neighbour's live store to resolve a seam.
import { BufferAttribute, BufferGeometry } from "@random-mesh/rmsl/scene";
import type { TileRect, VoxelTileConfig } from "./atlas";
import { VOXEL_AIR, VOXEL_WATER, type VoxelStore } from "../world/voxel-store";

/**
 * Vertex arrays for one mesh. The CPU builders produce plain arrays; the
 * web worker converts them to typed arrays so they can be transferred back
 * without a copy. `meshArraysToGeometry` consumes either.
 */
export interface MeshArrays {
  positions: number[] | Float32Array;
  normals: number[] | Float32Array;
  uvs: number[] | Float32Array;
  indices: number[] | Uint32Array;
}

/**
 * One quad's four corners as [xOffset, yOffset, zOffset, u, v] cell
 * offsets: the two tangent axes sweep 0..1 while the face axis stays 0,
 * and (u, v) are the in-plane local UVs from the raymarch renderer's face
 * mapping. Side faces flip v so the world-up axis maps to the top of the
 * source tile (grass sits on top).
 */
const FACE_CORNERS: Array<Array<[number, number, number, number, number]>> = [
  // +X/-X faces: u along +Z, v up along +Y (flipped)
  [
    [0, 0, 0, 0, 1],
    [0, 1, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 1, 1],
  ],
  // +Y/-Y faces: u along +X, v along +Z (no flip)
  [
    [0, 0, 0, 0, 0],
    [1, 0, 0, 1, 0],
    [1, 0, 1, 1, 1],
    [0, 0, 1, 0, 1],
  ],
  // +Z/-Z faces: u along +X, v up along +Y (flipped)
  [
    [0, 0, 0, 0, 1],
    [1, 0, 0, 1, 1],
    [1, 1, 0, 1, 0],
    [0, 1, 0, 0, 0],
  ],
];

/**
 * Used until the atlas loads (or for voxel ids with no tile config): a
 * full texel rect so faces still map to something sane.
 */
const DEFAULT_RECT: TileRect = [0, 0, 1, 1];

/**
 * Emits the terrain quads for every exposed face of `store`'s solid
 * voxels. `voxelTiles` maps each solid id to its top/side/bottom atlas
 * rects; when a config is missing (atlas not loaded yet) faces fall back
 * to `DEFAULT_RECT`.
 *
 * Neighbours are read from `store`'s 1-voxel meshing border (`atPadded`),
 * so seam faces against the adjacent block's matching voxels are culled
 * without a resolver. Below the floor is solid and above the ceiling is
 * air (the same rules as `sweepSurface`).
 */
export const buildBlockMesh = (
  store: VoxelStore,
  voxelTiles: VoxelTileConfig[],
): MeshArrays => {
  const [nx, ny, nz] = store.voxels;
  const scale = store.scale;
  const tiles = new Map<number, VoxelTileConfig>();
  for (const t of voxelTiles) {
    tiles.set(t.id, t);
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const at = (x: number, y: number, z: number): number =>
    store.atPadded(x, y, z);

  const emit = (
    wx: number,
    wy: number,
    wz: number,
    axis: number,
    sign: number,
    rect: TileRect,
  ): void => {
    const h = scale / 2;
    const base = positions.length / 3;
    for (const [xo, yo, zo, u, v] of FACE_CORNERS[axis]) {
      positions.push(
        axis === 0 ? wx + sign * h : wx + (xo - 0.5) * 2 * h,
        axis === 1 ? wy + sign * h : wy + (yo - 0.5) * 2 * h,
        axis === 2 ? wz + sign * h : wz + (zo - 0.5) * 2 * h,
      );
      normals.push(
        axis === 0 ? sign : 0,
        axis === 1 ? sign : 0,
        axis === 2 ? sign : 0,
      );
      uvs.push(
        rect[0] + u * (rect[2] - rect[0]),
        rect[1] + v * (rect[3] - rect[1]),
      );
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  for (let z = 0; z < nz; ++z) {
    for (let y = 0; y < ny; ++y) {
      for (let x = 0; x < nx; ++x) {
        const id = at(x, y, z);
        if (id === VOXEL_AIR || id === VOXEL_WATER) {
          continue;
        }
        const below = y === 0 ? 1 : at(x, y - 1, z);
        const above = y === ny - 1 ? 0 : at(x, y + 1, z);
        const left = at(x - 1, y, z);
        const right = at(x + 1, y, z);
        const front = at(x, y, z - 1);
        const back = at(x, y, z + 1);
        const exposedTop = above === VOXEL_AIR || above === VOXEL_WATER;
        const exposedBottom = below === VOXEL_AIR || below === VOXEL_WATER;
        const exposedLeft = left === VOXEL_AIR || left === VOXEL_WATER;
        const exposedRight = right === VOXEL_AIR || right === VOXEL_WATER;
        const exposedFront = front === VOXEL_AIR || front === VOXEL_WATER;
        const exposedBack = back === VOXEL_AIR || back === VOXEL_WATER;
        if (
          !exposedTop &&
          !exposedBottom &&
          !exposedLeft &&
          !exposedRight &&
          !exposedFront &&
          !exposedBack
        ) {
          continue;
        }
        const wx = (x + 0.5 - nx / 2) * scale;
        const wy = (y + 0.5 - ny / 2) * scale;
        const wz = (z + 0.5 - nz / 2) * scale;
        const tile = tiles.get(id);
        const top = tile?.top ?? DEFAULT_RECT;
        const side = tile?.side ?? DEFAULT_RECT;
        const bottom = tile?.bottom ?? DEFAULT_RECT;
        if (exposedTop) emit(wx, wy, wz, 1, 1, top);
        if (exposedBottom) emit(wx, wy, wz, 1, -1, bottom);
        if (exposedLeft) emit(wx, wy, wz, 0, -1, side);
        if (exposedRight) emit(wx, wy, wz, 0, 1, side);
        if (exposedFront) emit(wx, wy, wz, 2, -1, side);
        if (exposedBack) emit(wx, wy, wz, 2, 1, side);
      }
    }
  }

  return { positions, normals, uvs, indices };
};

/**
 * Emits the water surface quads: every face of a water voxel that borders
 * air (the top surface plus cliff-side banks). Uses the same positioning
 * as the terrain mesh so the two tile up seamlessly. UVs are unused by the
 * water material. Seam faces against adjacent blocks' water are culled by
 * the same generated `VoxelStore` border as the terrain mesh.
 */
export const buildWaterMesh = (store: VoxelStore): MeshArrays => {
  const [nx, ny, nz] = store.voxels;
  const scale = store.scale;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const at = (x: number, y: number, z: number): number =>
    store.atPadded(x, y, z);

  const emit = (
    wx: number,
    wy: number,
    wz: number,
    axis: number,
    sign: number,
  ): void => {
    const h = scale / 2;
    const base = positions.length / 3;
    for (const [xo, yo, zo, u, v] of FACE_CORNERS[axis]) {
      positions.push(
        axis === 0 ? wx + sign * h : wx + (xo - 0.5) * 2 * h,
        axis === 1 ? wy + sign * h : wy + (yo - 0.5) * 2 * h,
        axis === 2 ? wz + sign * h : wz + (zo - 0.5) * 2 * h,
      );
      normals.push(
        axis === 0 ? sign : 0,
        axis === 1 ? sign : 0,
        axis === 2 ? sign : 0,
      );
      uvs.push(u, v);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  for (let z = 0; z < nz; ++z) {
    for (let y = 0; y < ny; ++y) {
      for (let x = 0; x < nx; ++x) {
        if (at(x, y, z) !== VOXEL_WATER) {
          continue;
        }
        const below = y === 0 ? 1 : at(x, y - 1, z);
        const above = y === ny - 1 ? 0 : at(x, y + 1, z);
        const left = at(x - 1, y, z);
        const right = at(x + 1, y, z);
        const front = at(x, y, z - 1);
        const back = at(x, y, z + 1);
        const exposedTop = above === VOXEL_AIR;
        const exposedBottom = below === VOXEL_AIR;
        const exposedLeft = left === VOXEL_AIR;
        const exposedRight = right === VOXEL_AIR;
        const exposedFront = front === VOXEL_AIR;
        const exposedBack = back === VOXEL_AIR;
        if (
          !exposedTop &&
          !exposedBottom &&
          !exposedLeft &&
          !exposedRight &&
          !exposedFront &&
          !exposedBack
        ) {
          continue;
        }
        const wx = (x + 0.5 - nx / 2) * scale;
        const wy = (y + 0.5 - ny / 2) * scale;
        const wz = (z + 0.5 - nz / 2) * scale;
        if (exposedTop) emit(wx, wy, wz, 1, 1);
        if (exposedBottom) emit(wx, wy, wz, 1, -1);
        if (exposedLeft) emit(wx, wy, wz, 0, -1);
        if (exposedRight) emit(wx, wy, wz, 0, 1);
        if (exposedFront) emit(wx, wy, wz, 2, -1);
        if (exposedBack) emit(wx, wy, wz, 2, 1);
      }
    }
  }

  return { positions, normals, uvs, indices };
};

/**
 * Applies `mesh`'s arrays to an existing geometry *in place*, replacing
 * its attributes while keeping the geometry object identity stable. The
 * renderer keys its GPU-buffer cache by geometry object, so re-uploading
 * into the same geometry reuses the buffers it already allocated (the new
 * attributes carry `needsUpdate`, which makes the next draw refresh their
 * data). Replacing `mesh.geometry` with a fresh geometry instead would
 * orphan the old entry in that cache and leak its GPU buffers on every
 * rebuild.
 */
export const setGeometryData = (
  geometry: BufferGeometry,
  mesh: MeshArrays,
): void => {
  const toF32 = (a: number[] | Float32Array): Float32Array =>
    a instanceof Float32Array ? a : new Float32Array(a);
  const attr = (
    name: string,
    array: number[] | Float32Array,
    itemSize: number,
  ): void => {
    const a = new BufferAttribute(toF32(array), itemSize);
    a.needsUpdate = true;
    geometry.setAttribute(name, a);
  };
  attr("position", mesh.positions, 3);
  attr("normal", mesh.normals, 3);
  if (mesh.uvs.length > 0) {
    attr("uv", mesh.uvs, 2);
  } else {
    geometry.deleteAttribute("uv");
  }
  // wrap as a BufferAttribute so `setIndex` keeps the Uint32 type without
  // rescanning the array for the 16-bit cutoff
  const idx =
    mesh.indices instanceof Uint32Array
      ? mesh.indices
      : new Uint32Array(mesh.indices);
  geometry.setIndex(new BufferAttribute(idx, 1));
};

/**
 * Wraps extracted arrays into a fresh rmsl geometry (for tests and one-off
 * geometry); runtime block meshes should reuse a persistent geometry via
 * `setGeometryData` instead.
 */
export const meshArraysToGeometry = (mesh: MeshArrays): BufferGeometry => {
  const geometry = new BufferGeometry();
  setGeometryData(geometry, mesh);
  return geometry;
};

/**
 * The main-thread-to-worker mesh-build protocol. `data` is the block's voxel
 * data including its 1-voxel meshing border (a transferable copy), so the
 * worker can cull seam faces against the surrounding world without any
 * neighbour data of its own; the worker returns both meshes' arrays back.
 */
export interface MeshBuildRequest {
  id: number;
  voxels: [number, number, number];
  scale: number;
  data: Uint8Array;
  tileRects: VoxelTileConfig[];
}

export interface MeshBuildResult {
  id: number;
  terrain: MeshArrays;
  water: MeshArrays;
}
