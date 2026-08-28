// A model saved by rm-stacker, read by rm-stacker's own reader: a zip of six
// side PNGs drawn in palette indices, plus the palette they address. The
// editor publishes that reader as a package, so the two programs agree on what
// a model file is by construction rather than by two implementations of the
// same format staying in step.
//
// What is left here is what drawing a model needs and a drawing program has no
// reason to hand back: the model's extent in voxels.
import { load } from "@big-mesh-studios/stacker/format";
import type { Bitmap, Dimensions3D, RGBA } from "@big-mesh-studios/maths";

export const sideKinds = [
  "front",
  "back",
  "left",
  "right",
  "top",
  "bottom",
] as const;
export type SideKind = (typeof sideKinds)[number];

export type LoadedModel = {
  sides: Record<SideKind, Bitmap>;
  palette: RGBA[];
  dimensions: Dimensions3D;
};

/**
 * Reads a model zip and hands back the six side bitmaps, the palette (the
 * model's own, or the colours its images use), and
 * the model's grid dimensions — the sides are square, and the grid is that
 * size in every axis. Throws with a readable message when the file is not a
 * model rm-stacker wrote.
 */
export async function loadModel(file: Blob): Promise<LoadedModel> {
  const { sides, palette } = await load(file);
  const size = sides.front.width;
  return {
    sides,
    palette,
    dimensions: { width: size, height: size, depth: size },
  };
}
