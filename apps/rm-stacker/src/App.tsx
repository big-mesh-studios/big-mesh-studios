import { Component, createEffect, createTrackedEffect, onSettled, untrack } from "solid-js";
import PixelEditorView from "./PixelEditorView";
import VoxelPreviewView from "./VoxelPreviewView";
import { solveVoxels } from "./voxel-solver";

const App: Component = () => {
  let editorRef: { getImages: () => ImageData[] } | undefined;
  let previewRef:
    | {
        setVoxels: (out: Uint8Array, size: number) => void;
      }
    | undefined;

  const updateVoxels = () => {
    if (editorRef === undefined || previewRef === undefined) {
      return;
    }
    const images = editorRef.getImages();
    const size = images[0].width;
    const out = new Uint8Array(size * size * size * 4);
    solveVoxels({
      front: images[0],
      left: images[1],
      right: images[2],
      back: images[3],
      top: images[4],
      bottom: images[5],
      out,
    });
    previewRef.setVoxels(out, size);
  };

  createTrackedEffect(() => editorRef?.getImages() && updateVoxels());

  return (
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
        <PixelEditorView
          ref={ctx => {
            editorRef = ctx;
          }}
          onUpdate={updateVoxels}
        />
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
          <VoxelPreviewView
            ref={ctx => {
              previewRef = ctx;
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
