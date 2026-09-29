import { Accessor, Setter } from "@solidjs/signals";
import { untrack } from "solid-js";
import { loadFigure, saveFigure } from "@big-mesh-studios/stacker/format";
import { Bitmap, RGBA, Vector2D, Vector3D } from "@big-mesh-studios/maths";
import {
  keyAt,
  panelBitmap,
  partDimensions,
  withKey,
  withoutKey,
  type Motion,
  type PanelKind,
  type Part,
} from "@big-mesh-studios/stacker/renderer";
import { createVolume, volumeOffset } from "@big-mesh-studios/stacker/volume";
import { intersectSide } from "../utils/utils";
import { Command } from "./Command";

export function createCommander({
  parts,
  setParts,
  motions,
  setMotions,
  updateVoxels,
  requestRender,
  requestAutoSave,
  palette,
  setPalette,
}: {
  parts: Accessor<Part[]>;
  setParts: Setter<Part[]>;
  motions: Accessor<Motion[]>;
  setMotions: Setter<Motion[]>;
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

  /**
   * The commands putting `painted` back to what each cell held, as one command
   * to run them in turn — or a no-op where a fill changed nothing, so that a
   * stroke over ground already the colour it draws in leaves nothing to undo.
   *
   * Naming the cells rather than the whole figure is what lets a change say
   * which part of the box it drew on: a part's geometry is rebuilt from the
   * cells a command covered, and a whole-figure snapshot covers every part of
   * every figure, which is the whole model to mesh again for one filled region.
   */
  function restored(
    partName: string,
    kind: PanelKind,
    painted: { at: Vector2D; was: number }[],
  ): Command {
    if (painted.length === 0) {
      return Command.noOperation();
    }

    return Command.sequence(
      painted.map(({ at, was }) =>
        was === Bitmap.EMPTY
          ? Command.erasePixel(partName, kind, at)
          : Command.writePixel(partName, kind, at, was),
      ),
    );
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

          // Every cell the flood reaches held the colour it started from, so the
          // whole of it goes back to that one index.
          const painted: { at: Vector2D; was: number }[] = [
            {
              at: { x: Math.floor(position.x), y: Math.floor(position.y) },
              was: oldIndex,
            },
          ];

          const stack: number[] = [];
          stack.push(position.y);
          stack.push(position.x);

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
                painted.push({
                  at: {
                    x: Math.floor(neighbor.x),
                    y: Math.floor(neighbor.y),
                  },
                  was: oldIndex,
                });
                // `neighbors` is reused every iteration, so push the coordinates, not the object.
                stack.push(neighbor.y);
                stack.push(neighbor.x);
              }
            }
          }

          return restored(partName, kind, painted);
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

          const painted: { at: Vector2D; was: number }[] = [];

          for (let x = min.x; x <= max.x; x++) {
            for (let y = min.y; y <= max.y; y++) {
              if (!Bitmap.contains(side, x, y)) {
                continue;
              }

              if (onlyWhereEmpty && !Bitmap.isEmpty(side, x, y)) {
                continue;
              }

              const was = Bitmap.get(side, x, y);

              if (was === paletteIndex) {
                continue;
              }

              Bitmap.set(side, x, y, paletteIndex);
              painted.push({ at: { x, y }, was });
            }
          }

          return restored(partName, kind, painted);
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
        case "EditVoxel": {
          const { part: partName, voxel, value } = command;
          const edited = parts().find((part) => part.name === partName);

          if (edited === undefined) {
            return Command.noOperation();
          }

          const dimensions = partDimensions(edited);

          if (
            voxel.x < 0 ||
            voxel.y < 0 ||
            voxel.z < 0 ||
            voxel.x >= dimensions.width ||
            voxel.y >= dimensions.height ||
            voxel.z >= dimensions.depth
          ) {
            return Command.noOperation();
          }

          const at = volumeOffset(dimensions, voxel.x, voxel.y, voxel.z);
          const held = edited.edits?.voxels[at] ?? Bitmap.EMPTY;

          if (held === value) {
            return Command.noOperation();
          }

          // A part that has never held an edit is given a box to hold them in.
          // The voxels are written into the box it already has rather than a
          // copy of it, but the box and the part are new objects: everything
          // that reads the figure asks its parts what they hold, and a part
          // written into in place would go on answering with what it held
          // before.
          const box = edited.edits ?? createVolume(dimensions);

          box.voxels[at] = value;

          setParts((current) =>
            current.map((part) =>
              part.name === partName ? { ...part, edits: { ...box } } : part,
            ),
          );

          return Command.editVoxel(partName, voxel, held);
        }
        case "KeyPart": {
          const { motion: motionName, part: partName, at, key } = command;
          const standing = motions().find(({ name }) => name === motionName);

          if (standing === undefined) {
            return Command.noOperation();
          }

          const stood = keyAt(standing, partName, at);
          const next =
            key === null
              ? withoutKey(standing, partName, at)
              : withKey(standing, partName, key);

          // A motion hands itself back where nothing stood at that frame, and
          // where the key asked for is the one the part starts in that a later
          // key holds in place.
          if (next === standing) {
            return Command.noOperation();
          }

          setMotions(
            motions().map((held) => (held === standing ? next : held)),
          );

          // Whatever stood at that frame before, so that taking the key back
          // puts it there again — and takes the key away where there was none.
          return Command.keyPart(motionName, partName, at, stood ?? null);
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
