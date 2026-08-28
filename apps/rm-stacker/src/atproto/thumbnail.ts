// The small picture a model shows for itself in a listing.
//
// A real rendering of the model, from a raised three-quarter angle, drawn by
// the graphics card exactly as the preview draws it — same material, same
// light, into a canvas attached to nothing.
//
// Deciding where the camera stands is what is left here; drawing is
// `renderVoxelImage`'s job. A browser that cannot draw it gets no picture, and
// a model published without one lists by its name and its extent — though a
// browser that cannot draw this cannot draw the editor either.
import { encode } from "fast-png";
import { Dimensions3D, RGBA } from "../maths";
import type { Sides } from "../types";
import { renderVoxelImage } from "../voxel-render";
import { solveVoxels } from "../voxel-solver";

/**
 * How many pixels across the picture is: the size a card shows it at, so a
 * listing neither scales it up into softness nor down into a blur.
 */
const SIZE = 140;

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
 * How far back the camera stands to frame `voxels`.
 *
 * The marcher builds its rays through a pinhole of focal length two, so at
 * distance d it sees d/2 either side of the middle: standing at twice the
 * model's own reach frames it exactly, and a little more leaves an edge around
 * it.
 *
 * The reach is measured over the voxels that were actually drawn rather than
 * over the box they sit in. A model rarely fills its box, and framing the box
 * would leave the model a speck in the middle of a lot of nothing.
 */
export function cameraDistanceFor(voxels: Uint8Array, dimensions: Dimensions3D): number {
  const normalized = Dimensions3D.normalize(dimensions);
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

  return Math.max(NEAREST, 2 * furthest * BREATHING_ROOM);
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

/**
 * The picture of `sides` as the bytes of a png, drawn in `palette`, or
 * undefined where there is nothing to draw it with.
 */
export function thumbnailFromSides(sides: Sides, palette: RGBA[]): Uint8Array | undefined {
  const dimensions: Dimensions3D = {
    width: sides.front.width,
    height: sides.front.height,
    depth: sides.left.width,
  };
  const voxels = solveVoxels(dimensions, sides);

  const pixels = renderVoxelImage({
    dimensions,
    voxels,
    palette,
    size: SIZE,
    yaw: YAW,
    pitch: PITCH,
    radius: cameraDistanceFor(voxels, dimensions),
  });

  if (pixels === null) {
    return undefined;
  }

  bleedColourOutwards(pixels, SIZE, SIZE);

  return encode({ width: SIZE, height: SIZE, data: pixels, channels: 4, depth: 8 });
}
