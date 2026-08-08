import { createMemo, createStore, untrack } from "solid-js";
import * as THREE from "three";
import { Command } from "./Command";
import { load, save, saveToIndexedDB } from "./load-save";
import type { Dimensions2D, Dimensions3D, Sides, Vector2D } from "./types";
import { UndoRedoManager } from "./undo-redo";
import { byteTo2DigitHex, createEnqueue, findCollidingSide } from "./utils";
import { solveVoxels } from "./voxel-solver";

export interface StackerStore {
  dimensions: Dimensions3D;
  sides: Sides;
  voxels: Uint8Array;
  render: () => void;
  // doCommand: (command: Command) => Command;
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
        case "WritePixel": {
          const result = findCollidingSide(effect, store.sides, coordinates());
          if (!result) {
            return Command.noOperation();
          }

          const { x, y, colour } = effect;
          const { coordinate, side } = result;

          const colour2 = new THREE.Color(colour);
          colour2.convertLinearToSRGB();

          const r = Math.max(0, Math.min(255, Math.round(colour2.r * 255.0)));
          const g = Math.max(0, Math.min(255, Math.round(colour2.g * 255.0)));
          const b = Math.max(0, Math.min(255, Math.round(colour2.b * 255.0)));

          const localX = x - coordinate.x;
          const localY = y - coordinate.y;
          const offset = (localY * side.width + localX) << 2;
          let oldR = side.data[offset + 0];
          let oldG = side.data[offset + 1];
          let oldB = side.data[offset + 2];
          let oldA = side.data[offset + 3];
          side.data[offset + 0] = r;
          side.data[offset + 1] = g;
          side.data[offset + 2] = b;
          side.data[offset + 3] = 255;

          if (oldA) {
            let oldColour: THREE.ColorRepresentation = `#${byteTo2DigitHex(oldR)}${byteTo2DigitHex(
              oldG,
            )}${byteTo2DigitHex(oldB)}`;
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
          let oldR = side.data[offset + 0];
          let oldG = side.data[offset + 1];
          let oldB = side.data[offset + 2];
          side.data[offset + 0] = 0;
          side.data[offset + 1] = 0;
          side.data[offset + 2] = 0;
          side.data[offset + 3] = 0;

          let oldColour: THREE.ColorRepresentation = `#${byteTo2DigitHex(oldR)}${byteTo2DigitHex(
            oldG,
          )}${byteTo2DigitHex(oldB)}`;
          return Command.writePixel(x, y, oldColour);
        }
        case "LoadData": {
          let undoCommand = await snapshot();
          let data = await effect.data;
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
