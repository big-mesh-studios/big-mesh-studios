// @vitest-environment node
//
// What the crosshair of a camera in flight finds on the model the editor opens
// on.
//
// That model is a solid cube drawn inset a cell from the edge of its own box, so
// it has an empty cell in front of every one of its faces and placing is
// possible on it — as it is on any model somebody has drawn. What makes it the
// model worth this file is its size: fifteen voxels to a side, which is far
// larger than a crosshair reaches if the reach is a fixed number of voxels, and
// far larger than a camera stands off if the stand-off is a fixed number of world
// units. Both were fixed numbers once, and with both of them fixed the model the
// editor opens on could not be worked on at all: the camera stood further off
// than the crosshair reached, so the crosshair reported nothing while pointing
// straight at the model. The last test here is the one that says so.
import { describe, expect, it } from "vitest";
import {
  Matrix3x3,
  Vector3D,
  type Dimensions3D,
} from "@big-mesh-studios/maths";
import {
  packedFaces,
  partDimensions,
  sideAxes,
  solvePart,
  type Part,
  type PartPlacement,
  voxelReach,
} from "@big-mesh-studios/stacker/renderer";
import {
  crosshairOf,
  pickCrosshair,
  type FlyPickView,
} from "./picking/fly-picker";
import { createInitialPart } from "./stacker-store";
import { flightEntry, flightReach } from "./fly-camera";
import { framedVoxelSize } from "./voxel-preview-scene";

const AXIS = ["x", "y", "z"] as const;
const SIDES = ["front", "left", "right", "back", "top", "bottom"] as const;

/** The part the editor opens on. */
const fresh = (): Part =>
  createInitialPart("body", { width: 15, height: 15, depth: 15 });

/** Where a part stands when nothing has moved it, and how big its box is. */
const stands = (part: Part): PartPlacement => {
  const { width, height, depth } = partDimensions(part);

  return {
    position: Vector3D.create(),
    turn: Matrix3x3.identity(),
    scale: Math.max(width, height, depth),
  };
};

const inside = (
  cell: { x: number; y: number; z: number },
  of: Dimensions3D,
): boolean =>
  cell.x >= 0 &&
  cell.y >= 0 &&
  cell.z >= 0 &&
  cell.x < of.width &&
  cell.y < of.height &&
  cell.z < of.depth;

/** Where the middle of a cell of a box is drawn, in the world the part is in. */
const centreOf = (
  cell: { x: number; y: number; z: number },
  of: Dimensions3D,
): Vector3D =>
  Vector3D.create(
    cell.x + 0.5 - of.width / 2,
    cell.y + 0.5 - of.height / 2,
    cell.z + 0.5 - of.depth / 2,
  );

/**
 * A crosshair looking at `cell` from well outside the box on its low side, along
 * `axis` — which is the only way a crosshair can see a voxel at all.
 */
const lookingAt = (
  part: Part,
  cell: { x: number; y: number; z: number },
  axis: 0 | 1 | 2,
): FlyPickView => {
  const dimensions = partDimensions(part);
  const from = centreOf(cell, dimensions);
  const towards = Vector3D.create();

  towards[AXIS[axis]] = 1;
  from[AXIS[axis]] = cell[AXIS[axis]] - 40;

  return {
    solved: [solvePart(part)],
    placements: [stands(part)],
    origin: from,
    direction: towards,
    reach: 200,
    voxelSize: 1,
    focus: Vector3D.create(),
  };
};

