// A bucket in the hand: Minecraft's water and lava bucket rolled into one
// carried tool, whose fill lives on the tool rather than in the inventory.
// Its secondary use, aimed at a fluid source (level 0 water or lava), scoops
// that source into the bucket; aimed at an open cell while full, it pours the
// held fluid out as a source block and empties itself. Dipping into flowing
// water takes nothing, and pouring always places a source, exactly as a
// Minecraft bucket behaves.
import type { FluidKind } from "../../world/fluid";
import type { WorldVoxel } from "../../world/edit-layer";
import { clamp } from "../../utils";
import { easeInOut, easeOut, lerpPose, type SwingPose } from "../swing";
import type { Tool, ToolContext, ToolPick } from "./tool";

/** The bucket at rest, lower right of the first-person view like the sword. */
const REST_POSE: SwingPose = {
  x: 0.5,
  y: -0.3,
  z: -0.9,
  roll: -0.06,
  // Held by the top of its handle: the grip is up from the card's centre.
  handle: { x: 0, y: -0.42, z: 0 },
};

/** The bucket tilted, as a scoop or pour dips it toward the world. */
const TILT_POSE: SwingPose = {
  x: 0.46,
  y: -0.22,
  z: -0.72,
  roll: (24 * Math.PI) / 180,
  handle: { x: 0, y: -0.42, z: 0 },
};

/** How long a scoop or pour dips the bucket, in seconds. */
const DIP_TIME = 0.18;
/** How long the bucket takes to settle back to rest, in seconds. */
const RECOVER_TIME = 0.3;

export class BucketTool implements Tool {
  private readonly ctx: ToolContext;
  /** What the bucket holds, or null when it is empty. */
  private held: FluidKind | null = null;
  /**
   * Called after the bucket's fill changes, so the caller can swap the held
   * model and hotbar icon to the empty/water/lava sprite.
   */
  onFillChange: (() => void) | null = null;

  /** Seconds into the current dip, to time the motion against. */
  private dipTime = 0;
  /** Whether a scoop-or-pour dip is currently running. */
  private dipping = false;

  constructor(ctx: ToolContext) {
    this.ctx = ctx;
  }

  /** What the bucket currently holds, for the HUD or a message. */
  get fill(): FluidKind | null {
    return this.held;
  }

  private notify(): void {
    this.onFillChange?.();
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
    return this.secondary(pick);
  }

  secondary(pick: ToolPick): string | null {
    if (this.held === null) {
      return this.fillFrom(pick.primary);
    }
    return this.pourOut(pick.secondary);
  }

  /** Scoops the source under the crosshair, if there is one, into the bucket. */
  private fillFrom(target: ToolPick["primary"]): string | null {
    const voxel: WorldVoxel | null =
      target !== null && target.kind === "voxel" ? target.voxel : null;
    const kind = this.ctx.editing.sourceKind(voxel);
    if (kind === null || !this.ctx.editing.isScoopable(voxel)) {
      return "nothing to scoop — fill it at a water or lava source";
    }
    if (!this.ctx.editing.scoop(voxel)) {
      return "couldn't scoop that";
    }
    this.held = kind;
    this.dip();
    this.notify();
    return `bucket filled with ${kind}`;
  }

  /** Pours the held fluid into the cell against the targeted face, then empties. */
  private pourOut(place: WorldVoxel | null): string | null {
    if (this.held === null) {
      return null;
    }
    if (!this.ctx.editing.pourFluid(this.held, place)) {
      return "can't pour that here";
    }
    const poured = this.held;
    this.held = null;
    this.dip();
    this.notify();
    return `emptied ${poured} from the bucket`;
  }

  /** Starts the quick scoop-or-pour dip. */
  private dip(): void {
    this.dipping = true;
    this.dipTime = 0;
  }

  update(dt: number): void {
    if (!this.dipping) {
      return;
    }
    this.dipTime += dt;
    if (this.dipTime >= DIP_TIME + RECOVER_TIME) {
      this.dipping = false;
    }
  }

  pose(): SwingPose {
    if (!this.dipping) {
      return REST_POSE;
    }
    if (this.dipTime < DIP_TIME) {
      return lerpPose(REST_POSE, TILT_POSE, easeOut(this.dipTime / DIP_TIME));
    }
    const settle = (this.dipTime - DIP_TIME) / RECOVER_TIME;
    if (settle < 1) {
      return lerpPose(TILT_POSE, REST_POSE, easeInOut(clamp(settle, 0, 1)));
    }
    return REST_POSE;
  }

  stow(): void {
    this.dipping = false;
  }
}
