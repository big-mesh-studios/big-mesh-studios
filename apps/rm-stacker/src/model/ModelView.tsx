import { Component, createSignal, Show, useContext } from "solid-js";
import { StackerContext } from "../context";
import { createModelCanvas } from "./create-model-canvas";
import styles from "./ModelView.module.css";

const ModelView: Component = () => {
  const { dimensions, sides, sidesVersion, palette, preview } = useContext(StackerContext);

  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();

  const { glError, pickedVoxel } = createModelCanvas({
    canvas,
    rendererKind: preview.renderer,
    dimensions,
    sides,
    sidesVersion,
    palette,
    unlit: preview.unlit,
    autorotate: preview.autorotate,
  });

  return (
    <div class={styles.container}>
      <Show
        when={glError()}
        fallback={
          <>
            <canvas ref={setCanvas} class={styles.canvas} />
            <Show when={pickedVoxel()}>
              {voxel => (
                <div class={styles.picked}>
                  {voxel()[0] === -1
                    ? "no voxel"
                    : `voxel ${voxel()[0]}, ${voxel()[1]}, ${voxel()[2]}`}
                </div>
              )}
            </Show>
          </>
        }
      >
        {error => <div class={styles.error}>{error()}</div>}
      </Show>
    </div>
  );
};

export default ModelView;
