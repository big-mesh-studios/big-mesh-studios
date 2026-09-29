import { describe, expect, it } from "vitest";
import {
  Bitmap,
  Dimensions3D,
  Vector2D,
  Vector3D,
} from "@big-mesh-studios/maths";
import {
  createVolume,
  filledBounds,
  mirrorCells,
  packVolume,
  planeAxes,
  planeSliceCount,
  planeSlicedAxis,
  readSlice,
  readVoxel,
  resizeVolume,
  standOn,
  sliceAt,
  sliceCell,
  cellSlice,
  sliceContains,
  strokeCells,
  volumeIsEmpty,
  volumeLength,
  volumeOffset,
  volumeReach,
  writeSlice,
  writeVoxel,
  type Plane,
  type Volume,
} from "./volume";
import { solveVoxels } from "./solver";

const box = (width: number, height: number, depth: number) => ({
  width,
  height,
  depth,
});

/** A volume with the named voxels in it, laid out in the order they are given. */
function filled(
  dimensions: { width: number; height: number; depth: number },
  cells: [number, number, number][],
  index = 1,
): Volume {
  const volume = createVolume(dimensions);
  for (const [x, y, z] of cells) {
    writeVoxel(volume, x, y, z, index);
  }
  return volume;
}

describe("createVolume", () => {
  it("is empty, and as long as the box holds voxels", () => {
    const volume = createVolume(box(3, 4, 5));
    expect(volume.voxels).toHaveLength(volumeLength(box(3, 4, 5)));
    expect(volume.voxels.every((i) => i === Bitmap.EMPTY)).toBe(true);
    expect(volumeIsEmpty(volume)).toBe(true);
  });

  it("copies the dimensions, so the box cannot be resized under the array", () => {
    const volume = createVolume(box(2, 2, 2));
    volume.dimensions.width = 9;
    expect(volumeLength(volume.dimensions)).not.toBe(64);
  });
});

describe("volumeOffset", () => {
  it("lays voxels out a plane at a time, and a row within a plane", () => {
    const dimensions = box(3, 4, 5);
    expect(volumeOffset(dimensions, 0, 0, 0)).toBe(0);
    expect(volumeOffset(dimensions, 1, 0, 0)).toBe(1);
    expect(volumeOffset(dimensions, 0, 1, 0)).toBe(3);
    expect(volumeOffset(dimensions, 0, 0, 1)).toBe(12);
    // The last voxel of the box is the last cell of the array.
    expect(volumeOffset(dimensions, 2, 3, 4)).toBe(
      volumeLength(dimensions) - 1,
    );
  });

  it("reaches every voxel of the box exactly once", () => {
    const dimensions = box(3, 4, 2);
    const seen = new Set<number>();
    for (let z = 0; z < dimensions.depth; z++)
      for (let y = 0; y < dimensions.height; y++)
        for (let x = 0; x < dimensions.width; x++)
          seen.add(volumeOffset(dimensions, x, y, z));
    expect(seen.size).toBe(volumeLength(dimensions));
  });
});

describe("filledBounds", () => {
  it("is nothing at all for an empty box", () => {
    expect(filledBounds(createVolume(box(4, 4, 4)))).toBeUndefined();
  });

  it("is the smallest box around what was put in", () => {
    const volume = filled(box(8, 8, 8), [
      [1, 2, 3],
      [4, 6, 5],
    ]);
    expect(filledBounds(volume)).toEqual({
      low: Vector3D.create(1, 2, 3),
      dimensions: box(4, 5, 3),
    });
  });

  it("is one voxel around a single voxel", () => {
    const volume = filled(box(8, 8, 8), [[3, 3, 3]]);
    expect(filledBounds(volume)?.dimensions).toEqual(box(1, 1, 1));
  });
});

describe("volumeReach", () => {
  it("has no reach for a box with nothing in it", () => {
    expect(volumeReach(createVolume(box(4, 4, 4)))).toBe(0);
  });

  it("is measured over the voxels rather than the box around them", () => {
    const volume = filled(box(64, 64, 64), [[0, 0, 0]]);
    const tight = filled(box(1, 1, 1), [[0, 0, 0]]);
    expect(volumeReach(volume)).toBeCloseTo(volumeReach(tight));
  });

  it("grows with how far a voxel stands from the point it is measured at", () => {
    const near = filled(box(8, 8, 8), [[1, 1, 1]]);
    const far = filled(box(8, 8, 8), [[6, 6, 6]]);
    expect(volumeReach(far, Vector3D.create(0, 0, 0))).toBeGreaterThan(
      volumeReach(near, Vector3D.create(0, 0, 0)),
    );
  });
});

