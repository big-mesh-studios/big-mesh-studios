// The hearts HUD: the player's health as an Ocarina-of-Time row of hearts in
// the bottom-left corner of the screen, one heart per two hit points, a hit
// that cuts through a heart leaving it half full. Subscribes to the shared
// `PlayerHealth`'s change callback exactly as the hotbar subscribes to the
// inventory, so a hit or a respawn redraws it. On coarse pointers it sits
// above the touch joystick, which owns the same corner.
import { Component, createSignal, For, onCleanup } from "solid-js";
import { createMediaQuery } from "@big-mesh-studios/utils/create-media-query";
import styles from "./HealthHud.module.css";
import { useVoxelscape } from "../voxelscape/voxelscape-context";
import { heartStates, type HeartFill } from "../player/health";

// The classic heart, split down the middle into two mirrored halves so a
// half-heart is one filled half beside one empty one — no clip mask needed.
// The full silhouette underneath is the empty heart and shows as the dark
// outline wherever the halves leave it bare.
const OUTLINE_PATH =
  "M16 28 C 6 22, 0 16, 0 10 C 0 4.5, 4.5 1, 8.5 1 C 11 1, 14 2.5, 16 6 C 18 2.5, 21 1, 23.5 1 C 27.5 1, 32 4.5, 32 10 C 32 16, 26 22, 16 28 Z";
const LEFT_PATH =
  "M16 28 C 6 22, 0 16, 0 10 C 0 4.5, 4.5 1, 8.5 1 C 11 1, 14 2.5, 16 6 L 16 28 Z";
const RIGHT_PATH =
  "M16 6 C 18 2.5, 21 1, 23.5 1 C 27.5 1, 32 4.5, 32 10 C 32 16, 26 22, 16 28 L 16 6 Z";

/** One heart, drawn with the fill its hit points call for. */
const Heart = (props: { fill: HeartFill }) => (
  <svg viewBox="0 0 32 32" class={styles.heart} aria-hidden="true">
    <path d={OUTLINE_PATH} class={styles["heart-outline"]} />
    <path
      d={LEFT_PATH}
      class={props.fill >= 1 ? styles["heart-red"] : styles["heart-empty"]}
    />
    <path
      d={RIGHT_PATH}
      class={props.fill >= 2 ? styles["heart-red"] : styles["heart-empty"]}
    />
    {props.fill >= 1 && (
      <circle cx="10" cy="7" r="1.8" class={styles["heart-glint"]} />
    )}
  </svg>
);

export const HealthHud: Component = () => {
  const { health } = useVoxelscape();
  const coarse = createMediaQuery("(any-pointer: coarse)");
  const [hearts, setHearts] = createSignal<HeartFill[]>(
    heartStates(health.hp, health.maxHp),
  );

  const refresh = (): void => {
    setHearts(heartStates(health.hp, health.maxHp));
  };
  health.onChange = refresh;
  onCleanup(() => {
    if (health.onChange === refresh) {
      health.onChange = null;
    }
  });

  return (
    <div class={[styles.health, coarse() && styles["on-coarse"]]}>
      <For each={hearts()}>{(fill) => <Heart fill={fill} />}</For>
    </div>
  );
};
