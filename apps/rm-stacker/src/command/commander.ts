import { Accessor, Setter } from "@solidjs/signals";
import { untrack } from "solid-js";
import { load, save } from "../load-save";
import { Bitmap, RGBA } from "../maths";
import { Sides } from "../types";
import { intersectSide } from "../utils/utils";
import { Command } from "./Command";

export function createCommander({
  sides,
  setSides,
  updateVoxels,
  requestRender,
  requestAutoSave,
  palette,
  setPalette,
}: {
  sides: Accessor<Sides>;
  setSides: Setter<Sides>;
  setPalette: Setter<RGBA[]>;
  updateVoxels(): void;
  requestRender(): void;
  requestAutoSave(): void;
  palette: Accessor<RGBA[]>;
}) {
  function snapshot(_sides = sides()): Command {
    return Command.async(save(_sides, palette()).then(Command.loadData));
  }

  async function doCommand(command: Command): Promise<Command> {
    queueMicrotask(() => requestAutoSave());

    return untrack(async () => {
      switch (command.type) {
        case "NoOperation": {
          return Command.noOperation();
        }
        case "Sequence": {
          let commands = command.commands;
          let reverseCommands = Array(commands.length);

          for (let i = 0; i < commands.length; ++i) {
            reverseCommands[reverseCommands.length - 1 - i] = await doCommand(
              commands[i],
            );
          }

          return Command.sequence(reverseCommands);
        }
        case "FillPixel": {
          const { side: kind, position, paletteIndex } = command;
          const side = sides()[kind];

          const intersection = intersectSide({ position, side });

          if (!intersection) {
            return Command.noOperation();
          }

          const { index: oldIndex, offset } = intersection;

          if (oldIndex === paletteIndex) {
            return Command.noOperation();
          }

          side.data[offset] = paletteIndex;

          const stack: number[] = [];
          stack.push(position.y);
          stack.push(position.x);

          const undo = snapshot();

          // preallocated to lower GC-pressue
          let neighbors: { x: number; y: number }[] = [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
          ];

          while (true) {
            const x = stack.pop();
            const y = stack.pop();

            if (x === undefined || y === undefined) {
              break;
            }

            // top
            neighbors[0].x = x;
            neighbors[0].y = y - 1;
            // bottom
            neighbors[1].x = x;
            neighbors[1].y = y + 1;
            // left
            neighbors[2].x = x - 1;
            neighbors[2].y = y;
            // right
            neighbors[3].x = x + 1;
            neighbors[3].y = y;

            for (const neighbor of neighbors) {
              const intersection = intersectSide({ position: neighbor, side });

              // Neighbour lies outside this side: skip it, the rest of the region still fills.
              if (!intersection) {
                continue;
              }

              if (intersection.index === oldIndex) {
                side.data[intersection.offset] = paletteIndex;
                // `neighbors` is reused every iteration, so push the coordinates, not the object.
                stack.push(neighbor.y);
                stack.push(neighbor.x);
              }
            }
          }

          return undo;
        }
        case "FillRectangle": {
          const { side: kind, min, max, paletteIndex } = command;
          const side = sides()[kind];

          const _snapshot = snapshot(sides());

          for (let x = min.x; x <= max.x; x++) {
            for (let y = min.y; y <= max.y; y++) {
              Bitmap.set(side, x, y, paletteIndex);
            }
          }

          return _snapshot;
        }
        case "WritePixel": {
          const { side: kind, position, paletteIndex } = command;
          const side = sides()[kind];

          const intersection = intersectSide({ position, side });

          if (!intersection) {
            return Command.noOperation();
          }

          const { index: oldIndex, offset } = intersection;

          side.data[offset] = paletteIndex;

          return oldIndex === Bitmap.EMPTY
            ? Command.erasePixel(kind, position)
            : Command.writePixel(kind, position, oldIndex);
        }

        case "ErasePixel": {
          const { side: kind, position } = command;
          const side = sides()[kind];

          const intersection = intersectSide({ position, side });

          if (!intersection) {
            return Command.noOperation();
          }

          const { index: oldIndex, offset } = intersection;

          if (oldIndex === Bitmap.EMPTY) {
            return Command.noOperation();
          }

          side.data[offset] = Bitmap.EMPTY;

          return Command.writePixel(kind, position, oldIndex);
        }
        case "LoadData": {
          const undoCommand = snapshot();
          const loaded = await load(command.data, palette());

          setPalette(loaded.palette);
          setSides(loaded.sides);
          updateVoxels();
          requestRender();

          return undoCommand;
        }
        case "Async": {
          const _command = await command.command;
          return doCommand(_command);
        }

        default: {
          const x: never = command;
          throw new Error(`Unreachable ${x}`);
        }
      }
    });
  }

  return {
    snapshot,
    doCommand,
  };
}
