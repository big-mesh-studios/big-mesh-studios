import { createEffect, createMemo, createSignal, flush } from "solid-js";
import { Command } from "./command/Command";
import { createCommander } from "./command/commander";
import { save, saveToIndexedDB } from "./load-save";
import { Dimensions3D, Vector2D } from "./maths";
import { ResizeOptions, resizeSides } from "./resize-sides";
import type { Dimensions2D, Sides } from "./types";
import { UndoRedoManager } from "./undo-redo";
import { createEnqueue } from "./utils";
import { solveVoxels } from "./voxel-solver";

const INITIAL_DIMENSIONS = { width: 3, height: 5, depth: 4 };

export interface StackerStore {
  dimensions: Dimensions3D;
  sides: Sides;
  voxels: Uint8Array;
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

  const store: StackerStore = {
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
    flush();
    setVoxels(solveVoxels(store));
  }

  function snapshot(sides = store.sides): Command {
    return Command.async(save(sides).then(Command.loadData));
  }

  const doCommand = createCommander({
    store,
    setSides,
    updateVoxels,
    requestRender,
    requestAutoSave,
  });

  function doCommandAndUpdate(command: Command) {
    return Command.async(
      enqueue(async () => {
        const result = await doCommand(command);

        if (result.type !== "NoOperation") {
          updateVoxels();
          requestRender();
        }

        return result;
      }),
    );
  }

  function doCommandAndUndo(command: Command, pushUndo?: boolean, description?: string): Command {
    let reverseCommand = doCommandAndUpdate(command);

    if (pushUndo) {
      undoRedoManager.pushUndo({
        command: reverseCommand,
        description: description ?? "",
      });
    }

    return reverseCommand;
  }

  function requestRender() {
    renderSet.forEach(render => render());
  }

  createEffect(sides, requestRender);

  return {
    store,
    undoRedoManager,
    updateVoxels,
    setSides,
    /**
     * Re-frames the model to new dimensions, carrying the drawing over rather
     * than starting the panels afresh.
     */
    resize(options: ResizeOptions) {
      setSides(resizeSides(options));
      updateVoxels();
      requestRender();
      requestAutoSave();
    },
    doCommand: doCommandAndUndo,
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
      requestAutoSave();
    },
  };
}
