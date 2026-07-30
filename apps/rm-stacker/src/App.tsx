import { Component } from "solid-js";
import PixelEditorView from "./PixelEditorView";

const App: Component = () => {
  return (
    <div
      style={{
        "width": "100%",
        "height": "100%",
        "display": "flex",
        "flex-direction": "row",
        "overflow": "hidden",
      }}
    >
      <div
        class="bg-base-300"
        style={{
          "flex-grow": "1",
          "flex-shrink": "1",
          "flex-basis": "0",
          "overflow": "hidden",
        }}
      >
        <PixelEditorView/>
      </div>
      <div
        style={{
          "width": "5px",
        }}
      />
      <div
        style={{
          "flex-grow": "1",
          "flex-shrink": "1",
          "flex-basis": "0",
          "overflow": "hidden",
        }}
      >
        <div style="width: 100%; height: 100%;"></div>
      </div>
    </div>
  );
};

export default App;

