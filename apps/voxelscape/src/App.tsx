import { Component, createSignal, onCleanup, Show } from "solid-js";
import styles from "./App.module.css";
import CoarseControls from "./ui/CoarseControls";
import { Console } from "./ui/Console";
import { EditHud } from "./ui/EditHud";
import { LoadingScreen, LoadingToast } from "./ui/LoadingScreen";
import { createToasts, Toast } from "./ui/Toasts";
import { createMediaQuery } from "./utils/create-media-query";
import { createVoxelscape } from "./voxelscape/create-voxelscape";
import { VoxelscapeContext } from "./voxelscape/voxelscape-context";

/** How long a line the world reports on its own is left on screen. */
const NOTICE_SECONDS = 6;

const App: Component<{}> = () => {
  let hud: HTMLDivElement | undefined;

  const [notice, setNotice] = createSignal<string>();

  const coarsePointer = createMediaQuery("(any-pointer: coarse)");
  const toasts = createToasts();
  const voxelscape = createVoxelscape({
    onDebugStats: (line) => {
      if (hud !== undefined) {
        hud.textContent = line;
      }
    },
    onNotice: (line) => {
      setNotice(line);
      // Nobody has the console open when the world reports its atproto state,
      // so the same line is put where it can be read without opening it.
      toasts.show(() => line, NOTICE_SECONDS * 1000);
    },
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
        <toasts.Stack>
          <Show when={voxelscape.debugPerf()}>
            <Toast>
              <div
                ref={(el) => {
                  hud = el;
                }}
                class={styles["debug-perf"]}
              />
            </Toast>
          </Show>
          <LoadingToast />
        </toasts.Stack>
      </div>
    </VoxelscapeContext>
  );
};

export default App;
