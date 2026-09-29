// @vitest-environment node
//
// An edit is what a part's six drawings cannot say, so putting a voxel where the
// drawings already say it has to leave no edit behind — otherwise the part
// remembers a hand edit it did not need, and keeps contradicting a drawing made
// there afterwards.
import { describe, expect, it } from "vitest";
import { Bitmap, type Dimensions3D } from "@big-mesh-studios/maths";
import {
  partDimensions,
  sideAxes,
  sideKinds,
  type Part,
  type Sides,
} from "./data";
import { applyEdits, editFor, REMOVED } from "./edits";
import { packedFaces, solveVoxels } from "./solver";
import { createVolume, volumeOffset } from "./volume";

const EXTENT: Dimensions3D = { width: 4, height: 4, depth: 4 };

/** A part whose every drawing is filled with `colour`, or left blank. */
const drawn = (colour: number): Part => {
  const sides = Object.fromEntries(
    sideKinds.map((kind) => {
      const [across, down] = sideAxes[kind];

      return [
        kind,
        {
          width: EXTENT[across],
          height: EXTENT[down],
          data: new Uint8Array(EXTENT[across] * EXTENT[down]).fill(colour),
        },
      ];
    }),
  ) as unknown as Sides;

  return {
    name: "body",
    sides,
    sections: [],
    root: { x: 0, y: 0, z: 0 },
    pivot: { x: 2, y: 2, z: 2 },
    turn: { x: 0, y: 0, z: 0 },
    scale: 1,
    parent: null,
  };
};

/** The part's six drawings solved, which is what an edit corrects. */
const drawingsOf = (part: Part): Uint8Array => {
  const dimensions = partDimensions(part);

  return solveVoxels(dimensions, part.sides, part.sections);
};

/** The value an edit would hold for `wanted` at a cell of `part`. */
const forCell = (
  part: Part,
  cell: { x: number; y: number; z: number },
  wanted: number,
) => editFor(partDimensions(part), drawingsOf(part), cell, wanted);

/**
 * The part's volume with one cell's worth of edit applied, which is the whole
 * point of the value: what the cell reads as afterwards.
 */
const withEdit = (
  part: Part,
  cell: { x: number; y: number; z: number },
  value: number,
): Uint8Array => {
  const dimensions = partDimensions(part);
  const edits = createVolume(dimensions);

  edits.voxels[volumeOffset(dimensions, cell.x, cell.y, cell.z)] = value;

  return applyEdits(drawingsOf(part), dimensions, edits);
};

/** Whether a cell of a packed volume is what a caller wanted there. */
const reads = (
  packed: Uint8Array,
  dimensions: Dimensions3D,
  cell: { x: number; y: number; z: number },
  wanted: number,
): boolean => {
  const { x, y, z } = cell;
  const faces = packedFaces(dimensions, packed);
  const isSolid = faces.solid(x, y, z);

  if (wanted === Bitmap.EMPTY) {
    return !isSolid;
  }

  if (!isSolid) {
    return false;
  }

  for (let face = 0; face < 6; face++) {
    if (faces.colour(x, y, z, face) !== wanted) {
      return false;
    }
  }

  return true;
};

describe("editFor", () => {
  it("holds nothing where the drawings already put a voxel of that colour", () => {
    expect(forCell(drawn(3), { x: 1, y: 1, z: 1 }, 3)).toBe(Bitmap.EMPTY);
  });

  it("holds the colour where the drawings have a different one", () => {
    expect(forCell(drawn(3), { x: 1, y: 1, z: 1 }, 5)).toBe(5);
  });

  it("takes a voxel away where the drawings have something there", () => {
    expect(forCell(drawn(3), { x: 1, y: 1, z: 1 }, Bitmap.EMPTY)).toBe(REMOVED);
  });

  it("holds nothing where there is nothing to take away", () => {
    expect(
      forCell(drawn(Bitmap.EMPTY), { x: 1, y: 1, z: 1 }, Bitmap.EMPTY),
    ).toBe(Bitmap.EMPTY);
  });

  it("makes every cell of a box read as what was wanted there", () => {
    // The answer is only worth anything if applying it puts the voxel where the
    // caller asked, so this is the property the single-cell answer has to hold
    // for every cell and every wanted value, against a part that is solid all
    // the way through and one that is not.
    for (const colour of [Bitmap.EMPTY, 3]) {
      const part = drawn(colour);
      const dimensions = partDimensions(part);

      for (let z = 0; z < dimensions.depth; z++) {
        for (let y = 0; y < dimensions.height; y++) {
          for (let x = 0; x < dimensions.width; x++) {
            const cell = { x, y, z };

            for (const wanted of [Bitmap.EMPTY, 3, 9]) {
              const value = forCell(part, cell, wanted);
              const applied = withEdit(part, cell, value);
              const where = `${x},${y},${z} wanted ${wanted} from ${colour}`;

              expect(reads(applied, dimensions, cell, wanted), where).toBe(
                true,
              );
            }
          }
        }
      }
    }
  });

  it("leaves every other cell of the box as the drawings had it", () => {
    // An edit is a correction to one cell, so applying one must not reach any
    // other — or a voxel put in one place would quietly change the shape around
    // it.
    const part = drawn(3);
    const dimensions = partDimensions(part);
    const drawings = drawingsOf(part);
    const value = forCell(part, { x: 2, y: 1, z: 1 }, 9);
    const applied = withEdit(part, { x: 2, y: 1, z: 1 }, value);

    for (let z = 0; z < dimensions.depth; z++) {
      for (let y = 0; y < dimensions.height; y++) {
        for (let x = 0; x < dimensions.width; x++) {
          if (x === 2 && y === 1 && z === 1) {
            continue;
          }

          const cell = { x, y, z };
          const where = `${x},${y},${z}`;

          expect(reads(applied, dimensions, cell, 3), where).toBe(
            reads(drawings, dimensions, cell, 3),
          );
        }
      }
    }
  });
});
