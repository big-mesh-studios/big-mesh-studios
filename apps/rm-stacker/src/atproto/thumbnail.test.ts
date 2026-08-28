import { describe, expect, it } from "vitest";
import type { Dimensions3D } from "@big-mesh-studios/maths";
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
    const middle = cameraDistanceFor(volume([[8, 8, 8]]), dimensions);
    const corner = cameraDistanceFor(volume([[0, 0, 0]]), dimensions);

    expect(corner).toBeGreaterThan(middle);
  });

  it("frames what was drawn, not the box it was drawn in", () => {
    // Two voxels either side of the middle take up a fraction of the box, so
    // the camera comes in close — framing the box would leave them a speck.
    const small = cameraDistanceFor(
      volume([
        [7, 8, 8],
        [8, 8, 8],
      ]),
      dimensions,
    );
    const full = cameraDistanceFor(volume(everything()), dimensions);

    expect(small).toBeLessThan(full / 2);
  });

  it("stands somewhere sensible for a model with nothing in it", () => {
    const distance = cameraDistanceFor(volume([]), dimensions);

    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(1);
  });

  it("leaves an edge around a model that fills its box", () => {
    // The whole box normalises to one across its longest side, so its furthest
    // corner is half of the diagonal away. Twice that would touch the edges of
    // the picture exactly; a little more leaves the model clear of them.
    const full = cameraDistanceFor(volume(everything()), dimensions);
    const touching = 2 * Math.hypot(0.5, 0.5, 0.5);

    expect(full).toBeGreaterThan(touching);
    expect(full).toBeLessThan(touching * 1.3);
  });
});
