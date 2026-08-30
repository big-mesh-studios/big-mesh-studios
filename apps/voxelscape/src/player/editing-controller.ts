// Block editing: break the targeted voxel (collecting it into the inventory)
// or place a given block into the cell against the face being looked at. All
// the actual voxel mutation flows through the shared `EditLayer` (world-voxel
// keyed, so it persists and syncs), then into the containing block's store.
// A plain domain object: it knows how to edit voxels and keep the renderer
// informed, not which item is wielded, nor that a console or network exists.
import { type Dim3, type WorldBlock } from "../world/level-data";
import {
  blockWorldVoxelRange,
  worldVoxelToLocal,
  type EditLayer,
  type WorldVoxel,
} from "../world/edit-layer";
import { pickVoxel, type VoxelPick } from "../world/picker";
import { BREAK_YIELD, ITEMS, type ItemId } from "./items";
import { type Inventory } from "./inventory";
import { VOXEL_AIR, VOXEL_GRASS, VOXEL_DIRT } from "../world/voxel-store";

export interface EditingControllerParams {
  blocks: WorldBlock[];
  layer: EditLayer;
  inventory: Inventory;
  /**
   * Called with the slot index of every block a changed voxel belongs to: the
   * one whose interior owns it, and any carrying it in their meshing border.
   * They are given together so their geometry can reach the screen together.
   */
  onBlocksEdited: (indices: number[]) => void;
  /** Called after any edit is recorded, so persistence can schedule a save. */
  onEditRecorded: () => void;
  /**
   * Called with each newly recorded edit (world voxel, id, edit time), so the
   * caller can broadcast it to connected peers as an optimistic update.
   */
  onEdit?: (w: WorldVoxel, id: number, updatedAt: number) => void;
  /** Returns the camera's world position and unit look direction. */
  getLook: () => { origin: Dim3; direction: Dim3 };
  /** Returns the world voxels the player currently occupies, or null. */
  getPlayerVoxels: () => WorldVoxel[] | null;
}

const findBlockIndex = (blocks: WorldBlock[], w: WorldVoxel): number => {
  for (let i = 0; i < blocks.length; i++) {
    const { min, max } = blockWorldVoxelRange(blocks[i].center);
    if (
      w[0] >= min[0] &&
      w[0] <= max[0] &&
      w[1] >= min[1] &&
      w[1] <= max[1] &&
      w[2] >= min[2] &&
      w[2] <= max[2]
    ) {
      return i;
    }
  }
  return -1;
};

export class EditingController {
  private readonly blocks: WorldBlock[];
  private readonly layer: EditLayer;
  private readonly inventory: Inventory;
  private readonly onBlocksEdited: (indices: number[]) => void;
  private readonly onEditRecorded: () => void;
  private readonly onEdit: (
    w: WorldVoxel,
    id: number,
    updatedAt: number,
  ) => void;
  private readonly getLook: () => { origin: Dim3; direction: Dim3 };
  private readonly getPlayerVoxels: () => WorldVoxel[] | null;

  constructor(params: EditingControllerParams) {
    this.blocks = params.blocks;
    this.layer = params.layer;
    this.inventory = params.inventory;
    this.onBlocksEdited = params.onBlocksEdited;
    this.onEditRecorded = params.onEditRecorded;
    this.onEdit = params.onEdit ?? (() => {});
    this.getLook = params.getLook;
    this.getPlayerVoxels = params.getPlayerVoxels;
  }

  /** Recomputes the voxel under the crosshair from the current camera look. */
  pick(): VoxelPick {
    const { origin, direction } = this.getLook();
    return pickVoxel(this.blocks, origin, direction);
  }

