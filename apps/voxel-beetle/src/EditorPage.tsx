// The editor: the slice being drawn, the model beside it, and the controls over
// both. The one page the application has, and the one everything else exists to
// serve.
import { Component, Show, useContext } from "solid-js";
import styles from "./App.module.css";
import { Split } from "./components/SplitPane";
import { BeetleContext } from "./context";
import { Hud } from "./Hud";
import SliceEditorView from "./SliceEditorView/SliceEditorView";
import VoxelPreviewView from "./VoxelPreviewView";

const EditorPage: Component = () => {
  const { compact } = useContext(BeetleContext);

  const slicePane = (
    <Split.Pane size="50%">
      <SliceEditorView />
    </Split.Pane>
  );

  const previewPane = (
    <Split.Pane size="50%">
      <VoxelPreviewView />
    </Split.Pane>
  );

  const handle = <Split.Handle size="9px" class={styles.handle} />;

  // The preview is the same element in either arrangement, so it is carried
  // from one to the other rather than drawn again: the canvas keeps its graphics
  // context, and the model keeps where it was turned to.
  return (
    <>
      <div class={styles.shell}>
        <Split direction={compact() ? "row" : "column"}>
          <Show
            when={compact()}
            fallback={
              <>
                {slicePane}
                {handle}
                {previewPane}
              </>
            }
          >
            {previewPane}
            {handle}
            {slicePane}
          </Show>
        </Split>
      </div>
      <Hud />
    </>
  );
};

export default EditorPage;
