// A model saved by rm-stacker, read by rm-stacker's own reader: a zip of six
// side PNGs drawn in palette indices, plus the palette they address. The
// editor publishes that reader as a package, so the two programs agree on what
// a model file is by construction rather than by two implementations of the
// same format staying in step.
//
// What is left here is what drawing a model needs and a drawing program has no
// reason to hand back: the model's extent in voxels.
import { load } from "@big-mesh-studios/stacker/format";
import type { Sides } from "@big-mesh-studios/stacker/renderer";
import type { Dimensions3D, RGBA } from "@big-mesh-studios/maths";

export type LoadedModel = {
  sides: Sides;
  palette: RGBA[];
  dimensions: Dimensions3D;
};

/**
 * Reads a model zip and hands back the six side bitmaps, the palette (the
 * model's own, or the colours its images use), and the model's grid in voxels.
 * Throws with a readable message when the file is not a model rm-stacker
 * wrote.
 */
export async function loadModel(file: Blob): Promise<LoadedModel> {
  const { sides, palette } = await load(file);
  return {
    sides,
    palette,
    // The six sides are the faces of one box, so between them they give all
    // three of its extents: the front is drawn width across and height down,
    // and the left is drawn depth across. A model is not required to be a cube
    // and its sides are not required to be square.
    dimensions: {
      width: sides.front.width,
      height: sides.front.height,
      depth: sides.left.width,
    },
  };
}
