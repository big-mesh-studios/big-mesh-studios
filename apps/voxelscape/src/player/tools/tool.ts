// What wielding a hotbar item means. Each item resolves to one of these, so
// the frame loop drives whatever is held without asking which item it is: it
// picks, hands the pick to whichever button fired, and advances the tool.
import type { Vector3D } from "@big-mesh-studios/maths";
import type { MonsterSnapshot } from "../../monsters/monster";
import type { WorldVoxel } from "../../world/edit-layer";
import type { Dim3 } from "../../world/level-data";
import type { InputSnapshot } from "../create-input";
import type { EditingController } from "../editing-controller";
import type { SwingPose } from "../swing";

/** What the crosshair is over: a monster's body, or a voxel's near face. */
export type Target =
  | { kind: "monster"; id: string; distance: number }
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
  /** The player's world position, which a swing knocks a monster away from. */
  position: () => Vector3D;
  /** Every monster the local simulation currently holds. */
  monsters: () => Iterable<MonsterSnapshot>;
  /** Deals damage to a monster this client owns; false when another owns it. */
  damageMonster: (id: string, amount: number) => boolean;
  /** Flashes a monster the attacker hit, whatever its owner does with the hit. */
  flashMonster: (id: string) => void;
  /** Sends a hit to the owner of a monster this client does not own. */
  broadcastMonsterDamage: (damage: {
    id: string;
    amount: number;
    attackerX: number;
    attackerZ: number;
  }) => void;
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
