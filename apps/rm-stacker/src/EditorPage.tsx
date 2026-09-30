// The editor itself: the six-panel canvas, the preview beside it, and the
// controls over both. One of the two pages the application has, and the one
// everything else exists to serve.
import { Component, Loading, Show, useContext } from "solid-js";
import styles from "./App.module.css";
import { Split } from "./components/SplitPane";
import { StackerContext } from "./context";
import FlyControls from "./fly/FlyControls";
import { FlyHud } from "./FlyHud";
import { Hud } from "./Hud";
import PixelEditorView from "./PixelEditorView/PixelEditorView";
import VoxelPreviewView from "./VoxelPreviewView";

const EditorPage: Component = () => {
  const stacker = useContext(StackerContext);
  const initiallyNarrow = stacker.narrow();

  return (
    <>
      {/* Both views read the model in order to draw it, and it is read back from
          a database, so until it arrives they have nothing to draw and this
          shows an empty pane in their place. That is what keeps the fresh model
          the editor opens on meanwhile from ever being seen. */}
      <Loading fallback={<div class={styles.shell} />}>
        <div class={styles.shell} data-flying={stacker.flying() || undefined}>
          <Split direction={stacker.narrow() ? "row" : "column"}>
            {(() => {
              const pixelEditorPane = (
                <Split.Pane
                  class={styles.editorPane}
                  size={initiallyNarrow ? "75%" : "50%"}
                  max="245px"
                >
                  <div class={styles.editorScroll}>
                    <PixelEditorView />
                  </div>
                </Split.Pane>
              );
              const voxelPreviewPane = (
                <Split.Pane
                  style={{ display: "grid" }}
                  class={styles.previewPane}
                  size={initiallyNarrow ? "25%" : "50%"}
                  max="245px"
                >
                  <div style="flex-grow: 1; overflow: hidden;">
                    <VoxelPreviewView />
                  </div>
                </Split.Pane>
              );
              const handle = (
                <Split.Handle
                  size="5px"
                  style={{
                    cursor: stacker.narrow() ? "ns-resize" : "ew-resize",
                  }}
                  class={styles.handle}
                />
              );
              // The preview is the same element in either arrangement, so it is
              // carried from one to the other rather than drawn again: the
              // canvas keeps its graphics context, and the view keeps where it
              // was turned to.
              return (
                <Show
                  when={stacker.narrow()}
                  fallback={
                    <>
                      {pixelEditorPane}
                      {handle}
                      {voxelPreviewPane}
                    </>
                  }
                >
                  {voxelPreviewPane}
                  {handle}
                  {pixelEditorPane}
                </Show>
              );
            })()}
          </Split>
        </div>
      </Loading>
      {/* What a camera in flight is told with, laid under the toolbar so that the
          bars are still over it. The thumb controls go in with it: a camera in
          flight holds the pointer, so on a device that has one they are the only
          controls a thumb can reach at all. */}
      <Show when={stacker.flying()}>
        <FlyHud />
        <Show when={stacker.coarsePointer()}>
          <FlyControls
            input={stacker.flyInput}
            undo={() => stacker.undoRedoManager.undo()}
            redo={() => stacker.undoRedoManager.redo()}
          />
        </Show>
      </Show>
      <Hud />
    </>
  );
};

export default EditorPage;
