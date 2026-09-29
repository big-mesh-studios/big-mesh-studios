// Six drawings taken from a box of voxels, by showing what each face would see
// looking along the axis it looks down.
//
// This is the other direction to the solver's: a model is drawn as six faces of a
// box, and a file from elsewhere is a box of voxels. Projecting one onto the other
// loses what six faces cannot hold — a voxel buried behind a neighbour on every
// side, and the difference between two voxels of different colours in one run —
// and `edits.ts` is what puts that back.
//
// A face is not a record of whether the run it looks along is solid, but of what
// its nearest voxel shows. That is what the solver reads a face back as: a voxel's
// front takes the colour of the front drawing at its own cell, whatever stands in
// between, so projecting the nearest voxel along the run is the projection the
// solver already assumes. Taking the furthest, or the first non-empty cell from
// whichever end was nearer, would give a drawing whose re-solved volume is not
// this one.
import { Bitmap, Vector3D } from "@big-mesh-studios/maths";
import {
  axisSides,
  dimensionAxes,
  facingAxis,
  sideAxes,
  sideDirections,
  sideKinds,
  type Sides,
} from "./data";
import { volumeOffset, type Volume } from "./volume";

/**
 * The six drawings a volume is seen as, one per side of the box it fills.
 *
 * Each is drawn the way its own side is drawn, so a drawing and the side it is
 * drawn on belong to each other, and the box they describe is the one the volume
 * fills. A face whose whole run is empty comes back an empty drawing, which is a
 * drawing saying so — it carves that part of the box away — and not a failure to
 * draw.
 */
export const sidesOfVolume = (volume: Volume): Sides => {
  const sides = {} as Sides;

  for (const kind of sideKinds) {
    sides[kind] = projectSide(volume, kind);
  }

  return sides;
};

/** The drawing one side of the box is seen as. */
const projectSide = (volume: Volume, kind: keyof Sides) => {
  const { dimensions, voxels } = volume;
  const [acrossKind, downKind] = sideAxes[kind];
  const [acrossAgainst, downAgainst] = sideDirections[kind];
  const lookingKind = facingAxis[kind];

  const across = dimensionAxes[acrossKind];
  const down = dimensionAxes[downKind];
  const looking = dimensionAxes[lookingKind];

  const acrossLength = dimensions[acrossKind];
  const downLength = dimensions[downKind];
  const lookingLength = dimensions[lookingKind];

  // The side closing the high end of an axis sees it from the high end and walks
  // to the low one; the side closing the low end sees it the other way round.
  // `axisSides` names the high end of each axis as the second of its pair, which
  // is the same thing said already rather than a table of its own.
  const fromHigh = axisSides[lookingKind][1] === kind;
  const first = fromHigh ? lookingLength - 1 : 0;
  const step = fromHigh ? -1 : 1;

  const bitmap = Bitmap.create(acrossLength, downLength);
  const cell = Vector3D.create();

  for (let py = 0; py < downLength; py++) {
    for (let px = 0; px < acrossLength; px++) {
      // The cell of the drawing, on the two axes it spans. A drawing is turned
      // end for end on an axis its side counts against, which is the flip the
      // solver applies when it reads a drawing back the other way.
      cell[across] = acrossAgainst ? acrossLength - 1 - px : px;
      cell[down] = downAgainst ? downLength - 1 - py : py;

      for (let at = 0; at < lookingLength; at++) {
        cell[looking] = first + at * step;

        const index = voxels[volumeOffset(dimensions, cell.x, cell.y, cell.z)];

        if (index !== Bitmap.EMPTY) {
          bitmap.data[py * acrossLength + px] = index;
          break;
        }
      }
    }
  }

  return bitmap;
};
