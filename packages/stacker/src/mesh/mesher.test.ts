// @vitest-environment node
import {
  Bitmap,
  type Dimensions3D,
  type Vector3D,
} from "@big-mesh-studios/maths";
import { describe, expect, it } from "vitest";
import {
  CHUNK_SIZE,
  chunkAt,
  chunkCounts,
  chunkExtent,
  chunkKey,
  chunkOrigin,
  meshChunk,
  type ChunkMesh,
} from "./mesher";
import { normalOfFaceIndex } from "./vertex-format";

/** A box of empty voxels of these dimensions. */
const emptyVolume = (dimensions: Dimensions3D): Uint8Array =>
  new Uint8Array(dimensions.width * dimensions.height * dimensions.depth).fill(
    Bitmap.EMPTY,
  );

/** A box with the given cells filled, everything else empty. */
const volumeOf = (
  dimensions: Dimensions3D,
  filled: Iterable<Vector3D>,
  index = 3,
): Uint8Array => {
  const voxels = emptyVolume(dimensions);
  for (const { x, y, z } of filled) {
    voxels[
      z * dimensions.width * dimensions.height + y * dimensions.width + x
    ] = index;
  }
  return voxels;
};

/** Every cell of a box, in the order the loops that fill one go. */
const everyCell = (dimensions: Dimensions3D): Vector3D[] => {
  const cells: Vector3D[] = [];
  for (let z = 0; z < dimensions.depth; z++) {
    for (let y = 0; y < dimensions.height; y++) {
      for (let x = 0; x < dimensions.width; x++) {
        cells.push({ x, y, z });
      }
    }
  }
  return cells;
};

/** The whole of a box as one chunk, which is what a small model is. */
const meshAll = (dimensions: Dimensions3D, voxels: Uint8Array): ChunkMesh =>
  meshChunk(
    dimensions,
    voxels,
    { x: 0, y: 0, z: 0 },
    {
      width: dimensions.width,
      height: dimensions.height,
      depth: dimensions.depth,
    },
  );

const quadsOf = (mesh: ChunkMesh) => mesh.indices.length / 6;
const verticesOf = (mesh: ChunkMesh) => mesh.positions.length / 3;

/**
 * The area a mesh covers in cells, summed over its quads. Merging leaves this
 * unchanged — that is what makes it the measure of whether a face is drawn once,
 * once too many, or not at all, independently of how the quads were grouped.
 */
const areaOf = (mesh: ChunkMesh): number => {
  let area = 0;
  for (let quad = 0; quad < quadsOf(mesh); quad++) {
    const at = (corner: number) => [
      mesh.positions[corner * 3],
      mesh.positions[corner * 3 + 1],
      mesh.positions[corner * 3 + 2],
    ];
    // Two edges of the quad that share a vertex. Their cross product is the
    // area of the parallelogram they span, which for three corners of a
    // rectangle is the rectangle itself — there is no half here, as there would
    // be for a triangle.
    const a = at(mesh.indices[quad * 6]);
    const ab = at(mesh.indices[quad * 6 + 1]).map((one, i) => one - a[i]);
    const ac = at(mesh.indices[quad * 6 + 2]).map((one, i) => one - a[i]);
    const cross = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    area += Math.hypot(cross[0], cross[1], cross[2]);
  }
  return area;
};

/**
 * Whether a triangle's winding agrees with the normal its face index names,
 * which is the cross product of the two edges out of its first vertex read the
 * right-handed way round.
 */
const windsOutward = (mesh: ChunkMesh, triangle: number): boolean => {
  const at = (corner: number) => [
    mesh.positions[corner * 3],
    mesh.positions[corner * 3 + 1],
    mesh.positions[corner * 3 + 2],
  ];
  const [a, b, c] = [
    at(mesh.indices[triangle * 3]),
    at(mesh.indices[triangle * 3 + 1]),
    at(mesh.indices[triangle * 3 + 2]),
  ];
  const ab = b.map((one, i) => one - a[i]);
  const ac = c.map((one, i) => one - a[i]);
  const normal = [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ];
  // Every corner of a face carries the same index, so the first one names it.
  const face = normalOfFaceIndex(mesh.packed[mesh.indices[triangle * 3] * 4]);
  return normal[0] * face[0] + normal[1] * face[1] + normal[2] * face[2] > 0;
};

