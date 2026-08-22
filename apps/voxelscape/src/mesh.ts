// CPU triangle-mesh extraction for the alternative (surface-mesh) renderer.
// Each block's surface is turned into a set of quads — one per exposed face —
// whose positions are in the block's local world space (centred at the origin,
// matching the mesh placement used by the raymarch meshes). UVs are baked into
// the atlas using exactly the same face→tile mapping as `rayMarchWorld`, so the
// triangle renderer looks pixel-identical to the raymarched terrain.
import { BufferAttribute, BufferGeometry } from "@random-mesh/rmsl/scene";
import type { TileRect, VoxelTileConfig } from "./atlas";
import { VOXEL_AIR, VOXEL_WATER, type VoxelStore } from "./voxel-store";

// Vertex arrays for one mesh. The CPU builders produce plain arrays; the web
// worker converts them to typed arrays so they can be transferred back without
// a copy. `meshArraysToGeometry` consumes either.
export interface MeshArrays {
  positions: number[] | Float32Array;
  normals: number[] | Float32Array;
  uvs: number[] | Float32Array;
  indices: number[] | Uint32Array;
}

// Looks up a neighbouring block's store by its ring grid coordinate. Returns
// undefined when the ring has no block there (the world's outer edge), which
// the resolver treats as empty air.
export type BlockGridLookup = (
  gridX: number,
  gridZ: number,
) => VoxelStore | undefined;

// Resolves a voxel id at block-local voxel coords (x, y, z), handling the
// block volume's boundaries: below the floor is solid, above the ceiling is
// air, and horizontal out-of-bounds coords look into the neighbouring block's
// store so coincident seam faces are never double-emitted. Voxel coordinates
// tile across blocks, so block (gx, gz) covers worldVoxel in [gx*nx, (gx+1)*nx).
export interface BlockGridResolver {
  at(x: number, y: number, z: number): number;
}

export const makeBlockResolver = (
  store: VoxelStore,
  gridX: number,
  gridZ: number,
  lookup: BlockGridLookup,
): BlockGridResolver => {
  const [nx, ny, nz] = store.voxels;
  return {
    at(x, y, z) {
      if (y < 0) return 1; // the world's underside never surfaces
      if (y >= ny) return 0;
      let gx = gridX;
      let gz = gridZ;
      let lx = x;
      let lz = z;
      if (x < 0) {
        gx -= 1;
        lx += nx;
      } else if (x >= nx) {
        gx += 1;
        lx -= nx;
      }
      if (z < 0) {
        gz -= 1;
        lz += nz;
      } else if (z >= nz) {
        gz += 1;
        lz -= nz;
      }
      const neighbor = lookup(gx, gz);
      return neighbor === undefined ? VOXEL_AIR : neighbor.get(lx, y, lz);
    },
  };
};

// One quad's four corners as [xOff, yOff, zOff, u, v] cell offsets: the two
// tangent axes sweep 0..1 while the face axis stays 0, and (u, v) are the
// in-plane local UVs from the raymarch's face mapping. Side faces flip v so the
// world-up axis maps to the top of the source tile (grass sits on top).
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

// Used until the atlas loads (or for voxel ids with no tile config): a full
// texel rect so faces still map to something sane.
const DEFAULT_RECT: TileRect = [0, 0, 1, 1];

