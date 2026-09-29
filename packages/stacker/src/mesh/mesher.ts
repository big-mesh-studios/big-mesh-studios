// Turning a box of voxels into the triangles of its exposed faces, merged.
//
// A model is drawn as geometry rather than by walking it a ray at a time, so the
// cost of a model is paid when it changes instead of once a frame for every
// pixel that covers it. What a ray marcher spends per pixel this spends once per
// face, and then merges most of those away.
//
// The whole model is one volume in memory, which is what makes cutting it into
// chunks cheap here: a chunk reads the voxels one outside its own bounds straight
// out of the same array, so a face on a chunk boundary is culled by the chunk
// that owns the voxel and neither chunk draws it twice. There is no generated
// border, no padding to keep in step with a neighbour, and no second copy to
// reconcile.
import {
  Bitmap,
  type Dimensions3D,
  type Vector3D,
} from "@big-mesh-studios/maths";
import { FacePlane } from "./face-plane";
import { Growable } from "./growable";
import { faceIndexOf } from "./vertex-format";

/** The triangles of one chunk, in the arrays a vertex buffer is bound from. */
export interface ChunkMesh {
  /** Three floats a vertex: where it sits, in cells from the box's low corner. */
  positions: Float32Array;
  /**
   * Four bytes a vertex: the face index in `x`, the palette index in `y`, and
   * nothing in `z` or `w`.
   */
  packed: Uint8Array;
  /** Three of them a triangle, counting vertices from the start of `positions`. */
  indices: Uint32Array;
}

/** How many cells a box is across, or how many cells a chunk covers. */
export type ChunkSize = Dimensions3D;

/** Where a chunk sits in the grid of chunks a model is cut into. */
export type ChunkIndex = Vector3D;

/** How many cells a chunk spans along each axis. */
export const CHUNK_SIZE: ChunkSize = { width: 32, height: 32, depth: 32 };

/** How many chunks along each axis a box of these dimensions is cut into. */
export const chunkCounts = (dimensions: Dimensions3D): ChunkIndex => ({
  x: Math.ceil(dimensions.width / CHUNK_SIZE.width),
  y: Math.ceil(dimensions.height / CHUNK_SIZE.height),
  z: Math.ceil(dimensions.depth / CHUNK_SIZE.depth),
});

/** A chunk's own position, from the flat key a set of dirty chunks is held as. */
export const chunkAt = (key: number, counts: ChunkIndex): ChunkIndex => {
  const per = counts.x * counts.y;
  return {
    x: key % counts.x,
    y: Math.floor(key / counts.x) % counts.y,
    z: Math.floor(key / per),
  };
};

/**
 * A chunk's index in a flat list, from its own position and the grid it sits in.
 * The grid is part of the key because a resize changes how many chunks there
 * are, and a key from before it would then name a different chunk.
 */
export const chunkKey = (chunk: ChunkIndex, counts: ChunkIndex): number =>
  (chunk.z * counts.y + chunk.y) * counts.x + chunk.x;

/** The cell at the low corner of a chunk, which is its index times the chunk size. */
export const chunkOrigin = (chunk: ChunkIndex): ChunkIndex => ({
  x: chunk.x * CHUNK_SIZE.width,
  y: chunk.y * CHUNK_SIZE.height,
  z: chunk.z * CHUNK_SIZE.depth,
});

/**
 * How many cells a chunk covers, which is the chunk size cut back to the box: a
 * box whose extent is not a whole number of chunks leaves the last chunk in each
 * axis short, and one smaller than the chunk still covers it whole.
 */
export const chunkExtent = (
  dimensions: Dimensions3D,
  chunk: ChunkIndex,
): ChunkSize => {
  const origin = chunkOrigin(chunk);
  const along = (from: number, extent: number, size: number) =>
    Math.max(0, Math.min(extent, from + size) - from);
  return {
    width: along(origin.x, dimensions.width, CHUNK_SIZE.width),
    height: along(origin.y, dimensions.height, CHUNK_SIZE.height),
    depth: along(origin.z, dimensions.depth, CHUNK_SIZE.depth),
  };
};

/**
 * One quad's four corners as `[x, y, z]` cell offsets: the two tangent axes
 * sweep 0..1 across the rectangle while the face axis stays 0.
 *
 * The order reads anticlockwise seen from the +x, −y and +z sides, which is
 * outward for exactly those three; `windsOutward` says which orientation is
 * which, and the other three are drawn with their triangle indices reversed.
 */