describe("chunking", () => {
  it("cuts a box into as many chunks as it needs along each axis", () => {
    expect(chunkCounts({ width: 32, height: 32, depth: 32 })).toEqual({
      x: 1,
      y: 1,
      z: 1,
    });
    expect(chunkCounts({ width: 33, height: 64, depth: 100 })).toEqual({
      x: 2,
      y: 2,
      z: 4,
    });
  });

  it("puts a chunk's low corner at its index along the axis", () => {
    expect(chunkOrigin({ x: 2, y: 1, z: 0 })).toEqual({
      x: 2 * CHUNK_SIZE.width,
      y: 1 * CHUNK_SIZE.height,
      z: 0,
    });
  });

  it("cuts the last chunk back to the box, and no further", () => {
    const dimensions = { width: 40, height: 32, depth: 10 };
    expect(chunkExtent(dimensions, { x: 0, y: 0, z: 0 })).toEqual({
      width: 32,
      height: 32,
      depth: 10,
    });
    expect(chunkExtent(dimensions, { x: 1, y: 0, z: 0 })).toEqual({
      width: 8,
      height: 32,
      depth: 10,
    });
  });

  it("names a chunk by its position in the grid and reads it back", () => {
    const counts = chunkCounts({ width: 100, height: 100, depth: 100 });
    for (const at of [
      { x: 0, y: 0, z: 0 },
      { x: 3, y: 0, z: 0 },
      { x: 0, y: 2, z: 0 },
      { x: 1, y: 1, z: 2 },
    ]) {
      expect(chunkAt(chunkKey(at, counts), counts)).toEqual(at);
    }
  });
});

