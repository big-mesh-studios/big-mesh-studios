// The model being edited, and everything the interface reads about it: the tool
// in hand, the slice in front of you, the palette, the preview, and the history
// of what has been done to all of them.
//
// One object holds all of it, and the whole interface reads it through the
// context rather than each part keeping its own. A voxel is written in one place
// and the slice canvas, the preview, the palette and the undo history all have to
// hear about it in the same turn, which they only do if there is one place to
// hear it from.
import {
  createEffect,
  createMemo,
  createSignal,
  flush,
  untrack,
  type Accessor,
} from "solid-js";
import { Bitmap, type Dimensions3D, type RGBA } from "@big-mesh-studios/maths";
import { createMediaQuery } from "@big-mesh-studios/utils/create-media-query";
import {
  createVolume,
  packVolume,
  planeSliceCount,
  planeSlicedAxis,
  sliceAt,
  type Plane,
  type Slice,
  type Volume,
} from "@big-mesh-studios/stacker/volume";
import { writeCvox } from "@big-mesh-studios/stacker/cvox";
import { DAWNBRINGER_32_PALETTE } from "./default_palette";
import { INITIAL_DIMENSIONS, INITIAL_PALETTE_INDEX } from "./constants";
import { Command } from "./command/Command";
import { createCommander } from "./command/commander";
import { UndoRedoManager, type CommandEntry } from "./undo-redo";
import { loadFromIndexedDB, saveToIndexedDB } from "./load-save";
import { createEnqueue } from "./utils/utils";
import type { Home } from "./home";
import type { Alignment3D, ModeKind, Mirror, PreviewState } from "./types";

/** How long a change has to settle before the model is written down. */
const AUTOSAVE_DELAY = 1000;

const INITIAL_PREVIEW: PreviewState = {
  unlit: false,
  autorotate: true,
  autoframe: true,
  showSlice: true,
  showCells: false,
};

export interface SavedModel {
  volume: Volume;
  palette: RGBA[];
  undoStack: CommandEntry[];
  redoStack: CommandEntry[];
  preview: Partial<PreviewState>;
}

