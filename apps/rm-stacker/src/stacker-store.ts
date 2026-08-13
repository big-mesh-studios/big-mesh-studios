import { createEffect, createMemo, createSignal, flush } from "solid-js";
import { Command } from "./command/Command";
import { createCommander } from "./command/commander";
import { DAWNBRINGER_32_PALETTE } from "./default_palette";
import { loadFromIndexedDB, saveToIndexedDB } from "./load-save";
import { Bitmap, Dimensions3D, RGBA, Vector2D } from "./maths";
import { ResizeOptions, resizeSides } from "./resize-sides";
import { ModeKind, type Dimensions2D, type Sides } from "./types";
import { UndoRedoManager } from "./undo-redo";
import { createEnqueue, createMediaQuery } from "./utils";
import { solveVoxels } from "./voxel-solver";

const INITIAL_DIMENSIONS = { width: 15, height: 15, depth: 15 };
const INITIAL_PALETTE_INDEX = 5;

const createInitialImageBitmap = (
  dimensions: Dimensions2D | number,
  padding: Vector2D | number,
): Bitmap => {
  dimensions =
    typeof dimensions === "number" ? { width: dimensions, height: dimensions } : dimensions;
  padding = typeof padding === "number" ? { x: padding, y: padding } : padding;

  const data = Bitmap.create(dimensions.width, dimensions.height);

  for (let y = 0; y < dimensions.height - padding.y * 2; y++) {
    for (let x = 0; x < dimensions.width - padding.x * 2; x++) {
      const i = (padding.y + y) * dimensions.width + (padding.x + x);
      data.data[i] = INITIAL_PALETTE_INDEX;
    }
  }
  return data;
};

export const createInitialSides = (dimensions: Dimensions3D) => {
  return {
    front: createInitialImageBitmap(dimensions, 1),
    back: createInitialImageBitmap(dimensions, 1),
    left: createInitialImageBitmap(dimensions, 1),
    right: createInitialImageBitmap(dimensions, 1),
    top: createInitialImageBitmap(dimensions, 1),
    bottom: createInitialImageBitmap(dimensions, 1),
  };
};

export function createStacker() {
  const enqueue = createEnqueue<Command>();
  const renderSet = new Set<() => void>();

  const saved = createMemo(() =>
    loadFromIndexedDB(DAWNBRINGER_32_PALETTE).catch(error => {
      console.error("The saved model could not be read", error);
      return null;
    }),
  );

  const [mode, setMode] = createSignal<ModeKind>("Idle");
  const [selectedPaletteIndex, selectPaletteIndex] = createSignal(5);
  const [palette, setPalette] = createSignal<RGBA[]>(
    () => saved()?.palette ?? DAWNBRINGER_32_PALETTE,
  );
  const [sides, setSides] = createSignal<Sides>(
    () => saved()?.sides ?? createInitialSides(INITIAL_DIMENSIONS),
  );
  const undoRedoManager = new UndoRedoManager(
    command => doCommandAndUpdate(command),
    () => saved()?.undoStack ?? [],
    () => saved()?.redoStack ?? [],
  );
  const dimensions = createMemo<Dimensions3D>(() => ({
    width: sides().front.width,
    height: sides().front.height,
    depth: sides().left.width,
  }));
  const [voxels, setVoxels] = createSignal(() => solveVoxels(dimensions(), sides()));
  const narrow = createMediaQuery("(max-width: 500px)");

  const [unlit, setUnlit] = createSignal(false);
  const [autorotate, setAutorotate] = createSignal(true);

  const preview = {
    unlit,
    setUnlit,
    autorotate,
    setAutorotate,
  };

  const selectedColour = createMemo(() => palette()[selectedPaletteIndex()]);

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
              sides: sides(),
              palette: palette(),
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
    setVoxels(solveVoxels(dimensions(), sides()));
  }

  const { snapshot, doCommand } = createCommander({
    sides,
    setSides,
    updateVoxels,
    requestRender,
    requestAutoSave,
    palette,
    setPalette,
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
  createEffect(palette, requestRender);

  return {
    undoRedoManager,
    // dimensions
    dimensions,
    // sides
    sides,
    setSides,
    // voxels
    voxels,
    updateVoxels,
    // Palette
    palette,
    setPalette,
    selectedPaletteIndex,
    selectPaletteIndex,
    selectedColour,
    // mode
    mode,
    setMode,
    // layout
    narrow,
    // methods
    doCommand: doCommandAndUndo,
    requestAutoSave,
    requestRender,
    // scene state
    preview,
    /**
     * Constructs an undo command via a snapshot that you can push via
     * `pushUndo` at the end of your opperation.
     */
    snapshot,
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
    pushUndo(reverseCommand: Command, description: string) {
      undoRedoManager.pushUndo({
        command: reverseCommand,
        description: description ?? "",
      });
    },
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
