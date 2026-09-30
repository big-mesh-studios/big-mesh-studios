// @vitest-environment node
import type { Dimensions3D } from "@big-mesh-studios/maths";
import { describe, expect, it } from "vitest";
import { CHUNK_SIZE, chunkAt, chunkCounts } from "./mesher";
import { allChunks, dirtyChunks, wholeModel } from "./dirty-bounds";

/** The chunks named by a change covering `low`..`high`, read back as positions. */
const chunksFor = (
  low: { x: number; y: number; z: number },
  high: { x: number; y: number; z: number },
  dimensions: Dimensions3D,
) => {
  const counts = chunkCounts(dimensions);
  return dirtyChunks({ low, high }, dimensions)
    .map((key) => chunkAt(key, counts))
    .sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
};

const single = (x: number, y: number, z: number) => ({ x, y, z });

describe("dirtyChunks", () => {
  it("marks the one chunk a voxel well inside it belongs to", () => {
    expect(
      chunksFor(single(5, 5, 5), single(5, 5, 5), {
        width: 32,
        height: 32,
        depth: 32,
      }),
    ).toEqual([single(0, 0, 0)]);
  });

  it("marks the chunk across a boundary as well, since a face there is culled by it", () => {
    const dimensions = { width: 64, height: 32, depth: 32 };
    // The last cell of the first chunk: erasing it uncovers faces on the first
    // cell of the second, which that chunk's own geometry has to show.
    expect(chunksFor(single(31, 0, 0), single(31, 0, 0), dimensions)).toEqual([
      single(0, 0, 0),
      single(1, 0, 0),
    ]);
  });

  it("marks the chunks either side of a boundary on every axis at once", () => {
    const dimensions = { width: 64, height: 64, depth: 64 };
    expect(
      chunksFor(single(32, 32, 32), single(32, 32, 32), dimensions),
    ).toEqual([
      single(0, 0, 0),
      single(1, 0, 0),
      single(0, 1, 0),
      single(1, 1, 0),
      single(0, 0, 1),
      single(1, 0, 1),
      single(0, 1, 1),
      single(1, 1, 1),
    ]);
  });

  it("does not widen a change that is already at the low corner of the box", () => {
    // Widening is clipped to the box, so a voxel at the origin marks one chunk.
    expect(
      chunksFor(single(0, 0, 0), single(0, 0, 0), {
        width: 64,
        height: 64,
        depth: 64,
      }),
    ).toEqual([single(0, 0, 0)]);
  });

  it("does not widen past the high corner of the box", () => {
    // A box exactly two chunks across: the cell at its high corner is the last
    // of its chunk, and there is nothing beyond it to widen into.
    const dimensions = { width: 64, height: 64, depth: 64 };
    expect(
      chunksFor(single(63, 63, 63), single(63, 63, 63), dimensions),
    ).toEqual([single(1, 1, 1)]);
  });

  it("marks every chunk a filled block spans", () => {
    const dimensions = { width: 96, height: 32, depth: 32 };
    const found = chunksFor(single(0, 0, 0), single(95, 0, 0), dimensions);
    expect(found).toEqual([single(0, 0, 0), single(1, 0, 0), single(2, 0, 0)]);
  });
});

describe("allChunks", () => {
  it("marks every chunk a model is cut into, and no others", () => {
    const dimensions = { width: 40, height: 33, depth: 32 };
    const counts = chunkCounts(dimensions);
    expect(allChunks(dimensions)).toHaveLength(counts.x * counts.y * counts.z);
  });

  it("agrees with a change covering the whole model", () => {
    const dimensions = { width: 100, height: 100, depth: 100 };
    expect(allChunks(dimensions)).toEqual(
      dirtyChunks(wholeModel(dimensions), dimensions),
    );
  });

  it("covers a model one chunk across in a single key", () => {
    expect(allChunks({ width: 8, height: 8, depth: 8 })).toEqual([0]);
  });
});

describe("CHUNK_SIZE", () => {
  it("is the size a chunk covers, and what the key is derived from", () => {
    expect(CHUNK_SIZE).toEqual({ width: 32, height: 32, depth: 32 });
  });
});
