import { createEffect, createMemo, createSignal, untrack } from "solid-js";
import { Command } from "./Command";
import { load, save, saveToIndexedDB } from "./load-save";
import { resizeSides } from "./resize-sides";
import type {
  Coordinates,
  DimensionEnds,
  Dimensions2D,
  Dimensions3D,
  RGBA,
  Sides,
  Vector2D,
} from "./types";
import { UndoRedoManager } from "./undo-redo";
import { areRGBAsEqual, createEnqueue, findCollidingSide } from "./utils";
import { solveVoxels } from "./voxel-solver";

const INITIAL_DIMENSIONS = { width: 3, height: 5, depth: 4 };

const PADDING = 6;

/**
 * Where each panel sits on the editor canvas: the four side panels form a
 * horizontal band around the front panel, with top and bottom above and below
 * it. Pure in its dimensions so a resize can ask where a panel would end up.
 */
export const computeCoordinates = ({ width, height, depth }: Dimensions3D): Coordinates => ({
  front: { x: 0, y: 0 },
  left: { x: -(depth + PADDING), y: 0 },
  right: { x: width + PADDING, y: 0 },
  back: { x: width + depth + PADDING * 2, y: 0 },
  top: { x: 0, y: -(depth + PADDING) },
  bottom: { x: 0, y: height + PADDING },
});

export interface StackerStore {
  dimensions: Dimensions3D;
  sides: Sides;
  voxels: Uint8Array;
  render: () => void;
}

export interface ResizeOptions {
  dimensions: Dimensions3D;
  growEnds: DimensionEnds;
  /**
   * The state the new panels are derived from, defaulting to the current model.
   * A drag passes the state it started with so that every step re-derives from
   * the same pixels instead of stacking crop on top of crop.
   */
  from?: { sides: Sides; dimensions: Dimensions3D };
}

const createInitialImageData = (
  dimensions: Dimensions2D | number,
  padding: Vector2D | number,
): ImageData => {
  dimensions =
    typeof dimensions === "number" ? { width: dimensions, height: dimensions } : dimensions;
  padding = typeof padding === "number" ? { x: padding, y: padding } : padding;

  const data = new ImageData(dimensions.width, dimensions.height);

  for (let y = 0; y < dimensions.height - padding.y * 2; y++) {
    for (let x = 0; x < dimensions.width - padding.x * 2; x++) {
      const i = ((padding.y + y) * dimensions.width + (padding.x + x)) << 2;

      data.data[i + 0] = 0;
      data.data[i + 1] = 0;
      data.data[i + 2] = 255;
      data.data[i + 3] = 255;
    }
  }
  return data;
};

export const createInitialSides = (dimensions: Dimensions3D) => {
  return {
    front: createInitialImageData({ width: dimensions.width, height: dimensions.height }, 1),
    back: createInitialImageData({ width: dimensions.width, height: dimensions.height }, 1),
    left: createInitialImageData({ width: dimensions.depth, height: dimensions.height }, 1),
    right: createInitialImageData({ width: dimensions.depth, height: dimensions.height }, 1),
    top: createInitialImageData({ width: dimensions.width, height: dimensions.depth }, 1),
    bottom: createInitialImageData({ width: dimensions.width, height: dimensions.depth }, 1),
  };
};

