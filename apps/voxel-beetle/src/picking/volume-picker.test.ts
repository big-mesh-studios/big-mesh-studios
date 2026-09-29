import {
  Bitmap,
  type Dimensions3D,
  type Vector3D,
} from "@big-mesh-studios/maths";
import { createVolume, writeVoxel } from "@big-mesh-studios/stacker/volume";
import { describe, expect, it } from "vitest";
import { voxelCellEdges } from "../voxel-preview-scene";
import { pickModel, type ModelPickView } from "./volume-picker";

/** A volume of these dimensions with the given cells filled. */
const volumeOf = (
  dimensions: Dimensions3D,
  filled: Iterable<Vector3D> = [],
): ReturnType<typeof createVolume> => {
  const volume = createVolume(dimensions);
  for (const { x, y, z } of filled) {
    writeVoxel(volume, x, y, z, 3);
  }
  return volume;
};

/** A view of a model as it is drawn square on, the camera on its z axis. */
const viewOf = (
  volume: ReturnType<typeof createVolume>,
  resolution = { x: 500, y: 500 },
): ModelPickView => ({
  volume,
  worldToModel: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  camera: { x: 0, y: 0, z: 3 },
  resolution,
  uv: { x: resolution.x / 2, y: resolution.y / 2 },
});

/** The voxel picked at a point of a 500 by 500 canvas. */
const at = (view: ModelPickView, x: number, y: number) =>
  pickModel({ ...view, uv: { x, y } });

describe("pickModel", () => {
  it("picks the voxel nearest the camera when two are along one ray", () => {
    const view = viewOf(
      volumeOf({ width: 10, height: 10, depth: 10 }, [
        { x: 5, y: 5, z: 0 },
        { x: 5, y: 5, z: 9 },
      ]),
    );
    // Dead centre of the canvas is the middle of the box, and the near face of
    // the far voxel is what stands along that ray.
    expect(at(view, 250, 250)?.voxel).toEqual([5, 5, 9]);
  });

  it("picks nothing where the ray meets no voxel", () => {
    const view = viewOf(
      volumeOf({ width: 10, height: 10, depth: 10 }, [{ x: 0, y: 0, z: 0 }]),
    );
    expect(at(view, 250, 250)).toBeUndefined();
  });

  it("picks nothing for a ray that passes beside the model", () => {
    const view = viewOf(
      volumeOf({ width: 10, height: 10, depth: 10 }, [{ x: 0, y: 0, z: 0 }]),
    );
    // The far corner of the canvas, well outside a 10-voxel box at this range.
    expect(at(view, 0, 0)).toBeUndefined();
  });

  it("picks a different voxel as the ray moves across the model", () => {
    const filled: Vector3D[] = [];
    for (let x = 0; x < 10; x++) {
      filled.push({ x, y: 5, z: 9 });
    }
    const view = viewOf(volumeOf({ width: 10, height: 10, depth: 10 }, filled));
    const left = at(view, 200, 250);
    const right = at(view, 300, 250);
    expect(left?.voxel[0]).toBeLessThan(right?.voxel[0] ?? 0);
  });

  it("picks through a hole in a shell, rather than stopping at its far wall", () => {
    // A box with one voxel missing from the middle of its near face.
    const dimensions = { width: 5, height: 5, depth: 5 };
    const filled: Vector3D[] = [];
    for (const x of [1, 2, 3]) {
      for (const y of [1, 2, 3]) {
        for (const z of [1, 2, 3]) {
          if (x === 2 && y === 2 && z === 1) {
            continue;
          }
          filled.push({ x, y, z });
        }
      }
    }
    const view = viewOf(volumeOf(dimensions, filled));
    // The centre of the canvas looks straight through where the voxel was
    // missing, at the far wall behind it.
    expect(at(view, 250, 250)?.voxel).toEqual([2, 2, 3]);
  });

  it("picks a voxel the model has been turned to present", () => {
    const view = viewOf(
      volumeOf({ width: 10, height: 10, depth: 10 }, [{ x: 5, y: 5, z: 9 }]),
    );
    // A quarter turn about the y axis, which is the turntable's own first
    // movement, sending what was the near face to one side.
    const turned = pickModel({
      ...view,
      worldToModel: [0, 0, 1, 0, 1, 0, -1, 0, 0],
    });
    // What was at z = 9 is now off to the left of the model, so the ray down
    // the centre meets nothing.
    expect(turned).toBeUndefined();
  });

  it("picks a cell that the pick outline's box encloses", () => {
    // The cell the picker names has to be the one the preview encloses, or the
    // wireframe lands on a neighbour of what the pointer met.
    const dimensions = { width: 10, height: 10, depth: 10 };
    const view = viewOf(volumeOf(dimensions, [{ x: 5, y: 5, z: 9 }]));
    const picked = at(view, 250, 250)?.voxel;
    expect(picked).toEqual([5, 5, 9]);

    const edges = voxelCellEdges(dimensions, picked!);
    const low = [Infinity, Infinity, Infinity];
    const high = [-Infinity, -Infinity, -Infinity];
    // The positions are one (xyz xyz) pair an edge, and every corner of the box
    // is the end of at least one of them.
    for (let at = 0; at < edges.length; at += 3) {
      for (const axis of [0, 1, 2] as const) {
        low[axis] = Math.min(low[axis], edges[at + axis]);
        high[axis] = Math.max(high[axis], edges[at + axis]);
      }
    }

    // The camera stands on the model's z axis at three, and the box is one unit
    // across, so the ray down the centre of the canvas enters the box at its
    // near face — which is where the cell it picked has its own near face.
    expect(high[2]).toBeCloseTo(0.5, 7);
    // And that cell is the middle one along x, which the ray met head on.
    expect(low[0]).toBeCloseTo(0, 7);
    expect(high[0]).toBeCloseTo(0.1, 7);
  });

  it("reports a model one cell across as that one cell", () => {
    const view = viewOf(
      volumeOf({ width: 1, height: 1, depth: 1 }, [{ x: 0, y: 0, z: 0 }]),
    );
    expect(at(view, 250, 250)?.voxel).toEqual([0, 0, 0]);
  });

  it("picks nothing from a model with nothing in it", () => {
    const view = viewOf(volumeOf({ width: 4, height: 4, depth: 4 }));
    expect(at(view, 250, 250)).toBeUndefined();
  });

  it("keeps a ray that starts inside the model on the voxel it starts in", () => {
    const dimensions = { width: 10, height: 10, depth: 10 };
    const view = viewOf(volumeOf(dimensions, [{ x: 5, y: 5, z: 5 }]));
    // The camera standing where the voxel is, which the framing never does but
    // a zoomed-in ray across a hollow model can arrive at.
    expect(
      pickModel({ ...view, camera: { x: 0, y: 0, z: 0.5 } })?.voxel,
    ).toEqual([5, 5, 5]);
  });

  it("agrees with itself about where an empty cell is", () => {
    const volume = volumeOf({ width: 8, height: 8, depth: 8 });
    const view = viewOf(volume);
    expect(pickModel(view)).toBeUndefined();
    expect(volume.voxels.every((one) => one === Bitmap.EMPTY)).toBe(true);
  });
});
