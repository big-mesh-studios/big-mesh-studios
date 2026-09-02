import { describe, expect, it } from "vitest";
import { Bitmap, Vector3D, type Dimensions3D } from "@big-mesh-studios/maths";
import {
  centrePivot,
  sideAxes,
  sideKinds,
  type Figure,
  type Part,
  type SolvedPart,
} from "@big-mesh-studios/stacker/renderer";
import { cameraDistanceFor } from "./thumbnail";

const dimensions: Dimensions3D = { width: 16, height: 16, depth: 16 };

/** A volume with something drawn at each of `at`, and nothing anywhere else. */
function volume(at: Array<[number, number, number]>): Uint8Array {
  const { width, height, depth } = dimensions;
  const voxels = new Uint8Array(width * height * depth * 4);

  for (const [x, y, z] of at) {
    voxels[((z * width * height + y * width + x) << 2) + 3] = 255;
  }

  return voxels;
}

/** A part of the box `dimensions` describes, pivoting on its own middle at `root`. */
function part(name: string, root = Vector3D.create()): Part {
  return {
    name,
    sides: Object.fromEntries(
      sideKinds.map((kind) => {
        const [across, down] = sideAxes[kind];
        return [
          kind,
          Bitmap.create(dimensions[across], dimensions[down]),
        ] as const;
      }),
    ) as Part["sides"],
    sections: [],
    turn: Vector3D.create(),
    scale: 1,
    root,
    pivot: centrePivot(dimensions),
    parent: null,
  };
}

/** A figure of one part drawn at `at`, and what the camera is asked to frame. */
function lone(at: Array<[number, number, number]>): [Figure, SolvedPart[]] {
  const only = part("body");
  return [
    { parts: [only], palette: [] },
    [{ name: only.name, dimensions, voxels: volume(at) }],
  ];
}

/** Every voxel in the box. */
function everything(): Array<[number, number, number]> {
  const all: Array<[number, number, number]> = [];

  for (let z = 0; z < dimensions.depth; z++) {
    for (let y = 0; y < dimensions.height; y++) {
      for (let x = 0; x < dimensions.width; x++) {
        all.push([x, y, z]);
      }
    }
  }

  return all;
}

describe("cameraDistanceFor", () => {
  it("stands back further for a model that reaches further", () => {
    const middle = cameraDistanceFor(...lone([[8, 8, 8]]));
    const corner = cameraDistanceFor(...lone([[0, 0, 0]]));

    expect(corner).toBeGreaterThan(middle);
  });

  it("frames what was drawn, not the box it was drawn in", () => {
    // Two voxels either side of the middle take up a fraction of the box, so
    // the camera comes in close — framing the box would leave them a speck.
    const small = cameraDistanceFor(
      ...lone([
        [7, 8, 8],
        [8, 8, 8],
      ]),
    );
    const full = cameraDistanceFor(...lone(everything()));

    expect(small).toBeLessThan(full / 2);
  });

  it("stands somewhere sensible for a model with nothing in it", () => {
    const distance = cameraDistanceFor(...lone([]));

    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(cameraDistanceFor(...lone([[8, 8, 8]])));
  });

  it("leaves an edge around a model that fills its box", () => {
    // The box is sixteen voxels across, so its furthest corner is eight voxels
    // out along each axis. Twice that distance would touch the edges of the
    // picture exactly; a little more leaves the model clear of them.
    const full = cameraDistanceFor(...lone(everything()));
    const touching = 2 * Math.hypot(8, 8, 8);

    expect(full).toBeGreaterThan(touching);
    expect(full).toBeLessThan(touching * 1.3);
  });

  it("takes in what a part sitting away from the others has drawn in it", () => {
    const near = part("torso");
    const far = part("head", Vector3D.create(0, 12, 0));
    const figure: Figure = { parts: [near, far], palette: [] };
    const torso: SolvedPart = {
      name: near.name,
      dimensions,
      voxels: volume(everything()),
    };

    // The same two parts stand in the same places either way, so a voxel is the
    // same size in both; all that changes is whether the far one has anything
    // drawn in it for the camera to have to take in.
    const drawn = cameraDistanceFor(figure, [
      torso,
      { name: far.name, dimensions, voxels: volume(everything()) },
    ]);
    const empty = cameraDistanceFor(figure, [
      torso,
      { name: far.name, dimensions, voxels: volume([]) },
    ]);

    expect(drawn).toBeGreaterThan(empty);
  });
});