describe("the model the editor opens on", () => {
  it("is a cube inset a cell from the edge of its own box", () => {
    const part = fresh();
    const dimensions = partDimensions(part);
    const faces = packedFaces(dimensions, solvePart(part).voxels);

    let voxels = 0;
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];

    for (let z = 0; z < dimensions.depth; z++) {
      for (let y = 0; y < dimensions.height; y++) {
        for (let x = 0; x < dimensions.width; x++) {
          if (!faces.solid(x, y, z)) {
            continue;
          }

          voxels++;
          xs.push(x);
          ys.push(y);
          zs.push(z);
        }
      }
    }

    // A cell of empty space all the way round, so every face of it has a cell in
    // front of it to put a voxel into.
    expect(voxels).toBe(13 * 13 * 13);
    for (const axis of [xs, ys, zs]) {
      expect([Math.min(...axis), Math.max(...axis)]).toEqual([1, 13]);
    }
  });

  it("has a cell in front of every face of it to put a voxel into", () => {
    const part = fresh();
    const dimensions = partDimensions(part);
    const faces = packedFaces(dimensions, solvePart(part).voxels);

    let withoutRoom = 0;

    for (let z = 0; z < dimensions.depth; z++) {
      for (let y = 0; y < dimensions.height; y++) {
        for (let x = 0; x < dimensions.width; x++) {
          if (!faces.solid(x, y, z)) {
            continue;
          }

          for (const axis of [0, 1, 2] as const) {
            for (const side of [1, -1]) {
              const next = {
                x: x + (axis === 0 ? side : 0),
                y: y + (axis === 1 ? side : 0),
                z: z + (axis === 2 ? side : 0),
              };

              if (!inside(next, dimensions)) {
                withoutRoom++;
              }
            }
          }
        }
      }
    }

    // A face on the edge of the box is a face nothing can be built on, and the
    // model the editor opens on is the model every session starts from.
    expect(withoutRoom).toBe(0);
  });

  it("has nowhere to put a voxel against a face on the edge of a box", () => {
    // The other half of the same fact, and the limitation the model above is
    // drawn to avoid: a part that fills its own box has a surface made entirely
    // of its own edges, and nothing can be built on it at all until the box is
    // grown.
    const dimensions: Dimensions3D = { width: 4, height: 4, depth: 4 };
    const part: Part = {
      name: "full",
      sides: Object.fromEntries(
        SIDES.map((kind) => {
          const [across, down] = sideAxes[kind];

          return [
            kind,
            {
              width: dimensions[across],
              height: dimensions[down],
              data: new Uint8Array(dimensions[across] * dimensions[down]).fill(
                1,
              ),
            },
          ];
        }),
      ) as unknown as Part["sides"],
      sections: [],
      root: Vector3D.create(),
      pivot: Vector3D.create(2, 2, 2),
      turn: Vector3D.create(),
      scale: 1,
      parent: null,
    };

    const pick = pickCrosshair(lookingAt(part, { x: 2, y: 2, z: 0 }, 2));

    expect(pick?.voxel).toEqual([2, 2, 0]);
    expect(pick?.face?.place).toBeUndefined();
  });
});

describe("a camera opening on the model the editor starts on", () => {
  // The turntable stands three world units off, and a figure is drawn at the size
  // that fills the view from there.
  const STAND_OFF = 3;
  const ASPECT = 900 / 640;

  /** Where a camera entering flight opens, and what its crosshair can reach. */
  const opening = () => {
    const part = fresh();
    const solved = [solvePart(part)];
    const reach = voxelReach(
      { parts: [part] } as never,
      solved,
      Vector3D.EMPTY,
    );
    const voxel = framedVoxelSize(reach, STAND_OFF, ASPECT);
    const distance = flightEntry(reach, STAND_OFF, voxel);

    return { part, solved, reach, voxel, distance };
  };

  it("stands outside the model rather than inside it", () => {
    const { reach, voxel, distance } = opening();

    expect(distance).toBeGreaterThan(reach * voxel);
  });

  it("has the model in reach of its crosshair as it opens", () => {
    const { part, solved, reach, voxel, distance } = opening();

    // Looking at the model from where the camera opens, which is the first frame
    // of every flight and the one a press arrives on.
    const pick = pickCrosshair({
      solved,
      placements: [stands(part)],
      origin: Vector3D.create(0, 0, distance),
      direction: Vector3D.create(0, 0, -1),
      reach: flightReach(reach),
      voxelSize: voxel,
      focus: Vector3D.EMPTY,
    });

    expect(pick?.face?.place).toBeDefined();
    expect(crosshairOf(pick)?.places).toBe(true);
  });

  it("has it in reach from every direction it can be looked at from", () => {
    const { part, solved, reach, voxel, distance } = opening();

    for (const direction of [
      Vector3D.create(0, 0, -1),
      Vector3D.create(0, 0, 1),
      Vector3D.create(0, -1, 0),
      Vector3D.create(1, 0, 0),
      Vector3D.create(-1, 0, 0),
      Vector3D.create(0, 1, 0),
    ]) {
      // Standing off along the way being looked, which is where a camera that has
      // turned to face a part of the model actually is.
      const pick = pickCrosshair({
        solved,
        placements: [stands(part)],
        origin: Vector3D.create(
          direction.x * -distance,
          direction.y * -distance,
          direction.z * -distance,
        ),
        direction,
        reach: flightReach(reach),
        voxelSize: voxel,
        focus: Vector3D.EMPTY,
      });

      expect(crosshairOf(pick)?.places).toBe(true);
    }
  });
});
