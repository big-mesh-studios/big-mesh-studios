import { describe, expect, it } from "vitest";
import {
  Bitmap,
  Matrix3x3,
  Vector3D,
  type RGBA,
} from "@big-mesh-studios/maths";
import {
  centrePivot,
  figurePlacement,
  fitVoxelSize,
  partDimensions,
  sideAxes,
  sideKinds,
  type Figure,
  type Part,
  type SolvedPart,
} from "@big-mesh-studios/stacker/renderer";
import { pickFigure, type FigurePickView } from "./figure-picker";

const EXTENT = { width: 8, height: 8, depth: 8 };
const PALETTE: RGBA[] = [{ r: 255, g: 255, b: 255, a: 255 }];

/** A part of `EXTENT` voxels, standing `atZ` voxels along the depth axis. */
const partAt = (name: string, atZ: number): Part => ({
  name,
  sides: Object.fromEntries(
    sideKinds.map((kind) => {
      const [across, down] = sideAxes[kind];
      return [kind, Bitmap.create(EXTENT[across], EXTENT[down])];
    }),
  ) as Part["sides"],
  sections: [],
  turn: Vector3D.create(),
  scale: 1,
  root: Vector3D.create(0, 0, atZ),
  pivot: centrePivot(EXTENT),
  parent: null,
});

/** `part` with every one of its voxels solid, in the palette's first colour. */
const solid = (part: Part): SolvedPart => {
  const dimensions = partDimensions(part);
  const voxels = new Uint8Array(
    dimensions.width * dimensions.height * dimensions.depth * 4,
  );

  // The top two bits of a voxel's fourth byte are what the marcher reads as
  // solid, and the six face colours they leave at zero all address entry zero.
  for (let offset = 3; offset < voxels.length; offset += 4) {
    voxels[offset] = 0b11000000;
  }

  return { name: part.name, dimensions, voxels };
};

/** The same part with nothing painted in it, which a ray passes through. */
const emptied = (solved: SolvedPart): SolvedPart => ({
  ...solved,
  voxels: new Uint8Array(solved.voxels.length),
});

/**
 * `figure` seen from a camera three units down the z axis, turned `yaw` radians
 * about y, with the pointer just off the middle of a square canvas.
 */
const lookingAt = (figure: Figure, yaw: number): FigurePickView => {
  const { bounds, placements } = figurePlacement(figure);

  return {
    solved: figure.parts.map(solid),
    placements,
    framing: {
      focus: Vector3D.EMPTY,
      voxelSize: fitVoxelSize(bounds.dimensions),
    },
    palette: PALETTE,
    uv: { x: 0.51, y: 0.51 },
    resolution: { width: 500, height: 500 },
    cameraDistance: 3,
    worldToModel: Matrix3x3.rotationY(-yaw),
    modelToWorld: Matrix3x3.rotationY(yaw),
    lightDirection: Vector3D.create(0, 0, 1),
    unlit: true,
  };
};

describe("pickFigure", () => {
  const front = partAt("front", 12);
  const back = partAt("back", -12);
  const figure: Figure = { parts: [front, back], palette: PALETTE };

  it("reports the nearer part when one stands in front of the other", () => {
    expect(pickFigure(lookingAt(figure, 0))?.part).toBe("front");
  });

  it("reports the other one once the figure has been turned around", () => {
    expect(pickFigure(lookingAt(figure, Math.PI))?.part).toBe("back");
  });

  it("reaches the part behind through one with nothing painted in it", () => {
    const view = lookingAt(figure, 0);
    const met = pickFigure({
      ...view,
      solved: [emptied(view.solved[0]), view.solved[1]],
    });

    expect(met?.part).toBe("back");
  });

  it("names a voxel of the volume the part it reports was solved from", () => {
    const met = pickFigure(lookingAt(figure, 0))!;

    for (const axis of [0, 1, 2] as const) {
      expect(met.voxel[axis], `axis ${axis}`).toBeGreaterThanOrEqual(0);
      expect(met.voxel[axis], `axis ${axis}`).toBeLessThan(EXTENT.width);
    }
  });

  it("meets nothing where the figure is not drawn", () => {
    expect(
      pickFigure({ ...lookingAt(figure, 0), uv: { x: 0.99, y: 0.99 } }),
    ).toBe(undefined);
  });
});

describe("pickFigure, with a part turned", () => {
  const BAR = { width: 16, height: 2, depth: 2 };

  /** A bar lying along the width, turned as it is told. */
  const bar = (turn: Vector3D): Figure => ({
    parts: [
      {
        name: "bar",
        sides: Object.fromEntries(
          sideKinds.map((kind) => {
            const [across, down] = sideAxes[kind];
            return [kind, Bitmap.create(BAR[across], BAR[down])];
          }),
        ) as Part["sides"],
        sections: [],
        root: Vector3D.create(),
        pivot: centrePivot(BAR),
        turn,
        scale: 1,
        parent: null,
      },
    ],
    palette: PALETTE,
  });

  // Well to the right of the middle, but inside the reach of a bar lying
  // across the view: a third of the way out along one that spans the middle.
  const OFF_TO_THE_SIDE = { x: 0.63, y: 0.51 };

  it("meets a bar lying across the view out where it reaches", () => {
    expect(
      pickFigure({
        ...lookingAt(bar(Vector3D.create()), 0),
        uv: OFF_TO_THE_SIDE,
      })?.part,
    ).toBe("bar");
  });

  it("misses it once its own turn has stood it end on to the camera", () => {
    // Turned a quarter about its pivot, the bar runs away from the camera
    // rather than across it, and reaches two voxels either side of the middle
    // instead of eight.
    expect(
      pickFigure({
        ...lookingAt(bar(Vector3D.create(0, Math.PI / 2, 0)), 0),
        uv: OFF_TO_THE_SIDE,
      }),
    ).toBe(undefined);
  });

  it("still meets it at the middle, where the turn leaves it standing", () => {
    expect(
      pickFigure({
        ...lookingAt(bar(Vector3D.create(0, Math.PI / 2, 0)), 0),
        uv: { x: 0.51, y: 0.51 },
      })?.part,
    ).toBe("bar");
  });
});
