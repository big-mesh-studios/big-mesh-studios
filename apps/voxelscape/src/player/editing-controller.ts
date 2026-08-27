// Minecraft-style block editing: break a targeted voxel (collecting it into
// the inventory) or place the selected block into the adjacent cell. All the
// actual voxel mutation flows through the shared `EditLayer` (world-voxel
// keyed, so it persists and syncs), then into the containing block's store
// and GPU level. A plain domain object: it knows how to edit voxels and keep
// the renderers informed, not that a console or network exists.
import {
  syncLevelFromStore,
  type Dim3,
  type WorldBlock,
} from "../world/level-data";
import {
  blockWorldVoxelRange,
  worldVoxelToLocal,
  type EditLayer,
  type WorldVoxel,
} from "../world/edit-layer";
import { pickVoxel, type VoxelPick } from "../world/picker";
import { BREAK_YIELD, COLLECTABLE, type Inventory } from "./inventory";
import { VOXEL_AIR, VOXEL_GRASS, VOXEL_DIRT } from "../world/voxel-store";

export interface EditingControllerParams {
  blocks: WorldBlock[];
  layer: EditLayer;
  inventory: Inventory;
  surfaceOnly: boolean;
  /** Called with a block's slot index after one of its voxels changes. */
  onBlockEdited: (index: number) => void;
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
  private readonly surfaceOnly: boolean;
  private readonly onBlockEdited: (index: number) => void;
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
    this.surfaceOnly = params.surfaceOnly;
    this.onBlockEdited = params.onBlockEdited;
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
   * Breaks the targeted voxel and adds its inventory yield (grass and dirt
   * both collect as dirt). Returns a message describing the outcome, or null
   * when nothing was broken.
   */
  breakBlock(): string | null {
    const pick = this.pick();
    if (pick.target === null) {
      return null;
    }
    const [x, y, z] = pick.target;
    const id = this.readVoxel(pick.target);
    const yieldId = BREAK_YIELD[id];
    if (yieldId === undefined) {
      return null;
    }
    if (this.isFloor(pick.target)) {
      return "can't break the world floor";
    }
    this.applyEdit(pick.target, VOXEL_AIR);
    this.inventory.add(yieldId, 1);
    this.onEditRecorded();
    return `broke ${COLLECTABLE[yieldId]} at ${x},${y},${z}`;
  }
  /**
   * Places the selected block into the cell adjacent to the targeted face —
   * the block goes on the side of the voxel under the crosshair that you're
   * looking at, exactly as in Minecraft. A dirt block placed where the cell
   * above is open air becomes grass, so a fresh column shows grass where its
   * top is exposed. A cell no loaded block covers — above the world's ceiling,
   * or past the ring's outer edge — costs no item and records no edit. Always
   * returns a message so the player can see why a placement did not happen.
   */
  placeBlock(): string {
    const selected = this.inventory.selectedId;
    if (!(selected in COLLECTABLE)) {
      return "nothing selected to place";
    }
    if (this.inventory.count(selected) < 1) {
      return `no ${COLLECTABLE[selected].toLowerCase()} to place — break some first`;
    }
    const pick = this.pick();
    if (pick.target === null) {
      return "point at a block face to place against";
    }
    const place = pick.place;
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
      selected === VOXEL_DIRT && this.readVoxel([x, y + 1, z]) === VOXEL_AIR;
    const placedId = aboveAir ? VOXEL_GRASS : selected;
    this.applyEdit(place, placedId);
    this.inventory.remove(selected, 1);
    this.onEditRecorded();
    return `placed ${COLLECTABLE[selected]} at ${x},${y},${z}`;
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
    const i = findBlockIndex(this.blocks, w);
    if (i < 0) {
      return;
    }
    const block = this.blocks[i];
    const local = worldVoxelToLocal(block.store, block.center, w);
    if (!block.store.inBounds(local[0], local[1], local[2])) {
      return;
    }
    block.store.set(local[0], local[1], local[2], id);
    syncLevelFromStore(block.level, block.store, {
      surfaceOnly: this.surfaceOnly,
    });
    this.onBlockEdited(i);
  }

  /** Whether a voxel sits in the bottom row of its block (the world floor). */
  private isFloor(w: WorldVoxel): boolean {
    for (const block of this.blocks) {
      const local = worldVoxelToLocal(block.store, block.center, w);
      if (
        block.store.inBounds(local[0], local[1], local[2]) &&
        local[1] === 0
      ) {
        return true;
      }
    }
    return false;
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