export function createBeetle() {
  const [volume, setVolume] = createSignal<Volume>(
    createVolume(INITIAL_DIMENSIONS),
  );
  const [palette, setPalette] = createSignal<RGBA[]>([
    ...DAWNBRINGER_32_PALETTE,
  ]);

  const [mode, setModeRaw] = createSignal<ModeKind>("Draw");
  const [mirror, setMirror] = createSignal<Mirror>({
    across: false,
    down: false,
  });

  const [plane, setPlaneRaw] = createSignal<Plane>("xy");
  const [sliceIndex, setSliceIndex] = createSignal(
    INITIAL_DIMENSIONS.depth >> 1,
  );

  const [chosenPaletteIndex, setChosenPaletteIndex] = createSignal(
    INITIAL_PALETTE_INDEX,
  );
  const [erasing, setErasing] = createSignal(false);

  const [home, setHome] = createSignal<Home>({ kind: "nowhere" });

  /**
   * The model as this browser was last left with it. The read is a promise, and
   * every signal that reads it suspends until it lands, which is what keeps the
   * empty model the editor opens on from ever being seen.
   */
  const saved = createMemo(() =>
    loadFromIndexedDB(DAWNBRINGER_32_PALETTE).catch((cause) => {
      console.warn("could not read the model back from this browser", cause);
      return null;
    }),
  );

  const restoredUndoStack: Accessor<CommandEntry[]> = () =>
    saved()?.undoStack ?? [];
  const restoredRedoStack: Accessor<CommandEntry[]> = () =>
    saved()?.redoStack ?? [];

  /**
   * Whether the panels fit round the edges of the screen rather than beside the
   * model. A phone held sideways is wider than a tablet is narrow and is still
   * all thumbs, so the pointer is asked about as well as the width.
   */
  const compact = createMediaQuery("(pointer: coarse), (max-width: 760px)");

  const dimensions = createMemo(() => volume().dimensions);
  const sliceCount = createMemo(() => planeSliceCount(dimensions(), plane()));

  /**
   * The slice in front of you, held inside the box.
   *
   * A slice is chosen by number, and the box can be made smaller than the number
   * chosen — by a resize, by opening a model, by anything that replaces the box
   * rather than editing it. The number is clamped where it is read as well as
   * where it is set, so a box that has shrunk under it addresses a slice at one
   * of its own ends rather than one that is not there.
   */
  const slice = createMemo<Slice>(() => {
    const held = Math.max(0, Math.min(sliceIndex(), sliceCount() - 1));
    return sliceAt(dimensions(), plane(), held);
  });
  const chosenColour = createMemo(() => palette()[chosenPaletteIndex()]);
  const selectedPaletteIndex = createMemo(() =>
    erasing() ? Bitmap.EMPTY : chosenPaletteIndex(),
  );
  const selectedColour = createMemo<RGBA | undefined>(() =>
    erasing() ? undefined : chosenColour(),
  );

  /**
   * The plane to draw on, and the slice of it. Both are held inside the box: a
   * slice is chosen by number, and the box can be made smaller than the number
   * already chosen, so a number past either end stands for the end it is past
   * rather than for nothing at all.
   */
  function setPlane(next: Plane) {
    setPlaneRaw(next);
    setSliceIndex((at) =>
      Math.min(at, planeSliceCount(dimensions(), next) - 1),
    );
  }

  function setSlice(to: number) {
    setSliceIndex(Math.max(0, Math.min(to, sliceCount() - 1)));
  }

  function stepSlice(by: number) {
    setSlice(sliceIndex() + by);
  }

  /**
   * The slice a voxel belongs to brought in front of you, on whichever plane is
   * already being drawn. A tap in the preview and a tap in the canvas then mean
   * the same thing, and neither view is a place from which you cannot get to
   * the other.
   */
  function showVoxel(voxel: [number, number, number]) {
    const axis = planeSlicedAxis[plane()];
    setSlice(voxel[axis === "x" ? 0 : axis === "y" ? 1 : 2]);
  }

  function setMode(next: ModeKind) {
    setModeRaw(next);
  }

  function choosePaletteIndex(index: number) {
    setChosenPaletteIndex(index);
    setErasing(false);
  }

  function erase() {
    setErasing(!erasing());
  }

  /* Both views ask to be redrawn rather than the model announcing itself, and
     the two of them working out for themselves whether they care about it. */
  const renderCallbacks = new Set<() => void>();

  function onRender(callback: () => void) {
    renderCallbacks.add(callback);
    return () => {
      renderCallbacks.delete(callback);
    };
  }

  function requestRender() {
    for (const callback of [...renderCallbacks]) {
      queueMicrotask(callback);
    }
  }

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
            const { undoStack, redoStack } = undoRedoManager.getStacks();
            await saveToIndexedDB({
              volume: writeCvox(volume(), palette()).buffer as ArrayBuffer,
              undoStack,
              redoStack,
              preview: preview.state(),
            });
          } while (trySaveAgain);
          saving = false;
        })();
      }, AUTOSAVE_DELAY);
    };
  })();

  /* The bytes the ray marcher walks, packed. A stroke writes one voxel at a
     time, so this is repacked when a change has been read back rather than on
     the write itself: a read does not see a value until the next microtask, and
     packing a box per voxel of a stroke would cost more than the stroke does. */
  const [packed, setPacked] = createSignal<Uint8Array>(
    packVolume(untrack(volume)),
  );

  function repack() {
    flush();
    setPacked(packVolume(volume()));
  }

  const enqueue = createEnqueue<Command>();

  const { snapshot, doCommand } = createCommander({
    volume,
    setVolume,
    palette,
    setPalette,
    requestRender,
    requestAutoSave,
  });

  function doCommandAndUpdate(command: Command) {
    return Command.async(
      enqueue(async () => {
        const reverse = await doCommand(command);
        if (reverse.type !== "NoOperation") {
          repack();
          requestRender();
        }
        return reverse;
      }),
    );
  }

  const undoRedoManager = new UndoRedoManager(
    doCommandAndUpdate,
    restoredUndoStack,
    restoredRedoStack,
  );

  function doCommandAndUndo(
    command: Command,
    push = true,
    description = "",
  ): Command {
    const reverse = doCommandAndUpdate(command);
    if (push) {
      undoRedoManager.pushUndo({ command: reverse, description });
    }
    return reverse;
  }

  function pushUndo(command: Command, description: string) {
    undoRedoManager.pushUndo({ command, description });
  }

  /**
   * The box re-framed. One command, so one entry on the history, and the box as
   * it stood is the command that takes it back.
   */
  function resize(to: Dimensions3D, alignment: Alignment3D) {
    doCommandAndUndo(
      Command.resize(
        { x: to.width, y: to.height, z: to.depth },
        {
          ...(alignment.width !== undefined ? { x: alignment.width } : {}),
          ...(alignment.height !== undefined ? { y: alignment.height } : {}),
          ...(alignment.depth !== undefined ? { z: alignment.depth } : {}),
        },
      ),
      true,
      "Resize",
    );
  }

  function loadVolumeFrom(bytes: ArrayBuffer, to: Home) {
    return Command.async(
      enqueue(async () => {
        const reverse = await doCommand(Command.loadVolume(bytes));
        if (reverse.type !== "NoOperation") {
          setSliceIndex((at) => Math.min(at, volume().dimensions.depth - 1));
          setHome(to);
          undoRedoManager.clear();
          undoRedoManager.clearRedo();
          repack();
          requestRender();
          requestAutoSave();
        }
        return reverse;
      }),
    );
  }

  function reset() {
    undoRedoManager.clear();
    setVolume(createVolume(INITIAL_DIMENSIONS));
    setPalette([...DAWNBRINGER_32_PALETTE]);
    setPlaneRaw("xy");
    setSliceIndex(INITIAL_DIMENSIONS.depth >> 1);
    setMode("Draw");
    setMirror({ across: false, down: false });
    setChosenPaletteIndex(INITIAL_PALETTE_INDEX);
    setErasing(false);
    setHome({ kind: "nowhere" });
    repack();
    requestRender();
    requestAutoSave();
  }

  const preview = createPreviewStore();

  /**
   * How the model is drawn is part of what this browser was left holding, and it
   * arrives with the model rather than before it: the read is a promise, and
   * nothing read off a promise before it lands will be read again when it does.
   */
  createEffect(saved, (found) => {
    if (found !== null) {
      preview.adopt(found.preview);
    }
  });

  createEffect(
    () => [volume(), palette()],
    () => {
      requestRender();
    },
  );

  // The number the controls show is the one the drawing uses, so a box that has
  // shrunk under it moves the number too rather than only the picture.
  createEffect(sliceCount, (count) => {
    setSliceIndex((at) => Math.max(0, Math.min(at, count - 1)));
  });

  return {
    /* the model */
    volume,
    setVolume,
    dimensions,
    palette,
    setPalette,
    packed,

    /* the tool */
    mode,
    setMode,
    mirror,
    setMirror,

    /* the slice */
    plane,
    setPlane,
    sliceAt: sliceIndex,
    setSliceAt: setSlice,
    stepSlice,
    showVoxel,
    sliceCount,
    slice,

    /* the colour */
    chosenPaletteIndex,
    choosePaletteIndex,
    selectedPaletteIndex,
    chosenColour,
    selectedColour,
    erasing,
    erase,

    /* where it lives */
    home,
    setHome,

    /* the preview and the layout */
    preview,
    compact,

    /* what the model needs to happen to it */
    doCommand: doCommandAndUpdate,
    doCommandAndUndo,
    pushUndo,
    undoRedoManager,
    snapshot,
    repack,
    resize,
    loadVolume: loadVolumeFrom,
    reset,

    /* how the views are drawn */
    onRender,
    requestRender,
    requestAutoSave,
  };
}

