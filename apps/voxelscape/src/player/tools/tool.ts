// What wielding a hotbar item means. Each item resolves to one of these, so
// the frame loop drives whatever is held without asking which item it is: it
// picks, hands the pick to whichever button fired, and advances the tool.
import type { Vector3D } from "@big-mesh-studios/maths";
import type { AimTarget } from "../../places/figure-pick";
import type { WorldVoxel } from "../../world/edit-layer";
import type { Dim3 } from "../../world/level-data";
import type { InputSnapshot } from "../create-input";
import type { EditingController } from "../editing-controller";
import type { SwingPose } from "../swing";

/** What the crosshair is over: a strikeable body, or a voxel's near face. */
export type Target =
  | { kind: "actor"; id: string; distance: number }
  | { kind: "voxel"; voxel: WorldVoxel; distance: number };

/** Both of a frame's targets, one per button. */
export interface ToolPick {
  /** What the primary button would strike. */
  primary: Target | null;
  /** The cell the secondary button would fill, before any check that it may. */
  secondary: WorldVoxel | null;
}

/** Everything the tools are built against, assembled once in `createVoxelscape`. */
export interface ToolContext {
  /** Voxel picking and every voxel mutation. */
  editing: EditingController;
  /** The camera's world position and unit look direction. */
  look: () => { origin: Dim3; direction: Dim3 };
  /** The player's world position, which a swing knocks a struck body away from. */
  position: () => Vector3D;
  /**
   * Every body in the world a swing may land on instead of a voxel — whatever
   * a place's own script has put there. A tool never asks what one is; only
   * where it stands and how big it is.
   */
  strikeables: () => Iterable<AimTarget>;
  /**
   * Tells the world that a weapon struck the body `id` for `amount` hit
   * points, from an attacker standing at (`attackerX`, `attackerZ`). What
   * that means — whether it is hurt at all, by how much, what happens at
   * zero — is entirely the place's own rules to decide.
   */
  strike: (
    id: string,
    amount: number,
    attackerX: number,
    attackerZ: number,
  ) => void;
  /** Raises or lowers the player's guard. */
  setGuarding: (raised: boolean) => void;
}

export interface Tool {
  /** This frame's targets, computed once and handed to whichever button fired. */
  pick(): ToolPick;
  /**
   * Strikes what the crosshair is over and starts whatever animation the
   * strike has.
   *
   * @returns A line describing the outcome, or null when there is nothing to
   * report.
   */
  primary(pick: ToolPick): string | null;
  /**
   * Uses the tool on this frame's pick.
   *
   * @returns A line describing the outcome, or null when there is nothing to
   * report.
   */
  secondary(pick: ToolPick): string | null;
  /** Advances the tool by `dt` seconds and applies the buttons it holds. */
  update(dt: number, buttons: InputSnapshot): void;
  /** Where the hand holds this tool now, or null when it draws nothing. */
  pose(): SwingPose | null;
  /** Puts the tool away: it stops being wielded, and holds nothing down. */
  stow(): void;
}
