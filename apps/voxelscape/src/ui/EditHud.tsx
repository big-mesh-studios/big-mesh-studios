import styles from "./EditHud.module.css";
// Editing HUD: a crosshair at the screen centre, coloured for what the primary
// button would strike, and a bottom hotbar listing the carried items with the
// selected one highlighted. Driven by the shared `Inventory`'s `onChange`
// callback so counts and the selection refresh without wiring a per-item
// signal through the domain.
import { Component, createSignal, For, onCleanup } from "solid-js";
import { useVoxelscape } from "../voxelscape/voxelscape-context";
import { spriteIconStyle } from "./item-icon";
import { createMediaQuery } from "@big-mesh-studios/utils/create-media-query";

export const EditHud: Component = () => {
  const { inventory, editStatus, target, icons } = useVoxelscape();
  const coarsePointer = createMediaQuery("(any-pointer: coarse)");
  const [items, setItems] = createSignal(inventory.items());
  const [selected, setSelected] = createSignal(inventory.selectedId);

  const refresh = (): void => {
    setItems(inventory.items());
    setSelected(inventory.selectedId);
  };
  inventory.onChange = refresh;
  onCleanup(() => {
    if (inventory.onChange === refresh) {
      inventory.onChange = null;
    }
  });

  const aim = (): string | undefined => {
    const over = target();
    if (over === null) {
      return undefined;
    }
    return over.kind === "monster" ? styles.monster : styles.voxel;
  };

  return (
    <div class={styles.hud}>
      {/* crosshair */}
      <div class={[styles.crosshair, aim()]}>
        <div class={styles["vertical-stroke"]} />
        <div class={styles["horizontal-stroke"]} />
      </div>
      {/* hotbar */}
      <div class={styles.hotbar}>
        <For each={items()}>
          {(item) => {
            const icon = () => icons()[item.id];
            return (
              <div
                class={[styles.item, item.id === selected() && styles.active]}
                title={item.name}
                onPointerDown={() => inventory.setSelected(item.id)}
              >
                {icon() !== undefined ? (
                  <span class={styles.icon} style={spriteIconStyle(icon()!)} />
                ) : (
                  <span class={styles.name}>{item.name[0]}</span>
                )}
                {item.stackable && (
                  <span class={styles.count}>{item.count}</span>
                )}
              </div>
            );
          }}
        </For>
        <div class={styles.status}>
          {editStatus() ||
            (coarsePointer()
              ? "hold world to dig  •  tap a monster to strike"
              : "click to strike  •  right-click to use")}
        </div>
      </div>
    </div>
  );
};