export type Beetle = ReturnType<typeof createBeetle>;

function createPreviewStore() {
  const [unlit, setUnlit] = createSignal(INITIAL_PREVIEW.unlit);
  const [autorotate, setAutorotate] = createSignal(INITIAL_PREVIEW.autorotate);
  const [autoframe, setAutoframe] = createSignal(INITIAL_PREVIEW.autoframe);
  const [showSlice, setShowSlice] = createSignal(INITIAL_PREVIEW.showSlice);
  const [showCells, setShowCells] = createSignal(INITIAL_PREVIEW.showCells);

  const state = createMemo<PreviewState>(() => ({
    unlit: unlit(),
    autorotate: autorotate(),
    autoframe: autoframe(),
    showSlice: showSlice(),
    showCells: showCells(),
  }));

  return {
    unlit,
    setUnlit,
    autorotate,
    setAutorotate,
    autoframe,
    setAutoframe,
    showSlice,
    setShowSlice,
    showCells,
    setShowCells,
    state,

    /** How the model was left drawn, once this browser says what that was. */
    adopt(found: Partial<PreviewState>) {
      if (found.unlit !== undefined) {
        setUnlit(found.unlit);
      }
      if (found.autorotate !== undefined) {
        setAutorotate(found.autorotate);
      }
      if (found.autoframe !== undefined) {
        setAutoframe(found.autoframe);
      }
      if (found.showSlice !== undefined) {
        setShowSlice(found.showSlice);
      }
      if (found.showCells !== undefined) {
        setShowCells(found.showCells);
      }
    },
  };
}