describe("resizeVolume", () => {
  it("keeps a box that is not moved, whatever the alignment says", () => {
    const volume = filled(box(2, 2, 2), [
      [0, 0, 0],
      [1, 1, 1],
    ]);
    expect(resizeVolume(volume, box(2, 2, 2), {})).toEqual(volume);
  });

  it("puts new room at the far end by default", () => {
    const volume = filled(box(2, 2, 2), [[0, 0, 0]]);
    const grown = resizeVolume(volume, box(4, 2, 2), { width: "max" });
    expect(readVoxel(grown, 0, 0, 0)).toBe(1);
    expect(readVoxel(grown, 3, 0, 0)).toBe(Bitmap.EMPTY);
  });

  it("puts new room at the named end", () => {
    const volume = filled(box(2, 2, 2), [[0, 0, 0]]);
    const grown = resizeVolume(volume, box(4, 2, 2), { width: "min" });
    expect(readVoxel(grown, 2, 0, 0)).toBe(1);
    expect(grown.voxels[volumeOffset(grown.dimensions, 0, 0, 0)]).toBe(
      Bitmap.EMPTY,
    );
  });

  it("takes the voxels away at the named end when the box shrinks", () => {
    const volume = filled(box(4, 2, 2), [
      [0, 0, 0],
      [3, 0, 0],
    ]);
    const shrunk = resizeVolume(volume, box(2, 2, 2), { width: "max" });
    expect(readVoxel(shrunk, 0, 0, 0)).toBe(1);
    expect(readVoxel(shrunk, 1, 0, 0)).toBe(Bitmap.EMPTY);
  });

  it("leaves the array the size of the new box", () => {
    const volume = filled(box(2, 2, 2), [[0, 0, 0]]);
    expect(resizeVolume(volume, box(5, 6, 7), {}).voxels).toHaveLength(210);
  });
});

