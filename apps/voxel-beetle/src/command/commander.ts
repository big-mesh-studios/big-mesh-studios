// Applying a command to a model, and handing back the command that would take
// it back again.
//
// Every command is answered with its own inverse rather than with a copy of the
// model as it was, so that a stroke of a thousand voxels costs a thousand small
// commands to undo rather than a thousand-voxel volume. The commands that
// change the shape of the box rather than its contents are the exception: their
// inverse is the whole box as it was, which is a `.cvox` file, and a file of
// this shape is small enough for that to be cheap.
import {
  Bitmap,
  type RGBA,
  type Vector3D,
  Vector3D as V3,
} from "@big-mesh-studios/maths";
import {
  readVoxel,
  resizeVolume,
  volumeContains,
  writeVoxel,
  type Plane,
  type Volume,
} from "@big-mesh-studios/stacker/volume";
import { readModel, writeModel } from "../cvox-io";
import { Command, type Alignment } from "./Command";
import type { Accessor } from "solid-js";

export interface CommanderParams {
  volume: Accessor<Volume>;
  setVolume: (volume: Volume) => void;
  palette: Accessor<RGBA[]>;
  setPalette: (palette: RGBA[]) => void;
  requestRender(): void;
  requestAutoSave(): void;
}

export interface Commander {
  /** Every voxel as it stands, as the reverse of a change to all of them. */
  snapshot(): Command;
  doCommand(command: Command): Promise<Command>;
}

type Result = { type: "NoOperation" } | { type: "Done"; reverse: Command };

const done = (reverse: Command): Result => ({ type: "Done", reverse });
const nothing: Result = { type: "NoOperation" };

/** The four neighbours of a voxel, in the box's own axes. */
const neighbours = (voxel: Vector3D) =>
  [
    { x: voxel.x + 1, y: voxel.y, z: voxel.z },
    { x: voxel.x - 1, y: voxel.y, z: voxel.z },
    { x: voxel.x, y: voxel.y + 1, z: voxel.z },
    { x: voxel.x, y: voxel.y - 1, z: voxel.z },
    { x: voxel.x, y: voxel.y, z: voxel.z + 1 },
    { x: voxel.x, y: voxel.y, z: voxel.z - 1 },
  ] satisfies Vector3D[];

