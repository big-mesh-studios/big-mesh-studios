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
import { Vector3D } from "@big-mesh-studios/maths";
import {
  composeRoot,
  figurePlacement,
  fitVoxelSize,
  solveFigure,
  type Figure,
  type SolvedPart,
} from "@big-mesh-studios/stacker/renderer";
import { renderVoxelImage } from "../voxel-render";

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

/**
 * How near the camera may stand, in voxels. A figure with nothing drawn in it
 * has no reach to measure, and the camera would otherwise be put on the origin.
 */
const NEAREST = 2;

/**
 * How far back the camera stands to frame `figure`, in the voxels the figure is
 * drawn in.
 *
 * The marcher builds its rays through a pinhole of focal length two, so at
 * distance d it sees d/2 either side of the middle: standing at twice the
 * figure's own reach frames it exactly, and a little more leaves an edge around
 * it.
 *
 * The reach is measured over the voxels that were actually drawn rather than
 * over the boxes they sit in. A part rarely fills its box, and framing the
 * boxes would leave the figure a speck in the middle of a lot of nothing.
 *
 * @param solved Each part's volume, in the order `figure.parts` holds them.
 */
export function cameraDistanceFor(
  figure: Figure,
  solved: SolvedPart[],
): number {
  let furthest = 0;

  figure.parts.forEach((part, index) => {
    const { dimensions, voxels } = solved[index];
    const { width, height, depth } = dimensions;
    // Where the part's low corner sits in the figure, which is what turns a
    // voxel's place in its own box into its place in the whole drawing.
    const low = Vector3D.subtract(composeRoot(figure, part), part.pivot);

    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (voxels[((z * width * height + y * width + x) << 2) + 3] === 0) {
            continue;
          }

          // The far corner of the voxel rather than its middle, so the one at
          // the edge of the figure is inside the picture and not half out of it.
          const px = Math.abs(low.x + x + 0.5) + 0.5;
          const py = Math.abs(low.y + y + 0.5) + 0.5;
          const pz = Math.abs(low.z + z + 0.5) + 0.5;

          furthest = Math.max(furthest, Math.hypot(px, py, pz));
        }
      }
    }
  });

  return Math.max(NEAREST, 2 * furthest * BREATHING_ROOM);
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
function bleedColourOutwards(
  pixels: Uint8Array,
  width: number,
  height: number,
): void {
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
 * The picture of `figure` as the bytes of a png, with every part of it in
 * place, or undefined where there is nothing to draw it with.
 */
export function thumbnailFromFigure(figure: Figure): Uint8Array | undefined {
  const solved = solveFigure(figure);
  const { bounds } = figurePlacement(figure);
  const framing = {
    focus: Vector3D.EMPTY,
    voxelSize: fitVoxelSize(bounds.dimensions),
  };

  const pixels = renderVoxelImage({
    figure,
    solved,
    framing,
    size: SIZE,
    yaw: YAW,
    pitch: PITCH,
    radius: cameraDistanceFor(figure, solved) * framing.voxelSize,
  });

  if (pixels === null) {
    return undefined;
  }

  bleedColourOutwards(pixels, SIZE, SIZE);

  return encode({
    width: SIZE,
    height: SIZE,
    data: pixels,
    channels: 4,
    depth: 8,
  });
}
