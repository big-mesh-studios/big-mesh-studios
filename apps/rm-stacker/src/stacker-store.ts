import { createMemo, createStore, untrack } from "solid-js";
import * as THREE from "three";
import { Command } from "./Command";
import { load, save, saveToIndexedDB } from "./load-save";
import type { Dimensions2D, Dimensions3D, RGBA, Sides, Vector2D } from "./types";
import { UndoRedoManager } from "./undo-redo";
import { areColoursEqual, createEnqueue, findCollidingSide } from "./utils";
import { solveVoxels } from "./voxel-solver";

export interface StackerStore {
  dimensions: Dimensions3D;
  sides: Sides;
  voxels: Uint8Array;
  render: () => void;
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

export function createStackerStore() {
  const initialDimensions: Dimensions3D = { width: 3, height: 5, depth: 4 };
  const initialSides: Sides = createInitialSides(initialDimensions);
  const undoRedoManager = new UndoRedoManager(command => doCommandAndUpdate(command));
  const enqueue = createEnqueue<Command>();

  const [store, setStore] = createStore<StackerStore>({
    dimensions: initialDimensions,
    sides: initialSides,
    voxels: solveVoxels(
      { sides: initialSides, dimensions: initialDimensions },
      new Uint8Array(
        initialDimensions.width * initialDimensions.height * initialDimensions.depth * 4,
      ),
    ),
    render: () => {},
  });

  const PADDING = 6;
  const coordinates = createMemo(() => {
    return {
      front: new THREE.Vector2(0.0, 0.0),
      left: new THREE.Vector2(-(store.dimensions.depth + PADDING), 0.0),
      right: new THREE.Vector2(store.dimensions.width + PADDING, 0.0),
      back: new THREE.Vector2(store.dimensions.width + store.dimensions.depth + PADDING * 2, 0.0),
      top: new THREE.Vector2(0.0, -(store.dimensions.depth + PADDING)),
      bottom: new THREE.Vector2(0.0, store.dimensions.height + PADDING),
    };
  });

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
    setStore(store => {
      store.voxels = solveVoxels(
        store,
        new Uint8Array(
          store.dimensions.width * store.dimensions.height * store.dimensions.depth * 4,
        ),
      );
    });
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
          store.render();
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

          const queue = [{ x, y }];
          const visited = new Set();

          const undo = snapshot();

          while (true) {
            const coordinate = queue.shift();

            if (!coordinate) {
              break;
            }

            const { x, y } = coordinate;
            const id = `${x},${y}`;

            const offset = getOffset(side, origin, coordinate);
            visited.add(id);

            side.data[offset + 0] = r;
            side.data[offset + 1] = g;
            side.data[offset + 2] = b;
            side.data[offset + 3] = a;

            const neighbors = [
              // top
              { x, y: y - 1 },
              // bottom
              { x, y: y + 1 },
              // left
              { x: x - 1, y },
              // right
              { x: x + 1, y },
            ];

            for (let neighbor of neighbors) {
              if (neighbor.x - origin.x < 0 || neighbor.x - origin.x > side.width) {
                continue;
              }

              if (neighbor.y - origin.y < 0 || neighbor.y - origin.y > side.height) {
                continue;
              }

              const neighborId = `${neighbor.x},${neighbor.y}`;

              if (visited.has(neighborId)) {
                continue;
              }

              const neighborOffset = getOffset(side, origin, neighbor);
              const neighborColor = getColor(side, neighborOffset);
              const match = areColoursEqual(neighborColor, oldColour);

              if (match) {
                queue.push(neighbor);
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
          setStore(s => {
            s.sides = sides;
          });
          store.render();
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

  return {
    store,
    setStore,
    undoRedoManager,
    updateVoxels,
    coordinates,
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
  };
}
