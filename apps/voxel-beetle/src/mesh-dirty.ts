// The cells a change touched, so that the preview knows which of its chunks are
// no longer right.
//
// A model is drawn as geometry, and a change to a voxel is a change to the
// triangles around it. Repacking the whole volume for every stroke — which is
// what the ray-marched preview had to do, since the packed form was what the
// material read — would rebuild geometry that did not move. This says which
// cells changed instead, and the mesher rebuilds the one or two chunks they fall
// in.
//
// The bounds come from the command that reverses a change, which names the same
// cells the change did. Every change this editor makes has one, so a stroke and
// its undo are described by the same box without either having to be read twice.
import type { Vector3D } from "@big-mesh-studios/maths";
import type { CellBounds } from "@big-mesh-studios/stacker/mesh";
import type { Command } from "./command/Command";

/**
 * What a command left different: the box of cells it changed, or the whole model
 * for a change that replaced it. Undefined is a command that changed nothing,
 * which is what a stroke of a colour already there reads as.
 */
export type ChangedCells = { box: CellBounds } | { everything: true };

/**
 * The cells a command changed.
 *
 * A `Sequence` is the shape a stroke arrives in, one command per voxel, and its
 * box is a slab through the model rather than the model — which is the whole
 * difference between re-meshing one chunk and re-meshing all of them.
 */
export const changedCells = (command: Command): ChangedCells | undefined => {
  switch (command.type) {
    case "WriteVoxel":
    case "EraseVoxel":
    case "FillVoxel":
      return { box: { low: command.voxel, high: command.voxel } };
    case "FillBlock":
      return { box: { low: command.min, high: command.max } };
    case "Resize":
    case "LoadVolume":
      // Both replace the box itself, so every chunk of it is a different shape
      // or holds different voxels than it did.
      return { everything: true };
    case "Sequence": {
      let low: Vector3D | undefined;
      let high: Vector3D | undefined;
      let everything = false;
      for (const one of command.commands) {
        const changed = changedCells(one);
        if (changed === undefined) {
          continue;
        }
        if ("everything" in changed) {
          everything = true;
          continue;
        }
        low =
          low === undefined
            ? { ...changed.box.low }
            : {
                x: Math.min(low.x, changed.box.low.x),
                y: Math.min(low.y, changed.box.low.y),
                z: Math.min(low.z, changed.box.low.z),
              };
        high =
          high === undefined
            ? { ...changed.box.high }
            : {
                x: Math.max(high.x, changed.box.high.x),
                y: Math.max(high.y, changed.box.high.y),
                z: Math.max(high.z, changed.box.high.z),
              };
      }
      if (everything) {
        return { everything: true };
      }
      return low === undefined || high === undefined
        ? undefined
        : { box: { low, high } };
    }
    case "NoOperation":
    case "Async":
      return undefined;
  }
};
