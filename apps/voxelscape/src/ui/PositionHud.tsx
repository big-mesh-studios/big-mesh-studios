import { createSignal, onSettled, type Component } from "solid-js";
import styles from "./PositionHud.module.css";
import { useVoxelscape } from "../voxelscape/voxelscape-context";

/**
 * The player's coordinates, read each animation frame straight off the moving
 * body: the engine mutates `player.position` as the player walks, so no signal
 * exists to subscribe to and none is needed — this reads the position and asks
 * for the next frame, which is what the readout has to do to keep up.
 */
export const PositionHud: Component = () => {
  const { player } = useVoxelscape();
  const [line, setLine] = createSignal("");

  onSettled(() => {
    let frame = 0;
    const next = (): void => {
      const p = player.position;
      setLine(`${Math.round(p.x)}  ${Math.round(p.y)}  ${Math.round(p.z)}`);
      frame = requestAnimationFrame(next);
    };
    frame = requestAnimationFrame(next);
    return () => cancelAnimationFrame(frame);
  });

  return <div class={styles.coords}>{line()}</div>;
};
