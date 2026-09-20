// Minecraft-style inventory overlay: a grid of all carried items plus the
// current hotbar strip at the bottom. Press E / I to open and close it. Click
// an inventory item then click a hotbar slot to place/swap it there.
import { Component, createSignal, For, onCleanup, Show } from "solid-js";
import { useVoxelscape } from "../voxelscape/voxelscape-context";
import { spriteIconStyle, woolIconStyle } from "./item-icon";
import { ITEMS, type ItemId } from "../player/items";
import type { InventoryItem } from "../player/inventory";
import styles from "./InventoryHud.module.css";

export const InventoryHud: Component = () => {
  const { inventory, icons } = useVoxelscape();
  const [open, setOpen] = createSignal(false);
  const [items, setItems] = createSignal(inventory.items());
  const [hotbar, setHotbar] = createSignal(inventory.hotbarItems());
  const [selected, setSelected] = createSignal(inventory.selectedId);
  /** The item the player clicked on first (waiting to be placed in hotbar). */
  const [pendingItem, setPendingItem] = createSignal<ItemId | null>(null);

  const refresh = (): void => {
    setItems(inventory.items());
    setHotbar(inventory.hotbarItems());
    setSelected(inventory.selectedId);
  };

  // Daisy-chain onto the existing onChange so both EditHud and InventoryHud receive updates.
  const previousOnChange = inventory.onChange;
  inventory.onChange = () => {
    previousOnChange?.();
    refresh();
  };
  onCleanup(() => {
    inventory.onChange = previousOnChange;
  });

  // Keyboard: E or I toggles the inventory, Escape closes it.
  const handleKey = (e: KeyboardEvent): void => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;
    if (e.code === "KeyI" || e.code === "KeyE") {
      setOpen((v) => !v);
      setPendingItem(null);
      e.preventDefault();
    }
    if (e.code === "Escape" && open()) {
      setOpen(false);
      setPendingItem(null);
      e.preventDefault();
    }
  };
  const handleToggle = (): void => {
    setOpen((v) => !v);
    setPendingItem(null);
  };
  window.addEventListener("keydown", handleKey);
  window.addEventListener("toggle-inventory", handleToggle);
  onCleanup(() => {
    window.removeEventListener("keydown", handleKey);
    window.removeEventListener("toggle-inventory", handleToggle);
  });

  /** Renders a single item cell (shared between grid and hotbar strip). */
  const ItemCell = (props: {
    item: InventoryItem | null;
    class?: string;
    onClick?: () => void;
    dimmed?: boolean;
    highlighted?: boolean;
  }) => {
    if (!props.item || !props.item.id) {
      return (
        <div
          class={[styles.cell, styles.empty, props.class]
            .filter(Boolean)
            .join(" ")}
          onClick={props.onClick}
        />
      );
    }
    const def = ITEMS[props.item.id];
    const icon = () => icons()[props.item!.id];
    const wc = def?.woolColor;
    return (
      <div
        class={[
          styles.cell,
          props.highlighted && styles["cell-highlighted"],
          props.dimmed && styles["cell-dimmed"],
          props.class,
        ]
          .filter(Boolean)
          .join(" ")}
        title={props.item.name}
        onClick={props.onClick}
      >
        {wc !== undefined ? (
          <span class={styles["cell-icon"]} style={woolIconStyle(wc)} />
        ) : icon() !== undefined ? (
          <span class={styles["cell-icon"]} style={spriteIconStyle(icon()!)} />
        ) : (
          <span class={styles["cell-letter"]}>{props.item.name[0]}</span>
        )}
        {props.item.stackable && props.item.count > 0 && (
          <span class={styles["cell-count"]}>{props.item.count}</span>
        )}
      </div>
    );
  };

  /** Click an inventory item — mark it as pending for hotbar placement. */
  const handleInventoryClick = (id: ItemId) => {
    if (pendingItem() === id) {
      setPendingItem(null);
    } else {
      setPendingItem(id);
    }
  };

  /** Click a hotbar slot in the inventory view — place the pending item there. */
  const handleHotbarSlotClick = (slot: number, existingId: ItemId | null) => {
    const pending = pendingItem();
    if (pending !== null) {
      inventory.setHotbarSlot(slot, pending);
      setPendingItem(null);
    } else if (existingId !== null) {
      setPendingItem(existingId);
    }
  };

  return (
    <Show when={open()}>
      <div
        class={styles.overlay}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setOpen(false);
            setPendingItem(null);
          }
        }}
      >
        <div class={styles.panel} onClick={(e) => e.stopPropagation()}>
          <div class={styles.header}>
            <span class={styles.title}>Inventory</span>
            <button
              class={styles.close}
              onClick={() => {
                setOpen(false);
                setPendingItem(null);
              }}
              aria-label="Close inventory"
            >
              ✕
            </button>
          </div>

          {/* ── Full inventory grid ── */}
          <div class={styles.grid}>
            <For each={items()}>
              {(item) => (
                <ItemCell
                  item={item}
                  highlighted={pendingItem() === item.id}
                  onClick={() => handleInventoryClick(item.id)}
                />
              )}
            </For>
          </div>

          {/* ── Hotbar strip at the bottom ── */}
          <div class={styles.divider} />
          <div class={styles["hotbar-strip"]}>
            <For each={hotbar()}>
              {(item, i) => (
                <ItemCell
                  item={item.id ? item : null}
                  highlighted={
                    item.id !== null &&
                    item.id !== undefined &&
                    item.id === selected()
                  }
                  dimmed={pendingItem() !== null && item.id === pendingItem()}
                  onClick={() => handleHotbarSlotClick(i(), item.id ?? null)}
                />
              )}
            </For>
          </div>

          {/* ── Help text ── */}
          <div class={styles.help}>
            {pendingItem() !== null
              ? `Click a hotbar slot to place "${ITEMS[pendingItem()!]?.name}"`
              : "Click an item, then a hotbar slot to assign it · Press I or E to close"}
          </div>
        </div>
      </div>
    </Show>
  );
};
