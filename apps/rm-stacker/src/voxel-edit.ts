// Putting one voxel of a part where a camera in flight is pointing, and what the
// part's edits hold at that cell both before and after.
//
// A voxel a part is made of is either something one of its six drawings says or
// something an edit says instead, and the six drawings and an edit disagree
// about every cell they both have something to say about. Which of the two
// answers a cell takes is settled here, once, so that the command which lands it
// is a plain write with a plain reverse: a command carrying what a cell is to
// *be* could not name what it was *before*, because a cell the drawings already
// answer for is not a single value at all.
import { Bitmap, type Vector3D } from "@big-mesh-studios/maths";
import {
  editFor,
  partDimensions,
  solveVoxels,
  type Part,
} from "@big-mesh-studios/stacker/renderer";
import { volumeContains, volumeOffset } from "@big-mesh-studios/stacker/volume";

/** What a part's edits hold at one cell, and what putting a voxel there takes. */
export interface EditAt {
  /** The value the cell holds now, or `Bitmap.EMPTY` where nothing is held. */
  held: number;
  /** The value it would hold, which is the held one where nothing changes. */
  value: number;
}

/**
 * The value a part's edits hold at `voxel`, and the value they would hold for a
 * voxel there to be `wanted` — which is `Bitmap.EMPTY` for nothing there, or a
 * palette index.
 *
 * `undefined` where the cell is outside the part's own box: a part is drawn in
 * its box and nowhere else, and a voxel beyond it would have to be a part of its
 * own.
 *
 * The six drawings are solved again to answer this, which is the whole cost of
 * it. They are solved for the part on every change the editor makes anyway, and
 * a voxel is placed or taken away at the pace a hand can do it rather than at
 * the pace a frame draws, so the one solve is a cost worth paying for an answer
 * that keeps an edit from outliving the drawing it contradicts.
 */
export const editAt = (
  part: Part,
  voxel: Vector3D,
  wanted: number,
): EditAt | undefined => {
  const { x, y, z } = voxel;
  const dimensions = partDimensions(part);

  if (!volumeContains(dimensions, x, y, z)) {
    return undefined;
  }

  const at = volumeOffset(dimensions, x, y, z);

  return {
    held: part.edits?.voxels[at] ?? Bitmap.EMPTY,
    value: editFor(
      dimensions,
      solveVoxels(dimensions, part.sides, part.sections),
      voxel,
      wanted,
    ),
  };
};