// Emits the terrain quads for every exposed face of `store`'s solid voxels.
// `voxelTiles` maps each solid id to its top/side/bottom atlas rects; when a
// config is missing (atlas not loaded yet) faces fall back to `DEFAULT_RECT`.
export const buildBlockMesh = (
  store: VoxelStore,
  resolver: BlockGridResolver,
  voxelTiles: VoxelTileConfig[],
): MeshArrays => {
  const [nx, ny, nz] = store.voxels;
  const data = store.data;
  const plane = nx * ny;
  const scale = store.scale;
  const tiles = new Map<number, VoxelTileConfig>();
  for (const t of voxelTiles) {
    tiles.set(t.id, t);
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

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

  // Resolves an out-of-bounds neighbour id; `data` covers the in-bounds case
  // directly in the loop below, so this runs only on the block's boundary
  // columns. Below the floor is solid and above the ceiling is air (the same
  // rules as `sweepSurface`).
  const resolverAt = (x: number, y: number, z: number): number => {
    if (y < 0) return 1;
    if (y >= ny) return 0;
    return resolver.at(x, y, z);
  };

  let idx = 0;
  for (let z = 0; z < nz; ++z) {
    for (let y = 0; y < ny; ++y) {
      for (let x = 0; x < nx; ++x, ++idx) {
        const id = data[idx];
        if (id === VOXEL_AIR || id === VOXEL_WATER) {
          continue;
        }
        const below = y === 0 ? 1 : data[idx - nx];
        const above = y === ny - 1 ? 0 : data[idx + nx];
        const left = x === 0 ? resolverAt(x - 1, y, z) : data[idx - 1];
        const right = x === nx - 1 ? resolverAt(x + 1, y, z) : data[idx + 1];
        const front = z === 0 ? resolverAt(x, y, z - 1) : data[idx - plane];
        const back = z === nz - 1 ? resolverAt(x, y, z + 1) : data[idx + plane];
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

// Emits the water surface quads: every face of a water voxel that borders air
// (the top surface plus cliff-side banks). Same positioning as the terrain mesh
// so the two tile up seamlessly. UVs are unused by the water material.
export const buildWaterMesh = (
  store: VoxelStore,
  resolver: BlockGridResolver,
): MeshArrays => {
  const [nx, ny, nz] = store.voxels;
  const data = store.data;
  const plane = nx * ny;
  const scale = store.scale;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const emit = (
    wx: number,
    wy: number,
    wz: number,
    axis: number,
    sign: number,
  ): void => {
    const h = scale / 2;
    const base = positions.length / 3;
    for (const [xo, yo, zo] of FACE_CORNERS[axis]) {
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
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  const resolverAt = (x: number, y: number, z: number): number => {
    if (y < 0) return 1;
    if (y >= ny) return 0;
    return resolver.at(x, y, z);
  };

  let idx = 0;
  for (let z = 0; z < nz; ++z) {
    for (let y = 0; y < ny; ++y) {
      for (let x = 0; x < nx; ++x, ++idx) {
        if (data[idx] !== VOXEL_WATER) {
          continue;
        }
        const below = y === 0 ? 1 : data[idx - nx];
        const above = y === ny - 1 ? 0 : data[idx + nx];
        const left = x === 0 ? resolverAt(x - 1, y, z) : data[idx - 1];
        const right = x === nx - 1 ? resolverAt(x + 1, y, z) : data[idx + 1];
        const front = z === 0 ? resolverAt(x, y, z - 1) : data[idx - plane];
        const back = z === nz - 1 ? resolverAt(x, y, z + 1) : data[idx + plane];
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

// Applies `mesh`'s arrays to an existing geometry *in place*, replacing its
// attributes while keeping the geometry object identity stable. The renderer
// keys its GPU-buffer cache by geometry object, so re-uploading into the same
// geometry reuses the buffers it already allocated (the new attributes carry
// `needsUpdate`, which makes the next draw refresh their data). Replacing
// `mesh.geometry` with a fresh geometry instead would orphan the old entry in
// that cache and leak its GPU buffers on every rebuild.
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

// Wraps extracted arrays into a fresh rmsl geometry (for tests and one-off
// geometry); runtime block meshes should reuse a persistent geometry via
// `setGeometryData` instead.
export const meshArraysToGeometry = (mesh: MeshArrays): BufferGeometry => {
  const geometry = new BufferGeometry();
  setGeometryData(geometry, mesh);
  return geometry;
};

// The neighbour boundary data a worker needs to resolve block-seam faces: for
// each of the 8 neighbouring blocks, only the boundary slab that touches this
// block. Layouts are dense so the worker indexes them with plain arithmetic:
//   east/west  (neighbour +x/-x):  [lz * ny + ly]      (1 x ny x nz)
//   north/south (neighbour +z/-z): [ly * nx + lx]      (nx x ny x 1)
//   corner columns (ne +/-x +/-z): [ly]                (1 x ny x 1)
// `null` means that block does not exist (the world's outer edge → air).
export interface BlockShells {
  east: Uint8Array | null;
  west: Uint8Array | null;
  north: Uint8Array | null;
  south: Uint8Array | null;
  ne: Uint8Array | null;
  nw: Uint8Array | null;
  se: Uint8Array | null;
  sw: Uint8Array | null;
}

export const EMPTY_SHELLS: BlockShells = {
  east: null,
  west: null,
  north: null,
  south: null,
  ne: null,
  nw: null,
  se: null,
  sw: null,
};

// Extracts the 8 neighbour boundary shells for a block, so its mesh can be
// built off-thread (where the ring's full stores aren't available) with the
// same seam resolution as `makeBlockResolver`.
export const extractBlockShells = (
  store: VoxelStore,
  gridX: number,
  gridZ: number,
  lookup: BlockGridLookup,
): BlockShells => {
  const [nx, ny, nz] = store.voxels;
  const east = lookup(gridX + 1, gridZ);
  const west = lookup(gridX - 1, gridZ);
  const north = lookup(gridX, gridZ + 1);
  const south = lookup(gridX, gridZ - 1);
  const ne = lookup(gridX + 1, gridZ + 1);
  const nw = lookup(gridX - 1, gridZ + 1);
  const se = lookup(gridX + 1, gridZ - 1);
  const sw = lookup(gridX - 1, gridZ - 1);

  const sideSlab = (
    s: VoxelStore | undefined,
    xOfs: number,
  ): Uint8Array | null => {
    if (s === undefined) return null;
    const out = new Uint8Array(ny * nz);
    const d = s.data;
    for (let lz = 0; lz < nz; ++lz) {
      for (let ly = 0; ly < ny; ++ly) {
        out[lz * ny + ly] = d[(lz * ny + ly) * nx + xOfs];
      }
    }
    return out;
  };
  const faceSlab = (
    s: VoxelStore | undefined,
    zOfs: number,
  ): Uint8Array | null => {
    if (s === undefined) return null;
    const out = new Uint8Array(ny * nx);
    const d = s.data;
    for (let ly = 0; ly < ny; ++ly) {
      for (let lx = 0; lx < nx; ++lx) {
        out[ly * nx + lx] = d[(zOfs * ny + ly) * nx + lx];
      }
    }
    return out;
  };
  const cornerColumn = (
    s: VoxelStore | undefined,
    xOfs: number,
    zOfs: number,
  ): Uint8Array | null => {
    if (s === undefined) return null;
    const out = new Uint8Array(ny);
    const d = s.data;
    for (let ly = 0; ly < ny; ++ly) {
      out[ly] = d[(zOfs * ny + ly) * nx + xOfs];
    }
    return out;
  };

  return {
    east: sideSlab(east, 0),
    west: sideSlab(west, nx - 1),
    north: faceSlab(north, 0),
    south: faceSlab(south, nz - 1),
    ne: cornerColumn(ne, 0, 0),
    nw: cornerColumn(nw, nx - 1, 0),
    se: cornerColumn(se, 0, nz - 1),
    sw: cornerColumn(sw, nx - 1, nz - 1),
  };
};

// Resolves a voxel id at block-local coords from a block's own data plus its
// neighbour shells (what a worker uses instead of `makeBlockResolver`). Same
// boundary rules: below the floor is solid, above is air, horizontal OOB looks
// into the shelled neighbour (or air when the shell is null).
export const makeShellResolver = (
  store: VoxelStore,
  shells: BlockShells,
): BlockGridResolver => {
  const [nx, ny, nz] = store.voxels;
  const data = store.data;
  return {
    at(x, y, z) {
      if (y < 0) return 1;
      if (y >= ny) return 0;
      if (x >= nx) {
        if (z < 0) return shells.se?.[y] ?? 0;
        if (z >= nz) return shells.ne?.[y] ?? 0;
        return shells.east?.[z * ny + y] ?? 0;
      }
      if (x < 0) {
        if (z < 0) return shells.sw?.[y] ?? 0;
        if (z >= nz) return shells.nw?.[y] ?? 0;
        return shells.west?.[z * ny + y] ?? 0;
      }
      if (z >= nz) return shells.north?.[y * nx + x] ?? 0;
      if (z < 0) return shells.south?.[y * nx + x] ?? 0;
      return data[(z * ny + y) * nx + x];
    },
  };
};

// The main↔worker mesh-build protocol. `data` is the block's voxel data (a
// transferable copy), `shells` its neighbour boundary data, `tileRects` the
// per-voxel-id atlas rects; the worker returns both meshes' arrays back.
export interface MeshBuildRequest {
  id: number;
  voxels: [number, number, number];
  scale: number;
  data: Uint8Array;
  shells: BlockShells;
  tileRects: VoxelTileConfig[];
}

export interface MeshBuildResult {
  id: number;
  terrain: MeshArrays;
  water: MeshArrays;
}
