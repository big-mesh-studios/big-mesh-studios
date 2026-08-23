import { Component, Loading, Show } from "solid-js";
import styles from "./App.module.css";
import { Hud } from "./Hud";
import PixelEditorView from "./pixel-editor/PixelEditorView";
import StackerModelRenderer from "./StackerModelRenderer";
import { Split } from "./components/SplitPane";
import { StackerContext } from "./context";
import { createStacker } from "./store/stacker-store";

const App: Component = () => {
  const stacker = createStacker();
  const initiallyNarrow = stacker.narrow();

  return (
    <StackerContext value={stacker}>
      {/* Both views read the model in order to draw it, and it is read back from
          a database, so until it arrives they have nothing to draw and this
          shows an empty pane in their place. That is what keeps the fresh model
          the editor opens on meanwhile from ever being seen. */}
      <Loading fallback={<div class={styles.shell} />}>
        <div class={styles.shell}>
          <Split direction={stacker.narrow() ? "row" : "column"}>
            {(() => {
              const pixelEditorPane = (
                <Split.Pane size={initiallyNarrow ? "75%" : "50%"} max="245px">
                  <div style={{ "overflow-x": "auto", position: "absolute", inset: 0 }}>
                    <PixelEditorView />
                  </div>
                </Split.Pane>
              );
              const voxelPreviewPane = (
                <Split.Pane
                  style={{ display: "grid" }}
                  size={initiallyNarrow ? "25%" : "50%"}
                  max="245px"
                >
                  <div style="flex-grow: 1; overflow: hidden;">
                    <StackerModelRenderer />
                  </div>
                </Split.Pane>
              );
              const handle = (
                <Split.Handle
                  size="5px"
                  style={{ cursor: stacker.narrow() ? "ns-resize" : "ew-resize" }}
                  class={styles.handle}
                />
              );
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
      <Hud />
    </StackerContext>
  );
};

export default App;
