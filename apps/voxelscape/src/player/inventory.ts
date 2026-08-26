// Player inventory: how many of each placeable block the player holds, and
// which block is selected for placement. Breaking a collectable voxel yields
// a single "Dirt" item (grass and dirt both become dirt), so the hotbar is
// one slot; water isn't collectable and the floor isn't editable (see
// `EditingController`). A plain class with an optional change callback so the
// hotbar HUD can refresh when the count or the selection changes.
import { VOXEL_DIRT, VOXEL_GRASS } from "../world/voxel-store";

/** The block name shown for each placeable inventory item (dirt only). */
export const COLLECTABLE: Record<number, string> = {
  [VOXEL_DIRT]: "Dirt",
};

/**
 * What breaking each breakable voxel yields in the inventory: grass and dirt
 * both collect as plain dirt.
 */
export const BREAK_YIELD: Record<number, number> = {
  [VOXEL_GRASS]: VOXEL_DIRT,
  [VOXEL_DIRT]: VOXEL_DIRT,
};

/** Human-readable name of each breakable voxel (for pick feedback). */
export const BREAKABLE: Record<number, string> = {
  [VOXEL_GRASS]: "Grass",
  [VOXEL_DIRT]: "Dirt",
};

export interface InventoryItem {
  id: number;
  name: string;
  count: number;
}

export class Inventory {
  /** Called whenever a count changes or the selected block changes. */
  onChange: (() => void) | null = null;

  private counts = new Map<number, number>();
  private selected: number = VOXEL_DIRT;

  add(id: number, n: number = 1): void {
    if (!(id in COLLECTABLE)) {
      return;
    }
    this.counts.set(id, (this.counts.get(id) ?? 0) + n);
    this.emit();
  }

  /** Removes up to `n` of a block; returns false when there weren't enough. */
  remove(id: number, n: number = 1): boolean {
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

  count(id: number): number {
    return this.counts.get(id) ?? 0;
  }

  get selectedId(): number {
    return this.selected;
  }

  setSelected(id: number): boolean {
    if (!(id in COLLECTABLE)) {
      return false;
    }
    if (this.selected === id) {
      return false;
    }
    this.selected = id;
    this.emit();
    return true;
  }

  /** Every placeable block, in hotbar order. */
  items(): InventoryItem[] {
    return (Object.keys(COLLECTABLE) as unknown as number[]).map((id) => ({
      id: Number(id),
      name: COLLECTABLE[Number(id)],
      count: this.counts.get(Number(id)) ?? 0,
    }));
  }

  /**
   * Selects a hotbar slot by its position, as the number keys do.
   *
   * @returns Whether there is a slot at that position.
   */
  selectSlot(slot: number): boolean {
    const item = this.items()[slot];
    if (item === undefined) {
      return false;
    }
    return this.setSelected(item.id);
  }

  private emit(): void {
    this.onChange?.();
  }
}