export function createCommander({
  volume,
  setVolume,
  palette,
  setPalette,
  requestRender,
  requestAutoSave,
}: CommanderParams): Commander {
  const snapshot = (): Command =>
    Command.loadVolume(writeModel(volume(), palette()).buffer as ArrayBuffer);

  /**
   * The cells of a plane that are joined to `voxel` by an unbroken run of
   * voxels of one value, and the reverse of filling them.
   *
   * The run is walked within the plane and not through the box: a fill is a
   * thing done to the slice in front of you, and a fill that reached through
   * the model would quietly repaint a shape on the far side of it that is not
   * on screen to be seen happening.
   */
  function floodPlane(
    current: Volume,
    paletteIndex: number,
    voxel: Vector3D,
    plane: Plane,
  ) {
    const { dimensions } = current;
    const at = (x: number, y: number, z: number) =>
      volumeContains(dimensions, x, y, z) &&
      readVoxel(current, x, y, z) === paletteIndex;

    if (!at(voxel.x, voxel.y, voxel.z)) {
      return [];
    }

    const found: Vector3D[] = [];
    const seen = new Set<string>();
    const queue: Vector3D[] = [V3.create(voxel.x, voxel.y, voxel.z)];

    while (queue.length > 0) {
      const next = queue.pop()!;
      const key = `${next.x},${next.y},${next.z}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      found.push(next);

      // A plane fixes one axis, so the run spreads over the other two only.
      for (const { x, y, z } of neighbours(next)) {
        const inside =
          plane === "xy"
            ? z === voxel.z
            : plane === "yz"
              ? x === voxel.x
              : y === voxel.y;
        if (inside && at(x, y, z)) {
          queue.push(V3.create(x, y, z));
        }
      }
    }

    return found;
  }

  async function apply(command: Command): Promise<Result> {
    switch (command.type) {
      case "NoOperation":
        return nothing;

      case "Async":
        return apply(await command.command);

      case "Sequence": {
        const reverses: Command[] = [];
        for (const one of command.commands) {
          const result = await apply(one);
          if (result.type === "Done") {
            // Reverses are applied last-first, so a sequence of writes to the
            // same voxel is taken back in the order it was made.
            reverses.unshift(result.reverse);
          }
        }
        return reverses.length === 0
          ? nothing
          : done(
              reverses.length === 1 ? reverses[0] : Command.sequence(reverses),
            );
      }

      case "WriteVoxel": {
        if (
          !volumeContains(
            volume().dimensions,
            command.voxel.x,
            command.voxel.y,
            command.voxel.z,
          )
        ) {
          return nothing;
        }
        const was = readVoxel(
          volume(),
          command.voxel.x,
          command.voxel.y,
          command.voxel.z,
        );
        if (was === command.paletteIndex) {
          return nothing;
        }
        writeVoxel(
          volume(),
          command.voxel.x,
          command.voxel.y,
          command.voxel.z,
          command.paletteIndex,
        );
        return was === Bitmap.EMPTY
          ? done(Command.eraseVoxel(command.voxel))
          : done(Command.writeVoxel(command.voxel, was));
      }

      case "EraseVoxel": {
        if (
          !volumeContains(
            volume().dimensions,
            command.voxel.x,
            command.voxel.y,
            command.voxel.z,
          )
        ) {
          return nothing;
        }
        const was = readVoxel(
          volume(),
          command.voxel.x,
          command.voxel.y,
          command.voxel.z,
        );
        if (was === Bitmap.EMPTY) {
          return nothing;
        }
        writeVoxel(
          volume(),
          command.voxel.x,
          command.voxel.y,
          command.voxel.z,
          Bitmap.EMPTY,
        );
        return done(Command.writeVoxel(command.voxel, was));
      }

      case "FillVoxel": {
        const { dimensions } = volume();
        if (
          !volumeContains(
            dimensions,
            command.voxel.x,
            command.voxel.y,
            command.voxel.z,
          )
        ) {
          return nothing;
        }
        // Every cell of the run held the one value the seed did, so the value
        // to put back is the one the seed was read as, read before anything is
        // written rather than after.
        const was = readVoxel(
          volume(),
          command.voxel.x,
          command.voxel.y,
          command.voxel.z,
        );
        const run = floodPlane(volume(), was, command.voxel, command.plane);
        if (run.length === 0) {
          return nothing;
        }
        for (const cell of run) {
          writeVoxel(volume(), cell.x, cell.y, cell.z, command.paletteIndex);
        }
        const reverses = run.map((cell) =>
          was === Bitmap.EMPTY
            ? Command.eraseVoxel(cell)
            : Command.writeVoxel(cell, was),
        );
        return done(
          reverses.length === 1 ? reverses[0] : Command.sequence(reverses),
        );
      }

      case "FillBlock": {
        const { dimensions } = volume();
        const written: Command[] = [];
        for (let z = command.min.z; z <= command.max.z; z++) {
          for (let y = command.min.y; y <= command.max.y; y++) {
            for (let x = command.min.x; x <= command.max.x; x++) {
              if (!volumeContains(dimensions, x, y, z)) {
                continue;
              }
              const was = readVoxel(volume(), x, y, z);
              if (was === command.paletteIndex) {
                continue;
              }
              writeVoxel(volume(), x, y, z, command.paletteIndex);
              written.push(
                was === Bitmap.EMPTY
                  ? Command.eraseVoxel({ x, y, z })
                  : Command.writeVoxel({ x, y, z }, was),
              );
            }
          }
        }
        return written.length === 0
          ? nothing
          : done(written.length === 1 ? written[0] : Command.sequence(written));
      }

      case "Resize": {
        const from = volume();
        const resized = resizeVolume(
          from,
          {
            width: command.dimensions.x,
            height: command.dimensions.y,
            depth: command.dimensions.z,
          },
          renameAlignment(command.alignment),
        );
        setVolume(resized);
        return done(
          Command.loadVolume(writeModel(from, palette()).buffer as ArrayBuffer),
        );
      }

      case "LoadVolume": {
        // Taken down before anything is replaced, rather than read back out
        // afterwards: a setter's value does not reach a read until the next
        // microtask, so the model as it stands now is the only one to hand back.
        const from = volume();
        const fromPalette = palette();
        const { volume: loaded, palette: loadedPalette } = readModel(
          new Uint8Array(command.data),
        );
        setPalette(loadedPalette);
        setVolume(loaded);
        return done(
          Command.loadVolume(
            writeModel(from, fromPalette).buffer as ArrayBuffer,
          ),
        );
      }
    }
  }

  return {
    snapshot,

    doCommand: async (command: Command): Promise<Command> => {
      const result = await apply(command);
      if (result.type === "NoOperation") {
        return Command.noOperation();
      }
      requestRender();
      requestAutoSave();
      return result.reverse;
    },
  };
}

const renameAlignment = (
  alignment: Alignment,
): Partial<Record<"width" | "height" | "depth", "min" | "max">> => {
  const renamed: Partial<Record<"width" | "height" | "depth", "min" | "max">> =
    {};
  if (alignment.x !== undefined) {
    renamed.width = alignment.x;
  }
  if (alignment.y !== undefined) {
    renamed.height = alignment.y;
  }
  if (alignment.z !== undefined) {
    renamed.depth = alignment.z;
  }
  return renamed;
};
