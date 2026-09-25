import styles from "./EditHud.module.css";
// Editing HUD: a crosshair at the screen centre, coloured for what the primary
// button would strike, and a bottom hotbar listing the first HOTBAR_SIZE carried
// items with the selected one highlighted. Driven by the shared `Inventory`'s
// `onChange` callback so counts and the selection refresh without wiring a
// per-item signal through the domain.
import { Component, createSignal, For, onCleanup, Show } from "solid-js";
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
  const [pointerLocked, setPointerLocked] = createSignal(input.pointerLocked());
  const [pointerLockSuspended, setPointerLockSuspended] = createSignal(
    input.pointerLockSuspended(),
  );
  const [activityStarted, setActivityStarted] = createSignal(
    input.hasActivity(),
  );
  const stopControllerListener = input.onGamepadChange(setControllerConnected);
  const stopPointerLockListener = input.onPointerLockChange(setPointerLocked);
  const stopPointerLockSuspensionListener = input.onPointerLockSuspensionChange(
    setPointerLockSuspended,
  );
  const stopActivityListener = input.onActivity(() => setActivityStarted(true));

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
    stopPointerLockListener();
    stopPointerLockSuspensionListener();
    stopActivityListener();
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

  const mousePaused = (): boolean =>
    !coarsePointer() &&
    !controllerConnected() &&
    !pointerLockSuspended() &&
    !pointerLocked();
  const showControlGuide = (): boolean =>
    !activityStarted() && editStatus() === "";
  const statusText = (): string => {
    const status = editStatus();
    if (status !== "") {
      return status;
    }
    if (!activityStarted()) {
      if (coarsePointer()) {
        return "left stick to move  •  drag to look  •  buttons to act";
      }
      if (controllerConnected()) {
        return "left stick to move  •  right stick to look  •  buttons to act";
      }
      return "WASD to move  •  Space to jump  •  mouse to look  •  click to strike  •  E to use  •  I for inventory  •  B for places  •  Esc for the mouse";
    }
    if (scriptItem() !== null) {
      return `holding ${scriptItem()!.name} — ${
        coarsePointer()
          ? "use button"
          : controllerConnected()
            ? "press B"
            : "press E"
      } to use`;
    }
    if (coarsePointer()) {
      return "dig button to strike  •  use button to talk";
    }
    if (controllerConnected()) {
      return "A to jump  •  B to use  •  X to dig  •  LT to place or guard";
    }
    return "click to strike  •  right-click to use";
  };

  return (
    <div class={styles.hud}>
      {/* crosshair */}
      <div
        class={[
          styles.crosshair,
          aim(),
          mousePaused() ? styles.paused : undefined,
        ]}
      >
        <div class={styles["vertical-stroke"]} />
        <div class={styles["horizontal-stroke"]} />
      </div>
      <Show when={mousePaused()}>
        <div class={styles["pointer-hint"]} role="status">
          Click to play
        </div>
      </Show>
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
          title="Open Inventory (I)"
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
        <div
          class={[styles.status, showControlGuide() && styles.guide]}
          aria-live="polite"
        >
          {statusText()}
        </div>
      </div>
    </div>
  );
};
