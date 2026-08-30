// Player inventory: how many of each placeable block the player holds, which
// block is selected for placement, and the non-stackable tools carried beside
// them. Breaking a collectable voxel yields a single item (grass and dirt both
// become dirt; cloud becomes cloud), water isn't collectable and the floor
// isn't editable (see `EditingController`). The player starts carrying the
// bronze sword, which never stacks and is never consumed. A plain class with an
// optional change callback so the hotbar HUD can refresh when the count or the
// selection changes.
import { VOXEL_CLOUD, VOXEL_DIRT, VOXEL_GRASS } from "../world/voxel-store";

/** The block name shown for each placeable inventory item. */
export const COLLECTABLE: Record<number, string> = {
  [VOXEL_DIRT]: "Dirt",
  [VOXEL_CLOUD]: "Cloud",
};

/** The id of the sword every player starts with. */
export const SWORD = 4;

/**
 * The name shown for each non-stackable tool. A tool is carried exactly once,
 * cannot be added to or removed, and is never a block to place.
 */
export const TOOLS: Record<number, string> = {
  [SWORD]: "Sword",
};

/**
 * What breaking each breakable voxel yields in the inventory: grass and dirt
 * both collect as plain dirt.
 */
export const BREAK_YIELD: Record<number, number> = {
  [VOXEL_GRASS]: VOXEL_DIRT,
  [VOXEL_DIRT]: VOXEL_DIRT,
  [VOXEL_CLOUD]: VOXEL_CLOUD,
};

/** Human-readable name of each breakable voxel (for pick feedback). */
export const BREAKABLE: Record<number, string> = {
  [VOXEL_GRASS]: "Grass",
  [VOXEL_DIRT]: "Dirt",
  [VOXEL_CLOUD]: "Cloud",
};

export interface InventoryItem {
  id: number;
  name: string;
  count: number;
  /** Whether more than one can be carried; tools are always carried alone. */
  stackable: boolean;
}

export class Inventory {
  /** Called whenever a count changes or the selected block changes. */
  onChange: (() => void) | null = null;

  private counts = new Map<number, number>();
  private selected: number = VOXEL_DIRT;

  constructor() {
    this.counts.set(SWORD, 1);
  }

  add(id: number, n: number = 1): void {
    if (!(id in COLLECTABLE) || id in TOOLS) {
      return;
    }
    this.counts.set(id, (this.counts.get(id) ?? 0) + n);
    this.emit();
  }

  /** Removes up to `n` of a block; returns false when there weren't enough. */
  remove(id: number, n: number = 1): boolean {
    if (id in TOOLS) {
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

  count(id: number): number {
    return this.counts.get(id) ?? 0;
  }

  get selectedId(): number {
    return this.selected;
  }

  setSelected(id: number): boolean {
    if (!(id in COLLECTABLE) && !(id in TOOLS)) {
      return false;
    }
    if (this.selected === id) {
      return false;
    }
    this.selected = id;
    this.emit();
    return true;
  }

  /** Every carried item, collectable blocks in hotbar order then the tools. */
  items(): InventoryItem[] {
    const collectable = (Object.keys(COLLECTABLE) as unknown as number[]).map(
      (id) => {
        const numeric = Number(id);
        return {
          id: numeric,
          name: COLLECTABLE[numeric],
          count: this.counts.get(numeric) ?? 0,
          stackable: true,
        };
      },
    );
    const tools = (Object.keys(TOOLS) as unknown as number[]).map((id) => {
      const numeric = Number(id);
      return {
        id: numeric,
        name: TOOLS[numeric],
        count: 1,
        stackable: false,
      };
    });
    return [...collectable, ...tools];
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

  /**
   * Moves the selection one hotbar slot forward or back, wrapping around —
   * what the mouse wheel asks for.
   *
   * @returns Whether the selection changed.
   */
  selectStep(direction: 1 | -1): boolean {
    const items = this.items();
    if (items.length < 2) {
      return false;
    }
    const current = items.findIndex((item) => item.id === this.selected);
    const next = items[(current + direction + items.length) % items.length];
    if (next === undefined) {
      return false;
    }
    return this.setSelected(next.id);
  }

  private emit(): void {
    this.onChange?.();
  }
}
