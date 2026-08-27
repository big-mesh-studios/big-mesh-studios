// The small picture a model shows for itself in a listing.
//
// A real rendering of the model, from a raised three-quarter angle.
//
// It is drawn by the same code the preview draws with. The ray marcher in
// `shaders-shared` is written once and compiled two ways — into the fragment
// shader the preview runs on the graphics card, and into plain code that runs
// here — so this asks it for the colour at a point exactly as the shader does,
// down to the palette lookup and the light. There is no second idea of what a
// model looks like to fall out of step with the first.
//
// It runs on the processor rather than through the graphics card because there
// is no context to draw into: the preview builds its own inside the view that
// shows it, and a picture is wanted for a model that is not on screen. A few
// thousand rays once, when a model is published, is a price worth paying for a
// listing that costs one small image per model instead of a zip, six panels
// decoded, a volume solved and a scene rendered.
import { encode } from "fast-png";
import { Dimensions3D, Matrix3x3, RGBA, Vector3D } from "../maths";
import shaders from "../shaders";
import type { Sides } from "../types";
import { AMBIENT_COLOUR, LIGHT_COLOUR, LIGHT_DIR } from "../voxel-preview-scene";
import { voxelRenderer } from "../voxel-picker";
import { solveVoxels } from "../voxel-solver";

/** How many pixels across the picture is. */
const SIZE = 128;

/**
 * Where the model is seen from, matching the angle the preview opens on: turned
 * a little to the left and looked down on, so three faces are in view and the
 * shape reads as a solid.
 */
const YAW = Math.PI / 4;
const PITCH = Math.PI / 6;

/** How much clear space is left around the model, as a share of its size. */
const BREATHING_ROOM = 1.12;

/** Kept away from nothing at all, for a model with a single voxel in it. */
const NEAREST = 0.6;

/**
 * How far the furthest drawn voxel sits from the middle of the model, in the
 * same units the marcher works in — where the model's longest side is one.
 */
function reachOf(voxels: Uint8Array, dimensions: Dimensions3D, normalized: Dimensions3D): number {
  const { width, height, depth } = dimensions;
  let furthest = 0;

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (voxels[((z * width * height + y * width + x) << 2) + 3] === 0) {
          continue;
        }

        // The far corner of the voxel rather than its middle, so the one at the
        // edge of the model is inside the picture and not half out of it.
        const px = (Math.abs(x + 0.5 - width / 2) + 0.5) * (normalized.width / width);
        const py = (Math.abs(y + 0.5 - height / 2) + 0.5) * (normalized.height / height);
        const pz = (Math.abs(z + 0.5 - depth / 2) + 0.5) * (normalized.depth / depth);

        furthest = Math.max(furthest, Math.hypot(px, py, pz));
      }
    }
  }

  return furthest;
}

/** The palette as the marcher wants it: one row of texels, red green blue alpha. */
function paletteTexels(palette: RGBA[]): Uint8Array {
  const data = new Uint8Array(palette.length * 4);

  palette.forEach(({ r, g, b, a }, index) => {
    const offset = index << 2;
    data[offset + 0] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = a;
  });

  return data;
}

/**
 * Spreads the colour of drawn pixels outwards into the transparent ones around
 * them, leaving the transparency alone.
 *
 * Nothing sees this directly — every one of those pixels is invisible. It shows
 * when the picture is scaled: shrinking it blends each pixel with its
 * neighbours, and a neighbour that is transparent *black* drags a dark fringe
 * around everything. Giving those pixels the colour of what is beside them
 * means the blend has nothing dark to find.
 */
function bleedColourOutwards(pixels: Uint8Array, width: number, height: number): void {
  const source = pixels.slice();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) << 2;

      if (source[offset + 3] !== 0) {
        continue;
      }

      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;

        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          continue;
        }

        const neighbour = (ny * width + nx) << 2;

        if (source[neighbour + 3] !== 0) {
          pixels[offset + 0] = source[neighbour + 0];
          pixels[offset + 1] = source[neighbour + 1];
          pixels[offset + 2] = source[neighbour + 2];
          break;
        }
      }
    }
  }
}

/** The picture of `sides` as the bytes of a png, drawn in `palette`. */
export function thumbnailFromSides(sides: Sides, palette: RGBA[]): Uint8Array {
  const dimensions: Dimensions3D = {
    width: sides.front.width,
    height: sides.front.height,
    depth: sides.left.width,
  };
  const normalized = Dimensions3D.normalize(dimensions);
  const voxels = solveVoxels(dimensions, sides);

  const worldToModel = Matrix3x3.multiply(
    Matrix3x3.rotationY(-YAW),
    Matrix3x3.rotationX(-PITCH),
    Matrix3x3.create(),
  );
  const lightDirection = Matrix3x3.transform(worldToModel, LIGHT_DIR, Vector3D.create());

  // How far back to stand. The marcher builds its rays through a pinhole of
  // focal length two, so at distance d it sees d/2 either side of the middle:
  // standing at twice the model's own reach frames it exactly, and a little
  // more leaves an edge around it.
  //
  // The reach is measured over the voxels that were actually drawn rather than
  // over the box they sit in. A model rarely fills its box, and framing the box
  // would leave the model a speck in the middle of a lot of nothing.
  const radius = Math.max(NEAREST, 2 * reachOf(voxels, dimensions, normalized) * BREATHING_ROOM);

  const uniforms = {
    [shaders.uResolution]: [SIZE, SIZE],
    [shaders.uDimensions]: [normalized.width, normalized.height, normalized.depth],
    [shaders.uVoxelCount]: [dimensions.width, dimensions.height, dimensions.depth],
    [shaders.uLightDir]: [lightDirection.x, lightDirection.y, lightDirection.z],
    [shaders.uLightColour]: Array.from(LIGHT_COLOUR),
    [shaders.uAmbientColour]: Array.from(AMBIENT_COLOUR),
    [shaders.uCameraPosition]: [0, 0, radius],
    [shaders.uWorldToModel]: Array.from(worldToModel),
    [shaders.uUnlit]: false,
  };
  const textures = {
    [shaders.uVoxels]: {
      data: voxels,
      width: dimensions.width,
      height: dimensions.height,
      depth: dimensions.depth,
    },
    [shaders.uPalette]: { data: paletteTexels(palette), width: palette.length, height: 1 },
  };

  const pixels = new Uint8Array(SIZE * SIZE * 4);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const colour = voxelRenderer({
        uniforms,
        // The marcher counts up the picture from the bottom, as a shader does.
        varying: { vUv: [(x + 0.5) / SIZE, 1 - (y + 0.5) / SIZE] },
        textures,
      });

      // Nothing along that ray: the picture stays clear there.
      if (colour[3] < 0.5) {
        continue;
      }

      const offset = (y * SIZE + x) << 2;

      for (let channel = 0; channel < 3; channel++) {
        pixels[offset + channel] = Math.max(0, Math.min(255, Math.round(colour[channel] * 255)));
      }

      pixels[offset + 3] = 255;
    }
  }

  bleedColourOutwards(pixels, SIZE, SIZE);

  return encode({ width: SIZE, height: SIZE, data: pixels, channels: 4, depth: 8 });
}