export function createStacker() {
  const undoRedoManager = new UndoRedoManager(command => doCommandAndUpdate(command));
  const enqueue = createEnqueue<Command>();
  const renderSet = new Set<() => void>();

  const [sides, setSides] = createSignal<Sides>(createInitialSides(INITIAL_DIMENSIONS));
  const dimensions = createMemo<Dimensions3D>(() => ({
    width: sides().front.width,
    height: sides().front.height,
    depth: sides().left.width,
  }));

  const [voxels, setVoxels] = createSignal(
    solveVoxels({ sides: sides(), dimensions: dimensions() }),
  );

  const store = {
    get dimensions() {
      return dimensions();
    },
    get sides() {
      return sides();
    },
    get voxels() {
      return voxels();
    },
  };

  const coordinates = createMemo(() => computeCoordinates(store.dimensions));

  const requestAutoSave = (() => {
    let aboutToSave = false;
    let saving = false;
    let trySaveAgain = false;
    return () => {
      if (aboutToSave) {
        return;
      }
      if (saving) {
        trySaveAgain = true;
        return;
      }
      aboutToSave = true;
      setTimeout(() => {
        aboutToSave = false;
        saving = true;
        (async () => {
          do {
            trySaveAgain = false;
            let { undoStack, redoStack } = undoRedoManager.getStacks();
            await saveToIndexedDB({
              sides: store.sides,
              undoStack,
              redoStack,
            });
          } while (trySaveAgain);
          saving = false;
        })();
      }, 1000);
    };
  })();

  function updateVoxels() {
    setVoxels(solveVoxels(store));
  }

  function snapshot(): Command {
    let command = (async () => {
      let data = await save(store.sides);
      return Command.loadData(data);
    })();
    return Command.async(command);
  }

  const getOffset = (side: ImageData, origin: Vector2D, position: Vector2D) => {
    const localX = position.x - origin.x;
    const localY = position.y - origin.y;
    const offset = (localY * side.width + localX) << 2;
    return offset;
  };

  function getColor(side: ImageData, offset: number): RGBA {
    const r = side.data[offset + 0];
    const g = side.data[offset + 1];
    const b = side.data[offset + 2];
    const a = side.data[offset + 3];
    return { r, g, b, a };
  }

  const doCommandAndUpdate = (command: Command) => {
    return Command.async(
      enqueue(async () => {
        const result = await doCommand(command);

        if (result.type !== "NoOperation") {
          requestRender();
          updateVoxels();
        }

        return result;
      }),
    );
  };

  const doCommand = async (effect: Command): Promise<Command> => {
    queueMicrotask(() => requestAutoSave());

    return untrack(async () => {
      switch (effect.type) {
        case "NoOperation": {
          return Command.noOperation();
        }
        case "Sequence": {
          let commands = effect.commands;
          let reverseCommands = Array(commands.length);
          for (let i = 0; i < commands.length; ++i) {
            reverseCommands[reverseCommands.length - 1 - i] = await doCommand(commands[i]);
          }
          return Command.sequence(reverseCommands);
        }
        case "FillPixel": {
          const result = findCollidingSide(effect, store.sides, coordinates());

          if (!result) {
            return Command.noOperation();
          }

          const { x, y, colour } = effect;
          const { coordinate: origin, side } = result;
          const { r, g, b, a } = colour;

          const offset = getOffset(side, origin, { x, y });
          const oldColour = getColor(side, offset);

          if (areRGBAsEqual(colour, oldColour)) {
            return Command.noOperation();
          }

          side.data[offset + 0] = r;
          side.data[offset + 1] = g;
          side.data[offset + 2] = b;
          side.data[offset + 3] = a;

          const stack: number[] = [];
          stack.push(y);
          stack.push(x);

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

            for (let neighbor of neighbors) {
              if (neighbor.x - origin.x < 0 || neighbor.x - origin.x >= side.width) {
                continue;
              }

              if (neighbor.y - origin.y < 0 || neighbor.y - origin.y >= side.height) {
                continue;
              }

              let neighborOffset = getOffset(side, origin, neighbor);
              let neighborColour = getColor(side, neighborOffset);
              let match = areRGBAsEqual(neighborColour, oldColour);
              if (match) {
                side.data[neighborOffset + 0] = r;
                side.data[neighborOffset + 1] = g;
                side.data[neighborOffset + 2] = b;
                side.data[neighborOffset + 3] = a;
                stack.push(neighbor.y);
                stack.push(neighbor.x);
              }
            }
          }

          return undo;
        }
        case "WritePixel": {
          const result = findCollidingSide(effect, store.sides, coordinates());

          if (!result) {
            return Command.noOperation();
          }

          const { x, y, colour } = effect;
          const { coordinate, side } = result;

          const localX = x - coordinate.x;
          const localY = y - coordinate.y;
          const offset = (localY * side.width + localX) << 2;
          const oldColour = getColor(side, offset);
          side.data[offset + 0] = colour.r;
          side.data[offset + 1] = colour.g;
          side.data[offset + 2] = colour.b;
          side.data[offset + 3] = 255;

          if (oldColour.a) {
            return Command.writePixel(x, y, oldColour);
          } else {
            return Command.erasePixel(x, y);
          }
        }
        case "ErasePixel": {
          const { x, y } = effect;

          const result = findCollidingSide(effect, store.sides, coordinates());
          if (!result) {
            return Command.noOperation();
          }

          const { coordinate, side } = result;

          const localX = x - coordinate.x;
          const localY = y - coordinate.y;
          const offset = (localY * side.width + localX) << 2;
          if (side.data[offset + 3] === 0) {
            return Command.noOperation();
          }
          const old = getColor(side, offset);

          side.data[offset + 0] = 0;
          side.data[offset + 1] = 0;
          side.data[offset + 2] = 0;
          side.data[offset + 3] = 0;
          return Command.writePixel(x, y, old);
        }
        case "LoadData": {
          let undoCommand = snapshot();
          let data = effect.data;
          let sides = await load(data);
          setSides(sides);
          requestRender();
          updateVoxels();
          return undoCommand;
        }
        case "Async": {
          let command = await effect.command;
          return doCommand(command);
        }

        default: {
          const x: never = effect;
          throw new Error(`Unreachable ${x}`);
        }
      }
    });
  };

  function requestRender() {
    renderSet.forEach(render => render());
  }

  createEffect(sides, requestRender);

  return {
    store,
    undoRedoManager,
    updateVoxels,
    coordinates,
    setSides,
    /**
     * Re-frames the model to new dimensions, carrying the drawing over rather
     * than starting the panels afresh.
     */
    resize({
      dimensions: nextDimensions,
      growEnds,
      from = { sides: store.sides, dimensions: store.dimensions },
    }: ResizeOptions) {
      setSides(resizeSides(from.sides, from.dimensions, nextDimensions, growEnds));
      requestAnimationFrame(updateVoxels);
    },
    doCommand(command: Command, pushUndo?: boolean, description?: string): Command {
      let reverseCommand = doCommandAndUpdate(command);

      if (pushUndo) {
        undoRedoManager.pushUndo({
          command: reverseCommand,
          description: description ?? "",
        });
      }

      return reverseCommand;
    },
    /**
     * Constructs an undo command via a snapshot that you can push via
     * `pushUndo` at the end of your opperation.
     */
    snapshot,
    pushUndo(reverseCommand: Command, description: string) {
      undoRedoManager.pushUndo({
        command: reverseCommand,
        description: description ?? "",
      });
    },
    requestRender,
    onRender(callback: () => void) {
      renderSet.add(callback);
      return () => renderSet.delete(callback);
    },
    reset() {
      setSides(createInitialSides(INITIAL_DIMENSIONS));
      updateVoxels();
    },
  };
}
