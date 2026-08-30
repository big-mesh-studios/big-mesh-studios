// A placeable block in the hand. Its primary breaks the voxel under the
// crosshair and its secondary places its own block into the cell against the
// face being looked at; both run through the shared `EditingController`, which
// is what actually mutates voxels. Nothing is drawn in the hand for one.
import type { WorldVoxel } from "../../world/edit-layer";
import type { ItemId } from "../items";
import type { Tool, ToolContext, ToolPick } from "./tool";

export class BlockTool implements Tool {
  private readonly ctx: ToolContext;
  private readonly item: ItemId;
  /** The voxel this block places, and the one an inventory count is kept of. */
  private readonly voxel: number;

  constructor(ctx: ToolContext, item: ItemId, voxel: number) {
    this.ctx = ctx;
    this.item = item;
    this.voxel = voxel;
  }

  pick(): ToolPick {
    const pick = this.ctx.editing.pick();
    return {
      primary:
        pick.target === null
          ? null
          : { kind: "voxel", voxel: pick.target, distance: pick.distance },
      secondary: pick.place,
    };
  }

  primary(pick: ToolPick): string | null {
    return this.ctx.editing.breakBlock(voxelOf(pick.primary));
  }

  secondary(pick: ToolPick): string {
    return this.ctx.editing.placeBlock(
      this.item,
      this.voxel,
      voxelOf(pick.primary),
      pick.secondary,
    );
  }

  update(): void {}

  pose(): null {
    return null;
  }

  stow(): void {}
}

/** The voxel a target names, or null when the target is nothing or a monster. */
const voxelOf = (target: ToolPick["primary"]): WorldVoxel | null =>
  target !== null && target.kind === "voxel" ? target.voxel : null;
