import { Component, createSignal, onCleanup, Show } from "solid-js";
import styles from "./App.module.css";
import CoarseControls from "./ui/CoarseControls";
import { Console } from "./ui/Console";
import { EditHud } from "./ui/EditHud";
import { LoadingScreen } from "./ui/LoadingScreen";
import { createMediaQuery } from "./utils/create-media-query";
import { createVoxelscape } from "./voxelscape/create-voxelscape";
import { VoxelscapeContext } from "./voxelscape/voxelscape-context";

const App: Component<{}> = () => {
  const coarsePointer = createMediaQuery("(any-pointer: coarse)");

  let hud: HTMLDivElement | undefined;
  const [notice, setNotice] = createSignal<string>();
  const voxelscape = createVoxelscape({
    onDebugStats: (line) => {
      if (hud !== undefined) {
        hud.textContent = line;
      }
    },
    onNotice: setNotice,
  });

  onCleanup(voxelscape.dispose);

  return (
    <VoxelscapeContext value={voxelscape}>
      <div class={styles.container}>
        <canvas
          ref={voxelscape.mount}
          class={styles.canvas}
          {...voxelscape.input.canvasHandlers}
        />
        <Show when={coarsePointer()}>
          <CoarseControls />
        </Show>
        <EditHud />
        <LoadingScreen />
        <Console
          onCommand={(line) => voxelscape.commands.run(line)}
          notice={notice()}
        />
        <Show when={voxelscape.debugPerf}>
          <div
            ref={(el) => {
              hud = el;
            }}
            class={styles["debug-perf"]}
          />
        </Show>
      </div>
    </VoxelscapeContext>
  );
};

export default App;
