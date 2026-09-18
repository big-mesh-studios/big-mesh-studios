// Turning a loaded voxel figure into the parts a rig hangs off bones: each part
// solved into a volume, and the transform it rests in while unbound.
import {
  figurePlacement,
  solvePart,
  type Figure,
  type Part,
  type SolvedPart,
} from "@big-mesh-studios/stacker/renderer";
import type { Transform } from "../skeleton/transform";
import { quaternionFromMatrix3 } from "../skeleton/transform";

/** One part of a voxel figure, ready to be bound to a bone. */
export interface VoxelPart {
  name: string;
  part: Part;
  solved: SolvedPart;
  /** Where the part stands at rest, in the rig's voxel space. */
  anchor: Transform;
}

/**
 * Every part of `figure`, solved and resting where the figure places it. The
 * placements already carry each part's hierarchy, so a part drawn hanging off
 * another still comes back with the transform it should rest in.
 */
export function figureParts(figure: Figure): VoxelPart[] {
  const { placements } = figurePlacement(figure);

  return figure.parts.map((part, index) => {
    const placement = placements[index];
    return {
      name: part.name,
      part,
      solved: solvePart(part),
      anchor: {
        position: placement.position,
        rotation: quaternionFromMatrix3(placement.turn),
        scale: placement.scale,
      },
    };
  });
}
