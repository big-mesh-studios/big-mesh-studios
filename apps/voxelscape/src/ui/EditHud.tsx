import styles from "./EditHud.module.css";
// Block-editing HUD: a crosshair at the screen centre (the pick target,
// dimmed when nothing is within reach) and a bottom hotbar listing the
// collected blocks and tools, the selected one highlighted. Driven by the
// shared `Inventory`'s `onChange` callback so counts and the selection
// refresh without wiring a per-block signal through the domain.
import { Component, createSignal, For, onCleanup } from "solid-js";
import { useVoxelscape } from "../voxelscape/voxelscape-context";
import { SWORD } from "../player/inventory";
import { swordIconStyle } from "./item-icon";

export const EditHud: Component = () => {
  const { inventory, editStatus, inReach } = useVoxelscape();
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

  return (
    <div class={styles.hud}>
      {/* crosshair */}
      <div class={[styles.crosshair, inReach() && styles.active]}>
        <div class={styles["vertical-stroke"]} />
        <div class={styles["horizontal-stroke"]} />
      </div>
      {/* hotbar */}
      <div class={styles.hotbar}>
        <For each={items()}>
          {(item) => (
            <div
              class={[styles.item, item.id === selected() && styles.active]}
              title={item.name}
              onPointerDown={() => inventory.setSelected(item.id)}
            >
              {item.id === SWORD ? (
                <span class={styles.icon} style={swordIconStyle()} />
              ) : (
                <span class={styles.name}>{item.name[0]}</span>
              )}
              {item.stackable && <span class={styles.count}>{item.count}</span>}
            </div>
          )}
        </For>
        <div class={styles.status}>
          {editStatus() || "tap world to dig  •  button to place"}
        </div>
      </div>
    </div>
  );
};