describe("standOn", () => {
  /** Every solid voxel of a box, as a set of its coordinates. */
  const solidOf = (volume: Volume) => {
    const { width, height, depth } = volume.dimensions;
    const solid = new Set<string>();
    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (readVoxel(volume, x, y, z) !== Bitmap.EMPTY) {
            solid.add(`${x},${y},${z}`);
          }
        }
      }
    }
    return solid;
  };

  it("exchanges the two extents the turn is about, and leaves the third", () => {
    expect(standOn(createVolume(box(3, 5, 7)), "z", "y").dimensions).toEqual(
      box(3, 7, 5),
    );
    expect(standOn(createVolume(box(3, 5, 7)), "y", "z").dimensions).toEqual(
      box(3, 7, 5),
    );
  });

  it("stands the axis the model was standing on up from the low end", () => {
    // A stub at the foot of a model, which is where a model stands on the ground.
    const foot = filled(box(1, 1, 4), [[0, 0, 0]]);
    const stood = standOn(foot, "z", "y");
    expect(stood.dimensions).toEqual(box(1, 4, 1));
    expect(readVoxel(stood, 0, 0, 0)).toBe(1);
    expect(readVoxel(stood, 0, 3, 0)).toBe(Bitmap.EMPTY);
  });

  it("keeps the left of a model on the left, rather than turning it inside out", () => {
    const left = filled(box(4, 1, 1), [[0, 0, 0]]);
    expect(readVoxel(standOn(left, "z", "y"), 0, 0, 0)).toBe(1);

    const right = filled(box(4, 1, 1), [[3, 0, 0]]);
    expect(readVoxel(standOn(right, "z", "y"), 3, 0, 0)).toBe(1);
  });

  it("makes the depth it stood in the depth of the new box, turned end for end", () => {
    // The old z stands up as the new y, and the old y becomes the new z the other
    // way up, so the low end of one is the high end of the other.
    const low = filled(box(1, 3, 1), [[0, 0, 0]]);
    const stood = standOn(low, "z", "y");
    expect(stood.dimensions).toEqual(box(1, 1, 3));
    expect(readVoxel(stood, 0, 0, 2)).toBe(1);
  });

  it("is a turn and not a reflection, so which way a model faces is kept", () => {
    // A centre with one neighbour along each axis, each in a colour of its own so
    // that where each one has gone can be read back off the result rather than
    // worked out from the rule being tested. The three offsets are right-handed
    // where they stand, and a reflection would hand them back left-handed.
    const corner = createVolume(box(3, 3, 3));
    writeVoxel(corner, 2, 1, 1, 1);
    writeVoxel(corner, 1, 2, 1, 2);
    writeVoxel(corner, 1, 1, 2, 3);
    writeVoxel(corner, 1, 1, 1, 4);

    /** Where the voxel in a colour of its own stands in a box of any size. */
    const at = (volume: Volume, index: number) => {
      const offset = volume.voxels.indexOf(index);
      if (offset === -1) {
        throw new Error(`no voxel is in colour ${index}`);
      }
      const { width, height } = volume.dimensions;
      return Vector3D.create(
        offset % width,
        Math.floor(offset / width) % height,
        Math.floor(offset / (width * height)),
      );
    };

    /** The sign of the volume the three neighbours span about the centre. */
    const handedness = (volume: Volume) => {
      const dot = (a: Vector3D, b: Vector3D) =>
        a.x * b.x + a.y * b.y + a.z * b.z;
      const centre = at(volume, 4);
      const [first, second, third] = [1, 2, 3].map((index) =>
        Vector3D.subtract(at(volume, index), centre),
      );
      return Math.sign(dot(first, Vector3D.cross(second, third)));
    };

    expect(handedness(corner)).toBe(1);
    expect(handedness(standOn(corner, "z", "y"))).toBe(1);
    expect(handedness(standOn(standOn(corner, "z", "y"), "y", "x"))).toBe(1);
  });

  it("loses no voxel and gains none", () => {
    const volume = filled(
      box(3, 4, 5),
      [
        [0, 0, 0],
        [2, 3, 4],
        [1, 1, 1],
      ],
      7,
    );
    for (const [from, to] of [
      ["z", "y"],
      ["z", "x"],
      ["y", "x"],
    ] as const) {
      expect(solidOf(standOn(volume, from, to)).size).toBe(3);
    }
  });

  it("is taken back by the turn the other way, for every pair of axes", () => {
    const volume = filled(
      box(3, 4, 5),
      [
        [0, 0, 0],
        [2, 3, 4],
      ],
      7,
    );
    const axes = ["x", "y", "z"] as const;
    for (const from of axes) {
      for (const to of axes) {
        if (from === to) {
          continue;
        }
        const back = standOn(standOn(volume, from, to), to, from);
        expect(back.dimensions).toEqual(volume.dimensions);
        expect(solidOf(back)).toEqual(solidOf(volume));
      }
    }
  });

  it("refuses to stand a box on the axis it is already on", () => {
    expect(() => standOn(createVolume(box(2, 2, 2)), "y", "y")).toThrow(
      /cannot be stood on y from y/,
    );
  });
});

describe("the planes", () => {
  const planes: Plane[] = ["xy", "yz", "zx"];

  it("name each of the two axes a plane varies along, and leave the third out", () => {
    expect(planes.map((p) => planeSlicedAxis[p])).toEqual(["z", "x", "y"]);
    for (const plane of planes) {
      const [across, down] = planeAxes[plane];
      expect(new Set([across, down, planeSlicedAxis[plane]]).size).toBe(3);
    }
  });

  it("are cut into as many slices as the axis they do not vary along is long", () => {
    const dimensions = box(3, 4, 5);
    expect(planes.map((p) => planeSliceCount(dimensions, p))).toEqual([
      5, 3, 4,
    ]);
  });

  it("are as wide and as deep as the two axes they vary along", () => {
    const dimensions = box(3, 4, 5);
    expect(sliceAt(dimensions, "xy", 0)).toMatchObject({ width: 3, height: 4 });
    expect(sliceAt(dimensions, "yz", 0)).toMatchObject({ width: 4, height: 5 });
    expect(sliceAt(dimensions, "zx", 0)).toMatchObject({ width: 5, height: 3 });
  });
});

