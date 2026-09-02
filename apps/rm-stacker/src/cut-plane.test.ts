import { Vector3D } from "@big-mesh-studios/maths";
import {
  boxSize,
  centrePivot,
  figurePlacement,
  type Part,
} from "@big-mesh-studios/stacker/renderer";
import { Vector3 } from "@random-mesh/rmsl/scene";
import { describe, expect, it } from "vitest";
import { createInitialSides } from "./stacker-store";
import { CutPlane } from "./cut-plane";
import type { DimensionKind } from "./types";
import { voxelCellEdges } from "./voxel-preview-scene";

// A part five voxels wide, seven high and three deep, so that no two axes are
// the same length and a plane stood across the wrong one shows up as a wrong
// place.
const DIMENSIONS = { width: 5, height: 7, depth: 3 };

const part = (): Part => ({
  name: "body",
  sides: createInitialSides(DIMENSIONS),
  sections: [],
  turn: Vector3D.create(),
  scale: 1,
  root: Vector3D.create(),
  pivot: centrePivot(DIMENSIONS),
  parent: null,
});

/** The plane inside its group, as `place` has stood it in the part's box. */
const stand = (axis: DimensionKind, at: number) => {
  const plane = new CutPlane();
  const { placements } = figurePlacement({ parts: [part()], palette: [] });

  plane.place(placements[0], DIMENSIONS, { axis, at });

  return plane.group.children[0];
};

/** The low corner of the cell `voxel`, which the ray marcher draws it in. */
const cellCorner = (voxel: [number, number, number]) => {
  const [x, y, z] = voxelCellEdges(DIMENSIONS, voxel);
  return { x, y, z };
};

describe("CutPlane", () => {
  it("stands on the face of the voxel the cut falls before", () => {
    expect(stand("width", 2).position.x).toBeCloseTo(cellCorner([2, 0, 0]).x);
    expect(stand("height", 3).position.y).toBeCloseTo(cellCorner([0, 3, 0]).y);
    expect(stand("depth", 1).position.z).toBeCloseTo(cellCorner([0, 0, 1]).z);
  });

  it("faces along the axis it cuts", () => {
    const facing = (axis: DimensionKind) =>
      new Vector3(0, 0, 1).applyQuaternion(stand(axis, 2).quaternion);

    expect(facing("width").x).toBeCloseTo(1);
    expect(facing("height").y).toBeCloseTo(1);
    expect(facing("depth").z).toBeCloseTo(1);
  });

  it("spans the whole of the box across the two axes it does not cut", () => {
    const box = boxSize(DIMENSIONS);
    const across = stand("width", 2).scale;

    expect(across.x).toBeCloseTo(box.depth);
    expect(across.y).toBeCloseTo(box.height);

    const down = stand("height", 2).scale;

    expect(down.x).toBeCloseTo(box.width);
    expect(down.y).toBeCloseTo(box.depth);
  });
});
