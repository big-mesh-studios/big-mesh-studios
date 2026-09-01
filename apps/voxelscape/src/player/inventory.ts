// How many of each item the player holds, and which one is selected. A plain
// class with an optional change callback, so the hotbar HUD refreshes when a
// count or the selection changes. It knows nothing about what wielding an item
// does — that is the item's tool — and nothing about voxels.
import { ITEM_ORDER, ITEMS, type ItemId } from "./items";

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
  private selected: ItemId = "dirt";

  /** Adds `n` of a stackable item; an item carried alone is left as it is. */
  add(id: ItemId, n: number = 1): void {
    if (!ITEMS[id].stackable) {
      return;
    }
    this.counts.set(id, (this.counts.get(id) ?? 0) + n);
    this.emit();
  }

  /** Removes `n` of a stackable item; returns false when there weren't enough. */
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

  /** Every carried item, in hotbar order. */
  items(): InventoryItem[] {
    return ITEM_ORDER.map((id) => ({
      id,
      name: ITEMS[id].name,
      count: this.count(id),
      stackable: ITEMS[id].stackable,
    }));
  }

  /**
   * Selects a hotbar slot by its position, as the number keys do.
   *
   * @returns Whether there is a slot at that position.
   */
  selectSlot(slot: number): boolean {
    const id = ITEM_ORDER[slot];
    if (id === undefined) {
      return false;
    }
    return this.setSelected(id);
  }

  /**
   * Moves the selection one hotbar slot forward or back, wrapping around —
   * what the mouse wheel asks for.
   *
   * @returns Whether the selection changed.
   */
  selectStep(direction: 1 | -1): boolean {
    if (ITEM_ORDER.length < 2) {
      return false;
    }
    const current = ITEM_ORDER.indexOf(this.selected);
    const next =
      ITEM_ORDER[(current + direction + ITEM_ORDER.length) % ITEM_ORDER.length];
    return this.setSelected(next);
  }

  private emit(): void {
    this.onChange?.();
  }
}
