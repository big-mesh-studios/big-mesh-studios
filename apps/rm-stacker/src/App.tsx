import { Component, createEffect, createMemo, onSettled } from "solid-js";
import styles from "./App.module.css";
import PixelEditorView from "./PixelEditorView";
import VoxelPreviewView from "./VoxelPreviewView";
import { loadFromIndexedDB } from "./load-save";
import { StackerContext } from "./stacker-context";
import { createStacker } from "./stacker-store";

const App: Component = () => {
  const stacker = createStacker();

  const saveState = createMemo(loadFromIndexedDB);

  createEffect(saveState, result => {
    if (!result) {
      return;
    }

    const { sides, undoStack, redoStack } = result;

    stacker.setSides(sides);
    stacker.undoRedoManager.setStacks({
      undoStack,
      redoStack,
    });

    onSettled(() => {
      stacker.updateVoxels();
      stacker.requestRender();
    });
  });

  return (
    <StackerContext value={stacker}>
      <div class={styles.shell}>
        <div class={styles.editorPane}>
          <PixelEditorView />
        </div>
        <div class={styles.divider} />
        <div class={styles.previewPane}>
          <div style="flex-grow: 1; overflow: hidden;">
            <VoxelPreviewView />
          </div>
        </div>
      </div>
    </StackerContext>
  );
};

export default App;
