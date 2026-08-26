import styles from "./LoadingScreen.module.css";
import { Component, Show } from "solid-js";
import { useVoxelscape } from "../voxelscape/voxelscape-context";

/**
 * Two views of the same progress, because the player is let into the world
 * long before it is finished. Until the block they spawn in is on screen
 * there is nowhere to stand and nothing to look at, so the canvas is covered.
 * From then on the remaining blocks arrive behind the fog while they walk
 * around, and a corner readout counts those in without taking the screen back.
 */
export const LoadingScreen: Component = () => {
  const { loading } = useVoxelscape();
  /** The share of the window that is on screen, as a CSS width. */
  const percent = (): string =>
    `${(loading().blocksDrawn / loading().blocksTotal) * 100}%`;
  const remaining = (): number => loading().blocksTotal - loading().blocksDrawn;

  return (
    <Show when={remaining() > 0}>
      <Show
        when={loading().ready}
        fallback={
          <div class={styles.screen}>
            <div class={styles.title}>generating terrain</div>
            <div class={styles.spinner} />
          </div>
        }
      >
        <div class={styles.chip}>
          <div class={styles.track}>
            <div class={styles.bar} style={{ width: percent() }} />
          </div>
          <span class={styles.count}>{remaining()} blocks to go</span>
        </div>
      </Show>
    </Show>
  );
};
