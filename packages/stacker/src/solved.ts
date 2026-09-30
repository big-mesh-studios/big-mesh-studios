// A figure's parts as the volumes everything downstream reads: the marcher, the
// mesher, the picker, whatever measures how far a part reaches, and whatever is
// about to be written out as a file.
//
// This is arithmetic over arrays and belongs to no graphics card, so it sits
// apart from the modules that hand a volume to a material and build the group of
// boxes a figure is drawn as. A caller that only wants the shape of a model — a
// command line, a test, a tool that reads nothing and writes a file — reaches
// here rather than through a scene graph.
import type { Dimensions3D } from "@big-mesh-studios/maths";
import { partDimensions, type Figure, type Part } from "./data";
import { applyEdits } from "./edits";
import { solveVoxels } from "./solver";

/** One part's volume as everything downstream reads it, and the box it fills. */
export interface SolvedPart {
  name: string;
  dimensions: Dimensions3D;
  voxels: Uint8Array;
}

/** `part`'s drawings packed into the volume the rest of the pipeline reads. */
export function solvePart(part: Part): SolvedPart {
  const dimensions = partDimensions(part);
  const voxels = solveVoxels(dimensions, part.sides, part.sections);

  // What the six drawings cannot say is said here, once, so that everything
  // reading the packed box reads the model as it is rather than as its drawings
  // describe it.
  if (part.edits !== undefined) {
    applyEdits(voxels, dimensions, part.edits);
  }

  return {
    name: part.name,
    dimensions,
    voxels,
  };
}

/** Every part of `figure`, in the order it holds them. */
export function solveFigure(figure: Figure): SolvedPart[] {
  return figure.parts.map(solvePart);
}
