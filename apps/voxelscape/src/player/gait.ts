// The locomotion a moving player plays: which of its model's three motions,
// and how far through it, from how fast and how far along the ground it has
// come.
//
// The phase is counted in strides rather than in seconds, so a figure's legs
// keep step with the ground under them however fast it is going — two players
// at the same speed are mid-stride together, and a player who turns and
// accelerates does not slip. The figure renderer turns a stride into a frame of
// whichever motion the role named, so nothing here needs to know how that model
// was keyed.
import type { FigureGait, GaitRole } from "../places/voxel-figures";

/** A world distance per stride, in world units. */
export interface GaitTuning {
  /**
   * How far a stride covers the ground, in world units. One cycle of the
   * motion playing is played over this much walking.
   */
  stride: number;
  /** The ground speed, in world units per second, that plays the run clip. */
  runAt: number;
  /** The ground speed, in world units per second, that leaves standing still. */
  walkAt: number;
}

/**
 * A human avatar as the world moves. The world's own move speed is a run by
 * anything but the game's own measure — a player two units tall covers seven
 * and a half of their own heights a second — so the run clip is what a moving
 * player wears and the walk clip is what one wears slowed down, on a conveyor,
 * or carried. A stride spans several times the figure's own height for the same
 * reason: it is what keeps the legs stepping once per cycle at this speed.
 * Lowering `/player:speed` brings the two measures into agreement.
 */
export const HUMAN_GAIT: GaitTuning = {
  stride: 16,
  runAt: 12,
  walkAt: 3,
};

/**
 * The role a figure moving at `speed` plays. Between walking and running the
 * figure keeps the role it already had, so a player sitting on the boundary
 * does not swap clips several times a second; standing still is below both, and
 * ends a run as surely as it would end a walk.
 */
const roleAt = (
  current: GaitRole,
  speed: number,
  gait: GaitTuning,
): GaitRole => {
  if (speed >= gait.runAt) {
    return "run";
  }
  if (speed >= gait.walkAt) {
    return current === "run" ? "run" : "walk";
  }
  return "idle";
};

/**
 * One moving player's gait, and the phase its legs stand at. The phase is
 * carried across frames, which is the whole of what this holds: a figure given
 * none — an avatar whose model has no walking motions — stands in its rest pose
 * however fast it moves.
 */
export class PlayerGait {
  private readonly tuning: GaitTuning | undefined;
  private role: GaitRole = "idle";
  private phase = 0;

  constructor(tuning: GaitTuning | undefined) {
    this.tuning = tuning;
  }

  /**
   * The role and phase to draw the player at, having moved `speed` world units
   * per second for `dt` seconds. A player off the ground stands still, and a
   * change of role starts its clip at the beginning rather than wherever the
   * last one left off.
   */
  update(dt: number, speed: number, grounded: boolean): FigureGait {
    const gait = this.tuning;
    if (gait === undefined) {
      return { role: "idle", phase: 0 };
    }
    const next = grounded ? roleAt(this.role, speed, gait) : "idle";
    if (next !== this.role) {
      this.role = next;
      this.phase = 0;
    }
    if (grounded && gait.stride > 0) {
      this.phase += (speed * dt) / gait.stride;
    }
    return { role: this.role, phase: this.phase };
  }
}
