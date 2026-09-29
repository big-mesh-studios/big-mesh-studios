// Which chunks of a model a change has made worth re-meshing.
//
// A model is drawn as geometry, so a change to a voxel is a change to the
// triangles around it, and the question is which of them. A stroke writes a
// handful of voxels and the answer is one or two chunks; only a load or a resize
// has the whole model to rebuild.
//
// What a change covered is the caller's to say — this is a package of voxel
// arithmetic, and the editor's own commands are its to describe. What lives here
// is the step after that: turning a box of cells into the list of chunks whose
// geometry that box can have altered.
import { type Dimensions3D, type Vector3D } from "@big-mesh-studios/maths";
import { CHUNK_SIZE, chunkCounts, chunkKey } from "./mesher";

/** An axis-aligned box of cells, both corners of it included. */
export interface CellBounds {
  low: Vector3D;
  high: Vector3D;
}

/** How many cells outside a change the faces of a neighbouring chunk are altered in. */
const REACH = 1;

/**
 * The chunk indices whose geometry a change covering `bounds` has altered, keyed
 * the way `chunkKey` keys them.
 *
 * The bounds are widened by a cell on every side first. A face is culled by the
 * voxel across it, so erasing one voxel can uncover a face on its neighbour —
 * and that neighbour is in another chunk precisely when the change is near a
 * boundary, which is the one case where widening matters.
 */
export const dirtyChunks = (
  bounds: CellBounds,
  dimensions: Dimensions3D,
): number[] => {
  const low = {
    x: Math.max(0, bounds.low.x - REACH),
    y: Math.max(0, bounds.low.y - REACH),
    z: Math.max(0, bounds.low.z - REACH),
  };
  const high = {
    x: Math.min(dimensions.width - 1, bounds.high.x + REACH),
    y: Math.min(dimensions.height - 1, bounds.high.y + REACH),
    z: Math.min(dimensions.depth - 1, bounds.high.z + REACH),
  };

  const from = {
    x: Math.floor(low.x / CHUNK_SIZE.width),
    y: Math.floor(low.y / CHUNK_SIZE.height),
    z: Math.floor(low.z / CHUNK_SIZE.depth),
  };
  const counts = chunkCounts(dimensions);
  const to = {
    x: Math.min(counts.x - 1, Math.floor(high.x / CHUNK_SIZE.width)),
    y: Math.min(counts.y - 1, Math.floor(high.y / CHUNK_SIZE.height)),
    z: Math.min(counts.z - 1, Math.floor(high.z / CHUNK_SIZE.depth)),
  };

  const keys: number[] = [];
  for (let z = from.z; z <= to.z; z++) {
    for (let y = from.y; y <= to.y; y++) {
      for (let x = from.x; x <= to.x; x++) {
        keys.push(chunkKey({ x, y, z }, counts));
      }
    }
  }
  return keys;
};

/** The whole box, which is what a load or a resize leaves to rebuild. */
export const wholeModel = (dimensions: Dimensions3D): CellBounds => ({
  low: { x: 0, y: 0, z: 0 },
  high: {
    x: dimensions.width - 1,
    y: dimensions.height - 1,
    z: dimensions.depth - 1,
  },
});

/** The chunk indices of a model in its whole. */
export const allChunks = (dimensions: Dimensions3D): number[] =>
  dirtyChunks(wholeModel(dimensions), dimensions);
