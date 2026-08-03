import { Component } from "solid-js";
import PixelEditorView from "./PixelEditorView";
import VoxelPreviewView from "./VoxelPreviewView";
import { StackerContext } from "./stacker-context";
import { createStackerStore } from "./stacker-store";

const App: Component = () => {
  const stackerStore = createStackerStore();

  return (
    <StackerContext value={stackerStore}>
      <div
        class="flex-col md:flex-row"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          overflow: "hidden",
        }}
      >
        <div
          class="bg-base-300"
          style={{
            "flex-grow": "1",
            "flex-shrink": "1",
            "flex-basis": "0",
            overflow: "hidden",
          }}
        >
          <PixelEditorView />
        </div>
        <div
          style={{
            width: "5px",
          }}
        />
        <div
          style={{
            "flex-grow": "1",
            "flex-shrink": "1",
            "flex-basis": "0",
            overflow: "hidden",
            display: "flex",
            "flex-direction": "column",
          }}
        >
          <div style="flex-grow: 1; overflow: hidden;">
            <VoxelPreviewView />
          </div>
        </div>
      </div>
    </StackerContext>
  );
};

export default App;
