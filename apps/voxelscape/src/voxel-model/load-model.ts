// A model saved by rm-stacker, read by rm-stacker's own reader: a zip of six
// side PNGs drawn in palette indices, plus the palette they address. The
// editor publishes that reader as a package, so the two programs agree on what
// a model file is by construction rather than by two implementations of the
// same format staying in step.
//
// What is left here is the shape the rest of this world wants a model in.
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
  const { sides, palette, dimensions } = await load(file);
  return { sides, palette, dimensions };
}