const FACE_CORNERS: Array<Array<[number, number, number]>> = [
  // X faces lie in the YZ plane, first tangent y, second tangent z
  [
    [0, 0, 0],
    [0, 1, 0],
    [0, 1, 1],
    [0, 0, 1],
  ],
  // Y faces lie in the XZ plane, first tangent x, second tangent z
  [
    [0, 0, 0],
    [1, 0, 0],
    [1, 0, 1],
    [0, 0, 1],
  ],
  // Z faces lie in the XY plane, first tangent x, second tangent y
  [
    [0, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [0, 1, 0],
  ],
];

/** The two in-plane axis indices of a face, by the axis the face lies on. */
const TANGENT_AXES: Array<[number, number]> = [
  [1, 2],
  [0, 2],
  [0, 1],
];

/**
 * Whether a face on `axis` facing `sign` is already wound, in `FACE_CORNERS`
 * order, toward that normal.
 */
const windsOutward = (axis: number, sign: number): boolean =>
  axis === 1 ? sign === -1 : sign === 1;

/** The sweep's scratch arrays, reusable across the chunks of a model. */
export interface MeshBuilder {
  positions: Growable<Float32Array>;
  packed: Growable<Uint8Array>;
  indices: Growable<Uint32Array>;
}

/** An empty builder, for a caller that keeps one for the life of the model. */
export const createMeshBuilder = (): MeshBuilder => ({
  positions: new Growable(Float32Array),
  packed: new Growable(Uint8Array),
  indices: new Growable(Uint32Array),
});

/**
 * Meshes the chunk at `origin`, `extent` cells across, of a volume `dimensions`
 * long whose voxels are laid out a plane at a time — a voxel at `(x, y, z)` sits
 * at `z * width * height + y * width + x`.
 *
 * Empties `into` first, so a builder that has met the largest chunk a model has
 * allocates nothing again.
 */
export const meshChunk = (
  dimensions: Dimensions3D,
  voxels: Uint8Array,
  origin: ChunkIndex,
  extent: ChunkSize,
  into: MeshBuilder = createMeshBuilder(),
): ChunkMesh => {
  const { positions, packed, indices } = into;
  positions.clear();
  packed.clear();
  indices.clear();

  const { width, height, depth } = dimensions;
  const at = (x: number, y: number, z: number) =>
    voxels[z * width * height + y * width + x];
  const inside = (x: number, y: number, z: number) =>
    x >= 0 && y >= 0 && z >= 0 && x < width && y < height && z < depth;

  const size = [extent.width, extent.height, extent.depth];
  const low = [origin.x, origin.y, origin.z];
  const cell = [0, 0, 0];
  const neighbour = [0, 0, 0];

  for (let axis = 0; axis < 3; axis++) {
    const [a1, a2] = TANGENT_AXES[axis];
    // A plane is swept on the two axes its faces lie in, so it is laid out per
    // axis rather than once: X faces are swept over y and z, Y faces over x and
    // z, Z faces over x and y.
    const plane = new FacePlane(size[a1], size[a2]);

    for (const sign of [-1, 1]) {
      for (let slice = 0; slice < size[axis]; slice++) {
        plane.clear();
        for (let second = 0; second < size[a2]; second++) {
          for (let first = 0; first < size[a1]; first++) {
            cell[axis] = low[axis] + slice;
            cell[a1] = low[a1] + first;
            cell[a2] = low[a2] + second;

            const index = at(cell[0], cell[1], cell[2]);
            if (index === Bitmap.EMPTY) {
              continue;
            }

            // Reading one cell outside the chunk is what culls a seam: both
            // chunks see the same voxel here, so both decline to draw the face
            // between them. A cell outside the box reads as air, which is what
            // lets the faces on the outside of the model show.
            neighbour[axis] = cell[axis] + sign;
            neighbour[a1] = cell[a1];
            neighbour[a2] = cell[a2];
            if (
              inside(neighbour[0], neighbour[1], neighbour[2]) &&
              at(neighbour[0], neighbour[1], neighbour[2]) !== Bitmap.EMPTY
            ) {
              continue;
            }

            plane.set(first, second, index);
          }
        }

        plane.eachRectangle((rectangle) => {
          const base = positions.length / 3;
          const face = faceIndexOf(axis, sign);
          // The plane of the face in cells: the top of the slice it belongs to
          // facing up, that slice's bottom facing down.
          const facing = low[axis] + slice + (sign > 0 ? 1 : 0);
          const offsets = [0, 0, 0];
          const point = [0, 0, 0];

          for (const [ox, oy, oz] of FACE_CORNERS[axis]) {
            offsets[0] = ox;
            offsets[1] = oy;
            offsets[2] = oz;
            point[axis] = facing;
            point[a1] =
              low[a1] + rectangle.first + offsets[a1] * rectangle.wide;
            point[a2] =
              low[a2] + rectangle.second + offsets[a2] * rectangle.tall;
            positions.pushTriple(point[0], point[1], point[2]);
            packed.pushQuad(face, rectangle.index, 0, 0);
          }

          if (windsOutward(axis, sign)) {
            indices.pushTriple(base, base + 1, base + 2);
            indices.pushTriple(base, base + 2, base + 3);
          } else {
            indices.pushTriple(base, base + 2, base + 1);
            indices.pushTriple(base, base + 3, base + 2);
          }
        });
      }
    }
  }

  return {
    positions: positions.exact(),
    packed: packed.exact(),
    indices: indices.exact(),
  };
};