describe("slice addressing", () => {
  const dimensions = box(3, 4, 5);
  const planes: Plane[] = ["xy", "yz", "zx"];

  it("puts a cell on the axis the plane is named for, and stands the slice on the third", () => {
    expect(sliceCell(sliceAt(dimensions, "xy", 2), 1, 3)).toEqual(
      Vector3D.create(1, 3, 2),
    );
    expect(sliceCell(sliceAt(dimensions, "yz", 2), 1, 3)).toEqual(
      Vector3D.create(2, 1, 3),
    );
    expect(sliceCell(sliceAt(dimensions, "zx", 2), 1, 3)).toEqual(
      Vector3D.create(3, 2, 1),
    );
  });

  it("reads back the cell it came from, for every cell of every plane", () => {
    for (const plane of planes) {
      for (let at = 0; at < planeSliceCount(dimensions, plane); at++) {
        const slice = sliceAt(dimensions, plane, at);
        for (let u = 0; u < slice.width; u++) {
          for (let v = 0; v < slice.height; v++) {
            const cell = sliceCell(slice, u, v);
            expect(cellSlice(slice, cell.x, cell.y, cell.z)).toEqual(
              Vector2D.create(u, v),
            );
          }
        }
      }
    }
  });

  it("has no cell for a voxel another slice stands at", () => {
    expect(cellSlice(sliceAt(dimensions, "xy", 2), 1, 3, 1)).toBeUndefined();
    expect(cellSlice(sliceAt(dimensions, "xy", 2), 1, 3, 2)).toEqual(
      Vector2D.create(1, 3),
    );
  });

  it("has no cell outside the box", () => {
    const slice = sliceAt(dimensions, "xy", 0);
    expect(cellSlice(slice, 3, 0, 0)).toBeUndefined();
    expect(cellSlice(slice, 0, 4, 0)).toBeUndefined();
  });

  it("counts a cell it holds", () => {
    const slice = sliceAt(dimensions, "xy", 0);
    expect(sliceContains(slice, 0, 0)).toBe(true);
    expect(sliceContains(slice, 2, 3)).toBe(true);
    expect(sliceContains(slice, 3, 0)).toBe(false);
    expect(sliceContains(slice, -1, 0)).toBe(false);
  });
});

describe("writing through a slice", () => {
  const dimensions = box(3, 4, 5);

  it("puts what is written where the addressing says", () => {
    const volume = createVolume(dimensions);
    writeSlice(volume, sliceAt(dimensions, "yz", 1), 2, 3, 7);
    expect(readVoxel(volume, 1, 2, 3)).toBe(7);
    expect(readSlice(volume, sliceAt(dimensions, "yz", 1), 2, 3)).toBe(7);
  });

  it("leaves the neighbouring slices alone", () => {
    const volume = createVolume(dimensions);
    writeSlice(volume, sliceAt(dimensions, "zx", 2), 1, 2, 4);
    expect(readVoxel(volume, 2, 2, 1)).toBe(4);
    expect(readVoxel(volume, 1, 2, 1)).toBe(Bitmap.EMPTY);
  });

  it("keeps every cell of a slice its own", () => {
    const volume = createVolume(dimensions);
    const slice = sliceAt(dimensions, "xy", 1);
    for (let v = 0; v < slice.height; v++)
      for (let u = 0; u < slice.width; u++) writeSlice(volume, slice, u, v, 5);
    const written = volume.voxels.filter((i) => i === 5).length;
    expect(written).toBe(slice.width * slice.height);
  });
});

describe("strokeCells", () => {
  const slice = sliceAt(box(8, 8, 8), "xy", 0);

  it("is one cell for a drag that does not move", () => {
    expect(
      strokeCells(slice, Vector2D.create(2, 2), Vector2D.create(2, 2)),
    ).toEqual([Vector2D.create(2, 2)]);
  });

  it("fills in the cells a fast drag passes over", () => {
    expect(
      strokeCells(slice, Vector2D.create(0, 0), Vector2D.create(3, 0)),
    ).toEqual([
      Vector2D.create(0, 0),
      Vector2D.create(1, 0),
      Vector2D.create(2, 0),
      Vector2D.create(3, 0),
    ]);
  });

  it("walks a diagonal without repeating a cell", () => {
    const cells = strokeCells(
      slice,
      Vector2D.create(0, 0),
      Vector2D.create(2, 2),
    );
    expect(cells).toHaveLength(3);
    expect(new Set(cells.map((c) => `${c.x},${c.y}`)).size).toBe(3);
  });

  it("leaves out the cells the slice does not have", () => {
    expect(
      strokeCells(slice, Vector2D.create(-2, 0), Vector2D.create(9, 0)).every(
        (c) => sliceContains(slice, c.x, c.y),
      ),
    ).toBe(true);
  });
});

