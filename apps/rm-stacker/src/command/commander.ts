import { Accessor, Setter } from "@solidjs/signals";
import { untrack } from "solid-js";
import { loadFigure, saveFigure } from "@big-mesh-studios/stacker/format";
import { Bitmap, RGBA, Vector3D } from "@big-mesh-studios/maths";
import {
  keyAt,
  panelBitmap,
  withKey,
  withoutKey,
  type Motion,
  type PanelKind,
  type Part,
} from "@big-mesh-studios/stacker/renderer";
import { intersectSide } from "../utils/utils";
import { Command } from "./Command";

export function createCommander({
  parts,
  setParts,
  motion,
  setMotion,
  updateVoxels,
  requestRender,
  requestAutoSave,
  palette,
  setPalette,
}: {
  parts: Accessor<Part[]>;
  setParts: Setter<Part[]>;
  motion: Accessor<Motion>;
  setMotion: Setter<Motion>;
  setPalette: Setter<RGBA[]>;
  updateVoxels(): void;
  requestRender(): void;
  requestAutoSave(): void;
  palette: Accessor<RGBA[]>;
}) {
  function snapshot(_parts = parts()): Command {
    return Command.async(
      saveFigure({ parts: _parts, palette: palette() }).then(Command.loadData),
    );
  }

  /**
   * The drawing a command lands on: the panel of that name on the part of that
   * name, or undefined when the figure no longer holds either.
   *
   * A command names the part it was made against, and that part can have been
   * deleted since — by an undo reaching back past the point it was added, say —
   * or have lost the cut whose face was drawn on, so every command that draws
   * checks before it draws.
   */
  function panelOf(name: string, panel: PanelKind): Bitmap | undefined {
    const part = parts().find((part) => part.name === name);
    return part === undefined ? undefined : panelBitmap(part, panel);
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
          const {
            part: partName,
            panel: kind,
            position,
            paletteIndex,
          } = command;
          const side = panelOf(partName, kind);

          if (side === undefined) {
            return Command.noOperation();
          }

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
          const {
            part: partName,
            panel: kind,
            min,
            max,
            paletteIndex,
            onlyWhereEmpty,
          } = command;
          const side = panelOf(partName, kind);

          if (side === undefined) {
            return Command.noOperation();
          }

          const _snapshot = snapshot(parts());

          for (let x = min.x; x <= max.x; x++) {
            for (let y = min.y; y <= max.y; y++) {
              if (onlyWhereEmpty && !Bitmap.isEmpty(side, x, y)) {
                continue;
              }

              Bitmap.set(side, x, y, paletteIndex);
            }
          }

          return _snapshot;
        }
        case "WritePixel": {
          const {
            part: partName,
            panel: kind,
            position,
            paletteIndex,
          } = command;
          const side = panelOf(partName, kind);

          if (side === undefined) {
            return Command.noOperation();
          }

          const intersection = intersectSide({ position, side });

          if (!intersection) {
            return Command.noOperation();
          }

          const { index: oldIndex, offset } = intersection;

          side.data[offset] = paletteIndex;

          return oldIndex === Bitmap.EMPTY
            ? Command.erasePixel(partName, kind, position)
            : Command.writePixel(partName, kind, position, oldIndex);
        }

        case "ErasePixel": {
          const { part: partName, panel: kind, position } = command;
          const side = panelOf(partName, kind);

          if (side === undefined) {
            return Command.noOperation();
          }

          const intersection = intersectSide({ position, side });

          if (!intersection) {
            return Command.noOperation();
          }

          const { index: oldIndex, offset } = intersection;

          if (oldIndex === Bitmap.EMPTY) {
            return Command.noOperation();
          }

          side.data[offset] = Bitmap.EMPTY;

          return Command.writePixel(partName, kind, position, oldIndex);
        }
        case "KeyPart": {
          const { part: partName, at, key } = command;
          const standing = keyAt(motion(), partName, at);
          const next =
            key === null
              ? withoutKey(motion(), partName, at)
              : withKey(motion(), partName, key);

          // A motion hands itself back where nothing stood at that frame, and
          // where the key asked for is the one the part starts in that a later
          // key holds in place.
          if (next === motion()) {
            return Command.noOperation();
          }

          setMotion(next);

          // Whatever stood at that frame before, so that taking the key back
          // puts it there again — and takes the key away where there was none.
          return Command.keyPart(partName, at, standing ?? null);
        }
        case "MovePart": {
          const { part: partName, root } = command;
          const moved = parts().find((part) => part.name === partName);

          if (moved === undefined) {
            return Command.noOperation();
          }

          if (Vector3D.equals(moved.root, root)) {
            return Command.noOperation();
          }

          const previousRoot = moved.root;

          setParts((current) =>
            current.map((part) =>
              part.name === partName ? { ...part, root } : part,
            ),
          );

          return Command.movePart(partName, previousRoot);
        }
        case "TurnPart": {
          const { part: partName, turn } = command;
          const turned = parts().find((part) => part.name === partName);

          if (turned === undefined || Vector3D.equals(turned.turn, turn)) {
            return Command.noOperation();
          }

          const previousTurn = turned.turn;

          setParts((current) =>
            current.map((part) =>
              part.name === partName ? { ...part, turn } : part,
            ),
          );

          return Command.turnPart(partName, previousTurn);
        }
        case "ScalePart": {
          const { part: partName, scale } = command;
          const scaled = parts().find((part) => part.name === partName);

          if (scaled === undefined || !(scale > 0) || scaled.scale === scale) {
            return Command.noOperation();
          }

          const previousScale = scaled.scale;

          setParts((current) =>
            current.map((part) =>
              part.name === partName ? { ...part, scale } : part,
            ),
          );

          return Command.scalePart(partName, previousScale);
        }
        case "LoadData": {
          const undoCommand = snapshot();
          const loaded = await loadFigure(command.data, palette());

          setPalette(loaded.palette);
          setParts(loaded.parts);
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
