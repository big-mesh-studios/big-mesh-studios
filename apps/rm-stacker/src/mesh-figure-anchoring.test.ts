// @vitest-environment node
//
// The figure is drawn as triangles whose vertices are in cells from the low
// corner of a part's box, and the pointer is picked by walking the same cells.
// The two only agree if the part's group puts cell zero where the marcher put it,
// and this is what says they do.
//
// Nothing here draws anything: a `Group`'s own matrix is enough to find where a
// vertex lands, and the parts are placed through the same `standAs` the preview
// places them through.
import { describe, expect, it } from "vitest";
import { Vector3 } from "@random-mesh/rmsl/scene";
import { Bitmap, Vector3D } from "@big-mesh-studios/maths";
import {
  figurePlacement,
  MeshFigureMeshes,
  sideKinds,
  type Figure,
  type Part,
  type Sides,
} from "@big-mesh-studios/stacker/renderer";
import { voxelCellEdges } from "./voxel-preview-scene";

/** A part of a given size, with a drawing painted solid on all six sides. */
const partOf = (
  name: string,
  dimensions: { width: number; height: number; depth: number },
): Part => {
  const sides = {} as Sides;
  for (const kind of sideKinds) {
    const bitmap = Bitmap.create(
      kind === "left" || kind === "right" ? dimensions.depth : dimensions.width,
      kind === "top" || kind === "bottom"
        ? dimensions.depth
        : dimensions.height,
    );
    bitmap.data.fill(1);
    sides[kind] = bitmap;
  }
  return {
    name,
    sides,
    sections: [],
    root: Vector3D.create(),
    pivot: Vector3D.create(),
    turn: Vector3D.create(),
    scale: 1,
    parent: null,
  };
};

const figureOf = (part: Part): Figure => ({ parts: [part], palette: [] });

/** Where a point in a part's own cell space stands in the world. */
const placed = (
  meshes: MeshFigureMeshes,
  part: Part,
  x: number,
  y: number,
  z: number,
): Vector3 => {
  const group = meshes.groupFor(part.name)!;
  group.updateMatrixWorld(true);
  return new Vector3(x, y, z).applyMatrix4(group.matrix);
};

/** Every corner of the box a cell bounds, as the coordinates traced for it. */
const cornersOf = (traced: Float32Array): Set<string> => {
  const out = new Set<string>();
  for (let edge = 0; edge < 12; edge++) {
    for (const end of [0, 3]) {
      out.add(
        [
          traced[edge * 6 + end],
          traced[edge * 6 + end + 1],
          traced[edge * 6 + end + 2],
        ]
          .map((n) => n.toFixed(6))
          .join(","),
      );
    }
  }
  return out;
};

describe("a meshed figure is anchored where a marched one was", () => {
  it("puts a cell's corners where the outline traces that same cell", () => {
    for (const size of [
      { width: 10, height: 10, depth: 10 },
      // A box of odd extents has its middle half a voxel in, which is where a
      // mismatch between the two would show first.
      { width: 15, height: 15, depth: 15 },
      { width: 7, height: 3, depth: 11 },
    ]) {
      const part = partOf("body", size);
      const figure = figureOf(part);
      const meshes = new MeshFigureMeshes();
      meshes.place(figure, figurePlacement(figure));

      for (const voxel of [
        [0, 0, 0],
        [1, 2, 3],
        [size.width - 1, size.height - 1, size.depth - 1],
      ] as [number, number, number][]) {
        const traced = cornersOf(voxelCellEdges(size, voxel));

        // The eight corners of that cell, from the mesher's own coordinates.
        for (const [dx, dy, dz] of [
          [0, 0, 0],
          [1, 0, 0],
          [1, 1, 0],
          [0, 1, 0],
          [0, 0, 1],
          [1, 0, 1],
          [1, 1, 1],
          [0, 1, 1],
        ]) {
          const at = placed(
            meshes,
            part,
            voxel[0] + dx,
            voxel[1] + dy,
            voxel[2] + dz,
          );
          expect(
            traced.has([at.x, at.y, at.z].map((n) => n.toFixed(6)).join(",")),
          ).toBe(true);
        }
      }
    }
  });

  it("spans a part's box against its own longest axis, whatever the cell count", () => {
    // A part eight cells across and a part thirty-two are both drawn filling the
    // same distance, so a voxel means a different distance in each and the two
    // parts of a figure still meet.
    for (const size of [
      { width: 8, height: 8, depth: 8 },
      { width: 32, height: 32, depth: 32 },
      { width: 8, height: 8, depth: 32 },
    ]) {
      const part = partOf("body", size);
      const figure = figureOf(part);
      const meshes = new MeshFigureMeshes();
      meshes.place(figure, figurePlacement(figure));

      const longest = Math.max(size.width, size.height, size.depth);
      const expected = {
        width: size.width / longest,
        height: size.height / longest,
        depth: size.depth / longest,
      };

      for (const axis of [0, 1, 2]) {
        const near = placed(
          meshes,
          part,
          ...([0, 0, 0] as [number, number, number]),
        );
        const far = placed(meshes, part, size.width, size.height, size.depth);
        const across = Math.abs(
          [far.x, far.y, far.z][axis] - [near.x, near.y, near.z][axis],
        );

        expect(across).toBeCloseTo(
          [expected.width, expected.height, expected.depth][axis],
          6,
        );
      }
    }
  });
});
