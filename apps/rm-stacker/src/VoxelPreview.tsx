import { Component, Show, useContext } from "solid-js";
import { StackerContext } from "./context";
import { createOrbitCameraState, trackAutorotate } from "./voxel-preview-camera";
import VoxelPreviewViewCpu from "./voxel-preview-cpu/VoxelPreviewView";
import VoxelPreviewViewGpu from "./voxel-preview-gpu/VoxelPreviewView";

const VoxelPreview: Component = () => {
  const { preview } = useContext(StackerContext);

  // Owned here, above the renderer swap, so orbiting or zooming carries over
  // when the renderer toggle switches which of the two is mounted.
  const orbit = createOrbitCameraState();
  trackAutorotate(orbit, preview.autorotate);

  return (
    <Show when={preview.renderer() === "gpu"} fallback={<VoxelPreviewViewCpu orbit={orbit} />}>
      <VoxelPreviewViewGpu orbit={orbit} />
    </Show>
  );
};

export default VoxelPreview;
