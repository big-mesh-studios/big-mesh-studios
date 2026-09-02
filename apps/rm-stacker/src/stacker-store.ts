import {
  Bitmap,
  Dimensions2D,
  Dimensions3D,
  RGBA,
  Vector2D,
  Vector3D,
} from "@big-mesh-studios/maths";
import {
  centrePivot,
  partDimensions,
  solvePart,
  type Figure,
  type Part,
  type Sides,
  type SolvedPart,
} from "@big-mesh-studios/stacker/renderer";
import { createMediaQuery } from "@big-mesh-studios/utils/create-media-query";
import { Accessor } from "@solidjs/signals";
import { createEffect, createMemo, createSignal, flush } from "solid-js";
import { createAtproto } from "./atproto/create-atproto";
import { Command } from "./command/Command";
import { createCommander } from "./command/commander";
import { DAWNBRINGER_32_PALETTE } from "./default_palette";
import { Home } from "./home";
import { IndexedDBData, loadFromIndexedDB, saveToIndexedDB } from "./load-save";
import { NO_MIRROR } from "./mirror";
import { ResizeOptions, resizeSides } from "./resize-sides";
import { FocusKind, Mirror, ModeKind, PreviewState } from "./types";
import { UndoRedoManager } from "./undo-redo";
import { createEnqueue } from "./utils/utils";

const INITIAL_DIMENSIONS = { width: 15, height: 15, depth: 15 };
const INITIAL_PALETTE_INDEX = 5;

/** What the part of a figure that has only one is called. */
const FIRST_PART = "body";

