import styles from "./EditHud.module.css";
// Block-editing HUD: a crosshair at the screen centre (the pick target,
// dimmed when nothing is within reach) and a bottom hotbar listing the
// collected blocks, the selected one highlighted. Driven by the shared
// `Inventory`'s `onChange` callback so counts and the selection refresh
// without wiring a per-block signal through the domain.
import { Component, createSignal, For, onCleanup } from "solid-js";
import { COLLECTABLE } from "../inventory";
import { useVoxelscape } from "../voxelscape-context";

export const EditHud: Component = () => {
  const { inventory, editStatus, inReach } = useVoxelscape();
  const order = Object.keys(COLLECTABLE).map(Number);
  const [items, setItems] = createSignal(
    order.map((id) => ({
      id,
      name: COLLECTABLE[id],
      count: inventory.count(id),
    })),
  );
  const [selected, setSelected] = createSignal(inventory.selectedId);

  const refresh = (): void => {
    setItems(
      order.map((id) => ({
        id,
        name: COLLECTABLE[id],
        count: inventory.count(id),
      })),
    );
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
            <div class={[styles.item, item.id === selected() && styles.active]}>
              <span class={styles.name}>{item.name[0]}</span>
              <span class={styles.count}>{item.count}</span>
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
