import { Component, createSignal, useContext } from "solid-js";
import { StackerContext } from "./context";
import { createModelCanvas } from "./model-canvas";
import styles from "./StackerModelRenderer.module.css";

const StackerModelRenderer: Component = () => {
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
      {glError() === undefined ? (
        <>
          <canvas ref={setCanvas} class={styles.canvas} />
          {pickedVoxel() !== undefined && (
            <div class={styles.picked}>
              {pickedVoxel()![0] === -1
                ? "no voxel"
                : `voxel ${pickedVoxel()![0]}, ${pickedVoxel()![1]}, ${pickedVoxel()![2]}`}
            </div>
          )}
        </>
      ) : (
        <div class={styles.error}>{glError()}</div>
      )}
    </div>
  );
};

export default StackerModelRenderer;