describe("meshChunk", () => {
  it("draws nothing for a box with nothing in it", () => {
    const dimensions = { width: 4, height: 4, depth: 4 };
    const mesh = meshAll(dimensions, emptyVolume(dimensions));
    expect(quadsOf(mesh)).toBe(0);
    expect(verticesOf(mesh)).toBe(0);
  });

  it("draws a solid cube as its six faces, not its twenty-seven voxels' worth", () => {
    const dimensions = { width: 4, height: 4, depth: 4 };
    const filled = [
      { x: 1, y: 1, z: 1 },
      { x: 2, y: 1, z: 1 },
      { x: 1, y: 2, z: 1 },
      { x: 2, y: 2, z: 1 },
      { x: 1, y: 1, z: 2 },
      { x: 2, y: 1, z: 2 },
      { x: 1, y: 2, z: 2 },
      { x: 2, y: 2, z: 2 },
    ];
    const mesh = meshAll(dimensions, volumeOf(dimensions, filled));
    // Six faces of two by two cells, each merged into one quad.
    expect(quadsOf(mesh)).toBe(6);
    expect(verticesOf(mesh)).toBe(24);
  });

  it("draws the outside of a full box and none of its inside", () => {
    const dimensions = { width: 3, height: 3, depth: 3 };
    const mesh = meshAll(
      dimensions,
      volumeOf(dimensions, everyCell(dimensions)),
    );
    expect(quadsOf(mesh)).toBe(6);
  });

  it("merges a run of one colour along a face into a single quad", () => {
    const dimensions = { width: 8, height: 1, depth: 1 };
    const voxels = new Uint8Array(8).fill(3);
    const mesh = meshAll(dimensions, voxels);
    // Two ends of one cell, and four sides that each run the whole row.
    expect(quadsOf(mesh)).toBe(6);
    expect(areaOf(mesh)).toBe(8 * 4 + 2);
  });

  it("winds every face toward the side it is exposed on", () => {
    const dimensions = { width: 4, height: 4, depth: 4 };
    const voxels = volumeOf(dimensions, [
      { x: 1, y: 1, z: 1 },
      { x: 2, y: 1, z: 1 },
      { x: 1, y: 1, z: 2 },
    ]);
    const mesh = meshAll(dimensions, voxels);
    for (let triangle = 0; triangle < mesh.indices.length / 3; triangle++) {
      expect(windsOutward(mesh, triangle)).toBe(true);
    }
  });

  it("culls a face between two filled voxels", () => {
    const dimensions = { width: 2, height: 1, depth: 1 };
    const both = volumeOf(dimensions, [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
    ]);
    // Two cells end to end: the face between them is culled, leaving two ends
    // of one cell and four sides of two.
    expect(quadsOf(meshAll(dimensions, both))).toBe(6);
    expect(areaOf(meshAll(dimensions, both))).toBe(2 * 1 + 4 * 2);
  });

  it("covers an isolated voxel's six faces and nothing between it and its neighbour", () => {
    const dimensions = { width: 2, height: 1, depth: 1 };
    const one = volumeOf(dimensions, [{ x: 0, y: 0, z: 0 }]);
    const mesh = meshAll(dimensions, one);
    expect(quadsOf(mesh)).toBe(6);
    // Its far side faces the empty cell beside it, so all six show.
    expect(areaOf(mesh)).toBe(6);
  });

  it("carries the colour of the voxel a face belongs to", () => {
    const dimensions = { width: 2, height: 1, depth: 1 };
    const mesh = meshAll(
      dimensions,
      volumeOf(dimensions, [{ x: 0, y: 0, z: 0 }], 11),
    );
    // The palette index is the second lane of every vertex, four bytes on.
    const indices = new Set<number>();
    for (let vertex = 0; vertex < verticesOf(mesh); vertex++) {
      indices.add(mesh.packed[vertex * 4 + 1]);
    }
    expect(indices).toEqual(new Set([11]));
  });

  it("draws a face on a chunk boundary once, not once from each side", () => {
    // A box one chunk wide, filled solid. The two chunks share the plane at
    // x = 32, and neither may draw a face across it.
    const dimensions = { width: 64, height: 2, depth: 2 };
    const voxels = volumeOf(dimensions, everyCell(dimensions));
    const counts = chunkCounts(dimensions);
    expect(counts.x).toBe(2);

    let quads = 0;
    let area = 0;
    for (let x = 0; x < counts.x; x++) {
      for (let y = 0; y < counts.y; y++) {
        for (let z = 0; z < counts.z; z++) {
          const chunk = { x, y, z };
          const mesh = meshChunk(
            dimensions,
            voxels,
            chunkOrigin(chunk),
            chunkExtent(dimensions, chunk),
          );
          quads += quadsOf(mesh);
          area += areaOf(mesh);
        }
      }
    }

    // The surface of the box, drawn in full and once over: four long sides of
    // 64 by 2, two short ends of 2 by 2, and nothing at the seam in between.
    expect(area).toBe(4 * 64 * 2 + 2 * 2 * 2);
    // Merging cannot cross a chunk boundary, so the four long sides are drawn as
    // eight quads rather than four. That is the cost of cutting a model up, and
    // it is paid in quads rather than in faces drawn twice.
    expect(quads).toBe(10);
  });

  it("agrees with itself about area whether it is meshed whole or in chunks", () => {
    const dimensions = { width: 40, height: 3, depth: 3 };
    const filled = everyCell(dimensions).filter(
      ({ x, y }) => (x + y) % 3 !== 0,
    );
    const voxels = volumeOf(dimensions, filled);
    const whole = areaOf(meshAll(dimensions, voxels));

    const counts = chunkCounts(dimensions);
    let chunked = 0;
    for (let x = 0; x < counts.x; x++) {
      for (let y = 0; y < counts.y; y++) {
        for (let z = 0; z < counts.z; z++) {
          const chunk = { x, y, z };
          chunked += areaOf(
            meshChunk(
              dimensions,
              voxels,
              chunkOrigin(chunk),
              chunkExtent(dimensions, chunk),
            ),
          );
        }
      }
    }
    expect(chunked).toBe(whole);
  });

  it("reuses a builder without leaking one chunk's geometry into the next", () => {
    const dimensions = { width: 2, height: 2, depth: 2 };
    const full = volumeOf(dimensions, everyCell(dimensions));
    const sparse = volumeOf(dimensions, [{ x: 0, y: 0, z: 0 }]);
    const first = meshAll(dimensions, full);
    const second = meshChunk(
      dimensions,
      sparse,
      { x: 0, y: 0, z: 0 },
      { width: 2, height: 2, depth: 2 },
    );
    // A single voxel has six faces to a solid cube's six, so the two agree on
    // quad count; what must not happen is the first mesh's geometry still being
    // counted in the second's arrays.
    expect(second.positions.length).toBe(verticesOf(second) * 3);
    expect(second.indices.length).toBe(quadsOf(second) * 6);
    expect(quadsOf(first)).toBe(6);
  });
});