  /**
   * Breaks `target` and adds what it yields to the inventory (grass and dirt
   * both collect as dirt).
   *
   * @returns A message describing the outcome, or null when nothing was
   * broken — no target, or a voxel that yields nothing.
   */
  breakBlock(target: WorldVoxel | null): string | null {
    if (target === null) {
      return null;
    }
    const [x, y, z] = target;
    const item = BREAK_YIELD[this.readVoxel(target)];
    if (item === undefined) {
      return null;
    }
    this.applyEdit(target, VOXEL_AIR);
    this.inventory.add(item, 1);
    this.onEditRecorded();
    return `broke ${ITEMS[item].name} at ${x},${y},${z}`;
  }
  /**
   * Places `voxel` into `place`, the cell adjacent to the targeted face — the
   * block goes on the side of the voxel under the crosshair that you're
   * looking at, exactly as in Minecraft. A dirt block placed where the cell
   * above is open air becomes grass, so a fresh column shows grass where its
   * top is exposed. A cell no loaded block covers — above the world's ceiling,
   * or past the ring's outer edge — costs no item and records no edit.
   *
   * @param item The inventory item spent, one per placement.
   * @param voxel The voxel id written into the world.
   * @returns Always a message, so the player can see why a placement did not
   * happen.
   */
  placeBlock(
    item: ItemId,
    voxel: number,
    target: WorldVoxel | null,
    place: WorldVoxel | null,
  ): string {
    if (this.inventory.count(item) < 1) {
      return `no ${ITEMS[item].name.toLowerCase()} to place — break some first`;
    }
    if (target === null) {
      return "point at a block face to place against";
    }
    if (place === null || findBlockIndex(this.blocks, place) < 0) {
      return "can't build outside the world";
    }
    if (this.overlapsPlayer(place)) {
      return "can't place inside yourself";
    }
    if (this.readVoxel(place) !== VOXEL_AIR) {
      return "that space is occupied";
    }
    const [x, y, z] = place;
    const aboveAir =
      voxel === VOXEL_DIRT && this.readVoxel([x, y + 1, z]) === VOXEL_AIR;
    this.applyEdit(place, aboveAir ? VOXEL_GRASS : voxel);
    this.inventory.remove(item, 1);
    this.onEditRecorded();
    return `placed ${ITEMS[item].name} at ${x},${y},${z}`;
  }

  /** Reads the current voxel id at a world voxel from the containing store. */
  private readVoxel(w: WorldVoxel): number {
    const i = findBlockIndex(this.blocks, w);
    if (i < 0) {
      return VOXEL_AIR;
    }
    const block = this.blocks[i];
    const local = worldVoxelToLocal(block.store, block.center, w);
    return block.store.get(local[0], local[1], local[2]);
  }

  /**
   * Records the edit on the overlay and pushes it into the containing block's
   * store and GPU level, notifying the renderer switch of the slot change and
   * the caller of the newly recorded edit.
   */
  private applyEdit(w: WorldVoxel, id: number): void {
    const updatedAt = Date.now();
    if (!this.layer.set(w, id, updatedAt)) {
      return;
    }
    this.onEdit(w, id, updatedAt);
    // A voxel on a block's boundary is held by that block and by every block
    // whose meshing border reaches it — up to eight at a corner. Each culls
    // its seam faces against its own copy, so every copy is written and every
    // holder is rebuilt; writing only the one whose interior owns it leaves
    // the others culling a face against a voxel that is no longer there.
    const holders: number[] = [];
    for (let i = 0; i < this.blocks.length; i++) {
      const block = this.blocks[i];
      const [x, y, z] = worldVoxelToLocal(block.store, block.center, w);
      if (!block.store.inBoundsPadded(x, y, z)) {
        continue;
      }
      block.store.data[block.store.paddedIndex(x, y, z)] = id;
      if (id !== VOXEL_AIR) {
        block.store.mightHaveVoxels = true;
      }
      holders.push(i);
    }
    if (holders.length > 0) {
      this.onBlocksEdited(holders);
    }
  }

  private overlapsPlayer(w: WorldVoxel): boolean {
    const occupied = this.getPlayerVoxels();
    if (occupied === null) {
      return false;
    }
    return occupied.some(
      (p) => p[0] === w[0] && p[1] === w[1] && p[2] === w[2],
    );
  }
}
