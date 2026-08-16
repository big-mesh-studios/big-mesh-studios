import { describe, expect, it } from "vitest";
import { Bitmap, Dimensions3D, Matrix3x3 } from "./maths";
import {
  PANEL_PAIR_KINDS,
  PANEL_PAIR_UNIFORM_NAME,
  toPanelPairTextures,
} from "./panel-textures";
import shaders from "./shaders";
import { type Sides } from "./types";
import { voxelPicker } from "./voxel-picker";

// A cube small enough to reason about cell by cell, with an odd count on each
// axis so a ray through the middle of the canvas runs down the middle column of
// cells rather than along the seam between two of them.
const DIMENSIONS = { width: 5, height: 5, depth: 5 };
const COLOUR = 5;
const CAMERA_DISTANCE = 3;

const drawnPanel = (width: number, height: number): Bitmap => {
  const bitmap = Bitmap.create(width, height);
  bitmap.data.fill(COLOUR);
  return bitmap;
};

/** Six fully drawn panels: a solid block filling the whole grid. */
const solidSides = ({ width, height, depth }: Dimensions3D): Sides => ({
  front: drawnPanel(width, height),
  back: drawnPanel(width, height),
  left: drawnPanel(depth, height),
  right: drawnPanel(depth, height),
  top: drawnPanel(width, depth),
  bottom: drawnPanel(width, depth),
});

const erase = (panel: Bitmap, x: number, y: number) => {
  panel.data[y * panel.width + x] = Bitmap.EMPTY;
};

/**
 * The voxel under a point on the canvas, in the same call the preview makes.
 * The model is left unturned, so the camera looks straight down -z at the front
 * of the block from `CAMERA_DISTANCE` away.
 */
const pickAt = (sides: Sides, u: number, v: number) => {
  const normalized = Dimensions3D.normalize(DIMENSIONS);
  const pairs = toPanelPairTextures(sides);
  const picked = voxelPicker({
    uniforms: {
      [shaders.uResolution]: [100, 100],
      [shaders.uDimensions]: [normalized.width, normalized.height, normalized.depth],
      [shaders.uVoxelCount]: [DIMENSIONS.width, DIMENSIONS.height, DIMENSIONS.depth],
      [shaders.uLightDir]: [0, 0, 1],
      [shaders.uLightColour]: [1, 1, 1],
      [shaders.uAmbientColour]: [0, 0, 0],
      [shaders.uCameraPosition]: [0, 0, CAMERA_DISTANCE],
      [shaders.uWorldToModel]: Array.from(Matrix3x3.rotationY(0)),
      [shaders.uUnlit]: true,
    },
    varying: { vUv: [u, v] },
    textures: {
      ...Object.fromEntries(
        PANEL_PAIR_KINDS.map(kind => [PANEL_PAIR_UNIFORM_NAME[kind], pairs[kind]]),
      ),
      // Picking never reads a colour, but the marcher looks one up for every
      // hit, so the palette has to be there to be sampled.
      [shaders.uPalette]: { data: new Uint8Array(32 * 4).fill(255), width: 32, height: 1 },
    },
  });
  return Array.from(picked);
};

describe("voxel picker", () => {
  it("picks the front-most voxel of a solid block", () => {
    expect(pickAt(solidSides(DIMENSIONS), 0.5, 0.5)).toEqual([2, 2, 4]);
  });

  it("finds nothing where the front panel has erased the whole run behind it", () => {
    const sides = solidSides(DIMENSIONS);
    // The front panel reads row `height - 1 - y`, so the middle cell of the
    // panel faces the middle column of the block.
    erase(sides.front, 2, 2);
    expect(pickAt(sides, 0.5, 0.5)).toEqual([-1, -1, -1]);
  });

  it("picks through the layer a second panel has carved away", () => {
    const sides = solidSides(DIMENSIONS);
    // The top panel reads (x, z), so this erases the column of voxels above and
    // below the front-most cell of the middle column, and nothing behind it.
    erase(sides.top, 2, 4);
    expect(pickAt(sides, 0.5, 0.5)).toEqual([2, 2, 3]);
  });

  // The far panel of each pair is stored flipped onto the near panel's
  // coordinates, so these cover the three flips the packing performs. Erasing
  // through a far panel has to carve exactly the run its own coordinates name,
  // not the one its partner would.
  it("finds nothing where the back panel has erased the whole run behind it", () => {
    const sides = solidSides(DIMENSIONS);
    // The back panel counts x from the other end, so its cell (2, 2) faces the
    // same middle column of the block as the front panel's does.
    erase(sides.back, 2, 2);
    expect(pickAt(sides, 0.5, 0.5)).toEqual([-1, -1, -1]);
  });

  it("picks through the layer the bottom panel has carved away", () => {
    const sides = solidSides(DIMENSIONS);
    // The bottom panel reads (x, depth - 1 - z), so its row 0 faces the
    // front-most layer: this takes the column of voxels at x = 2, z = 4.
    erase(sides.bottom, 2, 0);
    expect(pickAt(sides, 0.5, 0.5)).toEqual([2, 2, 3]);
  });

  it("picks through the layer the right panel has carved away", () => {
    const sides = solidSides(DIMENSIONS);
    // The right panel counts z from the other end, so its cell (0, 2) faces the
    // front-most layer at the middle height, taking that row of voxels away.
    erase(sides.right, 0, 2);
    expect(pickAt(sides, 0.5, 0.5)).toEqual([2, 2, 3]);
  });

  it("finds nothing where the ray misses the block", () => {
    expect(pickAt(solidSides(DIMENSIONS), 0.02, 0.5)).toEqual([-1, -1, -1]);
  });
});