describe("mirrorCells", () => {
  const slice = sliceAt(box(5, 7, 5), "xy", 0);
  const cell = Vector2D.create(1, 2);

  it("is just the cell itself with nothing to mirror across", () => {
    expect(mirrorCells(slice, cell, false, false)).toEqual([cell]);
  });

  it("reaches the cell on the other side of the slice", () => {
    expect(mirrorCells(slice, cell, true, false)).toEqual([
      cell,
      Vector2D.create(3, 2),
    ]);
    expect(mirrorCells(slice, cell, false, true)).toEqual([
      cell,
      Vector2D.create(1, 4),
    ]);
  });

  it("reaches the far corner when both are mirrored", () => {
    expect(mirrorCells(slice, cell, true, true)).toEqual([
      cell,
      Vector2D.create(1, 4),
      Vector2D.create(3, 2),
      Vector2D.create(3, 4),
    ]);
  });

  it("does not list a cell twice when it is its own reflection", () => {
    const middle = Vector2D.create(2, 3);
    expect(mirrorCells(slice, middle, true, true)).toEqual([middle]);
  });
});

describe("packVolume", () => {
  /** The six faces of a packed voxel, as the ray marcher reads them. */
  const faces = (bytes: Uint8Array, at: number) => ({
    front: bytes[at] & 0b0001_1111,
    back:
      ((bytes[at] & 0b1110_0000) >> 5) |
      (((bytes[at + 1] & 0b0000_0011) << 3) & 0b1_1111),
    left: (bytes[at + 1] & 0b0111_1100) >> 2,
    right:
      ((bytes[at + 1] & 0b1000_0000) >> 7) |
      (((bytes[at + 2] & 0b0000_1111) << 1) & 0b1_1111),
    top:
      ((bytes[at + 2] & 0b1111_0000) >> 4) |
      (((bytes[at + 3] & 0b0000_0001) << 4) & 0b1_1111),
    bottom: (bytes[at + 3] & 0b0011_1110) >> 1,
    solid: (bytes[at + 3] & 0b1100_0000) !== 0,
  });

  const at = (
    dimensions: { width: number; height: number },
    x: number,
    y: number,
    z: number,
  ) =>
    (z * dimensions.width * dimensions.height + y * dimensions.width + x) << 2;

  it("is four bytes a voxel, in the same order the volume is laid out in", () => {
    const dimensions = box(3, 2, 2);
    const volume = createVolume(dimensions);
    volume.voxels[volumeOffset(dimensions, 2, 1, 1)] = 9;
    const packed = packVolume(volume);
    expect(packed).toHaveLength(volumeLength(dimensions) * 4);
    expect(faces(packed, at(dimensions, 2, 1, 1)).solid).toBe(true);
  });

  it("leaves an empty voxel with no solid mark", () => {
    const dimensions = box(2, 2, 2);
    const packed = packVolume(createVolume(dimensions));
    expect(faces(packed, 0).solid).toBe(false);
    expect(packed.every((byte) => byte === 0)).toBe(true);
  });

  it("gives a voxel one index on all six of its faces", () => {
    const dimensions = box(2, 2, 2);
    const volume = createVolume(dimensions);
    for (const index of [0, 1, 5, 17, 31]) {
      writeVoxel(volume, 1, 0, 0, index);
      const { front, back, left, right, top, bottom, solid } = faces(
        packVolume(volume),
        at(dimensions, 1, 0, 0),
      );
      expect([front, back, left, right, top, bottom]).toEqual(
        new Array(6).fill(index),
      );
      expect(solid).toBe(true);
      writeVoxel(volume, 1, 0, 0, Bitmap.EMPTY);
    }
  });

  it("agrees with the bit layout solveVoxels writes", () => {
    // Every voxel of every one of the six sides drawn one colour, so the
    // solver packs an index into all six of a voxel's faces too.
    const dimensions = box(2, 2, 2);
    const sides = {
      front: solidDrawing(dimensions.width, dimensions.height, 11),
      back: solidDrawing(dimensions.width, dimensions.height, 11),
      left: solidDrawing(dimensions.depth, dimensions.height, 11),
      right: solidDrawing(dimensions.depth, dimensions.height, 11),
      top: solidDrawing(dimensions.width, dimensions.depth, 11),
      bottom: solidDrawing(dimensions.width, dimensions.depth, 11),
    };
    const volume = createVolume(dimensions);
    volume.voxels.fill(11);

    expect(Array.from(packVolume(volume))).toEqual(
      Array.from(solveVoxels(dimensions, sides)),
    );
  });
});

/** A bitmap with one palette index in every cell of it. */
function solidDrawing(width: number, height: number, index: number) {
  return { width, height, data: new Uint8Array(width * height).fill(index) };
}

describe("Dimensions3D", () => {
  it("is what a volume's dimensions are", () => {
    const volume = createVolume(box(2, 3, 4));
    expect(Dimensions3D.equals(volume.dimensions, box(2, 3, 4))).toBe(true);
  });
});
