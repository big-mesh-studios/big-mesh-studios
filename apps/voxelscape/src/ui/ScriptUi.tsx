// The scripted UI a place shows one player: panels docked to a screen corner,
// each holding labels, bars, buttons, and item-sprite images. It reads the
// world's `ui` accessor on its own frame loop, the way the HUD and dialog
// overlays do, so a script that changes a panel needs no signal of its own. A
// press on a button is reported straight back to the world.
import {
  createEffect,
  createSignal,
  For,
  onSettled,
  Show,
  type Component,
} from "solid-js";
import { useVoxelscape } from "../voxelscape/voxelscape-context";
import type { UiItem, UiPanel } from "../places/script-host";
import type { ItemId } from "../player/items";
import { spriteIconStyle } from "./item-icon";
import styles from "./ScriptUi.module.css";

/** The corners a panel may dock to, in the order they are laid out. */
const ANCHORS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
] as const;

/** How full a bar is drawn, as a percentage clamped to 0..100. */
const fillPercent = (value: number, max: number): number =>
  max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));

/** A linear RGB colour as a CSS colour. */
const colourOf = (color: [number, number, number]): string =>
  `rgb(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)})`;

/** One item, drawn for the kind it is. */
const Item: Component<{ panel: string; item: UiItem }> = (props) => {
  const voxelscape = useVoxelscape();
  const item = props.item;
  if (item.kind === "label") {
    return (
      <span class={styles.label} style={{ color: colourOf(item.color) }}>
        {item.text}
      </span>
    );
  }
  if (item.kind === "bar") {
    return (
      <div class={styles.bar}>
        <Show when={item.label !== ""}>
          <span class={styles["bar-label"]}>{item.label}</span>
        </Show>
        <div class={styles["bar-track"]}>
          <div
            class={styles["bar-fill"]}
            style={{ width: `${fillPercent(item.value, item.max)}%` }}
          />
        </div>
      </div>
    );
  }
  if (item.kind === "button") {
    return (
      <button
        class={styles.button}
        onPointerDown={() => voxelscape.clickUi(props.panel, item.id)}
      >
        {item.label}
      </button>
    );
  }
  const bbox = voxelscape.icons()[item.sprite as ItemId];
  return bbox === undefined ? (
    <span class={styles["image-fallback"]}>{item.sprite}</span>
  ) : (
    <span class={styles.image} style={spriteIconStyle(bbox)} />
  );
};

/** One panel: its heading, then its items in the order the script set them. */
const Panel: Component<{ panel: UiPanel }> = (props) => (
  <div class={styles.panel}>
    <Show when={props.panel.title !== ""}>
      <div class={styles.title}>{props.panel.title}</div>
    </Show>
    <div class={styles.items}>
      <For each={props.panel.items}>
        {(item) => <Item panel={props.panel.id} item={item} />}
      </For>
    </div>
  </div>
);

/** Draws the panels a place's script shows the local player. */
export const ScriptUi: Component = () => {
  const voxelscape = useVoxelscape();
  const [panels, setPanels] = createSignal<UiPanel[]>([]);

  createEffect(
    () => panels().length > 0,
    (shown) => {
      if (shown) {
        return voxelscape.input.suspendPointerLock();
      }
    },
  );

  onSettled(() => {
    let frame = 0;
    let last = "";
    const tick = (): void => {
      const current = voxelscape.ui();
      const key = JSON.stringify(current);
      if (key !== last) {
        last = key;
        setPanels(current);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  });

  const forAnchor = (anchor: string): UiPanel[] =>
    panels().filter((panel) => panel.anchor === anchor);

  return (
    <Show when={panels().length > 0}>
      <div class={styles.layer}>
        <For each={ANCHORS}>
          {(anchor) => (
            <div class={[styles.anchor, styles[anchor]]}>
              <For each={forAnchor(anchor)}>
                {(panel) => <Panel panel={panel} />}
              </For>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
};
