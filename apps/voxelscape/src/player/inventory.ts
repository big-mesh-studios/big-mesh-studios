// How many of each item the player holds, and which one is selected. A plain
// class with an optional change callback, so the hotbar HUD refreshes when a
// count or the selection changes. It knows nothing about what wielding an item
// does — that is the item's tool — and nothing about voxels.
//
// The hotbar holds up to HOTBAR_SIZE slots; any item the player carries can be
// placed into a hotbar slot via the inventory screen. Items not in a hotbar
// slot are still carried and accessible from the inventory overlay.
import { ITEM_ORDER, ITEMS, type ItemId } from "./items";

/** How many slots the bottom hotbar shows. */
export const HOTBAR_SIZE = 5;

export interface InventoryItem {
  id: ItemId;
  name: string;
  count: number;
  /** Whether more than one can be carried; a tool is always carried alone. */
  stackable: boolean;
}

export class Inventory {
  /** Called whenever a count changes or the selected item changes. */
  onChange: (() => void) | null = null;

  private counts = new Map<ItemId, number>();
  private selected: ItemId = ITEM_ORDER[0]!;
  /**
   * The hotbar slots: up to HOTBAR_SIZE item ids (one per slot), or null for
   * an empty slot.
   */
  private hotbar: Array<ItemId | null> = Array.from(
    { length: HOTBAR_SIZE },
    (_, i) => (i < 2 ? (ITEM_ORDER[i] ?? null) : null),
  );

  /**
   * Adds `n` of a stackable item. If the item is not currently in any hotbar
   * slot and there is a blank slot available, it automatically places the item
   * into the first blank hotbar slot and autoselects it.
   */
  add(id: ItemId, n: number = 1): void {
    if (!ITEMS[id].stackable) {
      return;
    }
    const previousCount = this.counts.get(id) ?? 0;
    this.counts.set(id, previousCount + n);

    // If item is not in hotbar and there is an empty slot, assign and autoselect
    if (!this.hotbar.includes(id)) {
      const emptySlot = this.hotbar.indexOf(null);
      if (emptySlot !== -1) {
        this.hotbar[emptySlot] = id;
        this.selected = id;
      }
    }

    this.emit();
  }

  /** Removes `n` of a stackable item; clears hotbar slot if count drops to 0. */
  remove(id: ItemId, n: number = 1): boolean {
    if (!ITEMS[id].stackable) {
      return false;
    }
    const have = this.counts.get(id) ?? 0;
    if (have < n) {
      return false;
    }
    const left = have - n;
    if (left === 0) {
      this.counts.delete(id);
      const slot = this.hotbar.indexOf(id);
      if (slot !== -1) {
        this.hotbar[slot] = null;
        if (this.selected === id) {
          const first = this.hotbar.find((item) => item !== null);
          if (first !== undefined && first !== null) {
            this.selected = first;
          }
        }
      }
    } else {
      this.counts.set(id, left);
    }
    this.emit();
    return true;
  }

  /** How many of an item is held; an item carried alone is always one. */
  count(id: ItemId): number {
    return ITEMS[id].stackable ? (this.counts.get(id) ?? 0) : 1;
  }

  get selectedId(): ItemId {
    return this.selected;
  }

  /** Selects an item; returns whether the selection changed. */
  setSelected(id: ItemId): boolean {
    if (this.selected === id) {
      return false;
    }
    this.selected = id;
    this.emit();
    return true;
  }

  /** The current hotbar slots (up to HOTBAR_SIZE entries, some may be null). */
  hotbarSlots(): Array<ItemId | null> {
    return [...this.hotbar];
  }

  /**
   * Places `itemId` into hotbar slot `slot` (0-indexed). If the item is
   * already in another hotbar slot, the two slots swap. If `itemId` is null
   * the slot is cleared. Emits onChange.
   */
  setHotbarSlot(slot: number, itemId: ItemId | null): void {
    if (slot < 0 || slot >= HOTBAR_SIZE) return;
    if (itemId !== null) {
      const existingSlot = this.hotbar.indexOf(itemId);
      if (existingSlot !== -1 && existingSlot !== slot) {
        const displaced = this.hotbar[slot];
        this.hotbar[existingSlot] = displaced;
      }
    }
    this.hotbar[slot] = itemId;
    if (!this.hotbar.includes(this.selected)) {
      const first = this.hotbar.find((id) => id !== null);
      if (first !== undefined && first !== null) {
        this.selected = first;
      }
    }
    this.emit();
  }

  /** Every carried item (with count > 0 for stackables, or always for tools), in ITEM_ORDER order. */
  items(): InventoryItem[] {
    return ITEM_ORDER.filter((id) => this.count(id) > 0).map((id) => ({
      id,
      name: ITEMS[id].name,
      count: this.count(id),
      stackable: ITEMS[id].stackable,
    }));
  }

  /** The items currently in hotbar slots (in slot order). */
  hotbarItems(): InventoryItem[] {
    return this.hotbar.map((id) =>
      id !== null
        ? {
            id,
            name: ITEMS[id].name,
            count: this.count(id),
            stackable: ITEMS[id].stackable,
          }
        : {
            id: null as unknown as ItemId,
            name: "",
            count: 0,
            stackable: true,
          },
    );
  }

  /** Selects a hotbar slot by its position, as the number keys do. */
  selectSlot(slot: number): boolean {
    const id = this.hotbar[slot];
    if (id === undefined || id === null) {
      return false;
    }
    return this.setSelected(id);
  }

  /** Moves selection to the next or previous occupied hotbar slot. */
  selectStep(direction: 1 | -1): boolean {
    const occupied = this.hotbar
      .map((id, i) => ({ id, i }))
      .filter(({ id }) => id !== null);
    if (occupied.length < 2) {
      return false;
    }
    const currentIndex = occupied.findIndex(({ id }) => id === this.selected);
    const nextIndex =
      (currentIndex + direction + occupied.length) % occupied.length;
    const next = occupied[nextIndex]!.id!;
    return this.setSelected(next);
  }

  private emit(): void {
    this.onChange?.();
  }
}
