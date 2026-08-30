// The bronze sword. Its primary strikes the nearer of a monster within swing
// reach and a voxel within block reach, so it damages what is close and digs
// what is not; because block reach is the longer of the two, a wall standing
// between the player and a monster is always the nearer pick, and a swing
// cannot land through terrain. Holding the secondary raises the sword to
// guard, which halves what the player takes while it is up.
import { pickMonster, SWORD_DAMAGE } from "../../monsters/hit";
import { clamp } from "../../utils";
import type { InputSnapshot } from "../create-input";
import { easeInOut, easeOut, lerpPose, type SwingPose } from "../swing";
import type { Target, Tool, ToolContext, ToolPick } from "./tool";

/** The sword at ease, the lower right of the first-person view. */
export const REST_POSE: SwingPose = {
  x: 0.45,
  y: -0.35,
  z: -0.85,
  roll: 0,
};

/** The sword raised across the view, where a held guard holds it. */
export const GUARD_POSE: SwingPose = {
  x: 0.62,
  y: -0.48,
  z: -1.05,
  roll: (35 * Math.PI) / 180,
};

/** The sword at the end of the swing, whipped across and out in front. */
export const SWUNG_POSE: SwingPose = {
  x: 0.38,
  y: -0.18,
  z: -0.68,
  roll: (-50 * Math.PI) / 180,
};

/** How long the swing takes, in seconds. */
export const SWING_TIME = 0.22;
/** How long the sword takes to settle back to rest, in seconds. */
export const RECOVER_TIME = 0.28;
/** How long the sword takes to rise into or fall out of the guard, in seconds. */
export const GUARD_TIME = 0.16;

/** The stages of one swing; the guard rides alongside them rather than in them. */
export type SwordState = "idle" | "swing" | "recover";

/**
 * Where the sword sits partway through a swing.
 *
 * @param phase How far the state has run, 0 to 1.
 * @param guard How far the guard is raised, 0 to 1, which only shows while the
 * sword is at rest.
 */
export const swordPose = (
  state: SwordState,
  phase: number,
  guard: number,
): SwingPose => {
  switch (state) {
    case "idle":
      return lerpPose(REST_POSE, GUARD_POSE, guard);
    case "swing":
      return lerpPose(REST_POSE, SWUNG_POSE, easeOut(clamp(phase, 0, 1)));
    case "recover":
      return lerpPose(SWUNG_POSE, REST_POSE, easeInOut(clamp(phase, 0, 1)));
  }
};

/** The nearer of two targets, either of which may be nothing. */
const nearer = (a: Target | null, b: Target | null): Target | null => {
  if (a === null) {
    return b;
  }
  if (b === null) {
    return a;
  }
  return a.distance <= b.distance ? a : b;
};

export class SwordTool implements Tool {
  private readonly ctx: ToolContext;
  private state: SwordState = "idle";
  /** Seconds the current state has run, to time the swing against. */
  private stateTime = 0;
  /** How far the guard is raised, 0 to 1. */
  private guard = 0;
  /** Whether the guard is currently up, so it is reported only when it changes. */
  private guarding = false;

  constructor(ctx: ToolContext) {
    this.ctx = ctx;
  }

  pick(): ToolPick {
    const { origin, direction } = this.ctx.look();
    const voxel = this.ctx.editing.pick();
    const hit = pickMonster(origin, direction, this.ctx.monsters());
    return {
      primary: nearer(
        hit === null
          ? null
          : { kind: "monster", id: hit.id, distance: hit.distance },
        voxel.target === null
          ? null
          : { kind: "voxel", voxel: voxel.target, distance: voxel.distance },
      ),
      secondary: null,
    };
  }

  primary(pick: ToolPick): string | null {
    this.state = "swing";
    this.stateTime = 0;
    const target = pick.primary;
    if (target === null) {
      return null;
    }
    if (target.kind === "voxel") {
      return this.ctx.editing.breakBlock(target.voxel);
    }
    // The attacker sees the hit flash on their own client, whatever the
    // monster's owner does with it.
    this.ctx.flashMonster(target.id);
    // A monster the swing landed on but this client does not own is the
    // owner's to damage: broadcast the hit and let them apply it.
    if (!this.ctx.damageMonster(target.id, SWORD_DAMAGE)) {
      const position = this.ctx.position();
      this.ctx.broadcastMonsterDamage({
        id: target.id,
        amount: SWORD_DAMAGE,
        attackerX: position.x,
        attackerZ: position.z,
      });
    }
    return null;
  }

  secondary(): string | null {
    return null;
  }

  update(dt: number, buttons: InputSnapshot): void {
    if (this.state !== "idle") {
      this.stateTime += dt;
      if (this.state === "swing" && this.stateTime >= SWING_TIME) {
        this.state = "recover";
        this.stateTime = 0;
      } else if (this.state === "recover" && this.stateTime >= RECOVER_TIME) {
        this.state = "idle";
        this.stateTime = 0;
      }
    }
    this.raiseGuard(buttons.secondaryHeld && this.state === "idle");
    this.guard = clamp(
      this.guard + (this.guarding ? dt : -dt) / GUARD_TIME,
      0,
      1,
    );
  }

  pose(): SwingPose {
    const phase =
      this.state === "swing"
        ? this.stateTime / SWING_TIME
        : this.state === "recover"
          ? this.stateTime / RECOVER_TIME
          : 0;
    return swordPose(this.state, phase, this.guard);
  }

  stow(): void {
    this.state = "idle";
    this.stateTime = 0;
    this.guard = 0;
    this.raiseGuard(false);
  }

  private raiseGuard(raised: boolean): void {
    if (raised === this.guarding) {
      return;
    }
    this.guarding = raised;
    this.ctx.setGuarding(raised);
  }
}
