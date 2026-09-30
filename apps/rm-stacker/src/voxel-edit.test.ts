// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Bitmap, Vector3D, type Dimensions3D } from "@big-mesh-studios/maths";
import {
  centrePivot,
  partDimensions,
  REMOVED,
  sideAxes,
  sideKinds,
  type Part,
  type Sides,
} from "@big-mesh-studios/stacker/renderer";
import { createVolume, volumeOffset } from "@big-mesh-studios/stacker/volume";
import { editAt } from "./voxel-edit";

const DIMS: Dimensions3D = { width: 4, height: 4, depth: 4 };

/** A part whose every drawing is filled with `colour`, or left blank. */
const drawn = (colour: number): Part => ({
  name: "body",
  sides: Object.fromEntries(
    sideKinds.map((kind) => {
      const [across, down] = sideAxes[kind];

      return [
        kind,
        {
          width: DIMS[across],
          height: DIMS[down],
          data: new Uint8Array(DIMS[across] * DIMS[down]).fill(colour),
        },
      ];
    }),
  ) as unknown as Sides,
  sections: [],
  root: Vector3D.create(),
  pivot: centrePivot(DIMS),
  turn: Vector3D.create(),
  scale: 1,
  parent: null,
});

/** A part holding `value` in its edits at one cell. */
const holding = (colour: number, at: Vector3D, value: number): Part => {
  const part = drawn(colour);
  const edits = createVolume(DIMS);

  edits.voxels[volumeOffset(DIMS, at.x, at.y, at.z)] = value;

  return { ...part, edits };
};

const AT = Vector3D.create(1, 2, 3);

describe("editAt", () => {
  it("holds nothing for a part that has never been edited", () => {
    expect(editAt(drawn(1), AT, 5)?.held).toBe(Bitmap.EMPTY);
  });

  it("holds nothing for a cell of an empty edit box", () => {
    const part = holding(1, AT, 4);

    expect(editAt(part, Vector3D.create(0, 0, 0), 5)?.held).toBe(Bitmap.EMPTY);
  });

  it("holds what the cell was given before", () => {
    expect(editAt(holding(1, AT, 4), AT, 5)?.held).toBe(4);
  });

  it("holds nothing to put down where the drawings already say it", () => {
    // A part drawn all over already has a voxel of that colour at every cell, so
    // putting one there changes nothing and nothing is left to remember.
    const edit = editAt(drawn(1), AT, 1);

    expect(edit?.held).toBe(Bitmap.EMPTY);
    expect(edit?.value).toBe(Bitmap.EMPTY);
  });

  it("holds the colour to put down where the drawings say another", () => {
    expect(editAt(drawn(1), AT, 5)?.value).toBe(5);
  });

  it("holds a removal where the drawings have a voxel there", () => {
    expect(editAt(drawn(1), AT, Bitmap.EMPTY)?.value).toBe(REMOVED);
  });

  it("holds nothing to take away where the drawings have nothing there", () => {
    expect(editAt(drawn(Bitmap.EMPTY), AT, Bitmap.EMPTY)?.value).toBe(
      Bitmap.EMPTY,
    );
  });

  it("leaves no edit behind where the cell already holds the wanted value", () => {
    // A part carrying an edit that the drawings would have made on their own is
    // a part whose edit is about to become redundant, and putting the same voxel
    // down again is what takes it away.
    const part = holding(1, AT, 4);
    const edit = editAt(part, AT, 1);

    expect(edit?.held).toBe(4);
    expect(edit?.value).toBe(Bitmap.EMPTY);
  });

  it("leaves a removal behind where the cell already carries one", () => {
    const part = holding(1, AT, REMOVED);

    expect(editAt(part, AT, Bitmap.EMPTY)).toEqual({
      held: REMOVED,
      value: REMOVED,
    });
  });

  it("has no cell to speak of outside the part's own box", () => {
    const part = drawn(1);

    for (const voxel of [
      { x: -1, y: 0, z: 0 },
      { x: 0, y: -1, z: 0 },
      { x: DIMS.width, y: 0, z: 0 },
      { x: 0, y: DIMS.height, z: 0 },
      { x: 0, y: 0, z: DIMS.depth },
    ]) {
      expect(editAt(part, voxel, 5), `${voxel.x},${voxel.y},${voxel.z}`).toBe(
        undefined,
      );
    }
  });

  it("reads a cell at the very edge of the box", () => {
    const part = drawn(1);

    for (const voxel of [
      { x: 0, y: 0, z: 0 },
      { x: DIMS.width - 1, y: DIMS.height - 1, z: DIMS.depth - 1 },
    ]) {
      expect(
        editAt(part, voxel, 5)?.value,
        `${voxel.x},${voxel.y},${voxel.z}`,
      ).toBe(5);
    }
  });

  it("measures the box from the part's own drawings", () => {
    // A part with cuts across it is longer than any one drawing is wide, and a
    // cell has to be counted against the whole box rather than against a panel.
    const part = drawn(1);

    part.sections = [
      {
        axis: "width",
        at: 2,
        before: {
          width: DIMS.depth,
          height: DIMS.height,
          data: new Uint8Array(DIMS.depth * DIMS.height).fill(1),
        },
        after: {
          width: DIMS.depth,
          height: DIMS.height,
          data: new Uint8Array(DIMS.depth * DIMS.height).fill(1),
        },
      },
    ];

    expect(partDimensions(part)).toEqual(DIMS);
    expect(editAt(part, AT, 5)?.value).toBe(5);
    expect(editAt(part, { x: DIMS.width, y: 0, z: 0 }, 5)).toBeUndefined();
  });
});