const createInitialImageBitmap = (
  dimensions: Dimensions2D | number,
  padding: Vector2D | number,
): Bitmap => {
  dimensions =
    typeof dimensions === "number"
      ? { width: dimensions, height: dimensions }
      : dimensions;
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

/** A part drawn as a fresh box, pivoting on its own middle, at `root`. */
export const createInitialPart = (
  name: string,
  dimensions: Dimensions3D,
  root = Vector3D.create(),
): Part => ({
  name,
  sides: createInitialSides(dimensions),
  root,
  pivot: centrePivot(dimensions),
  parent: null,
});

/**
 * A name like `base` that no part in `parts` is using, counting up from `base
 * 2` until one is free.
 */
export const unusedPartName = (parts: Part[], base: string): string => {
  const taken = new Set(parts.map((part) => part.name));

  if (!taken.has(base)) {
    return base;
  }

  for (let suffix = 2; ; suffix++) {
    const candidate = `${base} ${suffix}`;

    if (!taken.has(candidate)) {
      return candidate;
    }
  }
};

function createPreviewStore(saved: Accessor<IndexedDBData | null>) {
  const [unlit, setUnlit] = createSignal(() => saved()?.preview?.unlit ?? true);
  const [autorotate, setAutorotate] = createSignal(
    () => saved()?.preview?.autorotate ?? true,
  );
  const [axesVisible, setAxesVisible] = createSignal(
    () => saved()?.preview?.axesVisible ?? false,
  );
  const [autoframe, setAutoframe] = createSignal(
    () => saved()?.preview?.autoframe ?? false,
  );
  const [focus, setFocus] = createSignal<FocusKind>(
    () => saved()?.preview?.focus ?? "root",
  );

  /** How the preview is drawn, as the one value that is written back out. */
  const state = createMemo<PreviewState>(() => ({
    unlit: unlit(),
    autorotate: autorotate(),
    axesVisible: axesVisible(),
    autoframe: autoframe(),
    focus: focus(),
  }));

  return {
    unlit,
    setUnlit,
    autorotate,
    setAutorotate,
    axesVisible,
    setAxesVisible,
    autoframe,
    setAutoframe,
    focus,
    setFocus,
    state,
  };
}

export function createStacker() {
  const enqueue = createEnqueue<Command>();
  const renderSet = new Set<() => void>();
  const atproto = createAtproto();

  const saved = createMemo(() =>
    loadFromIndexedDB(DAWNBRINGER_32_PALETTE).catch((error) => {
      console.error("The saved model could not be read", error);
      return null;
    }),
  );

  const [mode, setMode] = createSignal<ModeKind>("Idle");
  const [mirror, setMirror] = createSignal<Mirror>(NO_MIRROR);
  // Where the drawing lives, if anywhere yet. Held here rather than in whatever
  // view happens to save it, so that opening a model from one place cannot
  // leave a stale home behind from another.
  const [home, setHome] = createSignal<Home>({ kind: "nowhere" });
  const [selectedPaletteIndex, selectPaletteIndex] = createSignal(5);
  const [palette, setPalette] = createSignal<RGBA[]>(
    () => saved()?.palette ?? DAWNBRINGER_32_PALETTE,
  );
  const [parts, setParts] = createSignal<Part[]>(
    () => saved()?.parts ?? [createInitialPart(FIRST_PART, INITIAL_DIMENSIONS)],
  );
  const [selectedPartName, selectPart] = createSignal<string>(
    () => saved()?.selectedPartName ?? FIRST_PART,
  );
  const [figureLoads, setFigureLoads] = createSignal(0);
  const undoRedoManager = new UndoRedoManager(
    (command) => doCommandAndUpdate(command),
    () => saved()?.undoStack ?? [],
    () => saved()?.redoStack ?? [],
  );

  const figure = createMemo<Figure>(() => ({
    parts: parts(),
    palette: palette(),
  }));

  // Whichever part is being drawn on. A name can go missing — an undo can reach
  // back past the point a part was added — so the first part stands in, and
  // there is always one part to draw.
  const selectedPart = createMemo<Part>(
    () =>
      parts().find((part) => part.name === selectedPartName()) ?? parts()[0],
  );
  const sides = createMemo<Sides>(() => selectedPart().sides);
  const dimensions = createMemo<Dimensions3D>(() =>
    partDimensions(selectedPart()),
  );

  /** Every part's volume, packed for the graphics card, in the order they are listed. */
  const [solvedParts, setSolvedParts] = createSignal<SolvedPart[]>(() =>
    parts().map(solvePart),
  );
  const voxels = createMemo(
    () =>
      solvedParts().find((solved) => solved.name === selectedPart().name)
        ?.voxels ?? new Uint8Array(),
  );
  const narrow = createMediaQuery("(max-width: 500px)");

  const preview = createPreviewStore(saved);

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
              parts: parts(),
              palette: palette(),
              selectedPartName: selectedPartName(),
              undoStack,
              redoStack,
              preview: preview.state(),
            });
          } while (trySaveAgain);
          saving = false;
        })();
      }, 1000);
    };
  })();

  function updateVoxels() {
    flush();
    setSolvedParts(parts().map(solvePart));
  }

  const { snapshot, doCommand } = createCommander({
    parts,
    setParts,
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

  function doCommandAndUndo(
    command: Command,
    pushUndo?: boolean,
    description?: string,
  ): Command {
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
    renderSet.forEach((render) => render());
  }

  createEffect(parts, requestRender);
  createEffect(palette, requestRender);
  createEffect(selectedPart, requestRender);

  /**
   * Puts a whole figure in front of the editor in place of the one being drawn:
   * a model opened, a file read, the editor started afresh. A view that frames
   * the figure to its viewport frames it again on each of these, and leaves its
   * framing alone through an edit.
   */
  function loadParts(next: Part[]) {
    setParts(next);
    setFigureLoads((loads) => loads + 1);
  }

  /**
   * Replaces the parts, taking the figure as it stands first so the change can
   * be taken back in one step.
   */
  function changeParts(description: string, change: (parts: Part[]) => Part[]) {
    const undo = snapshot();
    setParts(change(parts()));
    updateVoxels();
    requestRender();
    requestAutoSave();
    undoRedoManager.pushUndo({ command: undo, description });
  }

  return {
    undoRedoManager,
    // the account models are published to and read from
    atproto,
    // where the drawing lives
    home,
    setHome,
    // the whole drawing, and the one part of it being drawn on
    figure,
    parts,
    setParts,
    loadParts,
    /** How many whole figures have been put in front of the editor. */
    figureLoads,
    selectedPart,
    selectedPartName,
    selectPart,
    // dimensions
    dimensions,
    // sides
    sides,
    // voxels
    voxels,
    solvedParts,
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
    // which panel axes a stroke is reflected along
    mirror,
    setMirror,
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
     * Re-frames the selected part to new dimensions, carrying the drawing over
     * rather than starting the panels afresh.
     */
    resize(options: ResizeOptions) {
      const resized = resizeSides(options);
      const name = selectedPart().name;
      setParts(
        parts().map((part) =>
          part.name === name ? { ...part, sides: resized } : part,
        ),
      );
      updateVoxels();
      requestRender();
      requestAutoSave();
    },
    /** Adds a fresh part beside the others and selects it. */
    addPart() {
      const name = unusedPartName(parts(), "part");
      changeParts("Add Part", (current) => [
        ...current,
        createInitialPart(name, INITIAL_DIMENSIONS),
      ]);
      selectPart(name);
    },
    /** Adds a copy of `name`'s drawings and placement beside it, and selects it. */
    duplicatePart(name: string) {
      const source = parts().find((part) => part.name === name);

      if (source === undefined) {
        return;
      }

      const copyName = unusedPartName(parts(), `${name} copy`);
      changeParts("Duplicate Part", (current) => [
        ...current,
        {
          ...source,
          name: copyName,
          sides: Object.fromEntries(
            Object.entries(source.sides).map(([kind, bitmap]) => [
              kind,
              { ...bitmap, data: new Uint8Array(bitmap.data) },
            ]),
          ) as Sides,
        },
      ]);
      selectPart(copyName);
    },
    /**
     * Takes `name` out of the figure. A part hanging off it is left hanging off
     * the figure itself, so nothing is dragged out with it. The last part
     * cannot be removed: a figure of nothing has no panels to draw on.
     */
    removePart(name: string) {
      if (parts().length <= 1) {
        return;
      }

      changeParts("Remove Part", (current) =>
        current
          .filter((part) => part.name !== name)
          .map((part) =>
            part.parent === name ? { ...part, parent: null } : part,
          ),
      );

      if (selectedPartName() === name) {
        selectPart(parts()[0].name);
      }
    },
    /** Calls `name` something else, keeping whatever hangs off it hanging off it. */
    renamePart(name: string, to: string) {
      if (
        to === name ||
        to === "" ||
        parts().some((part) => part.name === to)
      ) {
        return;
      }

      changeParts("Rename Part", (current) =>
        current.map((part) => ({
          ...part,
          name: part.name === name ? to : part.name,
          parent: part.parent === name ? to : part.parent,
        })),
      );

      if (selectedPartName() === name) {
        selectPart(to);
      }
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
      loadParts([createInitialPart(FIRST_PART, INITIAL_DIMENSIONS)]);
      selectPart(FIRST_PART);
      setHome({ kind: "nowhere" });
      updateVoxels();
      requestAutoSave();
    },
  };
}
