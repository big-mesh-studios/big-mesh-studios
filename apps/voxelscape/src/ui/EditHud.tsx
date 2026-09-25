import styles from "./EditHud.module.css";
// Editing HUD: a crosshair at the screen centre, coloured for what the primary
// button would strike, and a bottom hotbar listing the first HOTBAR_SIZE carried
// items with the selected one highlighted. Driven by the shared `Inventory`'s
// `onChange` callback so counts and the selection refresh without wiring a
// per-item signal through the domain.
import { Component, createSignal, For, onCleanup } from "solid-js";
import { useVoxelscape } from "../voxelscape/voxelscape-context";
import { spriteIconStyle, woolIconStyle } from "./item-icon";
import { createMediaQuery } from "@big-mesh-studios/utils/create-media-query";
import { ITEMS } from "../player/items";

export const EditHud: Component = () => {
  const { inventory, editStatus, target, icons, scriptItem, npcAim, input } =
    useVoxelscape();
  const coarsePointer = createMediaQuery("(any-pointer: coarse)");
  const [hotbar, setHotbar] = createSignal(inventory.hotbarItems());
  const [selected, setSelected] = createSignal(inventory.selectedId);
  const [controllerConnected, setControllerConnected] = createSignal(
    input.gamepadConnected(),
  );
  const stopControllerListener = input.onGamepadChange(setControllerConnected);

  const refresh = (): void => {
    setHotbar(inventory.hotbarItems());
    setSelected(inventory.selectedId);
  };
  inventory.onChange = refresh;
  onCleanup(() => {
    if (inventory.onChange === refresh) {
      inventory.onChange = null;
    }
    stopControllerListener();
  });

  // Red reads as "the primary button does something to what you're looking
  // at" — a strike, or any entity you're about to use.
  const aim = (): string | undefined => {
    if (npcAim()?.action === "use") {
      return styles.strikeable;
    }
    const over = target();
    if (over === null) {
      return undefined;
    }
    return over.kind === "actor" ? styles.strikeable : styles.voxel;
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
        <For each={hotbar()}>
          {(item, slotIndex) => {
            if (!item.id) {
              // empty slot
              return <div class={styles.item} data-slot={slotIndex()} />;
            }
            const itemDef = () => ITEMS[item.id];
            const icon = () => icons()[item.id];
            const woolColor = () => itemDef()?.woolColor;
            return (
              <div
                class={[styles.item, item.id === selected() && styles.active]}
                title={item.name}
                data-slot={slotIndex()}
                onPointerDown={() => inventory.setSelected(item.id)}
              >
                {woolColor() !== undefined ? (
                  <span
                    class={styles.icon}
                    style={woolIconStyle(woolColor()!)}
                  />
                ) : icon() !== undefined ? (
                  <span class={styles.icon} style={spriteIconStyle(icon()!)} />
                ) : (
                  <span class={styles.name}>{item.name[0]}</span>
                )}
                {item.stackable && item.count > 0 && (
                  <span class={styles.count}>{item.count}</span>
                )}
                <span class={styles["slot-number"]}>{slotIndex() + 1}</span>
              </div>
            );
          }}
        </For>
        <button
          class={styles["inventory-btn"]}
          title="Open Inventory (I / E)"
          aria-label="Open Inventory"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("toggle-inventory"));
          }}
        >
          🎒
        </button>
        <button
          class={styles["places-btn"]}
          title="Open Places (B)"
          aria-label="Open Places"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("toggle-catalog"));
          }}
        >
          🧭
        </button>
        {controllerConnected() && (
          <div class={styles.controller}>controller connected</div>
        )}
        <div class={styles.status}>
          {editStatus() ||
            (scriptItem() !== null
              ? `holding ${scriptItem()!.name} — ${
                  coarsePointer() ? "use button" : "press E"
                } to use`
              : coarsePointer()
                ? "dig button to strike  •  use button to talk"
                : "click to strike  •  right-click to use")}
        </div>
      </div>
    </div>
  );
};
