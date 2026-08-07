import { createStore } from "solid-js";
import { solveVoxels } from "./voxel-solver";
import type { Dimensions2D, Dimensions3D, Sides, Vector2D } from "./types";
import { UndoRedoManager } from "./undo-redo";
import { Command } from "./Command";
import { save } from "./load-save";

export interface StackerStore {
  dimensions: Dimensions3D;
  sides: Sides;
  voxels: Uint8Array;
  render: () => void;
  doCommand: (command: Command) => Command;
}

const createInitialImageData = (dimensions: Dimensions2D | number): ImageData => {
  dimensions =
    typeof dimensions === "number" ? { width: dimensions, height: dimensions } : dimensions;

  return new ImageData(dimensions.width, dimensions.height);
};

export const createInitialSides = (dimensions: Dimensions3D) => {
  return {
    front: createInitialImageData({ width: dimensions.width, height: dimensions.height }),
    back: createInitialImageData({ width: dimensions.width, height: dimensions.height }),
    left: createInitialImageData({ width: dimensions.depth, height: dimensions.height }),
    right: createInitialImageData({ width: dimensions.depth, height: dimensions.height }),
    top: createInitialImageData({ width: dimensions.width, height: dimensions.depth }),
    bottom: createInitialImageData({ width: dimensions.width, height: dimensions.depth }),
  };
};

export function createStackerStore() {
  const initialDimensions: Dimensions3D = { width: 32, height: 32, depth: 32 };
  const initialSides: Sides = createInitialSides(initialDimensions);

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
    doCommand: _command => Command.noOperation(),
  });
  let undoRedoManager = new UndoRedoManager(command => store.doCommand(command));

  return {
    store,
    setStore,
    undoRedoManager,
    updateVoxels() {
      setStore(store => {
        store.voxels = solveVoxels(
          store,
          new Uint8Array(
            store.dimensions.width * store.dimensions.height * store.dimensions.depth * 4,
          ),
        );
      });
    },
    doCommand: (command: Command, pushUndo?: boolean, description?: string): Command => {
      let reverseCommand = store.doCommand(command);
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
    snapshot: (): Command => {
      let command = (async () => {
        let data = await save(store.sides);
        return Command.loadData(data);
      })();
      return Command.async(command);
    },
    pushUndo: (reverseCommand: Command, description: string) => {
      undoRedoManager.pushUndo({
        command: reverseCommand,
        description: description ?? "",
      });
    },
  };
}
