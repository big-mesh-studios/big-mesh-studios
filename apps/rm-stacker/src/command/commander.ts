import { Accessor, Setter } from "@solidjs/signals";
import { untrack } from "solid-js";
import { load, save } from "../load-save";
import { RGBA } from "../maths";
import { Sides } from "../types";
import { intersectSide } from "../utils";
import { Command } from "./Command";

export function createCommander({
  sides,
  setSides,
  updateVoxels,
  requestRender,
  requestAutoSave,
}: {
  sides: Accessor<Sides>;
  setSides: Setter<Sides>;
  updateVoxels(): void;
  requestRender(): void;
  requestAutoSave(): void;
}) {
  function snapshot(_sides = sides()): Command {
    return Command.async(save(_sides).then(Command.loadData));
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
            reverseCommands[reverseCommands.length - 1 - i] = await doCommand(commands[i]);
          }

          return Command.sequence(reverseCommands);
        }
        case "FillPixel": {
          const { side: kind, position, colour: newColour } = command;
          const side = sides()[kind];

          const intersection = intersectSide({ position, side });

          if (!intersection) {
            return Command.noOperation();
          }

          const { colour: oldColour, offset } = intersection;

          if (!oldColour || RGBA.equals(newColour, oldColour)) {
            return Command.noOperation();
          }

          side.data[offset + 0] = newColour.r;
          side.data[offset + 1] = newColour.g;
          side.data[offset + 2] = newColour.b;
          side.data[offset + 3] = newColour.a;

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

              const match = RGBA.equals(intersection.colour, oldColour);

              if (match) {
                side.data[intersection.offset + 0] = newColour.r;
                side.data[intersection.offset + 1] = newColour.g;
                side.data[intersection.offset + 2] = newColour.b;
                side.data[intersection.offset + 3] = newColour.a;
                // `neighbors` is reused every iteration, so push the coordinates, not the object.
                stack.push(neighbor.y);
                stack.push(neighbor.x);
              }
            }
          }

          return undo;
        }
        case "WritePixel": {
          const { side: kind, position, colour } = command;
          const side = sides()[kind];

          const intersection = intersectSide({ position, side });

          if (!intersection) {
            return Command.noOperation();
          }

          const { colour: oldColour, offset } = intersection;

          side.data[offset + 0] = colour.r;
          side.data[offset + 1] = colour.g;
          side.data[offset + 2] = colour.b;
          side.data[offset + 3] = 255;

          if (oldColour.a) {
            return Command.writePixel(kind, position, oldColour);
          } else {
            return Command.erasePixel(kind, position);
          }
        }
        case "ErasePixel": {
          const { side: kind, position } = command;
          const side = sides()[kind];

          const intersection = intersectSide({ position, side });

          if (!intersection) {
            return Command.noOperation();
          }

          const { colour: oldColour, offset } = intersection;

          if (side.data[offset + 3] === 0) {
            return Command.noOperation();
          }

          side.data[offset + 0] = 0;
          side.data[offset + 1] = 0;
          side.data[offset + 2] = 0;
          side.data[offset + 3] = 0;

          return Command.writePixel(kind, position, oldColour);
        }
        case "LoadData": {
          let undoCommand = snapshot();
          let data = command.data;
          let sides = await load(data);

          setSides(sides);
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
