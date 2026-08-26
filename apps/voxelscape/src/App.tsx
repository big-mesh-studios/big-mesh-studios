import {
  Component,
  createEffect,
  createSignal,
  onCleanup,
  Show,
} from "solid-js";
import { createVoxelscape } from "./create-voxelscape";
import CoarseControls from "./ui/CoarseControls";
import { Console } from "./ui/Console";
import { EditHud } from "./ui/EditHud";
import { createMediaQuery } from "./utils/create-media-query";
import { VoxelscapeContext } from "./voxelscape-context";

const App: Component<{}> = () => {
  const coarsePointer = createMediaQuery("(any-pointer: coarse)");
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();

  let hud: HTMLDivElement | undefined;
  const voxelscape = createVoxelscape({
    onDebugStats: (line) => {
      if (hud !== undefined) {
        hud.textContent = line;
      }
    },
  });
  onCleanup(() => voxelscape.dispose());

  // `mount` returns its own unmount, so swapping the canvas releases the
  // previous renderer and leaves the world itself alone.
  createEffect(
    () => canvas(),
    (element) =>
      element === undefined ? undefined : voxelscape.mount(element),
  );

  const lookDrag = voxelscape.input.createLookDragHandlers();

  return (
    <VoxelscapeContext value={voxelscape}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      >
        <canvas
          ref={setCanvas}
          style={{
            position: "absolute",
            left: "0",
            top: "0",
            width: "100%",
            height: "100%",
            "touch-action": "none",
          }}
          onPointerDown={lookDrag.onPointerDown}
          onPointerMove={lookDrag.onPointerMove}
          onPointerUp={lookDrag.onPointerUp}
          onPointerCancel={lookDrag.onPointerCancel}
        />
        <Show when={coarsePointer()}>
          <CoarseControls />
        </Show>
        <EditHud />
        <Console onCommand={(line) => voxelscape.commands.run(line)} />
        <Show when={voxelscape.debugPerf}>
          <div
            ref={(el) => {
              hud = el;
            }}
            style={{
              position: "absolute",
              left: "8px",
              top: "8px",
              padding: "4px 8px",
              background: "rgba(0, 0, 0, 0.6)",
              color: "#fff",
              font: "12px monospace",
              "border-radius": "4px",
              "pointer-events": "none",
            }}
          />
        </Show>
      </div>
    </VoxelscapeContext>
  );
};

export default App;
