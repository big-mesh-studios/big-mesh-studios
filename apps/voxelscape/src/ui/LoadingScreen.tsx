import styles from "./LoadingScreen.module.css";
import { Component, Show } from "solid-js";
import { useVoxelscape } from "../voxelscape/voxelscape-context";
import { Toast } from "./Toasts";

/**
 * Covers the canvas until the block the player spawns in is drawn: until then
 * there is nowhere to stand and nothing to look at.
 */
export const LoadingScreen: Component = () => {
  const { loading } = useVoxelscape();

  return (
    <Show when={!loading().spawnDrawn}>
      <div class={styles.screen}>
        <div class={styles.title}>generating terrain</div>
        <div class={styles.spinner} />
      </div>
    </Show>
  );
};

/**
 * Counts in the blocks that arrive behind the fog while the player is already
 * walking around, once the spawn block has handed them the screen.
 */
export const LoadingToast: Component = () => {
  const { loading } = useVoxelscape();
  /** The share of the window that is on screen, as a CSS width. */
  const percent = (): string => `${(loading().drawn / loading().total) * 100}%`;
  const remaining = (): number => loading().total - loading().drawn;

  return (
    <Show when={loading().spawnDrawn && remaining() > 0}>
      <Toast>
        <div class={styles.track}>
          <div class={styles.bar} style={{ width: percent() }} />
        </div>
        <span>{remaining()} blocks to go</span>
      </Toast>
    </Show>
  );
};
