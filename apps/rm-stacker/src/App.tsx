import { Component, createEffect, createMemo, onSettled } from "solid-js";
import styles from "./App.module.css";
import PixelEditorView from "./PixelEditorView/PixelEditorView";
import VoxelPreviewView from "./VoxelPreviewView";
import { Split } from "./components/SplitPane";
import { LayoutContext, StackerContext } from "./context";
import { loadFromIndexedDB } from "./load-save";
import { createStacker } from "./stacker-store";
import { createMediaQuery } from "./utils";

const App: Component = () => {
  const stacker = createStacker();
  const query = createMediaQuery("(max-width: 500px)");
  const layout = createMemo(() => (query() ? "row" : "column"));

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
    <LayoutContext value={layout}>
      <StackerContext value={stacker}>
        <div class={styles.shell}>
          <Split direction={layout()}>
            <Split.Pane size="50%" max="245px">
              <div style={{ "overflow-x": "auto", position: "absolute", inset: 0 }}>
                <PixelEditorView />
              </div>
            </Split.Pane>
            <Split.Handle
              size="5px"
              style={{ cursor: layout() === "column" ? "ew-resize" : "ns-resize" }}
              class={styles.handle}
            />
            <Split.Pane style={{ display: "grid" }} size="50%" max="245px">
              <div style="flex-grow: 1; overflow: hidden;">
                <VoxelPreviewView />
              </div>
            </Split.Pane>
          </Split>
        </div>
      </StackerContext>
    </LayoutContext>
  );
};

export default App;
